import type { CSSProperties, ReactNode } from "react";

import { ArrowRight, Check, FileText, Link2, Sparkles, Tag, UploadCloud } from "lucide-react";

import { DA } from "./premium/mockups";
import s from "./premium/premium.module.css";

const BORDER = `1px solid ${DA.line}`;

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ border: BORDER, borderRadius: 14, background: "#FBFBFA", padding: 14, ...style }}>{children}</div>
  );
}
function Step({ n, title }: { n: number; title: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <span
        style={{
          display: "inline-flex",
          width: 28,
          height: 28,
          borderRadius: 99,
          background: DA.accent,
          color: "#fff",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 600, color: DA.text, lineHeight: 1.3 }}>{title}</div>
    </div>
  );
}
function FlowArrow() {
  return (
    <div className={s.ocrArrow} style={{ alignSelf: "center", color: "rgba(26,25,22,0.25)", paddingTop: 40 }}>
      <ArrowRight size={22} />
    </div>
  );
}

/** Section « IA & documents OCR » — flow recréé en vrai code. */
export function OcrDocumentsSection() {
  return (
    <section id="ocr" style={{ padding: "clamp(64px,9vw,120px) 24px", scrollMarginTop: 96 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        {/* Badge « Grâce à l'IA Amazon » */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: BORDER,
              background: DA.card,
              borderRadius: 99,
              padding: "8px 14px",
              fontSize: 13,
              color: DA.text,
              boxShadow: "0 8px 20px rgba(26,25,22,0.05)",
            }}
          >
            <span style={{ fontWeight: 800, color: "#111" }}>a</span>
            <span style={{ color: DA.muted }}>Grâce à l’IA Amazon</span>
          </span>
        </div>

        {/* Carte principale */}
        <div
          style={{
            border: BORDER,
            borderRadius: 26,
            background: DA.card,
            boxShadow: "0 20px 60px rgba(26,25,22,0.08)",
            padding: "clamp(24px,3.5vw,44px)",
          }}
        >
          {/* En-tête */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: 14 }}>
              <span
                style={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: 12,
                  background: DA.accentSoft,
                  color: DA.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} />
              </span>
              <div>
                <h2 style={{ fontSize: "clamp(22px,2.6vw,30px)", fontWeight: 700, color: DA.text, margin: 0 }}>
                  IA &amp; documents OCR
                </h2>
                <p style={{ color: DA.muted, fontSize: 15, marginTop: 6, maxWidth: 620, lineHeight: 1.5 }}>
                  Déposez votre facture fournisseur et créez votre stock automatiquement grâce à l’IA Amazon.
                </p>
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: `1px solid ${DA.accent}`,
                color: DA.accent,
                borderRadius: 99,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
              }}
            >
              PREMIUM
            </span>
          </div>

          {/* Flow 3 colonnes */}
          <div className={s.ocrFlow} style={{ marginTop: 34 }}>
            {/* Colonne 1 — Facture */}
            <div>
              <Step n={1} title="Déposez votre facture fournisseur" />
              <Panel>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: DA.muted }}>
                  FACTURE FOURNISSEUR
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: DA.accent,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      lineHeight: 1,
                    }}
                  >
                    GSM
                  </span>
                  <div style={{ flex: 1, fontSize: 10.5 }}>
                    <div style={{ fontWeight: 700, color: DA.text }}>GSM Parts</div>
                    <div style={{ color: DA.muted, fontSize: 9.5 }}>75011 Paris, France</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 9.5, color: DA.muted }}>
                    <div style={{ fontWeight: 600, color: DA.text }}>F-2026-0712</div>
                    <div>03 juil. 2026</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, borderTop: `1px solid ${DA.line}`, paddingTop: 8 }}>
                  {[
                    ["Écran iPhone 13", "2", "90,00 €"],
                    ["Batterie iPhone 13", "3", "72,00 €"],
                    ["Connecteur de charge", "5", "42,50 €"],
                  ].map(([d, q, t]) => (
                    <div
                      key={d}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: DA.text,
                        padding: "3px 0",
                      }}
                    >
                      <span>{d}</span>
                      <span style={{ color: DA.muted }}>×{q}</span>
                      <span style={{ fontWeight: 600 }}>{t}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      fontWeight: 700,
                      color: DA.text,
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: `1px solid ${DA.line}`,
                    }}
                  >
                    <span>TOTAL</span>
                    <span>204,50 €</span>
                  </div>
                </div>
              </Panel>
              <div
                style={{
                  border: `1px dashed ${DA.line}`,
                  borderRadius: 12,
                  padding: "14px 12px",
                  marginTop: 10,
                  textAlign: "center",
                  color: DA.muted,
                }}
              >
                <UploadCloud size={18} style={{ marginBottom: 4 }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: DA.text }}>Glissez-déposez votre facture</div>
                <div style={{ fontSize: 10 }}>PDF, JPG ou PNG</div>
              </div>
            </div>

            <FlowArrow />

            {/* Colonne 2 — Extraction */}
            <div>
              <Step n={2} title="Les données sont extraites grâce à l’IA Amazon" />
              <Panel>
                {[
                  ["Fournisseur", "GSM Parts"],
                  ["N° facture", "F-2026-0712"],
                  ["Date", "03/07/2026"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, padding: "4px 0" }}
                  >
                    <span style={{ color: DA.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, color: DA.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, borderTop: `1px solid ${DA.line}`, paddingTop: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.4,
                      color: DA.muted,
                      marginBottom: 4,
                    }}
                  >
                    <span>PIÈCE</span>
                    <span>PRIX · RÉF.</span>
                  </div>
                  {[
                    ["Écran iPhone 13", "45,00 € · IP13-LCD"],
                    ["Batterie iPhone 13", "24,00 € · IP13-BAT"],
                    ["Connecteur de charge", "8,50 € · IP13-CHG"],
                  ].map(([p, r]) => (
                    <div
                      key={p}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        padding: "3px 0",
                        color: DA.text,
                      }}
                    >
                      <span>{p}</span>
                      <span style={{ color: DA.muted }}>{r}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  color: DA.accent,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <Sparkles size={14} /> Extraction réussie
              </div>
            </div>

            <FlowArrow />

            {/* Colonne 3 — Stock */}
            <div>
              <Step n={3} title="Le stock est créé automatiquement" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Écran iPhone 13", "IP13-LCD", "45,00 €", "2"],
                  ["Batterie iPhone 13", "IP13-BAT", "24,00 €", "3"],
                  ["Connecteur de charge", "IP13-CHG", "8,50 €", "5"],
                ].map(([name, ref, price, stock]) => (
                  <div
                    key={name}
                    style={{
                      border: BORDER,
                      borderRadius: 12,
                      background: DA.card,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: 10.5 }}>
                      <div style={{ fontWeight: 600, color: DA.text }}>{name}</div>
                      <div style={{ color: DA.muted, fontSize: 9.5 }}>
                        Réf. {ref} · Stock : {stock}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: DA.text, textAlign: "right" }}>
                      {price}
                      <div style={{ fontSize: 8.5, fontWeight: 500, color: DA.muted }}>Prix d’achat</div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 10,
                  background: DA.accentSoft,
                  color: DA.accent,
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <FileText size={14} /> Facture F-2026-0712 liée
              </div>
            </div>
          </div>

          {/* Bénéfices */}
          <div className={s.ocrBenefits} style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${DA.line}` }}>
            {[
              [Check, "Stock créé automatiquement"],
              [Tag, "Prix d’achat enregistrés"],
              [Link2, "Références liées à la facture"],
            ].map(([Ico, label]) => {
              const I = Ico as typeof Check;
              return (
                <div
                  key={label as string}
                  style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 99,
                      background: DA.accentSoft,
                      color: DA.accent,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <I size={14} />
                  </span>
                  <span style={{ fontSize: 13.5, color: DA.text, fontWeight: 500 }}>{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
