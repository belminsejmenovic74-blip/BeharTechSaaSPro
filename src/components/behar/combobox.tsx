"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Combobox premium Behar Tech.
 * - Pas de <select> natif gris.
 * - Tape pour filtrer, clique pour sélectionner.
 * - Aucune auto-sélection : la valeur ne change qu'après clic ou Enter explicite.
 * - `value` est la valeur réellement sélectionnée (vide tant que rien n'est validé).
 * - `allowCreate` permet d'ajouter une entrée libre via "+ Ajouter «xxx»".
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Rechercher…",
  emptyLabel = "Aucun résultat",
  allowCreate = false,
  createLabel = "Ajouter",
  disabled,
  className,
  inputClassName,
  leftIcon,
  ariaLabel,
  inputTestId,
}: Readonly<{
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  emptyLabel?: string;
  allowCreate?: boolean;
  createLabel?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  leftIcon?: ReactNode;
  ariaLabel?: string;
  inputTestId?: string;
}>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    setQuery("");
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = options.filter((entry) => entry && entry.trim().length > 0);
    if (!q) return base.slice(0, 50);
    return base.filter((entry) => entry.toLowerCase().includes(q)).slice(0, 50);
  }, [options, query]);

  const showCreate =
    allowCreate &&
    query.trim().length > 0 &&
    !filtered.some((entry) => entry.toLowerCase() === query.trim().toLowerCase());

  const commit = (next: string) => {
    onChange(next.trim());
    setQuery("");
    setOpen(false);
    setHighlight(0);
  };

  const displayValue = open ? query : value;

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#6B6B6B]">
            {leftIcon}
          </span>
        ) : null}
        <input
          aria-label={ariaLabel ?? placeholder}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          className={cn(
            "h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-4 pr-10 text-[#1A1916] text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10 disabled:cursor-not-allowed disabled:opacity-50",
            leftIcon ? "pl-10" : "",
            inputClassName,
          )}
          data-testid={inputTestId}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min(h + 1, filtered.length + (showCreate ? 1 : 0) - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              if (highlight < filtered.length) {
                if (filtered[highlight]) commit(filtered[highlight]);
              } else if (showCreate) {
                commit(query);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
          placeholder={value ? value : placeholder}
          role="combobox"
          type="text"
          value={displayValue}
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#6B6B6B] transition",
            open ? "rotate-180" : "",
          )}
        />
      </div>
      {open && (
        <ul
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] py-1 shadow-[0_18px_42px_rgba(26,25,22,0.10)]"
          id={listId}
          role="listbox"
        >
          {filtered.length === 0 && !showCreate && <li className="px-3 py-2 text-[#6B6B6B] text-xs">{emptyLabel}</li>}
          {filtered.map((entry, index) => {
            const selected = entry === value;
            const active = index === highlight;
            return (
              <li
                aria-selected={selected}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                  active ? "bg-[#FFFFFF] text-[#1A1916]" : "text-[#1A1916] hover:bg-[#FFFFFF]",
                )}
                key={entry}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(entry);
                }}
                onMouseEnter={() => setHighlight(index)}
                role="option"
              >
                <span>{entry}</span>
                {selected ? <Check className="size-4 text-[#2A9D8F]" /> : null}
              </li>
            );
          })}
          {showCreate && (
            <li
              className={cn(
                "flex cursor-pointer items-center gap-2 border-[#E8E8E5] border-t px-3 py-2 text-[#167B70] text-sm",
                highlight === filtered.length ? "bg-[#FFFFFF]" : "hover:bg-[#FFFFFF]",
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(query);
              }}
              onMouseEnter={() => setHighlight(filtered.length)}
              role="option"
            >
              <span className="font-medium">
                + {createLabel} «{query.trim()}»
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
