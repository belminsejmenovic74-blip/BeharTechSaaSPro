// Documents imprimables de reconditionnement : Certificat, Bon de sortie, Étiquette stock.
// Présentation pure (props = données + QR). Styles inline (hex) pour une impression / PDF fidèles.

import { formatEuro } from "@/lib/behar-store";
import type { CertificateData, ControlStatus } from "@/lib/reconditioning-certificate";
import { stockRef } from "@/lib/reconditioning-certificate";

import { BeharLogo } from "./behar-logo";

const C = {
  ink: "#1A1916",
  muted: "#6B6B6B",
  faint: "#8A8A85",
  accent: "#2A9D8F",
  accentDark: "#167B70",
  line: "#E8E8E5",
  hair: "#FFFFFF",
  soft: "#FFFFFF",
  accentSoft: "#FFFFFF",
  amber: "#9A6B1B",
  amberSoft: "#FFFFFF",
};

const dateFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(d);
};
const dateTimeFr = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(d);
};
const val = (v: string | number | null | undefined, fallback = "—") => {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
};

const STATUS_STYLE: Record<ControlStatus, { bg: string; fg: string; label: string }> = {
  validé: { bg: C.accentSoft, fg: C.accentDark, label: "Validé" },
  "à signaler": { bg: C.amberSoft, fg: C.amber, label: "À signaler" },
  "non testé": { bg: "#FFFFFF", fg: C.faint, label: "Non testé" },
};

function StatusPill({ status }: Readonly<{ status: ControlStatus }>) {
  const s = STATUS_STYLE[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        padding: "0 9px",
        borderRadius: 7,
        background: s.bg,
        color: s.fg,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

function InfoCell({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${C.hair}` }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 2 }}>{label}</div>
      <div style={{ color: C.ink, fontSize: 13.5, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function DocHeader({ kicker, refLabel, refValue, dateIso }: Readonly<{ kicker: string; refLabel: string; refValue: string; dateIso: string }>) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
      <div>
        <BeharLogo size="md" />
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: C.muted, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{kicker}</div>
        <div style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, monospace", marginTop: 3 }}>{refValue}</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{dateFr(dateIso)}</div>
        <div style={{ color: C.faint, fontSize: 10, marginTop: 1 }}>{refLabel}</div>
      </div>
    </div>
  );
}

function ScoreBand({ data }: Readonly<{ data: CertificateData }>) {
  const items = [
    { label: "Points validés", value: `${data.validatedPoints} / ${data.protocolPoints}` },
    { label: "Grade", value: `${data.grade} · ${data.gradeLabel}` },
    { label: "Batterie", value: data.batteryHealth != null ? `${data.batteryHealth} %` : "—" },
    { label: "Défauts restants", value: data.defects.length ? `${data.defects.length}` : "Aucun" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
      {items.map((item, i) => (
        <div key={item.label} style={{ padding: "12px 14px", borderLeft: i === 0 ? "none" : `1px solid ${C.line}`, background: "#fff" }}>
          <div style={{ color: C.muted, fontSize: 10.5 }}>{item.label}</div>
          <div style={{ color: C.ink, fontSize: 16, fontWeight: 700, marginTop: 3 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function QrBlock({ qr, caption }: Readonly<{ qr: string; caption: string }>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      {qr ? (
        <img alt="QR certificat" src={qr} style={{ width: 96, height: 96, borderRadius: 8, border: `1px solid ${C.line}` }} />
      ) : (
        <div style={{ width: 96, height: 96, borderRadius: 8, border: `1px solid ${C.line}`, background: C.soft }} />
      )}
      <div style={{ color: C.muted, fontSize: 10, textAlign: "center", maxWidth: 120 }}>{caption}</div>
    </div>
  );
}

/* ════════════════════════════ A. Certificat ════════════════════════════ */

export function CertificatePrintable({ data, qr }: Readonly<{ data: CertificateData; qr: string }>) {
  const device = [data.brand, data.model].filter(Boolean).join(" ");
  const left = data.controls.slice(0, 9);
  const right = data.controls.slice(9);
  return (
    <div style={{ background: "#fff", color: C.ink, padding: 40, fontFamily: "Inter, system-ui, sans-serif", width: "100%", boxSizing: "border-box" }}>
      <DocHeader dateIso={data.date} kicker="Certificat de reconditionnement" refLabel="Référence" refValue={data.ref} />

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: "26px 0 4px" }}>Certificat de reconditionnement</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
        Appareil contrôlé, testé et reconditionné en atelier — {data.workshopName}.
      </p>

      <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32 }}>
        <div>
          <InfoCell label="Appareil" value={device || "—"} />
          <InfoCell label="Capacité" value={val(data.storage)} />
          <InfoCell label="Couleur" value={val(data.color)} />
          <InfoCell label="IMEI / Série" value={val(data.imei)} />
        </div>
        <div>
          <InfoCell label="Grade / État" value={`${data.grade} · ${data.gradeLabel}`} />
          <InfoCell label="Prix de vente" value={formatEuro(data.price)} />
          <InfoCell label="Garantie" value={`${data.warrantyMonths} mois`} />
          <InfoCell label="Accessoires inclus" value={val(data.accessories, "Aucun")} />
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <ScoreBand data={data} />
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionLabel>Détail des contrôles</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32, marginTop: 10 }}>
          {[left, right].map((group, gi) => (
            <div key={gi}>
              {group.map((c) => (
                <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.hair}` }}>
                  <span style={{ fontSize: 13, color: C.ink }}>{c.label}</span>
                  <StatusPill status={c.status} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {data.defects.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionLabel>Défauts restants</SectionLabel>
          <ul style={{ margin: "10px 0 0", paddingLeft: 0, listStyle: "none" }}>
            {data.defects.map((d) => (
              <li key={d} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.ink, padding: "3px 0" }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.amber, flexShrink: 0 }} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 140px", gap: 24, alignItems: "end", borderTop: `1px solid ${C.line}`, paddingTop: 22 }}>
        <div>
          <SectionLabel>Résumé atelier</SectionLabel>
          <p style={{ color: C.ink, fontSize: 13, lineHeight: 1.5, margin: "8px 0 18px" }}>{data.summary}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 99, background: C.accentSoft, color: C.accentDark, fontSize: 14 }}>✓</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Contrôle qualité validé</div>
              <div style={{ fontSize: 11, color: C.muted }}>{data.technician} · {dateTimeFr(data.date)}</div>
            </div>
          </div>
        </div>
        <QrBlock caption="Scannez pour vérifier ce certificat en ligne" qr={qr} />
      </div>

      <div style={{ marginTop: 24, color: C.faint, fontSize: 10.5, textAlign: "center" }}>
        {data.workshopName} · Certificat n° {data.ref} · Document généré automatiquement, vérifiable via le QR code.
      </div>
    </div>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div style={{ color: C.accentDark, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{children}</div>
  );
}

/* ════════════════════════════ B. Bon de sortie ════════════════════════════ */

export function BonSortiePrintable({ data, qr }: Readonly<{ data: CertificateData; qr: string }>) {
  const device = [data.brand, data.model].filter(Boolean).join(" ");
  return (
    <div style={{ background: "#fff", color: C.ink, padding: 40, fontFamily: "Inter, system-ui, sans-serif", width: "100%", boxSizing: "border-box" }}>
      <DocHeader dateIso={data.date} kicker="Bon de sortie reconditionnement" refLabel="Référence" refValue={data.ref} />

      <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", margin: "24px 0 4px" }}>Bon de sortie reconditionnement</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Résumé du reconditionnement remis avec l'appareil.</p>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32 }}>
        <div>
          <InfoCell label="Appareil" value={device || "—"} />
          <InfoCell label="Capacité / Couleur" value={[data.storage, data.color].filter(Boolean).join(" · ") || "—"} />
          <InfoCell label="IMEI / Série" value={val(data.imei)} />
          <InfoCell label="Accessoires inclus" value={val(data.accessories, "Aucun")} />
        </div>
        <div>
          <InfoCell label="Grade / État" value={`${data.grade} · ${data.gradeLabel}`} />
          <InfoCell label="Prix de vente" value={formatEuro(data.price)} />
          <InfoCell label="Garantie" value={`${data.warrantyMonths} mois`} />
          <InfoCell label="Batterie" value={data.batteryHealth != null ? `${data.batteryHealth} %` : "—"} />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <ScoreBand data={data} />
      </div>

      {data.defects.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Défauts restants</SectionLabel>
          <ul style={{ margin: "8px 0 0", paddingLeft: 0, listStyle: "none" }}>
            {data.defects.map((d) => (
              <li key={d} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.ink, padding: "3px 0" }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.amber, flexShrink: 0 }} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 140px", gap: 24, alignItems: "end", borderTop: `1px solid ${C.line}`, paddingTop: 20 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 99, background: C.accentSoft, color: C.accentDark, fontSize: 14 }}>✓</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Reconditionnement validé en atelier</div>
            <div style={{ fontSize: 11, color: C.muted }}>{data.technician} · {data.workshopName}</div>
          </div>
        </div>
        <QrBlock caption="Certificat complet en ligne" qr={qr} />
      </div>
    </div>
  );
}

/* ════════════════════════════ C. Étiquette stock ════════════════════════════ */

export function EtiquetteStockPrintable({ data, qr }: Readonly<{ data: CertificateData; qr: string }>) {
  const device = [data.brand, data.model].filter(Boolean).join(" ");
  return (
    <div
      style={{
        background: "#fff",
        color: C.ink,
        width: 320,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        padding: 18,
        fontFamily: "Inter, system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BeharLogo size="sm" />
        <span style={{ fontSize: 10, color: C.muted, fontFamily: "ui-monospace, monospace" }}>#{stockRef(data.ref)}</span>
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{device || "Appareil"}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{[data.storage, data.color].filter(Boolean).join(" · ") || "—"}</div>

          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 8px", borderRadius: 6, background: C.accentSoft, color: C.accentDark, fontSize: 11, fontWeight: 700 }}>
              Grade {data.grade}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>{data.gradeLabel}</span>
          </div>

          <div style={{ marginTop: 12, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{formatEuro(data.price)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Garantie {data.warrantyMonths} mois · Testé sur {data.protocolPoints} points
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: "center" }}>
          {qr ? (
            <img alt="QR" src={qr} style={{ width: 76, height: 76, borderRadius: 6, border: `1px solid ${C.line}` }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 6, border: `1px solid ${C.line}`, background: C.soft }} />
          )}
          <div style={{ fontSize: 9, color: C.faint, marginTop: 4 }}>Certificat</div>
        </div>
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.hair}`, display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint }}>
        <span>Réf. stock {data.ref}</span>
        <span>{data.workshopName}</span>
      </div>
    </div>
  );
}
