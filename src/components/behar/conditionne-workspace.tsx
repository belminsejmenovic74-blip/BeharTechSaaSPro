"use client";

import { useMemo, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardList,
  History,
  Package,
  Pencil,
  RotateCcw,
  Settings2,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

import { getModelsByBrand } from "@/data/deviceCatalog";
import { formatEuro, useBeharStore, type WorkshopCurrency } from "@/lib/behar-store";
import {
  blankInput,
  type ConditionneInput,
  type ConditionnePhotoSlot,
  type Estimation,
  estimate,
  type FonctionEtat,
  useConditionneStore,
} from "@/lib/conditionne-store";
import { useReconditioningStore } from "@/lib/reconditioning-store";
import { cn } from "@/lib/utils";

import { PhotoSlot } from "./photo-slot";
import { RealDeviceVisual } from "./real-product-visual";

const BRANDS = ["Apple", "Samsung", "Xiaomi", "Google", "Oppo", "Huawei", "Autre"];

const STEPS = [
  { id: 1, label: "Appareil" },
  { id: 2, label: "État" },
  { id: 3, label: "Photos" },
  { id: 4, label: "Estimation" },
  { id: 5, label: "Décision" },
];

const selectCls =
  "h-14 w-full rounded-[14px] border border-[#E8E8E5] bg-white px-4 text-[#1A1916] text-base outline-none transition focus:border-[#2A9D8F]";

/* ════════════════════════════ Écran principal ════════════════════════════ */

export function ConditionneScreen({ onClose }: Readonly<{ onClose: () => void }>) {
  const currency = useBeharStore((state) => state.workshopInfo.currency);
  const rules = useConditionneStore((s) => s.rules);
  const saveRecord = useConditionneStore((s) => s.saveRecord);
  const records = useConditionneStore((s) => s.records);
  const createReconditioning = useReconditioningStore((s) => s.createFile);
  const updateReconditioning = useReconditioningStore((s) => s.updateFile);

  const [view, setView] = useState<"flow" | "history">("flow");
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<ConditionneInput>(blankInput);
  const [prixPropose, setPrixPropose] = useState<number | null>(null);
  const [done, setDone] = useState<{ decision: string; reconditioningId?: string } | null>(null);

  const estimation = useMemo(() => estimate(input, rules), [input, rules]);
  const effectivePropose = prixPropose ?? estimation.prixConseille;
  const patch = (p: Partial<ConditionneInput>) => setInput((prev) => ({ ...prev, ...p }));

  const reset = () => {
    setInput(blankInput());
    setPrixPropose(null);
    setStep(1);
    setDone(null);
  };

  const finalize = (decision: "Estimation enregistrée" | "Brouillon" | "Envoyé en reconditionnement") => {
    let reconditioningId: string | undefined;
    if (decision === "Envoyé en reconditionnement") {
      reconditioningId = createReconditioning();
      updateReconditioning(reconditioningId, {
        brand: input.brand,
        model: input.model,
        storage: input.storage,
        color: input.color,
        imei: input.imei,
        source: "Rachat client",
        prixAchat: effectivePropose,
        prixVentePrevu: estimation.prixReventeEstime,
        observations: input.notes,
        photos: {
          face: input.photos.face,
          dos: input.photos.dos,
          cote: input.photos.gauche ?? input.photos.droite,
          defaut: input.photos.defaut,
        },
      });
    }
    saveRecord({ input, estimation, prixPropose: effectivePropose, decision, reconditioningFileId: reconditioningId });
    setDone({ decision, reconditioningId });
  };

  if (view === "history") {
    return <ConditionneHistory onBack={() => setView("flow")} records={records} />;
  }

  if (done) {
    return <DoneCard decision={done.decision} onClose={onClose} onNew={reset} sentToRecond={Boolean(done.reconditioningId)} />;
  }

  return (
    <div className="mx-auto w-full max-w-[1320px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-[#1A1916] text-[26px] leading-tight tracking-tight">Conditionné</h1>
          <p className="text-[#6B6B6B] text-sm">Estimez en quelques touches la valeur de reprise d'un téléphone d'occasion.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-semibold text-[#1A1916] text-sm transition hover:bg-[#FFFFFF]"
            onClick={() => setView("history")}
            type="button"
          >
            <History className="size-4" />
            Historique
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-semibold text-[#1A1916] text-sm transition hover:bg-[#FFFFFF]"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
            Annuler
          </button>
        </div>
      </div>

      <StepBar onJump={setStep} step={step} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)] lg:p-7">
          {step === 1 && <StepAppareil input={input} patch={patch} />}
          {step === 2 && <StepEtat input={input} patch={patch} />}
          {step === 3 && <StepPhotos input={input} patch={patch} />}
          {step === 4 && (
            <StepEstimation
              currency={currency}
              estimation={estimation}
              onEdit={setPrixPropose}
              propose={effectivePropose}
            />
          )}
          {step === 5 && <StepDecision onFinalize={finalize} />}

          <div className="mt-7 flex items-center justify-between gap-3 border-[#FFFFFF] border-t pt-5">
            <button
              className="inline-flex h-14 items-center gap-2 rounded-[14px] border border-[#E8E8E5] bg-white px-6 font-semibold text-[#1A1916] text-base transition hover:bg-[#FFFFFF] disabled:opacity-40"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              type="button"
            >
              <ArrowLeft className="size-5" />
              Retour
            </button>
            {step < 5 ? (
              <button
                className="inline-flex h-14 items-center gap-2 rounded-[14px] bg-[#2A9D8F] px-7 font-semibold text-base text-white shadow-[0_2px_8px_rgba(42,157,143,0.25)] transition hover:bg-[#238579] disabled:opacity-40"
                disabled={step === 1 && !input.model}
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                type="button"
              >
                Suivant
                <ArrowRight className="size-5" />
              </button>
            ) : (
              <span className="text-[#6B6B6B] text-sm">Choisissez une décision ci-dessus.</span>
            )}
          </div>
        </div>

        <EstimationSummary
          estimation={estimation}
          onEditPropose={setPrixPropose}
          input={input}
          propose={effectivePropose}
        />
      </div>
    </div>
  );
}

/* ─────────── Stepper ─────────── */

function StepBar({ step, onJump }: Readonly<{ step: number; onJump: (s: number) => void }>) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-[16px] border border-[#E8E8E5] bg-white px-4 py-3.5">
      {STEPS.map((s, i) => {
        const state = step === s.id ? "active" : s.id < step ? "done" : "todo";
        return (
          <div className="flex flex-1 items-center" key={s.id}>
            <button className="flex min-w-0 items-center gap-2.5" onClick={() => onJump(s.id)} type="button">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-semibold text-sm transition",
                  state === "active" && "bg-[#2A9D8F] text-white",
                  state === "done" && "bg-[#FFFFFF] text-[#147065]",
                  state === "todo" && "bg-[#FFFFFF] text-[#6B6B6B]",
                )}
              >
                {state === "done" ? <Check className="size-4" /> : s.id}
              </span>
              <span className={cn("hidden whitespace-nowrap font-semibold text-sm sm:block", state === "active" ? "text-[#1A1916]" : "text-[#6B6B6B]")}>
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="mx-2 h-px flex-1 bg-[#FFFFFF]" />}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════ Étape 1 — Appareil ════════════════════════════ */

function StepAppareil({ input, patch }: Readonly<{ input: ConditionneInput; patch: (p: Partial<ConditionneInput>) => void }>) {
  const models = input.brand && input.brand !== "Autre" ? getModelsByBrand(input.brand) : [];
  return (
    <div>
      <SectionTitle subtitle="Identifiez le téléphone repris." title="Appareil" />

      <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="grid place-items-center rounded-[18px] border border-[#E8E8E5] bg-[#FFFFFF] p-4">
          <RealDeviceVisual brand={input.brand} className="size-32" model={input.model} type="Smartphone" />
        </div>
        <div>
          <p className="mb-2 font-medium text-[#1A1916] text-sm">Marque</p>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {BRANDS.map((brand) => (
              <button
                className={cn(
                  "flex h-16 items-center justify-center rounded-[14px] border px-2 text-center font-semibold text-sm transition",
                  input.brand === brand ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]" : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#2A9D8F]/40",
                )}
                key={brand}
                onClick={() => patch({ brand, model: "" })}
                type="button"
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Modèle">
          {input.brand === "Autre" || !input.brand ? (
            <input className={selectCls} onChange={(e) => patch({ model: e.target.value })} placeholder="Saisir le modèle" value={input.model} />
          ) : (
            <select className={selectCls} onChange={(e) => patch({ model: e.target.value })} value={input.model}>
              <option value="">Sélectionner un modèle</option>
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Capacité">
          <select className={selectCls} onChange={(e) => patch({ storage: e.target.value })} value={input.storage}>
            <option value="">—</option>
            {["64 Go", "128 Go", "256 Go", "512 Go", "1 To"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Couleur">
          <input className={selectCls} onChange={(e) => patch({ color: e.target.value })} placeholder="Minuit, Argent…" value={input.color} />
        </Field>
        <Field label="Batterie (%)">
          <input className={selectCls} onChange={(e) => patch({ batteryPct: e.target.value })} placeholder="86" value={input.batteryPct} />
        </Field>
        <Field label="IMEI / Série (optionnel)">
          <input className={selectCls} onChange={(e) => patch({ imei: e.target.value })} placeholder="350503254788492" value={input.imei} />
        </Field>
        <Field label="Verrouillage">
          <div className="flex gap-2.5">
            <BigToggle active={!input.locked} label="Déverrouillé" onClick={() => patch({ locked: false })} />
            <BigToggle active={input.locked} label="Bloqué" onClick={() => patch({ locked: true })} />
          </div>
        </Field>
      </div>
    </div>
  );
}

/* ════════════════════════════ Étape 2 — État ════════════════════════════ */

function StepEtat({ input, patch }: Readonly<{ input: ConditionneInput; patch: (p: Partial<ConditionneInput>) => void }>) {
  return (
    <div>
      <SectionTitle subtitle="L'état et les défauts ajustent automatiquement l'estimation." title="État & fonctionnalités" />

      <ChoiceRow
        label="État général"
        onChange={(v) => patch({ etatGeneral: v as ConditionneInput["etatGeneral"] })}
        options={["Comme neuf", "Très bon état", "Bon état", "Correct", "Abîmé", "HS"]}
        value={input.etatGeneral}
      />
      <ChoiceRow
        label="Écran"
        onChange={(v) => patch({ ecran: v as ConditionneInput["ecran"] })}
        options={["OK", "Rayé", "Fissuré", "Cassé", "Tactile HS"]}
        value={input.ecran}
      />
      <ChoiceRow
        label="Batterie"
        onChange={(v) => patch({ batterie: v as ConditionneInput["batterie"] })}
        options={["100-90", "89-80", "79-70", "<70", "inconnue"]}
        value={input.batterie}
      />

      <p className="mt-6 mb-3 font-semibold text-[#1A1916] text-sm">Fonctions</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <FunctionRow label="Face ID / Touch ID" onChange={(v) => patch({ faceId: v })} value={input.faceId} />
        <FunctionRow label="Caméras" onChange={(v) => patch({ cameras: v })} value={input.cameras} />
        <FunctionRow label="Charge" onChange={(v) => patch({ charge: v })} value={input.charge} />
        <FunctionRow
          label="Réseau"
          okDefautLabels={["OK", "Bloqué", "Non testé"]}
          onChange={(v) => patch({ reseau: v as ConditionneInput["reseau"] })}
          value={input.reseau}
        />
        <FunctionRow label="Wi-Fi" onChange={(v) => patch({ wifi: v })} value={input.wifi} />
        <FunctionRow label="Boutons" onChange={(v) => patch({ boutons: v })} value={input.boutons} />
        <FunctionRow label="Haut-parleurs" onChange={(v) => patch({ hautParleurs: v })} value={input.hautParleurs} />
        <FunctionRow label="Micro" onChange={(v) => patch({ micro: v })} value={input.micro} />
      </div>

      <div className="mt-6">
        <Field label="Problème principal">
          <select className={selectCls} onChange={(e) => patch({ probleme: e.target.value as ConditionneInput["probleme"] })} value={input.probleme}>
            {["Aucun", "Écran cassé", "Batterie faible", "Dos cassé", "Face ID HS", "Caméra HS", "Charge HS", "Bloqué opérateur / iCloud", "Ne s'allume pas", "Autre"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

/* ════════════════════════════ Étape 3 — Photos ════════════════════════════ */

function StepPhotos({ input, patch }: Readonly<{ input: ConditionneInput; patch: (p: Partial<ConditionneInput>) => void }>) {
  const slots: { key: ConditionnePhotoSlot; label: string }[] = [
    { key: "face", label: "Face avant" },
    { key: "dos", label: "Dos" },
    { key: "gauche", label: "Côté gauche" },
    { key: "droite", label: "Côté droit" },
    { key: "defaut", label: "Défaut principal" },
    { key: "accessoires", label: "Accessoires / boîte" },
  ];
  const setPhoto = (key: ConditionnePhotoSlot, dataUrl: string | undefined) =>
    patch({ photos: { ...input.photos, [key]: dataUrl } });
  return (
    <div>
      <SectionTitle subtitle="Documentez l'état du téléphone avant reprise." title="Photos" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((slot) => (
          <PhotoSlot key={slot.key} label={slot.label} onChange={(d) => setPhoto(slot.key, d)} value={input.photos[slot.key]} />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════ Étape 4 — Estimation ════════════════════════════ */

function StepEstimation({
  currency,
  estimation,
  propose,
  onEdit,
}: Readonly<{
  currency: WorkshopCurrency;
  estimation: Estimation;
  propose: number;
  onEdit: (v: number | null) => void;
}>) {
  const marge = estimation.prixReventeEstime - propose;
  const margePct = estimation.prixReventeEstime ? (marge / estimation.prixReventeEstime) * 100 : 0;
  return (
    <div>
      <SectionTitle subtitle="Résultat basé sur vos paramètres de reprise." title="Estimation de reprise" />

      {!estimation.hasModel ? (
        <div className="rounded-[16px] border border-[#F0E0BC] bg-[#FFFFFF] px-4 py-5 text-[#9A6B1B] text-sm">
          Sélectionnez un modèle connu à l'étape 1 pour obtenir la cote et le prix de revente.
        </div>
      ) : (
        <div className="space-y-2.5">
          <BigLine label="Cote de base" value={formatEuro(estimation.coteDeBase)} />
          {estimation.deductions.map((d) => (
            <BigLine key={d.label} label={d.label} muted value={`- ${formatEuro(d.amount)}`} />
          ))}
          <BigLine bold label="Total déductions" value={`- ${formatEuro(estimation.totalDeductions)}`} />
          <div className="my-2 h-px bg-[#FFFFFF]" />
          <BigLine highlight label="Prix maximum d'achat" value={formatEuro(estimation.prixMaxAchat)} />
          <BigLine label="Prix conseillé de reprise" value={formatEuro(estimation.prixConseille)} />
          <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] px-4 py-3">
            <span className="font-semibold text-[#1A1916]">Prix proposé au client</span>
            <div className="flex items-center gap-2">
              <span className="text-[#6B6B6B] text-sm">{currency}</span>
              <input
                className="h-11 w-28 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-right font-semibold text-[#1A1916] text-lg outline-none focus:border-[#2A9D8F]"
                onChange={(e) => onEdit(e.target.value === "" ? null : Number(e.target.value))}
                type="number"
                value={propose || ""}
              />
              <button className="grid size-9 place-items-center rounded-[9px] text-[#6B6B6B] transition hover:bg-[#FFFFFF]" onClick={() => onEdit(null)} title="Revenir au prix conseillé" type="button">
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>
          <BigLine label="Prix de revente estimé" value={formatEuro(estimation.prixReventeEstime)} />
          <BigLine
            bold
            label="Marge potentielle"
            value={`${formatEuro(marge)} · ${margePct.toFixed(1)} %`}
            valueClass={marge >= 0 ? "text-[#147065]" : "text-[#C0564D]"}
          />
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 rounded-[12px] bg-[#FFFFFF] px-4 py-3 text-[#6B6B6B] text-xs">
        <Settings2 className="mt-0.5 size-4 shrink-0" />
        Estimation basée sur vos paramètres de reprise. Vous pouvez ajuster les règles dans Paramètres → Conditionné.
      </p>
    </div>
  );
}

/* ════════════════════════════ Étape 5 — Décision ════════════════════════════ */

function StepDecision({ onFinalize }: Readonly<{ onFinalize: (d: "Estimation enregistrée" | "Brouillon" | "Envoyé en reconditionnement") => void }>) {
  return (
    <div>
      <SectionTitle subtitle="Que souhaitez-vous faire de cette reprise ?" title="Décision" />
      <div className="grid gap-3.5">
        <DecisionTile
          desc="Garde une trace simple, sans créer d'achat. Utile si le client veut réfléchir."
          icon={ClipboardList}
          label="Enregistrer l'estimation"
          onClick={() => onFinalize("Estimation enregistrée")}
        />
        <DecisionTile
          desc="Enregistre le rachat en brouillon, à valider plus tard. N'impacte pas encore le CA."
          icon={Pencil}
          label="Mettre en brouillon"
          onClick={() => onFinalize("Brouillon")}
        />
        <DecisionTile
          desc="Rachat du téléphone : crée un dossier de reconditionnement (modèle, photos, défauts, prix repris) et déduit le prix de rachat du CA."
          icon={Sparkles}
          label="Envoyer en reconditionnement"
          onClick={() => onFinalize("Envoyé en reconditionnement")}
          primary
        />
      </div>
    </div>
  );
}

function DecisionTile({
  icon: Icon,
  label,
  desc,
  onClick,
  primary,
}: Readonly<{ icon: typeof ClipboardList; label: string; desc: string; onClick: () => void; primary?: boolean }>) {
  return (
    <button
      className={cn(
        "flex items-center gap-4 rounded-[16px] border p-5 text-left transition active:scale-[0.99]",
        primary ? "border-[#2A9D8F] bg-[#FFFFFF] hover:bg-[#FFFFFF]" : "border-[#E8E8E5] bg-white hover:border-[#2A9D8F]/40",
      )}
      onClick={onClick}
      type="button"
    >
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-[13px]", primary ? "bg-[#2A9D8F] text-white" : "bg-[#FFFFFF] text-[#2A9D8F]")}>
        <Icon className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-[#1A1916] text-base">{label}</span>
        <span className="block text-[#6B6B6B] text-sm">{desc}</span>
      </span>
      <ArrowRight className="ml-auto size-5 shrink-0 text-[#6B6B6B]" />
    </button>
  );
}

/* ════════════════════════════ Résumé live (droite) ════════════════════════════ */

function EstimationSummary({
  estimation,
  input,
  propose,
  onEditPropose,
}: Readonly<{ estimation: Estimation; input: ConditionneInput; propose: number; onEditPropose: (v: number | null) => void }>) {
  const marge = estimation.prixReventeEstime - propose;
  const margePct = estimation.prixReventeEstime ? (marge / estimation.prixReventeEstime) * 100 : 0;
  const device = [input.brand, input.model, input.storage].filter(Boolean).join(" ") || "Appareil à identifier";
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
        <p className="font-semibold text-[#1A1916]">Estimation de reprise</p>
        <p className="mt-0.5 truncate text-[#6B6B6B] text-xs">{device}</p>

        {!estimation.hasModel ? (
          <p className="mt-4 rounded-[12px] bg-[#FFFFFF] px-3 py-4 text-center text-[#6B6B6B] text-xs">
            Sélectionnez un modèle pour calculer la reprise.
          </p>
        ) : (
          <div className="mt-4 space-y-1.5 text-sm">
            <SumLine label="Cote de base" value={formatEuro(estimation.coteDeBase)} />
            {estimation.deductions.map((d) => (
              <SumLine key={d.label} label={d.label} muted value={`- ${formatEuro(d.amount)}`} />
            ))}
            <SumLine bold label="Total déductions" value={`- ${formatEuro(estimation.totalDeductions)}`} />
            <div className="my-1.5 h-px bg-[#FFFFFF]" />
            <div className="flex items-center justify-between rounded-[12px] bg-[#FFFFFF] px-3 py-2">
              <span className="font-semibold text-[#167B70]">Prix maximum d'achat</span>
              <span className="font-bold text-[#147065] text-lg">{formatEuro(estimation.prixMaxAchat)}</span>
            </div>
            <SumLine label="Prix conseillé de reprise" value={formatEuro(estimation.prixConseille)} />
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="inline-flex items-center gap-1 text-[#6B6B6B]">
                Prix proposé
                <Pencil className="size-3" />
              </span>
              <input
                className="h-9 w-24 rounded-[9px] border border-[#E8E8E5] bg-white px-2 text-right font-semibold text-[#1A1916] outline-none focus:border-[#2A9D8F]"
                onChange={(e) => onEditPropose(e.target.value === "" ? null : Number(e.target.value))}
                type="number"
                value={propose || ""}
              />
            </div>
            <SumLine label="Prix de revente estimé" value={formatEuro(estimation.prixReventeEstime)} />
            <div className="mt-1 flex items-center justify-between rounded-[12px] bg-[#FFFFFF] px-3 py-2">
              <span className="font-semibold text-[#1A1916]">Marge potentielle</span>
              <span className="inline-flex items-center gap-2">
                <span className={cn("font-bold", marge >= 0 ? "text-[#147065]" : "text-[#C0564D]")}>{formatEuro(marge)}</span>
                <span className="rounded-[6px] bg-[#FFFFFF] px-1.5 py-0.5 font-semibold text-[#147065] text-[11px]">{margePct.toFixed(1)} %</span>
              </span>
            </div>
          </div>
        )}

        <p className="mt-4 text-[#9A9A95] text-[11px]">
          Estimation indicative basée sur vos paramètres de reprise. Le réparateur garde la main sur le prix proposé.
        </p>
      </div>
    </aside>
  );
}

/* ════════════════════════════ Historique ════════════════════════════ */

const DECISION_TONE: Record<string, string> = {
  "Estimation enregistrée": "bg-[#FFFFFF] text-[#6B6B6B]",
  Brouillon: "bg-[#FFFFFF] text-[#9A6B00]",
  "Achat créé": "bg-[#FFFFFF] text-[#147065]",
  "Envoyé en reconditionnement": "bg-[#FFFFFF] text-[#167B70]",
  "Refus client": "bg-[#FFFFFF] text-[#C0564D]",
};

function ConditionneHistory({
  records,
  onBack,
}: Readonly<{ records: ReturnType<typeof useConditionneStore.getState>["records"]; onBack: () => void }>) {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-semibold text-[#1A1916] text-[26px] tracking-tight">Historique conditionné</h1>
          <p className="text-[#6B6B6B] text-sm">Reprises estimées au comptoir.</p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-[#E8E8E5] bg-white px-4 font-semibold text-[#1A1916] text-sm transition hover:bg-[#FFFFFF]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Nouvelle estimation
        </button>
      </div>

      {records.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#E8E8E5] bg-white px-6 py-16 text-center text-[#6B6B6B]">Aucune estimation enregistrée.</div>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[16px] border border-[#E8E8E5] bg-white px-5 py-4" key={r.id}>
              <RealDeviceVisual brand={r.brand} className="size-12 rounded-[12px] border border-[#E8E8E5] bg-[#FFFFFF] p-1" model={r.model} type="Smartphone" />
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold text-[#1A1916]">{[r.brand, r.model, r.storage].filter(Boolean).join(" ")}</p>
                <p className="text-[#6B6B6B] text-xs">
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")} · {r.etatGeneral}
                  {r.probleme !== "Aucun" ? ` · ${r.probleme}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#6B6B6B] text-[11px]">Proposé</p>
                <p className="font-bold text-[#1A1916]">{formatEuro(r.prixPropose)}</p>
              </div>
              <div className="text-right">
                <p className="text-[#6B6B6B] text-[11px]">Marge</p>
                <p className="font-semibold text-[#147065]">{formatEuro(r.marge)}</p>
              </div>
              <span className={cn("rounded-[8px] px-2.5 py-1 font-semibold text-[12px]", DECISION_TONE[r.decision] ?? "bg-[#FFFFFF] text-[#6B6B6B]")}>
                {r.decision}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════ Confirmation ════════════════════════════ */

function DoneCard({
  decision,
  sentToRecond,
  onNew,
  onClose,
}: Readonly<{ decision: string; sentToRecond: boolean; onNew: () => void; onClose: () => void }>) {
  return (
    <div className="mx-auto grid min-h-[60vh] w-full max-w-[560px] place-items-center">
      <div className="w-full rounded-[22px] border border-[#E8E8E5] bg-white p-8 text-center shadow-[0_1px_2px_rgba(26,25,22,0.035)]">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#FFFFFF] text-[#147065]">
          <BadgeCheck className="size-8" />
        </span>
        <h2 className="mt-5 font-semibold text-[#1A1916] text-xl">{decision}</h2>
        <p className="mt-1.5 text-[#6B6B6B] text-sm">
          {sentToRecond
            ? "Un dossier de reconditionnement a été créé (Atelier → Reconditionnement) avec le modèle, les photos, les défauts et les prix. Le prix de rachat est déduit du CA du jour."
            : decision === "Brouillon"
              ? "Le rachat a été enregistré en brouillon dans l'historique conditionné. Il n'impacte pas encore le CA tant qu'il n'est pas validé."
              : "L'estimation a été enregistrée dans l'historique conditionné."}
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            className="inline-flex h-13 items-center justify-center gap-2 rounded-[14px] bg-[#2A9D8F] px-6 py-3.5 font-semibold text-base text-white transition hover:bg-[#238579]"
            onClick={onNew}
            type="button"
          >
            <RotateCcw className="size-5" />
            Nouvelle estimation
          </button>
          <button
            className="inline-flex h-13 items-center justify-center gap-2 rounded-[14px] border border-[#E8E8E5] bg-white px-6 py-3.5 font-semibold text-base text-[#1A1916] transition hover:bg-[#FFFFFF]"
            onClick={onClose}
            type="button"
          >
            Retour au comptoir
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Primitives tactiles ─────────── */

function SectionTitle({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold text-[#1A1916] text-xl tracking-tight">{title}</h2>
      <p className="mt-0.5 text-[#6B6B6B] text-sm">{subtitle}</p>
    </div>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label className="block space-y-2">
      <span className="font-medium text-[#1A1916] text-sm">{label}</span>
      {children}
    </label>
  );
}

function BigToggle({ active, label, onClick }: Readonly<{ active: boolean; label: string; onClick: () => void }>) {
  return (
    <button
      className={cn(
        "h-14 flex-1 rounded-[14px] border font-semibold text-base transition",
        active ? "border-[#2A9D8F] bg-[#FFFFFF] text-[#167B70]" : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#2A9D8F]/40",
      )}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: Readonly<{ label: string; options: string[]; value: string; onChange: (v: string) => void }>) {
  return (
    <div className="mb-5">
      <p className="mb-2 font-medium text-[#1A1916] text-sm">{label}</p>
      <div className="flex flex-wrap gap-2.5">
        {options.map((opt) => (
          <button
            className={cn(
              "h-12 rounded-[12px] border px-4 font-semibold text-sm transition",
              value === opt ? "border-[#2A9D8F] bg-[#2A9D8F] text-white" : "border-[#E8E8E5] bg-white text-[#1A1916] hover:border-[#2A9D8F]/40",
            )}
            key={opt}
            onClick={() => onChange(opt)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FunctionRow({
  label,
  value,
  onChange,
  okDefautLabels = ["OK", "Défaut", "Non testé"],
}: Readonly<{ label: string; value: string; onChange: (v: FonctionEtat) => void; okDefautLabels?: [string, string, string] | string[] }>) {
  const tone = (opt: string) =>
    value !== opt
      ? "border-[#E8E8E5] bg-white text-[#6B6B6B]"
      : opt === "OK"
        ? "border-[#CDEBE4] bg-[#FFFFFF] text-[#147065]"
        : opt === "Non testé"
          ? "border-[#E8E8E5] bg-[#FFFFFF] text-[#1A1916]"
          : "border-[#F0D2CD] bg-[#FFFFFF] text-[#C0564D]";
  return (
    <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[#FFFFFF] px-3 py-2">
      <span className="truncate font-medium text-[#1A1916] text-sm">{label}</span>
      <div className="flex shrink-0 gap-1.5">
        {okDefautLabels.map((opt) => (
          <button
            className={cn("h-9 rounded-[8px] border px-2.5 font-semibold text-[12px] transition", tone(opt))}
            key={opt}
            onClick={() => onChange(opt as FonctionEtat)}
            type="button"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function BigLine({
  label,
  value,
  muted,
  bold,
  highlight,
  valueClass,
}: Readonly<{ label: string; value: string; muted?: boolean; bold?: boolean; highlight?: boolean; valueClass?: string }>) {
  if (highlight) {
    return (
      <div className="flex items-center justify-between rounded-[14px] bg-[#FFFFFF] px-4 py-3">
        <span className="font-semibold text-[#167B70] text-base">{label}</span>
        <span className="font-bold text-[#147065] text-2xl">{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className={cn("text-base", muted ? "text-[#6B6B6B]" : bold ? "font-semibold text-[#1A1916]" : "text-[#1A1916]")}>{label}</span>
      <span className={cn("text-base tabular-nums", bold ? "font-bold text-[#1A1916]" : "font-semibold text-[#1A1916]", valueClass)}>{value}</span>
    </div>
  );
}

function SumLine({ label, value, muted, bold }: Readonly<{ label: string; value: string; muted?: boolean; bold?: boolean }>) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? "text-[#6B6B6B]" : bold ? "font-semibold text-[#1A1916]" : "text-[#1A1916]")}>{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-[#1A1916]" : "font-semibold text-[#1A1916]")}>{value}</span>
    </div>
  );
}
