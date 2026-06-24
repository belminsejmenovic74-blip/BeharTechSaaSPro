import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Behar Tech Pro — La gestion d’atelier, en mode pro",
  description:
    "Centralisez les réparations, devis, paiements, rendez-vous, stocks et suivis clients de votre atelier avec Behar Tech Pro.",
};

export default function Home() {
  return <LandingPage />;
}
