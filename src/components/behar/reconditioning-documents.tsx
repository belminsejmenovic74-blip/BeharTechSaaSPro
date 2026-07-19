// Documents imprimables de reconditionnement : Certificat, Bon de sortie, Étiquette stock, Bon d'achat.
// Présentation pure (props = données + QR). Styles inline (hex) pour une impression / PDF fidèles.

import { formatEuro } from "@/lib/behar-store";
import type { CertificateData, ControlStatus } from "@/lib/reconditioning-certificate";
import { stockRef, WORKSHOP_NAME } from "@/lib/reconditioning-certificate";
import type { ReconditioningFile } from "@/lib/reconditioning-store";

import { BeharLogo } from "./behar-logo";

const C = {
  ink: "#101828",
  muted: "#667085",
  faint: "#98A2B3",
  accent: "#2A9D8F",
  accentDark: "#167B70",
  line: "#E4E7EC",
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
  return Number.isNaN(d.getTime())
    ? "—"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(d);
};
const val = (v: string | number | null | undefined, fallback = "—") => {
  if (v === null || v === undefined || v === "") return fallback;
  return String(v);
};

const STATUS_STYLE: Record<ControlStatus, { bg: string; fg: string; label: string }> = {
  validé: { bg: C.accentSoft, fg: C.accentDark, label: "Validé" },
  "à signaler": { bg: C.amberSoft, fg: C.amber, label: "À signaler" },
  "non testé": { bg: "#FFFFFF", fg: C.faint, label: "Non testé" },
  "non applicable": { bg: "#FFFFFF", fg: C.muted, label: "Non applicable" },
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

function DocHeader({
  kicker,
  refLabel,
  refValue,
  dateIso,
}: Readonly<{ kicker: string; refLabel: string; refValue: string; dateIso: string }>) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
      <div>
        <BeharLogo size="md" />
      </div>
      <div style={{ textAlign: "right" }}>
        <div
          style={{ color: C.muted, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}
        >
          {kicker}
        </div>
        <div
          style={{ color: C.ink, fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, monospace", marginTop: 3 }}
        >
          {refValue}
        </div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{dateFr(dateIso)}</div>
        <div style={{ color: C.faint, fontSize: 10, marginTop: 1 }}>{refLabel}</div>
      </div>
    </div>
  );
}

function ScoreBand({ data }: Readonly<{ data: CertificateData }>) {
  const items = [
    { label: "Points contrôlés", value: `${data.validatedPoints} / ${data.protocolPoints}` },
    { label: "Grade", value: `${data.grade} · ${data.gradeLabel}` },
    { label: "Batterie", value: data.batteryHealth != null ? `${data.batteryHealth} %` : "—" },
    { label: "Défauts restants", value: data.defects.length ? `${data.defects.length}` : "Aucun" },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          style={{ padding: "12px 14px", borderLeft: i === 0 ? "none" : `1px solid ${C.line}`, background: "#fff" }}
        >
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
        <img
          alt="QR certificat"
          src={qr}
          style={{ width: 96, height: 96, borderRadius: 8, border: `1px solid ${C.line}` }}
        />
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
    <div
      style={{
        background: "#fff",
        color: C.ink,
        padding: 40,
        fontFamily: "Inter, system-ui, sans-serif",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <DocHeader
        dateIso={data.date}
        kicker="Certificat de reconditionnement"
        refLabel="Référence"
        refValue={data.ref}
      />

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: "26px 0 4px" }}>
        Certificat de reconditionnement
      </h1>
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
                <div
                  key={c.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 0",
                    borderBottom: `1px solid ${C.hair}`,
                  }}
                >
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
              <li
                key={d}
                style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.ink, padding: "3px 0" }}
              >
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.amber, flexShrink: 0 }} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          marginTop: 26,
          display: "grid",
          gridTemplateColumns: "1fr 140px",
          gap: 24,
          alignItems: "end",
          borderTop: `1px solid ${C.line}`,
          paddingTop: 22,
        }}
      >
        <div>
          <SectionLabel>Résumé atelier</SectionLabel>
          <p style={{ color: C.ink, fontSize: 13, lineHeight: 1.5, margin: "8px 0 18px" }}>{data.summary}</p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: 99,
                background: C.accentSoft,
                color: C.accentDark,
                fontSize: 14,
              }}
            >
              ✓
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Contrôle qualité validé</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {data.technician} · {dateTimeFr(data.date)}
              </div>
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
    <div
      style={{
        color: C.accentDark,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

/* ════════════════════════════ B. Bon de sortie ════════════════════════════ */

export function BonSortiePrintable({ data, qr }: Readonly<{ data: CertificateData; qr: string }>) {
  const device = [data.brand, data.model].filter(Boolean).join(" ");
  return (
    <div
      style={{
        background: "#fff",
        color: C.ink,
        padding: 40,
        fontFamily: "Inter, system-ui, sans-serif",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <DocHeader
        dateIso={data.date}
        kicker="Bon de sortie reconditionnement"
        refLabel="Référence"
        refValue={data.ref}
      />

      <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", margin: "24px 0 4px" }}>
        Bon de sortie reconditionnement
      </h1>
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
              <li
                key={d}
                style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: C.ink, padding: "3px 0" }}
              >
                <span style={{ width: 5, height: 5, borderRadius: 99, background: C.amber, flexShrink: 0 }} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 140px",
          gap: 24,
          alignItems: "end",
          borderTop: `1px solid ${C.line}`,
          paddingTop: 20,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 26,
              height: 26,
              borderRadius: 99,
              background: C.accentSoft,
              color: C.accentDark,
              fontSize: 14,
            }}
          >
            ✓
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Reconditionnement validé en atelier</div>
            <div style={{ fontSize: 11, color: C.muted }}>
              {data.technician} · {data.workshopName}
            </div>
          </div>
        </div>
        <QrBlock caption="Certificat complet en ligne" qr={qr} />
      </div>
    </div>
  );
}

/* ════════════════════════════ C. Étiquette stock ════════════════════════════ */

export function EtiquetteInternePrintable({ file, qr }: Readonly<{ file: ReconditioningFile; qr: string }>) {
  const device = [file.brand, file.model].filter(Boolean).join(" ") || "Appareil";
  const detail = [file.storage, file.color].filter(Boolean).join(" · ") || "À compléter";
  const boughtAt = dateFr(file.receivedAt || file.createdAt);
  const problem = file.originalEstimation?.defects?.[0] || file.observations || "À compléter";
  return (
    <div
      style={{
        width: "70mm",
        minHeight: "40mm",
        background: "#fff",
        border: `1px solid ${C.line}`,
        borderRadius: "3mm",
        padding: "4mm",
        boxSizing: "border-box",
        color: C.ink,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "3mm" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 14, fontWeight: 800 }}>{file.number}</div>
          <div style={{ marginTop: "2mm", fontSize: 12, fontWeight: 800, lineHeight: 1.1 }}>{device}</div>
          <div style={{ marginTop: 2, fontSize: 10, color: C.muted }}>{detail}</div>
          <div style={{ marginTop: "2.5mm", fontSize: 9.5, color: C.muted, lineHeight: 1.35 }}>
            Acheté : {boughtAt}
            <br />
            Problème : {problem}
            <br />
            Statut : {file.status}
            <br />
            Lieu : {file.saleLocation || "Bac diagnostic"}
          </div>
        </div>
        {qr ? (
          <img
            alt="QR interne"
            src={qr}
            style={{ width: "18mm", height: "18mm", border: `1px solid ${C.line}`, borderRadius: 6 }}
          />
        ) : (
          <div style={{ width: "18mm", height: "18mm", border: `1px solid ${C.line}`, borderRadius: 6 }} />
        )}
      </div>
      <div
        style={{
          marginTop: "2.5mm",
          borderTop: `1px solid ${C.line}`,
          paddingTop: "2mm",
          fontSize: 8.5,
          color: C.faint,
        }}
      >
        QR interne atelier · {file.internalQrToken || "À compléter"}
      </div>
    </div>
  );
}

export function EtiquetteStockPrintable({
  data,
  format = "compact",
  qr,
}: Readonly<{ data: CertificateData; format?: "compact" | "mini"; qr: string }>) {
  const device = [data.brand, data.model].filter(Boolean).join(" ");
  const priceFormatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const mini = format === "mini";
  const settings = data.publicSettings;
  return (
    <div
      style={{
        background: "#fff",
        color: C.ink,
        width: mini ? "70mm" : "90mm",
        minHeight: mini ? "40mm" : "55mm",
        border: `1px solid ${C.line}`,
        borderRadius: mini ? "3mm" : "4mm",
        padding: mini ? "3.5mm" : "5mm",
        fontFamily: "Inter, system-ui, sans-serif",
        boxSizing: "border-box",
        boxShadow: "0 10px 30px rgba(16,24,40,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            color: C.ink,
            fontSize: mini ? 11 : 14,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            maxWidth: mini ? 130 : 170,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {settings.showShopName ? data.workshopName || "Boutique" : "Reconditionné"}
        </div>
        {settings.showReference && (
          <span style={{ fontSize: 10, color: C.muted, fontFamily: "ui-monospace, monospace" }}>
            #{stockRef(data.ref)}
          </span>
        )}
      </div>

      <div
        style={{
          marginTop: mini ? "2.8mm" : "4mm",
          display: "grid",
          gridTemplateColumns: mini ? "16mm 1fr 16mm" : "20mm 1fr 20mm",
          gap: mini ? "2.5mm" : "3mm",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: mini ? "16mm" : "20mm",
            height: mini ? "16mm" : "20mm",
            border: `1px solid ${C.line}`,
            borderRadius: "3mm",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            background: "#FFFFFF",
          }}
        >
          {data.imageUrl ? (
            <img alt="" src={data.imageUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ color: C.accentDark, fontSize: 9, fontWeight: 700 }}>APPAREIL</span>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: mini ? 11.5 : 14, fontWeight: 800, lineHeight: 1.08 }}>
            {settings.showModel ? device || "Appareil" : "Téléphone reconditionné"}
          </div>
          <div style={{ fontSize: mini ? 9 : 11, color: C.muted, marginTop: 3 }}>
            {[settings.showStorage ? data.storage : "", settings.showColor ? data.color : ""]
              .filter(Boolean)
              .join(" · ") || "—"}
          </div>

          {settings.showGrade && (
            <div style={{ marginTop: mini ? "2mm" : "4mm", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: mini ? 16 : 20,
                  padding: mini ? "0 5px" : "0 7px",
                  borderRadius: 6,
                  background: "#ECF8F4",
                  color: C.accentDark,
                  fontSize: mini ? 8.5 : 10,
                  fontWeight: 800,
                }}
              >
                Grade {data.grade}
              </span>
              {!mini && <span style={{ fontSize: 10, color: C.muted }}>{data.gradeLabel}</span>}
            </div>
          )}

          {settings.showPrice && (
            <div
              style={{
                marginTop: mini ? "2mm" : "4mm",
                fontSize: mini ? 17 : 23,
                fontWeight: 850,
                letterSpacing: "-0.02em",
              }}
            >
              {priceFormatter.format(data.price)}
            </div>
          )}
          <div style={{ fontSize: mini ? 8.5 : 10.5, color: C.muted, marginTop: 2, lineHeight: 1.35 }}>
            {[
              settings.showBattery && data.batteryHealth != null ? `Batterie ${data.batteryHealth} %` : "",
              settings.showWarranty ? `Garantie ${data.warrantyMonths} mois` : "",
              settings.showControlPoints ? `Testé ${data.validatedPoints}/${data.protocolPoints} points` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        <div style={{ flexShrink: 0, textAlign: "center" }}>
          {qr ? (
            <img
              alt="QR"
              src={qr}
              style={{
                width: mini ? "15mm" : "19mm",
                height: mini ? "15mm" : "19mm",
                borderRadius: 6,
                border: `1px solid ${C.line}`,
              }}
            />
          ) : (
            <div
              style={{
                width: mini ? "15mm" : "19mm",
                height: mini ? "15mm" : "19mm",
                borderRadius: 6,
                border: `1px solid ${C.line}`,
                background: C.soft,
              }}
            />
          )}
          {!mini && <div style={{ fontSize: 9, color: C.faint, marginTop: 4 }}>Suivi / certificat</div>}
        </div>
      </div>

      <div
        style={{
          marginTop: mini ? "2.5mm" : "4mm",
          paddingTop: mini ? "1.8mm" : "3mm",
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: mini ? 8.5 : 10,
          color: C.faint,
        }}
      >
        <span>{settings.showReference ? `Réf. stock ${data.ref}` : ""}</span>
        <span>{data.publicToken}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════ D. Bon d'achat / fiche de reprise ════════════════════════════ */

export function BonAchatPrintable({ file, detailed }: Readonly<{ file: ReconditioningFile; detailed?: boolean }>) {
  const device = [file.brand, file.model, file.storage, file.color].filter(Boolean).join(" ");
  const estimation = file.originalEstimation;
  const defects = estimation?.defects ?? [];
  return (
    <div
      style={{
        background: "#fff",
        color: C.ink,
        padding: 40,
        fontFamily: "Inter, system-ui, sans-serif",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <DocHeader
        dateIso={file.receivedAt || file.createdAt}
        kicker="Bon d'achat · Reçu de reprise"
        refLabel="Référence interne"
        refValue={file.number}
      />

      <h1 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.02em", margin: "24px 0 4px" }}>
        Bon d'achat — reprise téléphone
      </h1>
      <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
        Récapitulatif de la reprise remis au vendeur. Conservez ce document.
      </p>

      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 32 }}>
        <div>
          <InfoCell label="Appareil" value={device || "—"} />
          <InfoCell label="IMEI / Série" value={val(file.imei || file.serial)} />
          <InfoCell label="Accessoires remis" value={val(file.accessories, "Aucun")} />
        </div>
        <div>
          <InfoCell label="État constaté" value={file.cosmeticGrade ? `Grade ${file.cosmeticGrade}` : "—"} />
          <InfoCell label="Batterie" value={file.batteryHealth != null ? `≈ ${file.batteryHealth} %` : "—"} />
          <InfoCell label="Défauts signalés" value={defects.length ? defects.join(", ") : "Aucun"} />
        </div>
      </div>

      {detailed && estimation && estimation.deductions.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectionLabel>Détail du calcul</SectionLabel>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: `1px solid ${C.hair}`,
                fontSize: 13,
              }}
            >
              <span style={{ color: C.muted }}>Cote de base</span>
              <span style={{ fontWeight: 600 }}>{formatEuro(estimation.coteDeBase)}</span>
            </div>
            {estimation.deductions.map((d) => (
              <div
                key={`${d.label}-${d.amount}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: `1px solid ${C.hair}`,
                  fontSize: 13,
                }}
              >
                <span style={{ color: C.muted }}>{d.label}</span>
                <span style={{ fontWeight: 600, color: "#B4342A" }}>- {formatEuro(d.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 22,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: `1px solid ${C.line}`,
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <span style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>Prix de reprise payé au vendeur</span>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{formatEuro(file.prixAchat)}</span>
      </div>

      <p style={{ marginTop: 18, color: C.muted, fontSize: 11.5, lineHeight: 1.55 }}>
        Le vendeur déclare être le propriétaire légitime de l'appareil décrit ci-dessus, libre de tout gage ou
        opposition, et avoir supprimé ses comptes et données personnelles (iCloud / compte Google déconnectés).
        L'appareil est repris en l'état constaté le jour de la reprise.
      </p>

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {["Signature du vendeur", `Signature ${WORKSHOP_NAME}`].map((label) => (
          <div key={label}>
            <div style={{ color: C.muted, fontSize: 11, marginBottom: 40 }}>{label}</div>
            <div style={{ borderTop: `1px solid ${C.line}` }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, color: C.faint, fontSize: 10.5, textAlign: "center" }}>
        {WORKSHOP_NAME} · Bon d'achat n° {file.number} · Document généré automatiquement.
      </div>
    </div>
  );
}
