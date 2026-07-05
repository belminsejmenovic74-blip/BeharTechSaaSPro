"use client";

import { useEffect, useState } from "react";

import { landingContent } from "@/content/landing";

import styles from "./landing-page.module.css";

/**
 * Panneau de prévisualisation du CMS.
 *
 * Masqué par défaut : il n'apparaît qu'avec `?cms=1` dans l'URL (invisible en
 * navigation normale / production). Il montre que toute la page est pilotée
 * depuis `src/content/landing.ts` : ordre des sections, direction des
 * demi-cercles, flèches, onglets… et permet de copier la config.
 */
export function CMSPreviewConfig() {
  const [enabled, setEnabled] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).has("cms"));
  }, []);

  if (!enabled) return null;

  const { sections, arcs, showcases } = landingContent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(landingContent, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className={styles.cmsPanel} data-collapsed={collapsed}>
      <header>
        <strong>CMS · landing.ts</strong>
        <button type="button" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? "+" : "–"}
        </button>
      </header>

      {!collapsed && (
        <div className={styles.cmsBody}>
          <p className={styles.cmsHint}>
            Tout est piloté depuis <code>src/content/landing.ts</code>.
          </p>

          <h4>Ordre des sections</h4>
          <ol>
            {sections.map((section, index) => (
              <li key={`${section.kind}-${index}`}>
                {"ref" in section ? `${section.kind} · ${section.ref}` : section.kind}
              </li>
            ))}
          </ol>

          <h4>Demi-cercles (tunnel)</h4>
          <ul>
            {Object.entries(arcs).map(([key, arc]) => (
              <li key={key}>
                <strong>{key}</strong> — direction: {arc.direction}, height: {arc.height}, circleSize: {arc.circleSize}
              </li>
            ))}
          </ul>

          <h4>Showcases</h4>
          <ul>
            {Object.values(showcases).map((showcase) => (
              <li key={showcase.id}>
                <strong>{showcase.id}</strong> — {showcase.variant}, onglets: {showcase.tabs.length}, flèches:{" "}
                {showcase.showArrows ? showcase.arrowPosition : "off"}
              </li>
            ))}
          </ul>

          <button type="button" className={styles.cmsCopy} onClick={copy}>
            {copied ? "Copié ✓" : "Copier la config (JSON)"}
          </button>
        </div>
      )}
    </aside>
  );
}
