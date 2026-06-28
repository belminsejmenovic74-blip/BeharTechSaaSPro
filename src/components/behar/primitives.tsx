import type { ComponentProps, ReactNode } from "react";

import Image from "next/image";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { createPortal } from "react-dom";

export { Combobox } from "@/components/behar/combobox";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  "data-testid": dataTestId,
}: Readonly<{
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-[16px] border border-[#E8E8E5] bg-white shadow-[0_1px_2px_rgba(26,25,22,0.035)]",
        className,
      )}
      data-testid={dataTestId}
    >
      {children}
    </section>
  );
}

export function SearchBox({
  placeholder = "Rechercher...",
  className,
  value,
  onChange,
}: Readonly<{
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (val: string) => void;
}>) {
  return (
    <label className={cn("relative block", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6B6B6B]" />
      <input
        className="h-10 w-full rounded-[12px] border border-[#E8E8E5] bg-white pr-4 pl-10 text-[#1A1916] text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-3 focus:ring-[#2A9D8F]/10"
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

export function ToolbarSelect({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-medium text-[#1A1916] text-sm transition hover:border-[#2A9D8F]/35"
      type="button"
    >
      <span>{children}</span>
      <ChevronDown className="size-4 text-[#6B6B6B]" />
    </button>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: Readonly<{
  children: ReactNode;
  className?: string;
}> &
  ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "h-11 rounded-[12px] bg-[#2A9D8F] px-5 font-semibold text-white shadow-[0_1px_2px_rgba(42,157,143,0.14)] transition-colors duration-200 hover:bg-[#238579]",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: Readonly<{
  children: ReactNode;
  className?: string;
}> &
  ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        "h-11 rounded-[12px] border-[#E8E8E5] bg-white px-5 font-medium text-[#1A1916] transition-colors duration-200 hover:bg-[#FFFFFF]",
        className,
      )}
      type="button"
      variant="outline"
      {...props}
    >
      {children}
    </Button>
  );
}

export function MetricCard({
  label,
  value,
  trend,
  helper,
  icon: Icon,
  negative,
}: Readonly<{
  label: string;
  value: string;
  trend: string;
  helper: string;
  icon: LucideIcon;
  negative?: boolean;
}>) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#6B6B6B]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[#6B6B6B] text-[13px] leading-5">{label}</p>
          <p className="mt-1.5 font-semibold text-[#1A1916] text-[28px] leading-none tracking-tight">{value}</p>
          <p className={cn("mt-2 font-medium text-[13px]", negative ? "text-[#C84848]" : "text-[#2A9D8F]")}>{trend}</p>
          <p className="mt-0.5 text-[#6B6B6B] text-xs">{helper}</p>
        </div>
      </div>
    </Panel>
  );
}

const statusStyles: Record<string, string> = {
  Reçu: "border-[#D7EFEA] bg-[#FFFFFF] text-[#1E7D72]",
  Diagnostic: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  "En attente": "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  "En attente pièce": "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  "Pièce en attente": "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  "Pièce commandée": "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  "Pièce reçue": "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "En attente validation client": "border-[#E5DEFF] bg-[#FFFFFF] text-[#5D4BA8]",
  "Devis envoyé": "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  "Devis accepté": "border-[#D7EFEA] bg-[#FFFFFF] text-[#1E7D72]",
  "En réparation": "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "Test final": "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Test: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Prêt: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  "Téléphone prêt": "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "Prêt — paiement à encaisser": "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  "Prêt à remettre au client": "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "Test final validé": "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "Test non applicable": "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  "Test impossible": "border-[#FEF0C7] bg-[#FFFFFF] text-[#B54708]",
  "Test refusé par le client": "border-[#FEF0C7] bg-[#FFFFFF] text-[#B54708]",
  Rendu: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Irréparable: "border-[#F2D4D1] bg-[#FFFFFF] text-[#B42318]",
  SAV: "border-[#FFE6C7] bg-[#FFFFFF] text-[#936100]",
  Clôturé: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Actif: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "Client fidèle": "border-[#D7EFEA] bg-[#FFFFFF] text-[#147065]",
  Payée: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  Envoyée: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Payé: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  Annulé: "border-[#F2D4D1] bg-[#FFFFFF] text-[#B42318]",
  Réussi: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  "En retard": "border-[#F2D4D1] bg-[#FFFFFF] text-[#B42318]",
  Remboursé: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Brouillon: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Envoyé: "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
  Accepté: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  Refusé: "border-[#F2D4D1] bg-[#FFFFFF] text-[#B42318]",
  "En stock": "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
  ActifWidget: "border-[#D7EFEA] bg-[#FFFFFF] text-[#167B70]",
};

export function StatusBadge({ status, className }: Readonly<{ status: string; className?: string }>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-[7px] border px-2 py-0.5 font-semibold text-[11px] leading-none",
        statusStyles[status] ?? "border-[#E8E8E5] bg-[#FFFFFF] text-[#6B6B6B]",
        className,
      )}
    >
      {status === "ActifWidget" ? "Actif" : status}
    </span>
  );
}

export function DetailRow({
  label,
  value,
  emphasize,
  className,
}: Readonly<{
  label: string;
  value: ReactNode;
  emphasize?: boolean;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-6 py-3 text-sm border-b border-[#FFFFFF] last:border-0",
        className,
      )}
    >
      <dt className="text-[#6B6B6B]">{label}</dt>
      <dd className={cn("text-right text-[#1A1916]", emphasize && "font-semibold")}>{value}</dd>
    </div>
  );
}

export function TableShell({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <Panel className={cn("overflow-hidden", className)}>
      <div className="h-full overflow-auto">{children}</div>
    </Panel>
  );
}

export const tableClassName = "w-full min-w-[720px] border-collapse text-sm";
export const tableHeadClassName = "border-b border-[#E8E8E5] bg-[#FFFFFF] text-left text-xs font-semibold text-[#6B6B6B]";
export const tableCellClassName = "border-b border-[#E8E8E5] px-4 py-3 text-[#1A1916]";

export type TimelineItem = {
  text: string;
  detail?: string;
  icon?: any;
  date?: string;
  type?: "repair" | "quote" | "invoice" | "payment";
  id?: string;
};

export function Timeline({ items }: Readonly<{ items: readonly (string | TimelineItem)[] }>) {
  return (
    <ol className="space-y-4">
      {items.map((raw, index) => {
        const isString = typeof raw === "string";
        const text = isString ? raw : raw.text;
        const detail = isString ? undefined : raw.detail;
        const Icon = isString ? undefined : raw.icon;
        const date = isString ? undefined : raw.date;
        const key = `${text}-${index}`;

        return (
          <li className="flex gap-3 text-sm leading-snug" key={key}>
            <div className="relative flex flex-col items-center">
              <span
                className={cn(
                  "z-10 grid size-5 shrink-0 place-items-center rounded-full border bg-white",
                  index === 0 ? "border-[#2A9D8F] text-[#2A9D8F]" : "border-[#DADADA] text-[#6B6B6B]",
                )}
              >
                {Icon ? <Icon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              {index < items.length - 1 && <div className="absolute top-5 h-full w-[1px] bg-[#FFFFFF]" />}
            </div>
            <div className="flex-1 pb-2">
              <p className="font-semibold text-[#1A1916]">{text}</p>
              {detail && <p className="mt-0.5 text-[#6B6B6B] text-xs">{detail}</p>}
              {date && <p className="mt-1 text-[#8A8A8A] text-[10px] font-bold uppercase">{date}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function SuccessNote({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-[#2A9D8F]/15 bg-[#FFFFFF] p-4 text-[#167B70] text-sm">
      <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-[#2A9D8F] text-white">
        <Check className="size-4" />
      </span>
      <span>{children}</span>
    </div>
  );
}

export function DeviceThumb({ className }: Readonly<{ className?: string }>) {
  return (
    <div
      className={cn(
        "relative h-16 w-12 overflow-hidden rounded-[13px] border border-[#DADADA] bg-[#FFFFFF] shadow-[0_1px_2px_rgba(26,25,22,0.06)]",
        className,
      )}
    >
      <div className="absolute inset-1 rounded-[9px] border border-[#E8E8E5] bg-white" />
      <div className="absolute top-1.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-[#FFFFFF]" />
    </div>
  );
}

export function PartPlaceholder({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn("grid h-56 place-items-center rounded-[18px] bg-[#FFFFFF]", className)}>
      <div className="relative h-40 w-24 rounded-[14px] border border-[#DADADA] bg-white shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
        <div className="absolute inset-x-4 top-3 h-1.5 rounded-full bg-[#FFFFFF]" />
        <div className="absolute inset-x-3 top-9 h-24 rounded-lg border border-[#E8E8E5] bg-[#FFFFFF]" />
        <div className="absolute bottom-3 left-1/2 h-2 w-9 -translate-x-1/2 rounded-full bg-[#FFFFFF]" />
      </div>
    </div>
  );
}

export function PreviewLogo() {
  return (
    <Image
      alt="BEHAR • TECH"
      className="h-auto w-36 object-contain"
      height={36}
      src="/assets/logos/logo-horizontal.jpg"
      width={144}
    />
  );
}

export function FormField({
  label,
  children,
  error,
  className,
}: Readonly<{
  label?: string;
  children: ReactNode;
  error?: string;
  className?: string;
}>) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="font-medium text-[#1A1916] text-sm">{label}</label>}
      {children}
      {error && <p className="text-[#DC3545] text-xs mt-1">{error}</p>}
    </div>
  );
}

export function ChoiceCard({
  title,
  subtitle,
  icon: Icon,
  selected,
  onClick,
  disabled,
}: Readonly<{
  title: string;
  subtitle: string;
  icon: LucideIcon;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}>) {
  return (
    <button
      className={cn(
        "flex flex-col items-center gap-3 rounded-[14px] border p-5 text-center transition-colors duration-200",
        selected
          ? "border-[#2A9D8F] bg-[#FFFFFF]"
          : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/35",
        disabled && "cursor-not-allowed opacity-50",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <div
        className={cn(
          "grid size-10 place-items-center rounded-[10px]",
          selected ? "bg-[#2A9D8F] text-white" : "bg-[#FFFFFF] text-[#6B6B6B]",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className={cn("font-semibold", selected ? "text-[#167B70]" : "text-[#1A1916]")}>{title}</p>
        <p className="text-[#6B6B6B] text-xs">{subtitle}</p>
      </div>
    </button>
  );
}

export function Input({ className, ...props }: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-[#1A1916] text-sm outline-none transition-all duration-200 placeholder:text-[#8A8A8A] focus:border-[#2A9D8F] focus:ring-4 focus:ring-[#2A9D8F]/8 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ children, className, ...props }: Readonly<React.SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-10 w-full appearance-none rounded-[12px] border border-[#E8E8E5] bg-white px-4 pr-10 text-[#1A1916] text-sm outline-none transition focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-[#6B6B6B]" />
    </div>
  );
}

export function Textarea({ className, ...props }: Readonly<React.TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[12px] border border-[#E8E8E5] bg-white p-4 text-[#1A1916] text-sm outline-none transition placeholder:text-[#6B6B6B] focus:border-[#2A9D8F]/55 focus:ring-4 focus:ring-[#2A9D8F]/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}>) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-stretch p-0 md:items-center md:justify-center md:p-4">
      <div className="fixed inset-0 bg-[#1A1916]/32 transition-opacity" onClick={onClose} />
      <Panel
        className={cn(
          "relative z-10 w-full flex flex-col min-h-svh rounded-none md:min-h-0 md:max-h-[90vh] md:rounded-[20px]",
          maxWidth,
        )}
      >
        <div className="flex items-center justify-between border-b border-[#FFFFFF] px-5 py-4 md:px-7 md:py-5">
          <h2 className="font-semibold text-[#1A1916] text-[17px] tracking-tight">{title}</h2>
          <button
            className="grid size-9 place-items-center rounded-[10px] bg-[#FFFFFF] text-[#6B6B6B] transition hover:bg-[#FFFFFF] hover:text-[#1A1916] md:size-8 md:bg-transparent"
            onClick={onClose}
            type="button"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 md:p-7">{children}</div>
      </Panel>
    </div>,
    document.body,
  );
}
