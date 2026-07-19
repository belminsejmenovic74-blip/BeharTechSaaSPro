"use client";

// Primitives d'interface du widget, stylées via les variables CSS du thème
// (`--w-*`). Aucun composant décoratif superflu : boutons, cartes d'option,
// champs, barre de progression et coquille d'étape.

import { useMemo, useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Check, LoaderCircle, Search } from "lucide-react";

import { fold } from "@/lib/widget/global-catalog";
import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "h-12 w-full rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] px-4 text-sm text-[var(--w-text)] outline-none transition-colors placeholder:text-[var(--w-muted)] hover:border-[var(--w-primary-border,var(--w-border))] focus-visible:border-[var(--w-primary)] focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring,var(--w-tint))]";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-5 w-5 animate-spin", className)} aria-hidden="true" />;
}

type ButtonVariant = "primary" | "secondary" | "ghost";

export function WidgetButton({
  variant = "primary",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "border border-[var(--w-button-border,var(--w-primary))] bg-[var(--w-button-bg,var(--w-primary))] text-[var(--w-button-fg,var(--w-on-primary))] hover:brightness-95",
    secondary:
      "border border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-text)] hover:border-[var(--w-primary)]",
    ghost: "text-[var(--w-muted)] hover:text-[var(--w-text)]",
  };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-11 select-none items-center justify-center gap-2 rounded-[var(--w-radius)] px-5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring,var(--w-tint))] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function OptionCard({
  selected,
  title,
  subtitle,
  meta,
  onClick,
  disabled,
  icon,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[var(--w-radius)] border px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring,var(--w-tint))] disabled:opacity-50",
        selected
          ? "border-[var(--w-primary)] bg-[var(--w-tint)]"
          : "border-[var(--w-border)] bg-white hover:border-[#B9B9B4] hover:bg-[#F9FAFB]",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[var(--w-text)]">{title}</span>
          {subtitle ? <span className="mt-0.5 block truncate text-xs text-[var(--w-muted)]">{subtitle}</span> : null}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {meta !== null && meta !== undefined ? (
          <span className="text-xs font-medium text-[var(--w-muted)]">{meta}</span>
        ) : null}
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition",
            selected
              ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
              : "border-[var(--w-border)] text-transparent",
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </span>
    </button>
  );
}

export function WidgetChip({
  selected,
  children,
  onClick,
  disabled,
  segmented = false,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  segmented?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "border px-3.5 py-2 text-sm font-medium transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring,var(--w-tint))] disabled:opacity-50",
        "rounded-[10px]",
        selected
          ? segmented
            ? "border-[var(--w-primary)] bg-[var(--w-tint)] text-[var(--w-primary)]"
            : "border-[var(--w-primary)] bg-[var(--w-tint)] text-[var(--w-primary)]"
          : segmented
            ? "border-transparent bg-transparent text-[var(--w-muted)] hover:bg-white"
            : "border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-text)] hover:border-[var(--w-primary-border,var(--w-primary))] hover:bg-[var(--w-primary-soft,var(--w-tint))]",
      )}
    >
      {children}
    </button>
  );
}

export function WidgetField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--w-text)]">
          {label}
          {required ? <span className="text-[var(--w-primary)]"> *</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className="text-xs font-medium text-[#B4232A]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--w-muted)]">{hint}</span>
      ) : null}
    </div>
  );
}

export function WidgetInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_CLASS, className)} {...props} />;
}

export function WidgetSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_CLASS, "cursor-pointer appearance-auto bg-white font-medium", className)} {...props} />
  );
}

export function WidgetTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_CLASS, "h-auto min-h-[96px] resize-none py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function WidgetProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div
      className="w-full"
      role="progressbar"
      aria-label={`${steps[current]} — ${current + 1} / ${steps.length}`}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={current + 1}
    >
      <div className="grid gap-2 sm:hidden">
        <div className="flex items-end justify-between gap-3">
          <span className="truncate text-sm font-semibold text-[var(--w-text)]">{steps[current]}</span>
          <span className="text-xs font-medium tabular-nums text-[var(--w-muted)]">
            {current + 1} / {steps.length}
          </span>
        </div>
        <span className="h-1 overflow-hidden rounded-full bg-[var(--w-border)]">
          <span
            className="block h-full rounded-full bg-[var(--w-primary)] transition-[width] duration-300"
            style={{ width: `${((current + 1) / steps.length) * 100}%` }}
          />
        </span>
      </div>
      <ol className="hidden grid-cols-4 sm:grid">
        {steps.map((label, index) => (
          <li key={label} className="relative flex min-w-0 items-center justify-center gap-2 px-3 text-center">
            {index > 0 ? (
              <span
                className={cn(
                  "absolute right-1/2 top-1/2 h-px w-full -translate-y-1/2 transition-colors",
                  index <= current ? "bg-[var(--w-primary)]" : "bg-[var(--w-border)]",
                )}
              />
            ) : null}
            {index < current ? (
              <span className="relative z-10 grid size-4 place-items-center rounded-full bg-[#F9FAFB] text-[var(--w-primary)]">
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
            ) : null}
            <span
              className={cn(
                "relative z-10 truncate bg-[#F9FAFB] px-2 text-xs font-medium",
                index === current ? "text-[var(--w-text)]" : "text-[var(--w-muted)]",
              )}
            >
              {label}
            </span>
            {index === current ? (
              <span className="absolute -bottom-2 h-0.5 w-8 rounded-full bg-[var(--w-primary)]" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <header className="grid gap-1.5">
        <h2 className="text-[calc(1.25rem*var(--w-heading-scale,1))] font-semibold tracking-tight text-[var(--w-text)]">
          {title}
        </h2>
        {subtitle ? <p className="text-sm leading-relaxed text-[var(--w-muted)]">{subtitle}</p> : null}
      </header>
      {children}
    </div>
  );
}

export function WidgetNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      className={cn(
        "rounded-[var(--w-radius)] border px-4 py-3 text-sm leading-relaxed",
        tone === "warning"
          ? "border-[#EBD9B4] bg-[#FBF6EA] text-[#8A6D1B]"
          : "border-[var(--w-border)] bg-[var(--w-tint)] text-[var(--w-text)]",
      )}
    >
      {children}
    </div>
  );
}

export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-[var(--w-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--w-text)]">{value}</span>
    </div>
  );
}

// Champ de recherche compact avec icône, aligné sur le style de la maquette.
export function WidgetSearch({
  value,
  onChange,
  placeholder = "Rechercher…",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--w-muted)]" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="h-10 w-full rounded-[calc(var(--w-radius)-2px)] border border-[var(--w-border)] bg-[var(--w-surface)] pl-9 pr-3 text-sm text-[var(--w-text)] outline-none transition placeholder:text-[var(--w-muted)] hover:border-[var(--w-primary-border)] focus-visible:border-[var(--w-primary)] focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]"
      />
    </div>
  );
}

// Liste propre, compacte, scrollable et recherchable (marques, modèles).
// Remplace les « gros boutons dispersés » : une seule colonne lisible.
export function CatalogList({
  items,
  value,
  onSelect,
  searchable = true,
  searchPlaceholder = "Rechercher…",
  ariaLabel,
  renderLeading,
  renderTrailing,
  loading = false,
  emptyHint = "Aucun résultat.",
  heightClass = "max-h-[340px]",
  footer,
}: {
  items: string[];
  value: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  ariaLabel?: string;
  renderLeading?: (item: string, selected: boolean) => ReactNode;
  renderTrailing?: (item: string, selected: boolean) => ReactNode;
  loading?: boolean;
  emptyHint?: string;
  heightClass?: string;
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return q ? items.filter((item) => fold(item).includes(q)) : items;
  }, [items, query]);

  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      {searchable ? (
        <WidgetSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} ariaLabel={ariaLabel} />
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-y-auto pr-1", heightClass)}>
        {loading ? (
          <div className="grid gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="h-11 animate-pulse rounded-[calc(var(--w-radius)-2px)] bg-[var(--w-tint)]" />
            ))}
          </div>
        ) : filtered.length ? (
          <ul className="grid gap-1">
            {filtered.map((item) => {
              const selected = fold(item) === fold(value);
              return (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[calc(var(--w-radius)-2px)] border px-3 py-2.5 text-left text-sm transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-focus-ring)]",
                      selected
                        ? "border-[var(--w-primary-border)] bg-[var(--w-primary-soft)] font-semibold text-[var(--w-text)]"
                        : "border-transparent text-[var(--w-text)] hover:bg-[var(--w-primary-soft)]",
                    )}
                  >
                    {renderLeading ? renderLeading(item, selected) : null}
                    <span className="min-w-0 flex-1 truncate">{item}</span>
                    {renderTrailing ? (
                      renderTrailing(item, selected)
                    ) : (
                      <Check
                        className={cn(
                          "size-4 shrink-0 transition",
                          selected ? "text-[var(--w-primary)]" : "text-transparent",
                        )}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1 py-8 text-center text-sm text-[var(--w-muted)]">{emptyHint}</p>
        )}
        {footer}
      </div>
    </div>
  );
}
