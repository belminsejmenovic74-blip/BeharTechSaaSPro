"use client";

import { useState } from "react";

import { AtelierMockup, ComptoirMockup, DashboardMockup, MobileMockup } from "./premium/mockups";
import { ShowcaseShell } from "./premium/showcase-shell";

/** Bloc « Pensé pour chaque besoin de votre boutique » — mockups en vrai code. */
const TABS = [
  {
    label: "Dashboard / Accueil",
    leftTitle: "Dashboard / Accueil",
    benefits: [
      "Vue complète de l’activité",
      "Chiffre d’affaires et suivi",
      "Dossiers à encaisser",
      "Pilotage quotidien",
    ],
    Mockup: DashboardMockup,
  },
  {
    label: "Comptoir",
    leftTitle: "Comptoir",
    benefits: [
      "Encaissement rapide",
      "Vente d’accessoires en 3 taps",
      "Prise en charge express",
      "Scanner QR et recherche dossier",
    ],
    Mockup: ComptoirMockup,
  },
  {
    label: "Mobile",
    leftTitle: "Mobile",
    benefits: [
      "Votre atelier dans la poche",
      "Suivi des dossiers en temps réel",
      "Pipeline réparations mobile",
      "Rendez-vous et notifications",
    ],
    Mockup: MobileMockup,
  },
  {
    label: "Mode atelier",
    leftTitle: "Mode atelier",
    benefits: [
      "File d’attente en kanban",
      "Reçu, diagnostic, réparation, test",
      "Alertes retards et blocages",
      "Charge atelier en un coup d’œil",
    ],
    Mockup: AtelierMockup,
  },
];

export function BoutiqueNeedsSection() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];
  const Mockup = tab.Mockup;

  return (
    <ShowcaseShell
      id="pense"
      titleLines={["Pensé pour chaque besoin", "de votre boutique."]}
      leftTitle={tab.leftTitle}
      benefits={tab.benefits}
      tabs={TABS.map((t) => ({ label: t.label }))}
      active={active}
      setActive={setActive}
      tabStyle="dots"
    >
      <div style={{ width: "100%", maxWidth: 820, display: "flex", justifyContent: "center" }}>
        <Mockup />
      </div>
    </ShowcaseShell>
  );
}
