"use client";

import type { CSSProperties, ReactNode } from "react";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { DA } from "./mockups";
import s from "./premium.module.css";

export type ShellTab = { label: string; icon?: ReactNode };
export type FloatingCard = { icon: ReactNode; title: string; text: string; pos: "tl" | "bl" | "tr" | "br" };

const POS: Record<FloatingCard["pos"], CSSProperties> = {
  tl: { top: 8, left: -22 },
  bl: { bottom: 8, left: -22 },
  tr: { top: 8, right: -22 },
  br: { bottom: 8, right: -22 },
};

export function ShowcaseShell({
  id,
  brand = false,
  titleLines,
  accentSubtitle,
  description,
  leftTitle,
  benefits,
  tabs,
  active,
  setActive,
  tabStyle = "dots",
  children,
  floating,
}: {
  id?: string;
  brand?: boolean;
  titleLines: string[];
  accentSubtitle?: string;
  description?: string;
  leftTitle: string;
  benefits: string[];
  tabs: ShellTab[];
  active: number;
  setActive: (i: number) => void;
  tabStyle?: "dots" | "filled";
  children: ReactNode;
  floating?: FloatingCard[];
}) {
  const go = (d: number) => setActive((active + tabs.length + d) % tabs.length);

  return (
    <section id={id} style={{ padding: "clamp(64px,9vw,120px) 24px", scrollMarginTop: 96 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          {brand && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  color: DA.text,
                }}
              >
                BEHAR
                <span style={{ width: 4, height: 4, borderRadius: 99, background: DA.accent }} />
                TECH
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    border: `1px solid ${DA.accent}`,
                    color: DA.accent,
                    borderRadius: 5,
                    padding: "1px 4px",
                  }}
                >
                  PRO
                </span>
              </span>
            </div>
          )}
          <h2
            style={{
              fontSize: "clamp(30px,4.4vw,52px)",
              fontWeight: 700,
              letterSpacing: -1,
              lineHeight: 1.05,
              color: DA.text,
              margin: 0,
            }}
          >
            {titleLines.map((l) => (
              <span key={l} style={{ display: "block" }}>
                {l}
              </span>
            ))}
          </h2>
          {accentSubtitle && (
            <p style={{ color: DA.accent, fontWeight: 600, fontSize: 18, marginTop: 16 }}>{accentSubtitle}</p>
          )}
          {description && (
            <p style={{ color: DA.muted, fontSize: 17, marginTop: 10, lineHeight: 1.55 }}>{description}</p>
          )}
        </div>

        {/* Body */}
        <div className={s.grid} style={{ marginTop: "clamp(40px,5vw,72px)" }}>
          {/* Left benefits */}
          <aside className={s.left}>
            <h3 style={{ color: DA.accent, fontWeight: 700, fontSize: 17, margin: "0 0 18px" }}>{leftTitle}</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 15 }}>
              {benefits.map((b) => (
                <li
                  key={b}
                  style={{ display: "flex", gap: 11, alignItems: "flex-start", color: DA.text, fontSize: 14.5 }}
                >
                  <span
                    style={{
                      marginTop: 1,
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: 99,
                      background: DA.accent,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </aside>

          {/* Center stage */}
          <div className={s.stage} style={{ position: "relative" }}>
            <button aria-label="Précédent" onClick={() => go(-1)} className={`${s.arrow} ${s.arrowLeft}`} type="button">
              <ArrowLeft size={18} />
            </button>
            <button aria-label="Suivant" onClick={() => go(1)} className={`${s.arrow} ${s.arrowRight}`} type="button">
              <ArrowRight size={18} />
            </button>
            <div style={{ position: "relative", display: "flex", justifyContent: "center", width: "100%" }}>
              {children}
              {floating && (
                <div className={s.floating} aria-hidden>
                  {floating.map((c) => (
                    <article key={c.title} style={{ ...POS[c.pos] }} className={s.floatingCard}>
                      <span style={{ color: DA.accent, display: "inline-flex" }}>{c.icon}</span>
                      <strong style={{ display: "block", fontSize: 12.5, color: DA.text, marginTop: 6 }}>
                        {c.title}
                      </strong>
                      <span style={{ display: "block", fontSize: 11, color: DA.muted, marginTop: 2, lineHeight: 1.35 }}>
                        {c.text}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right tabs */}
          <nav className={s.right}>
            {tabs.map((t, i) => {
              const on = i === active;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setActive(i)}
                  className={s.tab}
                  style={{
                    background: on && tabStyle === "filled" ? DA.accent : DA.card,
                    borderColor: on ? DA.accent : DA.line,
                    color: on && tabStyle === "filled" ? "#fff" : on ? DA.text : DA.muted,
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {tabStyle === "dots" ? (
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: on ? DA.accent : "#D3D3D0" }} />
                  ) : (
                    t.icon
                  )}
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 40 }}>
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              aria-label={`Écran ${i + 1}`}
              onClick={() => setActive(i)}
              style={{
                height: 8,
                width: i === active ? 24 : 8,
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                background: i === active ? DA.accent : "#D3D3D0",
                transition: "all .2s",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
