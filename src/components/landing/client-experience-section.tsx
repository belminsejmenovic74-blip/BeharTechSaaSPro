"use client";

import { useState } from "react";

import { Link2, Mail, MessageSquare, Package, Smartphone, Star, TrendingUp } from "lucide-react";

import { PhoneAvis, PhoneReconditionne, PhoneSms, PhoneSuivi } from "./premium/client-screens";
import { ShowcaseShell, type FloatingCard } from "./premium/showcase-shell";

const FLOATING: FloatingCard[] = [
  { icon: <MessageSquare size={16} />, title: "SMS envoyé", text: "Notifié à chaque étape.", pos: "tl" },
  { icon: <Mail size={16} />, title: "Email envoyé", text: "Confirmation automatique.", pos: "bl" },
  { icon: <Link2 size={16} />, title: "Documents accessibles", text: "Facture, certificat, photos.", pos: "tr" },
  { icon: <Package size={16} />, title: "Prêt à récupérer", text: "Alerte dès que c’est prêt.", pos: "br" },
];

const TABS = [
  { label: "Suivi de réparation", icon: <TrendingUp size={16} />, Mockup: PhoneSuivi },
  { label: "Téléphone reconditionné", icon: <Smartphone size={16} />, Mockup: PhoneReconditionne },
  { label: "SMS & email", icon: <Mail size={16} />, Mockup: PhoneSms },
  { label: "Avis Google", icon: <Star size={16} />, Mockup: PhoneAvis },
];

const BENEFITS = [
  "Suivi clair et rassurant",
  "SMS et email automatiques",
  "Documents accessibles",
  "Contact direct avec l’atelier",
];

export function ClientExperienceSection() {
  const [active, setActive] = useState(0);
  const Mockup = TABS[active].Mockup;

  return (
    <ShowcaseShell
      id="clients"
      brand
      titleLines={["On pense à vos clients"]}
      accentSubtitle="Expérience plus professionnelle"
      description="Au lieu d’un papier perdu ou d’un message WhatsApp flou, le client a un vrai suivi digital, comme dans un service premium."
      leftTitle="Avantages client"
      benefits={BENEFITS}
      tabs={TABS.map((t) => ({ label: t.label, icon: t.icon }))}
      active={active}
      setActive={setActive}
      tabStyle="filled"
      floating={FLOATING}
    >
      <Mockup />
    </ShowcaseShell>
  );
}
