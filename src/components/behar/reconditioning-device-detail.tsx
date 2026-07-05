"use client";

// reconditioning-device-detail — fiche d'un appareil repris.
// Header (statut, grade, marge, action principale) + Résumé financier + Diagnostic
// + Atelier (pièces reliées au stock réel) + Vente + Documents.

import { useMemo, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  Package,
  Plus,
  QrCode,
  ShieldCheck,
  Tag,
  Trash2,
  Wrench,
} from "lucide-react";

import { PhotoSlot } from "@/components/behar/photo-slot";
import { useBeharStore } from "@/lib/behar-store";
import { publicAbsoluteUrl } from "@/lib/public-access";
import {
  buildCertificateData,
  type CertificateData,
  certificatePublicPath,
  resolveReconditioningDeviceImage,
} from "@/lib/reconditioning-certificate";
import {
  calculateEstimatedMargin,
  calculateRealMargin,
  formatMoney,
  formatPercent,
  safeNumber,
} from "@/lib/reconditioning-calc";
import { isPriceKnown } from "@/lib/reconditioning-pricing";
import {
  computeMargin,
  DEVICE_STATUS_LABEL,
  type FunctionalTestKey,
  gradeLabel,
  type PhysicalCheckKey,
  type PhysicalState,
  type ReconditioningFile,
  type TestState,
  useReconditioningStore,
} from "@/lib/reconditioning-store";
import { canPublishPublicCertificate, getReadyForSaleChecklist } from "@/lib/reconditioning-validation";
import { isStockItemCompatibleWithModel } from "@/lib/stock-parts";
import { cn } from "@/lib/utils";

import {
  AccentButton,
  deviceTitle,
  FieldLabel,
  GhostButton,
  GradeBadge,
  inputCls,
  SectionCard,
  selectCls,
  StatusBadge,
} from "./reconditioning-ui";

export function ReconditioningDeviceDetail({ fileId, onBack }: Readonly<{ fileId: string; onBack: () => void }>) {
  const file = useReconditioningStore((s) => s.files.find((f) => f.id === fileId));

  if (!file) {
    return (
      <div className="rounded-[20px] border border-[#E8E5DF] bg-white p-8 text-center">
        <p className="text-[#6B6B6B] text-sm">Appareil introuvable.</p>
        <GhostButton className="mt-4" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Retour
        </GhostButton>
      </div>
    );
  }

  return <DeviceDetailInner file={file} onBack={onBack} />;
}

function DeviceDetailInner({ file, onBack }: Readonly<{ file: ReconditioningFile; onBack: () => void }>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const sendToWorkshop = useReconditioningStore((s) => s.sendToWorkshop);
  const generateCertificate = useReconditioningStore((s) => s.generateCertificate);
  const publishToStock = useReconditioningStore((s) => s.publishToStock);
  const markSold = useReconditioningStore((s) => s.markSold);
  const reopenFile = useReconditioningStore((s) => s.reopenFile);
  const setPhoto = useReconditioningStore((s) => s.setPhoto);
  const workshopSettings = useBeharStore((s) => s.workshopSettings);

  const costs = computeMargin(file);
  const realCosts = costs.coutTotal - (file.prixAchat || 0);
  const estimatedCosts = file.originalEstimation?.plannedCostsTotal ?? null;
  const workshopSynced = hasWorkshopSync(file);
  const shopName = workshopSettings.commercialName || workshopSettings.name || workshopSettings.brand || "Boutique";
  const certificateData = useMemo(
    () => buildCertificateData(file, { workshopName: shopName, shopLogoUrl: workshopSettings.logoUrl }),
    [file, shopName, workshopSettings.logoUrl],
  );
  const publicUrl = useMemo(() => publicAbsoluteUrl(certificatePublicPath(certificateData)), [certificateData]);
  const estMargin = calculateEstimatedMargin({
    resalePrice: file.prixVentePrevu,
    buyPrice: file.prixAchat > 0 ? file.prixAchat : null,
    partsCost: estimatedCosts ?? undefined,
  });
  const realMargin = calculateRealMargin({
    soldPrice: file.status === "Vendu" ? file.soldPrice : null,
    buyPrice: file.prixAchat > 0 ? file.prixAchat : null,
    partsCost: realCosts,
  });
  const headerMargin = realMargin ?? estMargin;
  const image = resolveReconditioningDeviceImage(file);
  const canPublishPublic = canPublishPublicCertificate(file);

  const markReady = () => {
    if (!canPublishPublic) {
      window.alert(
        "Complétez le diagnostic final public, le prix, la batterie, la garantie et une photo/catalogue avant publication.",
      );
      return;
    }
    generateCertificate(file.id);
  };

  const askSold = () => {
    const answer = window.prompt("Prix de vente final (€)", file.prixVentePrevu > 0 ? String(file.prixVentePrevu) : "");
    if (answer == null) return;
    const price = Number(answer);
    if (Number.isFinite(price) && price >= 0) markSold(file.id, price);
  };

  const mainAction = (() => {
    switch (file.status) {
      case "À compléter":
      case "Brouillon":
        return { label: "Compléter", run: () => undefined };
      case "Acheté":
        return { label: "Passer en atelier", run: () => sendToWorkshop(file.id) };
      case "Évaluation":
      case "Reconditionnement":
      case "En attente pièce":
      case "Tests":
        return { label: "Marquer prêt à vendre", run: markReady };
      case "Prêt à vendre":
      case "En stock":
        return { label: "Marquer vendu", run: askSold };
      case "Vendu":
      case "Bloqué":
        return { label: "Réactiver", run: () => reopenFile(file.id) };
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[20px] border border-[#E8E5DF] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.04)]">
        <button
          className="inline-flex items-center gap-1.5 text-[#6B6B6B] text-[13px] transition hover:text-[#1A1916]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Retour aux appareils
        </button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-[16px] border border-[#E8E5DF] bg-[#FAFAF8] text-[#6B6B6B]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={deviceTitle(file)} className="size-full object-contain p-1.5" src={image} />
              ) : (
                <Package className="size-6" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-[#1A1916] text-[20px] tracking-tight">{deviceTitle(file)}</h2>
              <p className="mt-0.5 text-[#6B6B6B] text-[12.5px]">
                {[file.storage, file.color].filter(Boolean).join(" · ") || "Stockage / couleur à compléter"} · Réf.{" "}
                {file.number}
              </p>
              <p className="mt-0.5 text-[#6B6B6B] text-[12.5px]">{file.imei || file.serial || "IMEI non renseigné"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={file.status} />
                <GradeBadge grade={file.condition?.grade ?? file.cosmeticGrade} />
                <span
                  className={cn(
                    "font-semibold text-[12.5px]",
                    headerMargin == null
                      ? "text-[#9B9B96]"
                      : headerMargin.amount >= 0
                        ? "text-[#147065]"
                        : "text-[#B4342A]",
                  )}
                >
                  {headerMargin == null
                    ? "Marge à compléter"
                    : `Marge ${realMargin ? "réelle" : "estimée"} ${formatMoney(headerMargin.amount)}`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mainAction && <AccentButton onClick={mainAction.run}>{mainAction.label}</AccentButton>}
            <GhostButton onClick={() => openDoc(file.id, "etiquette")}>
              <Tag className="size-4 text-[#2A9D8F]" />
              Étiquette de vente
            </GhostButton>
            <GhostButton onClick={() => openDoc(file.id, "certificat")}>
              <FileText className="size-4 text-[#2A9D8F]" />
              Documents
            </GhostButton>
            <GhostButton onClick={() => window.open(publicUrl, "_blank", "noopener")}>
              <QrCode className="size-4 text-[#2A9D8F]" />
              QR / certificat
            </GhostButton>
          </div>
        </div>
        {file.status === "Bloqué" && file.blockedReason && (
          <p className="mt-3 rounded-[12px] border border-[#F0D9D6] bg-[#FCF4F3] px-3.5 py-2.5 font-semibold text-[#B4342A] text-[12.5px]">
            Bloqué : {file.blockedReason}
          </p>
        )}
        {file.status === "Refusé" && (
          <p className="mt-3 rounded-[12px] border border-[#E8E5DF] bg-[#F7F7F5] px-3.5 py-2.5 text-[#6B6B6B] text-[12.5px]">
            Reprise refusée{file.refusedReason ? ` : ${file.refusedReason}` : ""} — conservée pour l'historique.
          </p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <FinalQualityControlSection
          certificateData={certificateData}
          estMargin={estMargin}
          file={file}
          onValidate={markReady}
          publicUrl={publicUrl}
          realCosts={realCosts}
          workshopSynced={workshopSynced}
        />
        <InitialDiagnosticSection file={file} />
        <SectionCard subtitle="Photos reprises et photos de vente." title="Photos">
          <p className="mt-4 mb-2 font-medium text-[#1A1916] text-[13px]">Photos avant</p>
          <div className="grid max-w-[430px] grid-cols-3 gap-3">
            <PhotoSlot label="Face" onChange={(v) => setPhoto(file.id, "face", v)} value={file.photos.face} />
            <PhotoSlot label="Dos" onChange={(v) => setPhoto(file.id, "dos", v)} value={file.photos.dos} />
            <PhotoSlot label="Défaut" onChange={(v) => setPhoto(file.id, "defaut", v)} value={file.photos.defaut} />
          </div>
        </SectionCard>
      </div>

      {/* 3. Atelier */}
      <WorkshopSection file={file} />

      <div className="grid gap-4 xl:grid-cols-2">
        <TraceabilitySection file={file} />
        {/* 4. Vente & documents */}
        <SectionCard subtitle="Informations publiques de mise en vente et documents client." title="Vente & documents">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldLabel label="Prix de vente (€)">
              <input
                className={inputCls}
                min={0}
                onChange={(e) => updateFile(file.id, { prixVentePrevu: Math.max(0, safeNumber(e.target.value)) })}
                type="number"
                value={file.prixVentePrevu || ""}
              />
            </FieldLabel>
            <FieldLabel label="Garantie (mois)">
              <input
                className={inputCls}
                min={0}
                onChange={(e) =>
                  updateFile(file.id, { warrantyMonths: Math.max(0, Math.round(safeNumber(e.target.value))) })
                }
                type="number"
                value={file.warrantyMonths}
              />
            </FieldLabel>
            <FieldLabel label="Localisation">
              <input
                className={inputCls}
                onChange={(e) => updateFile(file.id, { saleLocation: e.target.value })}
                placeholder="Vitrine A, étagère 2…"
                value={file.saleLocation ?? ""}
              />
            </FieldLabel>
            <FieldLabel label="Photo vente">
              <PhotoSlot label="Photo" onChange={(v) => setPhoto(file.id, "cote", v)} value={file.photos.cote} />
            </FieldLabel>
          </div>
          <div className="mt-4 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
            <InfoRow
              label="Prix vitrine"
              value={file.prixVentePrevu > 0 ? formatMoney(file.prixVentePrevu) : "À compléter"}
            />
            <InfoRow
              label="Prix minimum"
              value={
                file.prixConseille > 0
                  ? formatMoney(Math.min(file.prixConseille, file.prixVentePrevu || file.prixConseille))
                  : "À compléter"
              }
            />
            <InfoRow
              label="Batterie annoncée"
              value={file.batteryHealth != null ? `${file.batteryHealth} %` : "À compléter"}
            />
            <InfoRow
              label="Grade annoncé"
              value={certificateData.grade ? `Grade ${certificateData.grade}` : "À compléter"}
            />
            <InfoRow
              label="Statut vente"
              value={file.status === "Vendu" ? "Vendu" : file.status === "En stock" ? "En vitrine" : "Préparation"}
            />
            <InfoRow label="Lien QR" value={certificateData.publicToken} />
          </div>
          {file.status === "Vendu" ? (
            <p className="mt-4 rounded-[12px] bg-[#ECF8F4] px-3.5 py-2.5 font-semibold text-[#147065] text-[13px]">
              Vendu {formatMoney(file.soldPrice ?? 0)}
              {realMargin != null
                ? ` — marge réelle ${formatMoney(realMargin.amount)} (${formatPercent(realMargin.pct)})`
                : ""}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {!["Prêt à vendre", "En stock"].includes(file.status) && (
                <GhostButton onClick={markReady}>
                  <Tag className="size-4 text-[#2A9D8F]" />
                  Marquer prêt à vendre
                </GhostButton>
              )}
              {file.status === "Prêt à vendre" && !file.publishedToStock && (
                <GhostButton onClick={() => publishToStock(file.id)}>
                  <Package className="size-4 text-[#2A9D8F]" />
                  Préparer la mise en vente
                </GhostButton>
              )}
              {["Prêt à vendre", "En stock"].includes(file.status) && (
                <AccentButton onClick={askSold}>Marquer vendu</AccentButton>
              )}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <DocButton doc="achat" fileId={file.id} label="Bon de reprise" />
            <DocButton doc="interne" fileId={file.id} label="Étiquette interne" />
            <DocButton doc="certificat" fileId={file.id} label="Fiche reconditionnement" />
            <DocButton doc="sortie" fileId={file.id} label="Certificat de test" />
            <DocButton doc="etiquette" fileId={file.id} label="Étiquette de vente" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <GhostButton onClick={() => openDoc(file.id, "etiquette")}>
              <Tag className="size-4 text-[#2A9D8F]" />
              Imprimer étiquette
            </GhostButton>
            <GhostButton
              onClick={() => {
                void navigator.clipboard?.writeText(publicUrl);
              }}
            >
              <QrCode className="size-4 text-[#2A9D8F]" />
              Copier lien QR
            </GhostButton>
            <GhostButton onClick={() => window.open(publicUrl, "_blank", "noopener")}>
              <ExternalLink className="size-4 text-[#2A9D8F]" />
              Ouvrir page publique
            </GhostButton>
          </div>
          {file.status !== "Vendu" && (
            <p className="mt-3 text-[#9B9B96] text-[12px]">
              La facture / le reçu sera disponible après la vente (mode comptoir).
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ───────────────────────── Résumé financier ───────────────────────── */

export function ReconditioningFinancialSummary({
  file,
  estimatedCosts,
  realCosts,
  workshopSynced,
  estMargin,
  realMargin,
}: Readonly<{
  file: ReconditioningFile;
  estimatedCosts: number | null;
  realCosts: number;
  workshopSynced: boolean;
  estMargin: { amount: number; pct: number | null } | null;
  realMargin: { amount: number; pct: number | null } | null;
}>) {
  return (
    <SectionCard subtitle="Estimé à la reprise vs réel en atelier." title="Résumé financier">
      <div className="space-y-1 text-[13px]">
        <FinRow label="Prix de reprise" value={file.prixAchat > 0 ? formatMoney(file.prixAchat) : "À compléter"} />
        <FinRow
          label="Coûts estimés (reprise)"
          value={estimatedCosts != null ? formatMoney(estimatedCosts) : "À compléter"}
        />
        <FinRow label="Coûts réels (atelier)" value={workshopSynced ? formatMoney(realCosts) : "À compléter"} />
        <FinRow
          label="Prix de revente"
          value={file.prixVentePrevu > 0 ? formatMoney(file.prixVentePrevu) : "À compléter"}
        />
        <div className="border-[#F1F1EF] border-t pt-1.5">
          <FinRow
            label="Marge prévue"
            tone={estMargin == null ? undefined : estMargin.amount >= 0 ? "good" : "bad"}
            value={
              estMargin == null ? "À compléter" : `${formatMoney(estMargin.amount)} (${formatPercent(estMargin.pct)})`
            }
          />
          <FinRow
            label="Marge réelle"
            tone={realMargin == null ? undefined : realMargin.amount >= 0 ? "good" : "bad"}
            value={
              realMargin == null
                ? "Après la vente"
                : `${formatMoney(realMargin.amount)} (${formatPercent(realMargin.pct)})`
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}

/* ───────────────────────── Diagnostic final ───────────────────────── */

type QaState = "Non testé" | "OK" | "À vérifier" | "Défaut final" | "Non applicable";

type QaItem =
  | { kind: "functional"; key: FunctionalTestKey; label: string; required?: boolean }
  | { kind: "physical"; key: PhysicalCheckKey; label: string; required?: boolean };

const QA_GROUPS: { id: string; title: string; items: QaItem[] }[] = [
  {
    id: "screen",
    title: "Écran & tactile",
    items: [
      { kind: "functional", key: "Écran", label: "Écran, tactile et luminosité", required: true },
      { kind: "functional", key: "Capteurs", label: "True Tone / capteurs si applicable" },
    ],
  },
  {
    id: "battery",
    title: "Batterie & charge",
    items: [
      { kind: "functional", key: "Batterie", label: "Batterie", required: true },
      { kind: "functional", key: "Charge", label: "Charge filaire et connecteur", required: true },
      { kind: "functional", key: "Boutons", label: "Boutons et vibreur" },
    ],
  },
  {
    id: "network",
    title: "Réseau & connectivité",
    items: [
      { kind: "functional", key: "Réseau", label: "Réseau mobile", required: true },
      { kind: "functional", key: "Wi-Fi", label: "Wi-Fi", required: true },
      { kind: "functional", key: "Bluetooth", label: "Bluetooth" },
      { kind: "functional", key: "Face ID / Touch ID", label: "GPS / sécurité biométrique" },
    ],
  },
  {
    id: "media",
    title: "Caméras & audio",
    items: [
      { kind: "functional", key: "Caméras", label: "Caméras avant et arrière", required: true },
      { kind: "functional", key: "Micro", label: "Micro", required: true },
      { kind: "functional", key: "Haut-parleurs", label: "Haut-parleurs", required: true },
    ],
  },
  {
    id: "identity",
    title: "Sécurité & identité",
    items: [
      { kind: "physical", key: "Vis", label: "Visserie / scellement" },
      { kind: "physical", key: "Humidité", label: "Oxydation", required: true },
      { kind: "functional", key: "Réseau", label: "IMEI contrôlé" },
    ],
  },
  {
    id: "cosmetic",
    title: "État esthétique",
    items: [
      { kind: "physical", key: "Écran fissuré", label: "Face avant", required: true },
      { kind: "physical", key: "Back glass", label: "Face arrière", required: true },
      { kind: "physical", key: "Châssis", label: "Châssis", required: true },
      { kind: "physical", key: "Rayures", label: "Rayures" },
      { kind: "physical", key: "Chocs", label: "Chocs" },
    ],
  },
];

const allQaItems = QA_GROUPS.flatMap((group) => group.items);
const uniqueQaItems = allQaItems.filter(
  (item, index, list) => list.findIndex((other) => other.kind === item.kind && other.key === item.key) === index,
);
const QA_OPTIONS: QaState[] = ["Non testé", "OK", "À vérifier", "Défaut final", "Non applicable"];
const GRADE_OPTIONS: ReconditioningFile["cosmeticGrade"][] = ["A+", "A", "B", "C", "D"];
const formatDate = (iso?: string) => {
  if (!iso) return "À compléter";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "À compléter" : date.toLocaleDateString("fr-FR");
};

function qaState(file: ReconditioningFile, item: QaItem): QaState {
  const value = item.kind === "functional" ? file.functionalTests[item.key] : file.physicalChecks[item.key];
  if (!value) return "Non testé";
  if (value === "Défaut" || value === "Important") return "Défaut final";
  if (value === "Léger") return "À vérifier";
  return value;
}

function functionalValue(state: QaState): TestState | undefined {
  if (state === "Non testé") return undefined;
  if (state === "Défaut final") return "Défaut";
  return state;
}

function physicalValue(state: QaState): PhysicalState | undefined {
  if (state === "Non testé") return undefined;
  if (state === "À vérifier") return "Léger";
  if (state === "Défaut final") return "Important";
  return state === "OK" || state === "Non applicable" ? state : undefined;
}

function scoreFor(items: QaItem[], file: ReconditioningFile) {
  const unique = items.filter(
    (item, index, list) => list.findIndex((other) => other.kind === item.kind && other.key === item.key) === index,
  );
  const treated = unique.filter((item) => qaState(file, item) !== "Non testé").length;
  return { treated, total: unique.length };
}

function finalDefects(file: ReconditioningFile) {
  return uniqueQaItems
    .map((item) => ({ item, state: qaState(file, item) }))
    .filter(({ state }) => state === "À vérifier" || state === "Défaut final");
}

function readiness(file: ReconditioningFile, publicReady: boolean) {
  const requiredUntested = uniqueQaItems.filter((item) => item.required && qaState(file, item) === "Non testé").length;
  const uncontrolled = uniqueQaItems.filter((item) => qaState(file, item) === "Non testé").length;
  const defects = finalDefects(file);
  const hasPhoto = Boolean(file.photos.cote || file.photos.face);
  const defectCommentRequired = defects.some(({ state }) => state === "Défaut final") && !file.testComment.trim();
  const items = [
    { label: "Données appareil complètes", done: Boolean(file.brand && file.model && file.storage && file.color) },
    { label: "Grade final renseigné", done: Boolean(file.cosmeticGrade || file.condition?.grade) },
    { label: "Batterie renseignée", done: file.batteryHealth != null && file.batteryHealth >= 0 },
    { label: "Prix vente renseigné", done: file.prixVentePrevu > 0 },
    { label: "Garantie renseignée", done: file.warrantyMonths > 0 },
    { label: "Tests obligatoires validés", done: requiredUntested === 0 },
    { label: "Photos publiques ajoutées", done: hasPhoto },
    { label: "Diagnostic final cohérent", done: uncontrolled === 0 && !defectCommentRequired },
    { label: "Étiquette vente générable", done: publicReady },
    { label: "QR public générable", done: publicReady },
  ];
  const missing = [
    ...getReadyForSaleChecklist(file)
      .filter((item) => !item.done)
      .map((item) => item.label),
    ...(requiredUntested > 0 ? [`${requiredUntested} tests obligatoires non contrôlés`] : []),
    ...(uncontrolled > 0 ? [`${uncontrolled} points encore non testés`] : []),
    ...(defectCommentRequired ? ["Commentaire public requis pour un défaut final"] : []),
  ].filter((value, index, list) => list.indexOf(value) === index);
  return { items, missing, readyCount: items.filter((item) => item.done).length, requiredUntested, uncontrolled };
}

function FinalQualityControlSection({
  certificateData,
  estMargin,
  file,
  onValidate,
  publicUrl,
  realCosts,
  workshopSynced,
}: Readonly<{
  certificateData: CertificateData;
  estMargin: { amount: number; pct: number | null } | null;
  file: ReconditioningFile;
  onValidate: () => void;
  publicUrl: string;
  realCosts: number;
  workshopSynced: boolean;
}>) {
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const setPhoto = useReconditioningStore((s) => s.setPhoto);
  const appendEvent = useReconditioningStore((s) => s.appendEvent);
  const publicReady = canPublishPublicCertificate(file);
  const ready = readiness(file, publicReady);
  const defects = finalDefects(file);
  const totalScore = scoreFor(uniqueQaItems, file);
  const initialProblem = file.originalEstimation?.defects[0] || file.observations || "Aucun problème initial résumé";

  const setQaState = (item: QaItem, state: QaState) => {
    if (item.kind === "functional") {
      const next = { ...file.functionalTests };
      const value = functionalValue(state);
      if (value) next[item.key] = value;
      else delete next[item.key];
      updateFile(file.id, { functionalTests: next });
      return;
    }
    const next = { ...file.physicalChecks };
    const value = physicalValue(state);
    if (value) next[item.key] = value;
    else delete next[item.key];
    updateFile(file.id, { physicalChecks: next });
  };

  return (
    <section className="xl:col-span-2">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <SectionCard
            subtitle="Décision qualité avant étiquette, QR client et mise en vente."
            title="Contrôle qualité final"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <div className="rounded-[14px] border border-[#E8E5DF] bg-[#FAFAF8] p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1A1916] text-sm">{file.number}</p>
                    <p className="mt-0.5 text-[#6B6B6B] text-[12.5px]">
                      {deviceTitle(file)} ·{" "}
                      {[file.storage, file.color].filter(Boolean).join(" · ") || "Stockage / couleur à compléter"}
                    </p>
                  </div>
                  <StatusBadge status={file.status} />
                </div>
                <div className="mt-3 grid gap-x-5 gap-y-1.5 text-[12.5px] sm:grid-cols-2">
                  <InfoRow label="Acheté le" value={formatDate(file.receivedAt)} />
                  <InfoRow label="Source" value={file.source} />
                  <InfoRow label="Problème initial" value={initialProblem} />
                  <InfoRow label="Pièces utilisées" value={`${file.parts.length}`} />
                  <InfoRow label="Coût réel atelier" value={workshopSynced ? formatMoney(realCosts) : "À compléter"} />
                  <InfoRow
                    label="Prix vente prévu"
                    value={file.prixVentePrevu > 0 ? formatMoney(file.prixVentePrevu) : "À compléter"}
                  />
                  <InfoRow label="Marge estimée" value={estMargin ? formatMoney(estMargin.amount) : "À compléter"} />
                  <InfoRow label="Statut actuel" value={DEVICE_STATUS_LABEL[file.status]} />
                </div>
              </div>

              <div className="rounded-[14px] border border-[#E8E5DF] bg-white p-3.5">
                <p className="font-semibold text-[#1A1916] text-sm">Données publiques de vente</p>
                <div className="mt-3 grid gap-2">
                  <FieldLabel label="Grade final">
                    <select
                      className={selectCls}
                      onChange={(e) =>
                        updateFile(file.id, { cosmeticGrade: e.target.value as ReconditioningFile["cosmeticGrade"] })
                      }
                      value={file.cosmeticGrade}
                    >
                      <option value="">Sélectionner</option>
                      {GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade} — {gradeLabel(grade)}
                        </option>
                      ))}
                    </select>
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldLabel label="Batterie finale %">
                      <input
                        className={inputCls}
                        max={100}
                        min={0}
                        onChange={(e) =>
                          updateFile(file.id, {
                            batteryHealth:
                              e.target.value === "" ? null : Math.max(0, Math.min(100, safeNumber(e.target.value))),
                          })
                        }
                        type="number"
                        value={file.batteryHealth ?? ""}
                      />
                    </FieldLabel>
                    <FieldLabel label="Prix de vente">
                      <input
                        className={inputCls}
                        min={0}
                        onChange={(e) =>
                          updateFile(file.id, { prixVentePrevu: Math.max(0, safeNumber(e.target.value)) })
                        }
                        type="number"
                        value={file.prixVentePrevu || ""}
                      />
                    </FieldLabel>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FieldLabel label="Garantie">
                      <input
                        className={inputCls}
                        min={0}
                        onChange={(e) =>
                          updateFile(file.id, { warrantyMonths: Math.max(0, Math.round(safeNumber(e.target.value))) })
                        }
                        type="number"
                        value={file.warrantyMonths}
                      />
                    </FieldLabel>
                    <FieldLabel label="Photo publique">
                      <PhotoSlot
                        label="Photo"
                        onChange={(v) => setPhoto(file.id, "cote", v)}
                        value={file.photos.cote}
                      />
                    </FieldLabel>
                  </div>
                  <div className="grid gap-x-4 gap-y-1 pt-1 text-[12.5px]">
                    <InfoRow
                      label="Reconditionné le"
                      value={file.reconditionedAt ? formatDate(file.reconditionedAt) : "À la validation"}
                    />
                    <InfoRow label="Référence visible client" value={file.number} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            subtitle={`${totalScore.treated} / ${totalScore.total} points contrôlés. Un point vide reste Non testé.`}
            title="Points de contrôle final"
          >
            <div className="space-y-2">
              {QA_GROUPS.map((group, index) => {
                const score = scoreFor(group.items, file);
                return (
                  <details
                    className="rounded-[14px] border border-[#E8E5DF] bg-white"
                    key={group.id}
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <ChevronDown className="size-4 shrink-0 text-[#9B9B96]" />
                        <span className="truncate font-semibold text-[#1A1916] text-sm">{group.title}</span>
                      </span>
                      <span className="shrink-0 rounded-full border border-[#E8E5DF] px-2.5 py-1 font-semibold text-[#6B6B6B] text-[11.5px]">
                        {score.treated} / {score.total} contrôlés
                      </span>
                    </summary>
                    <div className="space-y-2 border-[#F1F1EF] border-t p-3">
                      {group.items.map((item) => {
                        const state = qaState(file, item);
                        return (
                          <div
                            className="grid gap-2 rounded-[12px] bg-[#FAFAF8] p-2.5 lg:grid-cols-[minmax(150px,1fr)_auto]"
                            key={`${item.kind}-${item.key}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[#1A1916] text-[12.5px]">{item.label}</p>
                              <p className="text-[#9B9B96] text-[11px]">
                                {item.required ? "Obligatoire" : "Optionnel / selon modèle"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {QA_OPTIONS.map((option) => (
                                <button
                                  className={cn(
                                    "min-h-8 rounded-[8px] border px-2.5 font-semibold text-[11.5px] transition",
                                    state === option
                                      ? option === "OK"
                                        ? "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]"
                                        : option === "Défaut final"
                                          ? "border-[#F0D9D6] bg-[#FCF4F3] text-[#B4342A]"
                                          : "border-[#E8E5DF] bg-white text-[#1A1916]"
                                      : "border-[#E8E5DF] bg-white text-[#6B6B6B] hover:border-[#2A9D8F]/40",
                                  )}
                                  key={option}
                                  onClick={() => setQaState(item, option)}
                                  type="button"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            subtitle="Uniquement les défauts encore présents après reconditionnement."
            title="Défauts finaux à afficher au client"
          >
            {defects.length === 0 ? (
              <p className="rounded-[14px] border border-[#D7EFEA] bg-[#ECF8F4] px-3.5 py-3 font-semibold text-[#147065] text-[13px]">
                Aucun défaut final visible client.
              </p>
            ) : (
              <div className="space-y-2">
                {defects.map(({ item, state }) => (
                  <div
                    className="rounded-[14px] border border-[#FFD7B5] bg-[#FFF2E8] p-3 text-[12.5px]"
                    key={`${item.kind}-${item.key}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#1A1916]">{item.label}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-[#C05621] text-[11px]">
                        {state}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-3">
                      <InfoRow label="Visible client" value="Oui" />
                      <InfoRow
                        label="Impact grade"
                        value={file.cosmeticGrade ? `Grade ${file.cosmeticGrade}` : "À confirmer"}
                      />
                      <InfoRow label="Impact prix" value="Prix à vérifier" />
                    </div>
                  </div>
                ))}
                <FieldLabel label="Commentaire public">
                  <textarea
                    className={cn(inputCls, "h-auto py-3")}
                    onChange={(e) => updateFile(file.id, { testComment: e.target.value })}
                    placeholder="Ex. Micro-rayures visibles sur la face arrière."
                    rows={3}
                    value={file.testComment}
                  />
                </FieldLabel>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <SectionCard subtitle={`${ready.readyCount} / ${ready.items.length} éléments prêts`} title="Validation vente">
            <div className="h-2 overflow-hidden rounded-full bg-[#F1F1EF]">
              <div
                className="h-full rounded-full bg-[#2A9D8F]"
                style={{ width: `${Math.round((ready.readyCount / ready.items.length) * 100)}%` }}
              />
            </div>
            <div className="mt-3 space-y-2">
              {ready.items.map((item) => (
                <div className="flex items-center gap-2 text-[12.5px]" key={item.label}>
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-[#147065]" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-[#C05621]" />
                  )}
                  <span className={item.done ? "text-[#1A1916]" : "text-[#C05621]"}>{item.label}</span>
                </div>
              ))}
            </div>
            {ready.missing.length > 0 && (
              <div className="mt-4 rounded-[12px] border border-[#FFD7B5] bg-[#FFF2E8] p-3">
                <p className="font-semibold text-[#C05621] text-[12.5px]">Impossible de valider :</p>
                <ul className="mt-1.5 space-y-1 text-[#C05621] text-[12px]">
                  {ready.missing.slice(0, 5).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 grid gap-2">
              <GhostButton onClick={() => appendEvent(file.id, "Brouillon diagnostic final enregistré", "Atelier")}>
                <FileText className="size-4 text-[#2A9D8F]" />
                Enregistrer brouillon
              </GhostButton>
              <AccentButton
                className="disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!publicReady}
                onClick={onValidate}
              >
                <ShieldCheck className="size-4" />
                Valider diagnostic final
              </AccentButton>
              <GhostButton
                className="disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!publicReady}
                onClick={() => openDoc(file.id, "etiquette")}
              >
                <Tag className="size-4 text-[#2A9D8F]" />
                Générer étiquette vente
              </GhostButton>
              <GhostButton
                className="disabled:cursor-not-allowed disabled:opacity-55"
                disabled={!publicReady}
                onClick={() => window.open(publicUrl, "_blank", "noopener")}
              >
                <QrCode className="size-4 text-[#2A9D8F]" />
                Ouvrir aperçu QR client
              </GhostButton>
            </div>
          </SectionCard>

          <SectionCard subtitle="Aperçu QR client" title="Ce que verra le client">
            <div className="flex gap-3">
              <span className="grid size-14 shrink-0 place-items-center rounded-[12px] border border-[#E8E5DF] bg-[#FAFAF8] text-[#9B9B96]">
                {file.photos.cote ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Photo publique" className="size-full rounded-[12px] object-cover" src={file.photos.cote} />
                ) : (
                  <ImageIcon className="size-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#1A1916] text-sm">{certificateData.workshopName}</p>
                <p className="truncate text-[#1A1916] text-[13px]">{deviceTitle(file)}</p>
                <p className="text-[#6B6B6B] text-[12px]">
                  {[file.storage, file.color].filter(Boolean).join(" · ") || "Détails à compléter"}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-[12.5px]">
              <InfoRow
                label="Prix"
                value={file.prixVentePrevu > 0 ? formatMoney(file.prixVentePrevu) : "À compléter"}
              />
              <InfoRow
                label="Grade"
                value={file.cosmeticGrade ? `${file.cosmeticGrade} — ${gradeLabel(file.cosmeticGrade)}` : "À compléter"}
              />
              <InfoRow
                label="Batterie"
                value={file.batteryHealth != null ? `${file.batteryHealth} %` : "À compléter"}
              />
              <InfoRow
                label="Garantie"
                value={file.warrantyMonths > 0 ? `${file.warrantyMonths} mois` : "À compléter"}
              />
              <InfoRow
                label="Diagnostic final"
                value={`${certificateData.validatedPoints} / ${certificateData.protocolPoints} points contrôlés`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Écran", "Réseau", "Caméra", "IMEI"].map((label) => (
                <span
                  className="rounded-full border border-[#D7EFEA] bg-[#ECF8F4] px-2.5 py-1 font-semibold text-[#147065] text-[11px]"
                  key={label}
                >
                  {label} OK
                </span>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </section>
  );
}

function InitialDiagnosticSection({ file }: Readonly<{ file: ReconditioningFile }>) {
  const condition = file.condition;
  const battery = condition?.batteryTier || (condition?.batteryPct != null ? `${condition.batteryPct} %` : "");
  const defects = [
    ...(file.originalEstimation?.defects ?? []),
    condition?.screen === "casse" ? "Écran cassé" : "",
    condition?.screen === "tache" || condition?.screen === "lignes" ? "Écran à contrôler" : "",
    condition?.backGlass === "casse" ? "Face arrière cassée" : "",
    condition?.batteryPct != null && condition.batteryPct < 80 ? "Batterie faible" : "",
    file.observations,
  ].filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);

  return (
    <SectionCard
      subtitle="Constat à la reprise. Visible uniquement en interne, jamais dans le QR client."
      title="Diagnostic à la reprise"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        <InfoRow label="Source" value={file.customerName || file.supplierName || file.source} />
        <InfoRow label="Grade repris" value={file.condition?.grade || file.cosmeticGrade || "À compléter"} />
        <InfoRow label="Écran" value={condition?.screen || "Non renseigné"} />
        <InfoRow label="Batterie reprise" value={battery || "Non renseigné"} />
        <InfoRow label="Face arrière" value={condition?.backGlass || "Non renseigné"} />
        <InfoRow label="Face ID / Touch ID" value={condition?.biometrics || "Non renseigné"} />
        <InfoRow label="Réseau" value={condition?.network || "Non renseigné"} />
        <InfoRow label="Caméra" value={condition?.camera || "Non renseigné"} />
        <InfoRow label="Oxydation" value={condition?.oxidation || "Non renseigné"} />
        <InfoRow label="iCloud / Google" value={condition?.lock || "Non renseigné"} />
        <InfoRow label="IMEI" value={condition?.imeiStatus || "Non renseigné"} />
      </div>
      {defects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {defects.map((label) => (
            <span
              className="rounded-full border border-[#FFD7B5] bg-[#FFF2E8] px-2.5 py-1 font-semibold text-[#C05621] text-[11.5px]"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TraceabilitySection({ file }: Readonly<{ file: ReconditioningFile }>) {
  return (
    <SectionCard
      subtitle="Cycle de vie interne du téléphone, des pièces et des étiquettes."
      title="Suivi de l'appareil"
    >
      <div className="grid gap-2 text-[13px] sm:grid-cols-2">
        <InfoRow label="Référence interne" value={file.number} />
        <InfoRow label="QR interne" value={file.internalQrToken || "À compléter"} />
        <InfoRow label="QR public" value={file.publicEnabled ? file.publicToken || "Généré" : "Non publié"} />
        <InfoRow label="Étiquette interne" value={file.internalLabelGeneratedAt ? "Générée" : "À générer"} />
      </div>
      {file.parts.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-[#E8E5DF]">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_95px_85px] gap-2 bg-[#F7F7F5] px-3 py-2 font-semibold text-[#6B6B6B] text-[11px]">
            <span>Pièce</span>
            <span>Fournisseur</span>
            <span>Stock</span>
            <span className="text-right">Coût</span>
          </div>
          {file.parts.map((part) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_110px_95px_85px] gap-2 border-[#F1F1EF] border-t px-3 py-2 text-[12px]"
              key={part.id}
            >
              <span className="min-w-0 truncate font-medium text-[#1A1916]">
                {part.label || "Pièce atelier"}
                <span className="block truncate font-normal text-[#9B9B96]">
                  {part.sku || part.reference || "Réf. non renseignée"}
                </span>
              </span>
              <span className="truncate text-[#6B6B6B]">{part.supplier || file.supplierName || "Interne"}</span>
              <span className="text-[#6B6B6B]">
                {part.stockBefore != null && part.stockAfter != null
                  ? `${part.stockBefore} → ${part.stockAfter}`
                  : part.stockDecremented
                    ? "Décrémenté"
                    : "Manuel"}
              </span>
              <span className="text-right font-semibold text-[#1A1916]">
                {formatMoney(safeNumber(part.cost) * Math.max(1, safeNumber(part.quantity)))}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-2">
        {[...file.history]
          .reverse()
          .slice(0, 8)
          .map((event) => (
            <div className="flex items-start gap-2 border-[#F7F7F5] border-b pb-2 last:border-0" key={event.id}>
              <Clock3 className="mt-0.5 size-3.5 shrink-0 text-[#9B9B96]" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[#1A1916] text-[12.5px]">{event.title}</p>
                <p className="text-[#9B9B96] text-[11px]">
                  {new Date(event.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  {event.by ? ` · ${event.by}` : ""}
                </p>
              </div>
            </div>
          ))}
      </div>
    </SectionCard>
  );
}

/* ───────────────────────── Atelier ───────────────────────── */

function WorkshopSection({ file }: Readonly<{ file: ReconditioningFile }>) {
  const stockItems = useBeharStore((s) => s.stockItems);
  const addPart = useReconditioningStore((s) => s.addPart);
  const updatePart = useReconditioningStore((s) => s.updatePart);
  const removePart = useReconditioningStore((s) => s.removePart);
  const updateFile = useReconditioningStore((s) => s.updateFile);
  const [showPicker, setShowPicker] = useState(false);
  const [showAllStock, setShowAllStock] = useState(false);

  // Priorité aux pièces compatibles avec CE modèle — le reste du stock est
  // accessible via « Tout le stock » (cas des pièces mal renseignées).
  const compatibleParts = useMemo(
    () =>
      stockItems.filter(
        (item) => (item.stock ?? 0) > 0 && isStockItemCompatibleWithModel(item, file.brand, file.model),
      ),
    [stockItems, file.brand, file.model],
  );
  const otherParts = useMemo(
    () =>
      stockItems.filter(
        (item) => item.active !== false && (item.stock ?? 0) > 0 && !compatibleParts.some((c) => c.id === item.id),
      ),
    [stockItems, compatibleParts],
  );
  const availableParts =
    showAllStock || compatibleParts.length === 0 ? [...compatibleParts, ...otherParts] : compatibleParts;

  const linkStockItem = (partId: string, stockItemId: string) => {
    const item = stockItems.find((s) => s.id === stockItemId);
    updatePart(file.id, partId, {
      stockItemId: stockItemId || undefined,
      ...(item ? { label: item.name, cost: safeNumber(item.purchasePrice) } : {}),
    });
  };
  const workshopSynced = hasWorkshopSync(file);
  const partsTotal = file.parts.reduce(
    (sum, part) => sum + safeNumber(part.cost) * Math.max(1, safeNumber(part.quantity)),
    0,
  );
  const laborTotal = safeNumber(file.laborCost);
  const workshopTotal = partsTotal + laborTotal;
  const workshopStatus =
    file.status === "Acheté"
      ? "En attente atelier"
      : file.status === "Évaluation"
        ? "Diagnostic"
        : file.status === "Reconditionnement" || file.status === "En attente pièce"
          ? "En réparation"
          : file.status === "Tests"
            ? "Test final"
            : file.status === "Prêt à vendre" || file.status === "En stock" || file.status === "Vendu"
              ? "Terminé"
              : "À synchroniser";

  return (
    <SectionCard
      action={
        <GhostButton
          className="h-9 px-3 text-[12.5px]"
          onClick={() => {
            addPart(file.id);
            setShowPicker(true);
          }}
        >
          <Plus className="size-3.5" />
          Ajouter une pièce du stock
        </GhostButton>
      }
      subtitle={`Pièces réellement utilisées : le stock est décrémenté et les coûts réels remplacent les estimations. ${compatibleParts.length > 0 ? `${compatibleParts.length} pièce${compatibleParts.length > 1 ? "s" : ""} compatible${compatibleParts.length > 1 ? "s" : ""} avec ${[file.brand, file.model].filter(Boolean).join(" ") || "ce modèle"}.` : "Aucune pièce compatible trouvée dans le stock — tout le stock est proposé."}`}
      title="Atelier"
    >
      <div className="mb-3 grid gap-3 rounded-[14px] border border-[#E8E5DF] bg-[#FAFAF8] p-3 text-[13px] sm:grid-cols-4">
        <InfoRow label="Statut atelier" value={workshopStatus} />
        <InfoRow label="Technicien" value="Technicien atelier" />
        <InfoRow label="Total atelier" value={workshopSynced ? formatMoney(workshopTotal) : "À compléter"} />
        <span
          className={cn(
            "inline-flex h-7 w-fit items-center rounded-full border px-2.5 font-semibold text-[11.5px]",
            workshopSynced
              ? "border-[#CDEBE4] bg-[#ECF8F4] text-[#147065]"
              : "border-[#FFD7B5] bg-[#FFF2E8] text-[#C05621]",
          )}
        >
          {workshopSynced ? "Synchronisé avec atelier" : "Données atelier à synchroniser"}
        </span>
      </div>
      {compatibleParts.length > 0 && otherParts.length > 0 && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-[#6B6B6B] text-[12.5px]">
          <input checked={showAllStock} onChange={(e) => setShowAllStock(e.target.checked)} type="checkbox" />
          Afficher tout le stock (pas seulement les pièces compatibles)
        </label>
      )}
      {file.parts.length === 0 ? (
        <p className="rounded-[14px] border border-[#E8E5DF] border-dashed px-4 py-6 text-center text-[#9B9B96] text-[13px]">
          Aucune pièce pour le moment.
        </p>
      ) : (
        <div className="space-y-2">
          {file.parts.map((part) => (
            <div
              className="flex flex-wrap items-center gap-2.5 rounded-[14px] border border-[#E8E5DF] px-3.5 py-2.5"
              key={part.id}
            >
              <Wrench className={cn("size-4 shrink-0", part.stockDecremented ? "text-[#147065]" : "text-[#9B9B96]")} />
              <input
                className={cn(inputCls, "h-9 min-w-[140px] flex-1")}
                onChange={(e) => updatePart(file.id, part.id, { label: e.target.value })}
                placeholder="Nom de la pièce"
                value={part.label}
              />
              {(showPicker || part.stockItemId) && (
                <select
                  className={cn(selectCls, "h-9 w-auto max-w-[260px] text-[12.5px]")}
                  onChange={(e) => linkStockItem(part.id, e.target.value)}
                  value={part.stockItemId ?? ""}
                >
                  <option value="">Hors stock (coût manuel)</option>
                  {availableParts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} —{" "}
                      {isPriceKnown(item.purchasePrice) ? formatMoney(item.purchasePrice) : "prix à renseigner"} ·{" "}
                      {item.stock ?? 0} en stock
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-1.5">
                <input
                  className={cn(inputCls, "h-9 w-16 text-right")}
                  min={1}
                  onChange={(e) =>
                    updatePart(file.id, part.id, { quantity: Math.max(1, Math.round(safeNumber(e.target.value))) })
                  }
                  type="number"
                  value={part.quantity || 1}
                />
                <span className="text-[#6B6B6B] text-[12px]">qté</span>
                <input
                  className={cn(inputCls, "h-9 w-24 text-right")}
                  min={0}
                  onChange={(e) => updatePart(file.id, part.id, { cost: Math.max(0, safeNumber(e.target.value)) })}
                  type="number"
                  value={part.cost}
                />
                <span className="text-[#6B6B6B] text-[12px]">€</span>
              </div>
              <span className="min-w-18 text-right font-semibold text-[#1A1916] text-[12.5px]">
                {formatMoney(safeNumber(part.cost) * Math.max(1, safeNumber(part.quantity)))}
              </span>
              {part.stockDecremented && (
                <span className="rounded-full bg-[#ECF8F4] px-2 py-0.5 font-semibold text-[#147065] text-[11px]">
                  Stock décrémenté
                </span>
              )}
              <button
                className="ml-auto grid size-8 place-items-center rounded-[8px] text-[#9B9B96] transition hover:bg-[#FCF4F3] hover:text-[#B4342A]"
                onClick={() => removePart(file.id, part.id)}
                title="Retirer la pièce (restaure le stock)"
                type="button"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FieldLabel label="Main-d'œuvre (€)">
          <input
            className={inputCls}
            min={0}
            onChange={(e) => updateFile(file.id, { laborCost: Math.max(0, safeNumber(e.target.value)) })}
            type="number"
            value={file.laborCost ?? 0}
          />
        </FieldLabel>
        <FieldLabel label="Notes internes">
          <input
            className={inputCls}
            onChange={(e) => updateFile(file.id, { m360Notes: e.target.value })}
            placeholder="Remarques atelier…"
            value={file.m360Notes}
          />
        </FieldLabel>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-[#F1F1EF] border-t pt-3">
        <div className="text-[#6B6B6B] text-[12.5px]">
          Pièces {formatMoney(partsTotal)} · Main-d'œuvre {formatMoney(laborTotal)} · Total réel{" "}
          {workshopSynced ? formatMoney(workshopTotal) : "À compléter"}
        </div>
        <GhostButton
          onClick={() => window.open(`/atelier?reconditioning=${encodeURIComponent(file.id)}`, "_blank", "noopener")}
        >
          <ExternalLink className="size-4 text-[#2A9D8F]" />
          Voir dossier atelier
        </GhostButton>
      </div>
    </SectionCard>
  );
}

/* ───────────────────────── Primitives locales ───────────────────────── */

function InfoRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-2 border-[#F7F7F5] border-b py-1 last:border-0">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-medium text-[#1A1916]">{value}</span>
    </div>
  );
}

function FinRow({ label, value, tone }: Readonly<{ label: string; value: string; tone?: "good" | "bad" }>) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[#6B6B6B]">{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "good" ? "text-[#147065]" : tone === "bad" ? "text-[#B4342A]" : "text-[#1A1916]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DocButton({ fileId, doc, label }: Readonly<{ fileId: string; doc: string; label: string }>) {
  return (
    <button
      className="flex flex-col items-center gap-1.5 rounded-[14px] border border-[#E8E5DF] bg-white px-2 py-3.5 font-semibold text-[#1A1916] text-[12px] transition hover:border-[#2A9D8F]/45"
      onClick={() =>
        window.open(`/print/reconditionnement?id=${encodeURIComponent(fileId)}&doc=${doc}`, "_blank", "noopener")
      }
      type="button"
    >
      <FileText className="size-4 text-[#2A9D8F]" />
      {label}
    </button>
  );
}

function openDoc(fileId: string, doc: string, extra = "") {
  const suffix = extra ? `&${extra}` : "";
  window.open(`/print/reconditionnement?id=${encodeURIComponent(fileId)}&doc=${doc}${suffix}`, "_blank", "noopener");
}

function hasWorkshopSync(file: ReconditioningFile): boolean {
  return (
    file.parts.length > 0 ||
    safeNumber(file.laborCost) > 0 ||
    Boolean(file.m360Notes.trim()) ||
    ["Évaluation", "Reconditionnement", "En attente pièce", "Tests", "Prêt à vendre", "En stock", "Vendu"].includes(
      file.status,
    )
  );
}
