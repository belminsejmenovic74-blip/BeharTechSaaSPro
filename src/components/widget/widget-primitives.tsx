"use client";

// Primitives d'interface du widget, stylées via les variables CSS du thème
// (`--w-*`). Aucun composant décoratif superflu : boutons, cartes d'option,
// champs, barre de progression et coquille d'étape.

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const FIELD_CLASS =
  "h-11 w-full rounded-[var(--w-radius)] border border-[var(--w-border)] bg-[var(--w-surface)] px-3.5 text-sm text-[var(--w-text)] outline-none transition placeholder:text-[var(--w-muted)] focus-visible:border-[var(--w-primary)] focus-visible:ring-2 focus-visible:ring-[var(--w-tint)]";

function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={cn("h-3 w-3", className)} aria-hidden="true">
      <path
        d="M2.5 6.2 5 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5 animate-spin", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-20" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
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
    primary: "bg-[var(--w-primary)] text-[var(--w-on-primary)] shadow-sm hover:brightness-95",
    secondary:
      "border border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-text)] hover:border-[var(--w-primary)]",
    ghost: "text-[var(--w-muted)] hover:text-[var(--w-text)]",
  };
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-11 select-none items-center justify-center gap-2 rounded-[var(--w-radius)] px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-tint)] disabled:pointer-events-none disabled:opacity-50",
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
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[var(--w-radius)] border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-tint)] disabled:opacity-50",
        selected
          ? "border-[var(--w-primary)] bg-[var(--w-tint)]"
          : "border-[var(--w-border)] bg-[var(--w-surface)] hover:border-[var(--w-primary)]",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[var(--w-text)]">{title}</span>
        {subtitle ? <span className="mt-0.5 block truncate text-xs text-[var(--w-muted)]">{subtitle}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {meta ? <span className="text-xs font-medium text-[var(--w-muted)]">{meta}</span> : null}
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition",
            selected
              ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
              : "border-[var(--w-border)] text-transparent",
          )}
        >
          <CheckMark />
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
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-tint)] disabled:opacity-50",
        selected
          ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-[var(--w-on-primary)]"
          : "border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-text)] hover:border-[var(--w-primary)]",
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
    <div className="w-full">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--w-muted)]">
          Étape {current + 1} sur {steps.length}
        </span>
        <span className="truncate text-sm font-semibold text-[var(--w-text)]">{steps[current]}</span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((label, index) => (
          <div key={label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--w-border)]">
            <div
              className={cn(
                "h-full rounded-full bg-[var(--w-primary)] transition-all duration-500 ease-out",
                index <= current ? "w-full" : "w-0",
              )}
            />
          </div>
        ))}
      </div>
      <ol className="mt-3 hidden grid-cols-5 gap-1 sm:grid" aria-hidden="true">
        {steps.map((label, index) => (
          <li
            key={label}
            className={cn(
              "truncate text-center text-[11px] font-medium transition-colors",
              index <= current ? "text-[var(--w-text)]" : "text-[var(--w-muted)]",
            )}
          >
            {label}
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
        <h2 className="text-xl font-semibold tracking-tight text-[var(--w-text)]">{title}</h2>
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
