"use client";

import { useState } from "react";

import { Menu, X } from "lucide-react";

import { landingContent } from "@/content/landing";

import { Brand } from "./_shared";
import styles from "./landing-page.module.css";

/**
 * En-tête fixe et simple : logo à gauche, "Connexion" + bouton teal à droite,
 * fond blanc cassé, fine bordure basse.
 */
export function Header({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { brand, connexion, cta } = landingContent.header;

  return (
    <header className={`${styles.header} ${styles.headerFixed} ${compact ? styles.headerCompact : ""}`}>
      <Brand brand={brand} />
      <nav className={styles.headerActions} aria-label="Navigation principale">
        <a className={styles.headerLink} href={connexion.href}>
          {connexion.label}
        </a>
        <a className={styles.headerCta} href={cta.href}>
          {cta.label}
        </a>
      </nav>
      <button
        className={styles.menuButton}
        type="button"
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <div className={styles.mobileNav}>
          <a href={connexion.href} onClick={() => setOpen(false)}>
            {connexion.label}
          </a>
          <a href={cta.href} onClick={() => setOpen(false)}>
            {cta.label}
          </a>
        </div>
      )}
    </header>
  );
}
