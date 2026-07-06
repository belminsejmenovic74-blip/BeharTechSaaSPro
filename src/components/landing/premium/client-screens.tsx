import type { CSSProperties, ReactNode } from "react";

import {
  ArrowLeft,
  BadgeCheck,
  Battery,
  Camera,
  Check,
  Mail,
  MessageSquare,
  ShieldCheck,
  Star,
  Wifi,
} from "lucide-react";

import { DA, PhoneFrame } from "./mockups";

const BORDER = `1px solid ${DA.line}`;

function Logo() {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 11, color: DA.text }}
    >
      BEHAR
      <span style={{ width: 3, height: 3, borderRadius: 99, background: DA.accent }} />
      TECH
      <span
        style={{
          fontSize: 7,
          fontWeight: 700,
          border: `1px solid ${DA.accent}`,
          color: DA.accent,
          borderRadius: 4,
          padding: "1px 3px",
        }}
      >
        PRO
      </span>
    </span>
  );
}
function Box({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ border: BORDER, borderRadius: 12, background: DA.card, padding: 10, ...style }}>{children}</div>;
}
function Head() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
      <Logo />
      <span
        style={{
          width: 22,
          height: 22,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: BORDER,
          borderRadius: 7,
        }}
      >
        <ArrowLeft size={12} color={DA.muted} />
      </span>
    </div>
  );
}

/* 1 — Suivi de réparation ------------------------------------------------ */
const STEPS = [
  ["Reçu", "07 mai · 09:12", "done"],
  ["Diagnostic", "07 mai · 11:04", "done"],
  ["Devis validé", "07 mai · 14:30", "done"],
  ["En réparation", "08 mai · 10:15", "current"],
  ["Prêt à récupérer", "Étape à venir", "todo"],
] as const;

export function PhoneSuivi() {
  return (
    <PhoneFrame>
      <Head />
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10, color: DA.text }}>Suivi de réparation</div>
      <div style={{ color: DA.muted, fontSize: 10, marginBottom: 8 }}>Nous vous tenons informé à chaque étape.</div>

      <Box style={{ display: "flex", gap: 8, fontSize: 9.5 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: DA.muted }}>Réf.</div>
          <div style={{ fontWeight: 600, color: DA.text }}>BT-2026-4587</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: DA.muted }}>Appareil</div>
          <div style={{ fontWeight: 600, color: DA.text }}>iPhone 13</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: DA.muted }}>Statut</div>
          <div style={{ fontWeight: 600, color: DA.accent }}>En réparation</div>
        </div>
      </Box>

      <Box style={{ marginTop: 8 }}>
        {STEPS.map(([label, time, state], i) => (
          <div
            key={label}
            style={{ display: "flex", gap: 8, position: "relative", paddingBottom: i < STEPS.length - 1 ? 10 : 0 }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 99,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: state === "todo" ? "#F0F0EE" : DA.accent,
                  color: "#fff",
                  fontSize: 8,
                  fontWeight: 700,
                }}
              >
                {state === "done" ? <Check size={10} /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  style={{ width: 2, flex: 1, background: state === "todo" ? "#EDEDEB" : DA.accent, marginTop: 2 }}
                />
              )}
            </div>
            <div style={{ marginTop: -1 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: state === "current" ? DA.accent : state === "todo" ? DA.muted : DA.text,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 9, color: DA.muted }}>{time}</div>
            </div>
          </div>
        ))}
      </Box>

      <Box style={{ marginTop: 8, display: "flex", gap: 8 }}>
        {(
          [
            [MessageSquare, "SMS envoyé"],
            [Mail, "Email envoyé"],
          ] as const
        ).map(([Ico, t]) => {
          const I = Ico;
          return (
            <div key={t as string} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 9.5 }}>
              <I size={12} color={DA.accent} />
              <span style={{ color: DA.text }}>{t}</span>
            </div>
          );
        })}
      </Box>
    </PhoneFrame>
  );
}

/* 2 — Téléphone reconditionné ------------------------------------------- */
export function PhoneReconditionne() {
  return (
    <PhoneFrame>
      <Head />
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10 }}>Mon appareil reconditionné</div>
      <div style={{ color: DA.muted, fontSize: 10, marginBottom: 8 }}>Tests et informations de votre appareil.</div>

      <Box style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            width: 46,
            height: 62,
            borderRadius: 8,
            background: "linear-gradient(160deg,#2f5d4f,#24463b)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>iPhone 13 · 128 Go</div>
          <div style={{ fontSize: 9.5, color: DA.accent, marginTop: 1 }}>● Vert</div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 9 }}>
            <div>
              <div style={{ color: DA.muted }}>Grade</div>
              <div style={{ fontWeight: 600 }}>Premium</div>
            </div>
            <div>
              <div style={{ color: DA.muted }}>Batterie</div>
              <div style={{ fontWeight: 600 }}>100 %</div>
            </div>
            <div>
              <div style={{ color: DA.muted }}>Garantie</div>
              <div style={{ fontWeight: 600 }}>12 mois</div>
            </div>
          </div>
        </div>
      </Box>

      <Box style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 99,
            background: DA.accentSoft,
            color: DA.accent,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldCheck size={16} />
        </span>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 600 }}>Appareil vérifié et prêt à l’emploi</div>
          <div style={{ fontSize: 9, color: DA.muted }}>80 points de contrôle validés.</div>
        </div>
      </Box>

      <Box style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, marginBottom: 8 }}>Certificat de contrôle</div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {[Camera, Battery, Wifi, ShieldCheck, BadgeCheck].map((Ico, i) => (
            <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Ico size={13} color={DA.muted} />
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 99,
                  background: DA.accent,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={8} color="#fff" />
              </span>
            </span>
          ))}
        </div>
      </Box>
    </PhoneFrame>
  );
}

/* 3 — SMS & email (écran verrouillé) ------------------------------------ */
export function PhoneSms() {
  return (
    <PhoneFrame>
      <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        <div style={{ textAlign: "center", marginTop: -30 }}>
          <div style={{ fontSize: 40, fontWeight: 300, letterSpacing: -1, color: DA.text }}>9:41</div>
          <div style={{ fontSize: 12, color: DA.muted }}>Mardi 27 mai</div>
        </div>
        {[
          [MessageSquare, "#34C759", "SMS"],
          [Mail, "#0A84FF", "Mail"],
        ].map(([Ico, color, tag]) => {
          const I = Ico as typeof Mail;
          return (
            <div
              key={tag as string}
              style={{
                background: "rgba(255,255,255,0.82)",
                backdropFilter: "blur(6px)",
                border: BORDER,
                borderRadius: 16,
                padding: 10,
                display: "flex",
                gap: 9,
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: color as string,
                  color: "#fff",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <I size={14} />
              </span>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: DA.text }}>Behar Tech Pro</div>
                <div style={{ fontSize: 9.5, color: DA.text, marginTop: 1, lineHeight: 1.3 }}>
                  Votre iPhone 13 est prêt à être récupéré. Vous pouvez passer à l’atelier.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PhoneFrame>
  );
}

/* 4 — Avis Google -------------------------------------------------------- */
export function PhoneAvis() {
  return (
    <PhoneFrame>
      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, fontWeight: 500, color: DA.text }}>
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </span>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 99,
              background: "#2540c9",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
            }}
          >
            S
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 10 }}>Donner un avis</div>
        <Box style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <Logo />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Behar Tech Pro</span>
        </Box>
        <div style={{ textAlign: "center", marginTop: 12, color: DA.muted, fontSize: 10 }}>
          Évaluez votre expérience
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={22} fill="#FBBC05" color="#FBBC05" />
          ))}
        </div>
        <div style={{ textAlign: "center", color: "#1A73E8", fontSize: 11, fontWeight: 600, marginTop: 4 }}>
          Excellent
        </div>
        <Box style={{ marginTop: 10, fontSize: 10, color: DA.text, lineHeight: 1.4 }}>
          Service rapide, suivi clair et très professionnel. Je recommande.
        </Box>
        <div
          style={{
            marginTop: 10,
            background: "#1A73E8",
            color: "#fff",
            textAlign: "center",
            borderRadius: 10,
            padding: "9px 0",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Publier
        </div>
      </div>
    </PhoneFrame>
  );
}
