"use client";

// Sélecteur de catalogue mono-choix réutilisable : recherche textuelle,
// suggestions sous forme de puces, saisie « autre » libre, états chargement /
// erreur / vide. Utilisé pour catégorie, marque, modèle et problème simple.

import { useId, useMemo, useState, type ReactNode } from "react";

import { WidgetButton, WidgetChip, WidgetInput } from "@/components/widget/widget-primitives";

export type CatalogPickerProps = {
  items: string[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  value: string;
  isCustom: boolean;
  allowOther?: boolean;
  otherLabel?: string;
  otherPlaceholder?: string;
  emptyHint?: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
  onSelectOther: (value: string) => void;
  onEnterOther: () => void;
  renderItemIcon?: (item: string) => ReactNode;
};

function normalize(value: string): string {
  // Repli insensible aux accents sans dépendre d'un littéral de marques
  // combinantes dans la source : on décompose puis on retire U+0300–U+036F.
  let out = "";
  for (const character of value.toLowerCase().normalize("NFD")) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x0300 || code > 0x036f) out += character;
  }
  return out;
}

export function CatalogPicker({
  items,
  loading,
  error,
  onReload,
  searchable = false,
  searchPlaceholder = "Rechercher…",
  value,
  isCustom,
  allowOther = false,
  otherLabel = "Autre",
  otherPlaceholder = "Précisez…",
  emptyHint,
  disabled,
  onSelect,
  onSelectOther,
  onEnterOther,
  renderItemIcon,
}: CatalogPickerProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? items.filter((item) => normalize(item).includes(q)) : items;
  }, [items, query]);

  const hasExactMatch = useMemo(
    () => items.some((item) => normalize(item) === normalize(query.trim())),
    [items, query],
  );

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2" aria-busy="true">
        {[64, 88, 72, 96, 60].map((width, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: squelette purement visuel
            key={index}
            className="h-9 animate-pulse rounded-full bg-[var(--w-border)]"
            style={{ width }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] p-4">
        <p className="text-sm text-[var(--w-muted)]">Ce catalogue n’a pas pu être chargé.</p>
        <WidgetButton variant="secondary" onClick={onReload} className="h-9 px-4 text-xs">
          Réessayer
        </WidgetButton>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {searchable && items.length > 6 ? (
        <div className="relative">
          <WidgetInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {filtered.map((item) => (
          <WidgetChip
            key={item}
            selected={!isCustom && value === item}
            onClick={() => onSelect(item)}
            disabled={disabled}
          >
            <span className="inline-flex items-center gap-1.5">
              {renderItemIcon?.(item)}
              {item}
            </span>
          </WidgetChip>
        ))}

        {allowOther && query.trim() && !hasExactMatch ? (
          <WidgetChip
            selected={isCustom && value === query.trim()}
            onClick={() => onSelectOther(query.trim())}
            disabled={disabled}
          >
            Utiliser «&nbsp;{query.trim()}&nbsp;»
          </WidgetChip>
        ) : null}

        {allowOther ? (
          <WidgetChip selected={isCustom} onClick={onEnterOther} disabled={disabled}>
            {otherLabel}
          </WidgetChip>
        ) : null}
      </div>

      {!filtered.length && !isCustom ? (
        <p className="text-sm text-[var(--w-muted)]">
          {emptyHint ??
            (allowOther ? "Aucune suggestion — utilisez « Autre » pour préciser." : "Aucune option disponible.")}
        </p>
      ) : null}

      {isCustom ? (
        <WidgetInput
          id={inputId}
          autoFocus
          value={value}
          onChange={(event) => onSelectOther(event.target.value)}
          placeholder={otherPlaceholder}
          disabled={disabled}
        />
      ) : null}
    </div>
  );
}
