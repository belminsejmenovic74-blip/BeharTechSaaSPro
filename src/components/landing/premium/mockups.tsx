import type { CSSProperties, ReactNode } from "react";

import {
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  Menu,
  Package,
  QrCode,
  Search,
  Signal,
  Wifi,
  Wrench,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* DA Behar Tech Pro                                                    */
/* ------------------------------------------------------------------ */
export const DA = {
  bg: "#FFFFFF",
  text: "#101828",
  muted: "#667085",
  accent: "#2A9D8F",
  accentSoft: "#E9F5F2",
  card: "#FFFFFF",
  line: "rgba(16,24,40,0.08)",
  lineSoft: "rgba(16,24,40,0.05)",
};
const BORDER = `1px solid ${DA.line}`;
const SOFT_SHADOW = "0 20px 60px rgba(16,24,40,0.08)";

/* ------------------------------------------------------------------ */
/* Cadres premium réutilisables                                        */
/* ------------------------------------------------------------------ */

/** Fenêtre style macOS (barre + pastilles rouge/jaune/vert). */
export function BrowserFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 16,
        border: BORDER,
        background: DA.card,
        boxShadow: SOFT_SHADOW,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "11px 14px",
          borderBottom: `1px solid ${DA.lineSoft}`,
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "#FF5F57" }} />
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "#FEBC2E" }} />
        <span style={{ width: 11, height: 11, borderRadius: 99, background: "#28C840" }} />
      </div>
      {children}
    </div>
  );
}

/** Cadre iPhone (bezel sombre fin + encoche + barre d'accueil). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 300,
        maxWidth: "82vw",
        borderRadius: 46,
        padding: 10,
        background: "linear-gradient(160deg,#2b2b2e,#1c1c1f)",
        boxShadow: "0 30px 70px rgba(16,24,40,0.16), 0 10px 24px rgba(16,24,40,0.08)",
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: 38,
          background: DA.card,
          overflow: "hidden",
          aspectRatio: "300 / 620",
        }}
      >
        {/* encoche */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 96,
            height: 26,
            borderRadius: 99,
            background: "#111",
            zIndex: 5,
          }}
        />
        {/* barre statut */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px 6px",
            fontSize: 11,
            fontWeight: 600,
            color: DA.text,
          }}
        >
          <span>9:41</span>
          <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <Signal size={12} /> <Wifi size={12} />
          </span>
        </div>
        <div style={{ padding: "4px 14px 16px", height: "calc(100% - 40px)", overflow: "hidden" }}>{children}</div>
        {/* home indicator */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 5,
            borderRadius: 99,
            background: "rgba(16,24,40,0.22)",
          }}
        />
      </div>
    </div>
  );
}

/* petits helpers UI --------------------------------------------------- */
function Logo({ small = false }: { small?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 700,
        fontSize: small ? 11 : 13,
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
          letterSpacing: 0.5,
          border: `1px solid ${DA.accent}`,
          color: DA.accent,
          borderRadius: 5,
          padding: "1px 4px",
        }}
      >
        PRO
      </span>
    </span>
  );
}

function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "danger" }) {
  const map = {
    muted: { bg: "#F4F4F2", fg: DA.muted },
    accent: { bg: DA.accentSoft, fg: DA.accent },
    danger: { bg: "#FDECEC", fg: "#D2544B" },
  }[tone];
  return (
    <span
      style={{ fontSize: 10, fontWeight: 600, background: map.bg, color: map.fg, borderRadius: 6, padding: "2px 7px" }}
    >
      {children}
    </span>
  );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ border: BORDER, borderRadius: 12, background: DA.card, padding: 12, ...style }}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* MOCKUP — Dashboard (macOS)                                           */
/* ------------------------------------------------------------------ */
const NAV = [
  ["Tableau de bord", true],
  ["Réparations", false],
  ["Clients", false],
  ["Devis", false],
  ["Factures", false],
  ["Rendez-vous", false],
  ["Stock", false],
  ["Achats", false],
  ["Reconditionnement", false],
  ["Documents", false],
  ["Paramètres", false],
] as const;

export function DashboardMockup() {
  return (
    <BrowserFrame>
      <div style={{ display: "flex", height: 470, fontSize: 12, color: DA.text }}>
        {/* Sidebar */}
        <aside style={{ width: 168, flexShrink: 0, borderRight: `1px solid ${DA.lineSoft}`, padding: "14px 10px" }}>
          <div style={{ padding: "0 6px 12px" }}>
            <Logo small />
          </div>
          {NAV.map(([label, active]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                marginBottom: 1,
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: active ? 600 : 500,
                color: active ? DA.accent : DA.muted,
                background: active ? DA.accentSoft : "transparent",
              }}
            >
              <span
                style={{ width: 6, height: 6, borderRadius: 2, background: active ? DA.accent : "rgba(16,24,40,0.18)" }}
              />
              {label}
            </div>
          ))}
        </aside>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, padding: "16px 18px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Tableau de bord</div>
              <div style={{ color: DA.muted, fontSize: 11 }}>Vue d’ensemble de l’atelier.</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: BORDER,
                  borderRadius: 8,
                  padding: "5px 9px",
                  color: DA.muted,
                  fontSize: 11,
                }}
              >
                <Search size={12} /> Rechercher…
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: DA.accent,
                  color: "#fff",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                + Nouvelle prise en charge
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, margin: "14px 0" }}>
            {[
              ["CA facturé", "308,00 €", "7 derniers jours"],
              ["Marge nette", "0,00 €", "moyenne"],
              ["Achats", "40,00 €", "période"],
              ["CA en attente", "89,00 €", "à finaliser"],
            ].map(([k, v, s], i) => (
              <Card key={k as string} style={{ padding: 11 }}>
                <div style={{ color: DA.muted, fontSize: 10 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3, color: i === 3 ? DA.accent : DA.text }}>
                  {v}
                </div>
                <div style={{ color: DA.muted, fontSize: 9.5, marginTop: 2 }}>{s}</div>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 11.5 }}>D’où vient le CA</span>
              <span style={{ color: DA.muted, fontSize: 10 }}>Réparations · 100 %</span>
            </div>
            <svg viewBox="0 0 320 64" style={{ width: "100%", height: 56 }} preserveAspectRatio="none">
              <polyline
                points="0,48 46,40 92,44 138,26 184,32 230,16 276,22 320,10"
                fill="none"
                stroke={DA.accent}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ height: 8, borderRadius: 99, background: DA.accentSoft, marginTop: 12, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: DA.accent, borderRadius: 99 }} />
            </div>
          </Card>

          {/* À encaisser */}
          <Card
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 11.5 }}>À encaisser</div>
              <div style={{ color: DA.muted, fontSize: 10, marginTop: 2 }}>REP-0003 · Client comptoir 003</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 700 }}>89,00 €</span>
              <ChevronRight size={14} color={DA.muted} />
            </div>
          </Card>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ------------------------------------------------------------------ */
/* MOCKUP — Comptoir (tablette / grille de tuiles)                     */
/* ------------------------------------------------------------------ */
const COMPTOIR_TILES = [
  ["Nouvelle prise en charge", "Créer un dossier", Wrench],
  ["Rendez-vous du jour", "Consulter et poursuivre", Calendar],
  ["Scanner QR", "Ouvrir le hub scan", QrCode],
  ["Rechercher un dossier", "Client, téléphone, n°", Folder],
  ["Vente comptoir", "Vente réglée", Package],
  ["Devis", "Créer et envoyer", FileText],
] as const;

export function ComptoirMockup() {
  return (
    <BrowserFrame>
      <div style={{ padding: "18px 20px", height: 470, color: DA.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Logo small />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: DA.accent }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: DA.accent }} /> Session active
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Comptoir</div>
        <div style={{ color: DA.muted, fontSize: 11, marginBottom: 16 }}>
          Créer, retrouver ou poursuivre un dossier.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
          {COMPTOIR_TILES.map(([t, s, Ico]) => (
            <Card key={t as string} style={{ padding: 16, textAlign: "center" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: 34,
                  height: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  background: DA.accentSoft,
                  color: DA.accent,
                  marginBottom: 8,
                }}
              >
                <Ico size={17} />
              </span>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{t}</div>
              <div style={{ color: DA.muted, fontSize: 10, marginTop: 2 }}>{s}</div>
            </Card>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ------------------------------------------------------------------ */
/* MOCKUP — Mode atelier (kanban)                                      */
/* ------------------------------------------------------------------ */
const KANBAN = [
  ["Reçu", "0", []],
  ["Diagnostic", "0", []],
  ["En réparation", "1", ["iPhone 12", "Écran LCD"]],
  ["Test final", "1", ["iPhone 13", "Diagnostic"]],
  ["Prêt", "0", []],
] as const;

export function AtelierMockup() {
  return (
    <BrowserFrame>
      <div style={{ padding: "18px 20px", height: 470, color: DA.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Logo small />
          <Chip tone="accent">Mode atelier</Chip>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>File d’attente atelier</div>
        <div style={{ color: DA.muted, fontSize: 11, marginBottom: 14 }}>
          Reçu, diagnostic, réparation, test final et prêt.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {KANBAN.map(([col, count, items]) => (
            <div
              key={col as string}
              style={{
                background: "#FBFBFA",
                border: `1px solid ${DA.lineSoft}`,
                borderRadius: 10,
                padding: 8,
                minHeight: 220,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10.5,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                <span>{col}</span>
                <span style={{ color: DA.muted }}>{count}</span>
              </div>
              {(items as readonly string[]).length ? (
                <Card style={{ padding: 8 }}>
                  {(items as readonly string[]).map((it, i) => (
                    <div
                      key={it}
                      style={{
                        fontSize: 10,
                        fontWeight: i === 0 ? 600 : 400,
                        color: i === 0 ? DA.text : DA.muted,
                        marginBottom: 2,
                      }}
                    >
                      {it}
                    </div>
                  ))}
                  <div style={{ marginTop: 6 }}>
                    <Chip tone="danger">En retard</Chip>
                  </div>
                </Card>
              ) : (
                <div
                  style={{
                    border: `1px dashed ${DA.line}`,
                    borderRadius: 8,
                    padding: "10px 6px",
                    textAlign: "center",
                    color: DA.muted,
                    fontSize: 9.5,
                  }}
                >
                  Aucun dossier
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ------------------------------------------------------------------ */
/* MOCKUP — Mobile (accueil app)                                       */
/* ------------------------------------------------------------------ */
export function MobileMockup() {
  return (
    <PhoneFrame>
      <div style={{ color: DA.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <Logo small />
          <Menu size={16} color={DA.muted} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 12 }}>Tableau de bord</div>
        <div style={{ color: DA.muted, fontSize: 11 }}>Vue d’ensemble de l’atelier.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
          {(
            [
              ["Dossiers en cours", "2", Wrench],
              ["Reçus aujourd’hui", "0", FileText],
              ["Devis", "1", FileText],
              ["Documents", "0", FileText],
            ] as const
          ).map(([k, v, Ico]) => (
            <Card key={k as string} style={{ padding: 10 }}>
              <Ico size={15} color={DA.accent} />
              <div style={{ color: DA.muted, fontSize: 10, marginTop: 6 }}>{k}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div>
            </Card>
          ))}
        </div>
        <Card style={{ marginTop: 10, padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600 }}>
            <Wrench size={13} color={DA.accent} /> Pipeline réparations
          </div>
          <div style={{ height: 7, borderRadius: 99, background: DA.accentSoft, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: "70%", height: "100%", background: DA.accent }} />
          </div>
        </Card>
      </div>
    </PhoneFrame>
  );
}
