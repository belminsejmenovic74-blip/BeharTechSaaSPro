"use client";

import type { CSSProperties, ReactNode } from "react";

import {
  ArrowRight,
  Box,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Wrench,
} from "lucide-react";

import type { IconName } from "@/content/landing";

import styles from "./landing-page.module.css";

/** Résout un nom d'icône (contenu CMS) vers son composant lucide. */
const ICONS: Record<Exclude<IconName, "google">, LucideIcon> = {
  layout: LayoutDashboard,
  store: Store,
  phone: Phone,
  wrench: Wrench,
  sparkles: Sparkles,
  box: Box,
  trending: TrendingUp,
  calendar: CalendarDays,
  mail: Mail,
  message: MessageCircle,
  star: Star,
  link: Link2,
  package: PackageCheck,
  globe: Globe2,
  clock: Clock3,
  check: CheckCircle2,
  shield: ShieldCheck,
  file: FileText,
  "arrow-right": ArrowRight,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  // "google" est rendu comme un "G" coloré (pas d'icône lucide).
  if (name === "google") {
    return (
      <span className={styles.googleMark} aria-hidden>
        G
      </span>
    );
  }
  const Cmp = ICONS[name];
  return <Cmp className={className} aria-hidden />;
}

export function Brand({ brand }: { brand: { name: string; mark: string; pro: string } }) {
  return (
    <a href="/" className={styles.brand} aria-label={`${brand.name} ${brand.mark} ${brand.pro}`}>
      <span>{brand.name}</span>
      <span className={styles.brandDot} />
      <span>{brand.mark}</span>
      <span className={styles.brandPro}>{brand.pro}</span>
    </a>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`${styles.reveal} ${className}`} style={{ "--delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

export function CheckList({ title, items }: { title: string; items: string[] }) {
  return (
    <aside className={styles.benefitList}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <CheckCircle2 /> {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function Dots({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className={styles.dots}>
      {Array.from({ length: count }, (_, index) => (
        <button
          type="button"
          aria-label={`Afficher l’écran ${index + 1}`}
          className={active === index ? styles.dotActive : ""}
          key={index}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
