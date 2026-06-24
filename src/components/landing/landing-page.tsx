"use client";

import type { CSSProperties, FormEvent, TouchEvent } from "react";
import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleCheck,
  Clock3,
  CreditCard,
  FileCheck2,
  FileText,
  Headphones,
  LockKeyhole,
  Mail,
  Menu,
  PackageCheck,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

import styles from "./landing-page.module.css";

const benefits = [
  {
    title: "Moins d’administratif",
    subtitle: "Documents, devis, factures et dossiers centralisés.",
    bullets: ["Bons de prise en charge", "Devis et factures", "Historique client"],
    icon: FileText,
    image: "/mockups/mockup-administratif-dossier.png",
  },
  {
    title: "Moins d’appels",
    subtitle: "Vos clients trouvent leurs réponses, vous gardez votre concentration.",
    bullets: ["Suivi en ligne 24/7", "Notifications automatiques", "Moins d’interruptions"],
    icon: Phone,
    image: "/mockups/mockup-moins-appels.png",
  },
  {
    title: "Stock intelligent via partenaires IA",
    subtitle: "Le bon produit, au bon moment, au bon prix.",
    bullets: ["Import fournisseurs via PDF ou photo", "Mise à jour automatique des stocks", "Achats suggérés par IA"],
    icon: PackageCheck,
    image: "/mockups/mockup-stock-intelligent.png",
  },
  {
    title: "Moins de litiges",
    subtitle: "Chaque étape est tracée, chaque action est protégée.",
    bullets: [
      "Historique complet des interventions",
      "Preuves et documents centralisés",
      "Transparence totale avec vos clients",
    ],
    icon: ShieldCheck,
    image: "/mockups/mockup-anti-litige-tablette.png",
  },
  {
    title: "Plus de contrôle",
    subtitle: "Vos données, vos indicateurs, vos décisions.",
    bullets: [
      "Tableaux de bord clairs et utiles",
      "Pilotage en temps réel de la performance",
      "Décisions éclairées, résultats mesurables",
    ],
    icon: BarChart3,
    image: "/mockups/mockup-dashboard-controle.png",
  },
  {
    title: "QualiRépar simplifié",
    subtitle: "Préparez et centralisez les éléments nécessaires à vos dossiers.",
    bullets: ["Documents regroupés", "Pièces et interventions suivies", "Dossiers mieux organisés"],
    icon: FileCheck2,
    image: "code",
  },
];

const tools = [
  {
    title: "Paiement en ligne",
    subtitle: "SumUp / Stripe",
    bullets: [
      "Liens de paiement sécurisés envoyés à vos clients.",
      "Acompte ou paiement total en quelques clics.",
      "Suivi des transactions en temps réel.",
    ],
    icon: CreditCard,
    image: "/mockups/mockup-paiement.png",
    badge: "Paiement sécurisé",
  },
  {
    title: "Widget de rendez-vous",
    subtitle: "Intégrez-le à votre site.",
    bullets: [
      "Calendrier en temps réel et créneaux disponibles.",
      "Choix de l’appareil et du problème.",
      "Notes et pièces jointes optionnelles.",
    ],
    icon: CalendarDays,
    image: "/mockups/mockup-rendez-vous.png",
  },
  {
    title: "Prix de référence avec IA",
    subtitle: "Achat / revente / marge.",
    bullets: [
      "Estimez vos prix d’achat et de revente à partir de millions de références.",
      "IA intégrée pour des suggestions fiables et à jour.",
      "Marge estimée pour décider en confiance.",
    ],
    icon: WandSparkles,
    image: "/mockups/mockup-prix-ia.png",
  },
  {
    title: "Protection anti-litige",
    subtitle: "Dossier complet et horodaté.",
    bullets: [
      "Photos et état de l’appareil à l’entrée.",
      "Accessoires et observations enregistrés.",
      "Signature du client et historique horodaté.",
    ],
    icon: ShieldCheck,
    image: "/mockups/mockup-protection-anti-litige.png",
  },
];

const workshopModes = [
  {
    title: "Atelier comptoir",
    description:
      "Accueillez vos clients, créez une prise en charge, préparez un devis et indiquez les règlements externes depuis une interface simple.",
    icon: Store,
    bullets: ["Prise en charge rapide", "Devis et règlement externe", "QR code et suivi client"],
    image: "/mockups/mockup-atelier-comptoir.png",
  },
  {
    title: "Réparateur en déplacement",
    description: "Gardez votre planning, vos interventions et vos dossiers clients dans votre poche.",
    icon: Truck,
    bullets: ["Tournées du jour", "Interventions mobiles", "Documents et statuts accessibles partout"],
    image: "/mockups/mockup-deplacement.png",
  },
  {
    title: "Reconditionnement & revente",
    description: "Suivez vos achats, vos lots, vos coûts, vos marges et vos opportunités de revente.",
    icon: PackageCheck,
    stats: [
      { label: "achats", value: 120, suffix: "" },
      { label: "lots", value: 36, suffix: "" },
      { label: "en reconditionnement", value: 58, suffix: "" },
      { label: "prêts à vendre", value: 158, suffix: "" },
      { label: "marge moyenne", value: 28.4, suffix: " %" },
    ],
    image: "/mockups/mockup-reconditionnement.png",
  },
  {
    title: "Multi-boutique",
    description: "Pilotez plusieurs boutiques depuis un seul endroit : équipes, stocks, ventes et performances.",
    icon: Building2,
    stats: [
      { label: "boutiques actives", value: 3, suffix: "" },
      { label: "membres", value: 24, suffix: "" },
      { label: "articles en stock", value: 12540, suffix: "" },
      { label: "CA du jour", value: 9450, suffix: " EUR" },
    ],
    image: "/mockups/mockup-multiboutique.png",
  },
];

const plans = [
  {
    name: "Gratuit",
    monthly: "0 EUR",
    annual: "0 EUR",
    annualNote: "",
    description: "Pour découvrir Behar Tech Pro.",
    features: ["1 poste", "10 réparations / mois", "10 SMS inclus", "Suivi client de base"],
    cta: "Commencer",
  },
  {
    name: "Starter",
    monthly: "29 EUR",
    annual: "290 EUR",
    annualNote: "Soit 24 EUR / mois",
    description: "Pour démarrer proprement.",
    features: ["2 postes", "Réparations illimitées", "30 SMS inclus", "Devis & factures"],
    cta: "Choisir Starter",
  },
  {
    name: "Pro",
    monthly: "49 EUR",
    annual: "490 EUR",
    annualNote: "Soit 41 EUR / mois",
    description: "Pour gérer un atelier complet.",
    features: [
      "4 postes",
      "Réparations illimitées",
      "150 SMS inclus",
      "Stock, documents et suivi client",
      "SMS & e-mails automatiques",
    ],
    cta: "Choisir Pro",
    popular: true,
  },
  {
    name: "Business",
    monthly: "99 EUR",
    annual: "990 EUR",
    annualNote: "Soit 83 EUR / mois",
    description: "Pour équipes, gros volumes et multi-boutiques.",
    features: [
      "Postes illimités",
      "Réparations illimitées",
      "250 SMS inclus",
      "Multi-boutique",
      "Rôles équipe & suivi avancé",
    ],
    cta: "Choisir Business",
  },
];

const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function Brand() {
  return (
    <a className={styles.brand} href="#produit" aria-label="Behar Tech Pro, retour en haut">
      <span>BEHAR • TECH</span>
      <span className={styles.brandPro}>PRO</span>
    </a>
  );
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.14 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

function SectionHeading({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  return (
    <Reveal className={styles.sectionHeading}>
      <span className={styles.badge}>{badge}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </Reveal>
  );
}

function _StockMockup() {
  return (
    <div className={styles.stockMockup} role="img" aria-label="Aperçu du stock intelligent">
      <div className={styles.mockupTopline}>
        <div>
          <span className={styles.mockupEyebrow}>Stock intelligent</span>
          <strong>Suggestions d’achat</strong>
        </div>
        <span className={styles.aiScore}>
          <Sparkles size={13} /> IA active
        </span>
      </div>
      {[
        ["Écran iPhone 13", "Stock faible", "Commander 6"],
        ["Batterie Galaxy S23", "Rotation forte", "Commander 4"],
        ["Connecteur USB-C", "Prévision 7 j", "Commander 12"],
      ].map(([name, state, action], index) => (
        <div className={styles.stockRow} key={name}>
          <span className={styles.stockIndex}>{String(index + 1).padStart(2, "0")}</span>
          <div>
            <strong>{name}</strong>
            <span>{state}</span>
          </div>
          <button type="button">{action}</button>
        </div>
      ))}
    </div>
  );
}

function HeroDesktopInterface() {
  return (
    <div className={styles.heroDesktopUi} role="img" aria-label="Dashboard reconditionnement et achats">
      <div className={styles.heroUiTopbar}>
        <Brand />
        <span>Belmin · Gérant</span>
      </div>
      <div className={styles.heroDesktopBody}>
        <aside className={styles.heroSidebar}>
          {["Tableau de bord", "Téléphones", "Achats", "Lots", "Reconditionnement", "Ventes", "Stock"].map(
            (item, index) => (
              <span className={index === 0 ? styles.heroSidebarActive : ""} key={item}>
                {item}
              </span>
            ),
          )}
        </aside>
        <div className={styles.heroDashboard}>
          <div className={styles.heroDashboardTitle}>
            <div>
              <strong>Gérant — Reconditionnement & achats</strong>
              <span>Suivi des achats, du reconditionnement et de la rentabilité.</span>
            </div>
            <small>20 mai – 20 juin 2024</small>
          </div>
          <div className={styles.heroKpis}>
            {[
              ["Téléphones achetés", "120"],
              ["En reconditionnement", "36"],
              ["Prêts à vendre", "58"],
              ["Marge moyenne", "28,4 %"],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>+18 % vs période précédente</small>
              </div>
            ))}
          </div>
          <div className={styles.heroPerformance}>
            <strong>Performance globale</strong>
            <div>
              {[
                ["Dépenses totales", "18 450 EUR"],
                ["Coût réparations", "3 620 EUR"],
                ["Valeur de revente", "28 750 EUR"],
                ["Marge estimée", "10 300 EUR"],
              ].map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                </span>
              ))}
            </div>
          </div>
          <div className={styles.heroTable}>
            <div className={styles.heroTableHead}>
              <strong>Inventaire & rentabilité</strong>
              <span>Prix achat</span>
              <span>Coût total</span>
              <span>Marge</span>
              <span>État</span>
            </div>
            {[
              ["iPhone 13 128Go", "420 EUR", "505 EUR", "145 EUR", "Prêt à vendre"],
              ["iPhone 12 64Go", "280 EUR", "340 EUR", "110 EUR", "Prêt à vendre"],
              ["Samsung S21 128Go", "220 EUR", "290 EUR", "90 EUR", "Très bon"],
              ["iPhone 11 64Go", "180 EUR", "230 EUR", "70 EUR", "En cours"],
            ].map((row) => (
              <div className={styles.heroTableRow} key={row[0]}>
                {row.map((cell) => (
                  <span key={cell}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroTabletInterface() {
  const actions = [
    [ReceiptText, "Nouvelle prise en charge"],
    [FileText, "Nouveau devis"],
    [CalendarDays, "Rendez-vous"],
    [CreditCard, "Marquer réglé"],
    [Users, "Clients"],
    [PackageCheck, "Scanner QR"],
  ] as const;

  return (
    <div className={styles.heroTabletUi} role="img" aria-label="Accueil comptoir">
      <div className={styles.heroTabletTop}>
        <Brand />
        <span>En ligne</span>
      </div>
      <h3>Accueil comptoir</h3>
      <p>Bonjour, prêt à accueillir vos clients.</p>
      <div className={styles.heroTabletActions}>
        {actions.map(([Icon, label], index) => (
          <div key={label}>
            <span className={index === 0 ? styles.heroActionPrimary : ""}>
              <Icon />
            </span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>
      <div className={styles.heroTabletToday}>
        <strong>Aujourd’hui</strong>
        <div>
          <span>
            <b>12</b>
            <small>Réparations</small>
          </span>
          <span>
            <b>5</b>
            <small>Rendez-vous</small>
          </span>
          <span>
            <b>1 240 EUR</b>
            <small>Paiements</small>
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroPhoneInterface() {
  return (
    <div className={styles.heroPhoneUi} role="img" aria-label="Suivi de réparation">
      <div className={styles.heroPhoneTop}>
        <Brand />
        <span>FR</span>
      </div>
      <h3>Suivi de votre réparation</h3>
      <p>Nous vous tenons informé à chaque étape.</p>
      <div className={styles.heroRepairCard}>
        <div>
          <strong>REP-000124</strong>
          <span>En cours</span>
        </div>
        <small>iPhone 13 · Écran cassé</small>
      </div>
      <div className={styles.heroTimeline}>
        {["Reçu", "Diagnostic", "Réparation", "Test", "Prêt"].map((step, index) => (
          <span className={index < 3 ? styles.heroTimelineDone : ""} key={step}>
            <b>{index < 2 ? "✓" : index + 1}</b>
            <small>{step}</small>
          </span>
        ))}
      </div>
      <div className={styles.heroRepairStatus}>
        <ReceiptText />
        <span>
          <strong>Réparation en cours</strong>
          <small>Prochaine étape : test final.</small>
        </span>
      </div>
      <div className={styles.heroDocuments}>
        <strong>Documents</strong>
        {["Bon de prise en charge", "Devis", "Facture"].map((item, index) => (
          <span key={item}>
            <FileText />
            {item}
            <small>{index < 2 ? "Ouvrir" : "À venir"}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroMultiShopInterface() {
  return (
    <div className={styles.heroMultiUi} role="img" aria-label="Vue multi-boutique">
      <div className={styles.heroUiTopbar}>
        <Brand />
        <span>Vue d’ensemble</span>
      </div>
      <div className={styles.heroMultiBody}>
        <div className={styles.heroDashboardTitle}>
          <div>
            <strong>Gérant — Multi-boutique</strong>
            <span>Performances, équipes et stocks de tous vos sites.</span>
          </div>
          <small>Aujourd’hui</small>
        </div>
        <div className={styles.heroKpis}>
          {[
            ["Boutiques", "4"],
            ["Équipe", "18"],
            ["Stock global", "428"],
            ["CA du jour", "8 940 EUR"],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>Synchronisé en direct</small>
            </div>
          ))}
        </div>
        <div className={styles.heroShopList}>
          {[
            ["Paris · République", "3 450 EUR", "28,1 %"],
            ["Lyon · Part-Dieu", "2 990 EUR", "27,6 %"],
            ["Marseille · Vieux-Port", "2 190 EUR", "26,0 %"],
          ].map(([shop, revenue, margin]) => (
            <div key={shop}>
              <span>
                <Store />
                <strong>{shop}</strong>
              </span>
              <span>
                <small>CA du jour</small>
                <b>{revenue}</b>
              </span>
              <span>
                <small>Marge</small>
                <b>{margin}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function _WorkshopInterface({ index }: { index: number }) {
  if (index === 0)
    return (
      <div className={styles.workshopTabletFrame}>
        <HeroTabletInterface />
      </div>
    );
  if (index === 1)
    return (
      <div className={styles.workshopPhoneFrame}>
        <HeroPhoneInterface />
      </div>
    );
  if (index === 3) return <HeroMultiShopInterface />;
  return <HeroDesktopInterface />;
}

function _ToolPreview({ kind }: { kind: string }) {
  if (kind === "appointment") {
    return (
      <div className={styles.miniInterface}>
        <strong>Prendre rendez-vous</strong>
        <span className={styles.miniLabel}>Date</span>
        <div className={styles.fakeInput}>
          Mercredi 29 mai 2024 <CalendarDays size={14} />
        </div>
        <span className={styles.miniLabel}>Créneau</span>
        <div className={styles.slotRow}>
          {["09:00", "10:30", "14:00", "15:30"].map((slot) => (
            <span className={slot === "10:30" ? styles.slotActive : ""} key={slot}>
              {slot}
            </span>
          ))}
        </div>
        <div className={styles.fakeInput}>
          iPhone 13 Pro <ChevronDown size={14} />
        </div>
        <div className={styles.fakeInput}>
          Écran cassé <ChevronDown size={14} />
        </div>
      </div>
    );
  }

  if (kind === "pricing") {
    return (
      <div className={styles.miniInterface}>
        <div className={styles.productLine}>
          <div className={styles.phoneThumb} />
          <div>
            <strong>iPhone 13 Pro</strong>
            <span>128 Go · Graphite</span>
          </div>
          <span className={styles.aiScore}>92/100</span>
        </div>
        {[
          ["Prix d’achat suggéré", "420,00 EUR"],
          ["Coût estimé", "80,00 EUR"],
          ["Prix de revente conseillé", "649,00 EUR"],
        ].map(([label, value]) => (
          <div className={styles.priceLine} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div className={styles.marginLine}>
          <span>Marge estimée</span>
          <strong>149,00 EUR · 22,9 %</strong>
        </div>
      </div>
    );
  }

  if (kind === "protection") {
    return (
      <div className={styles.miniInterface}>
        <strong>Dossier d’intervention</strong>
        <span className={styles.miniMeta}>N° INT-2024-05-29-1267</span>
        <span className={styles.miniLabel}>Photos à l’entrée</span>
        <div className={styles.photoStrip}>
          {[1, 2, 3, 4].map((item) => (
            <span key={item}>
              <Phone size={16} />
            </span>
          ))}
        </div>
        <div className={styles.dossierLine}>
          <span>État de l’appareil</span>
          <strong>Écran rayé</strong>
        </div>
        <div className={styles.dossierLine}>
          <span>Accessoires</span>
          <strong>Boîte, câble USB-C</strong>
        </div>
        <div className={styles.signature}>
          Signature client <span>Belmin</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.miniInterface}>
      <span className={styles.mockupEyebrow}>Paiement de la réparation</span>
      <strong className={styles.paymentAmount}>279,00 EUR</strong>
      <span className={styles.miniMeta}>Réparation iPhone 13 Pro</span>
      <div className={styles.paymentBrands}>
        <span>sumup°</span>
        <span>stripe</span>
      </div>
      <button className={styles.miniPrimary} type="button">
        <LockKeyhole size={14} /> Payer en toute sécurité
      </button>
      <span className={styles.secureLine}>
        <ShieldCheck size={13} /> Paiement 100 % sécurisé
      </span>
    </div>
  );
}

function QualiReparInterface() {
  return (
    <div className={styles.qualiReparUi}>
      <div className={styles.qualiReparHeader}>
        <strong>Dossier QualiRépar</strong>
        <span className={styles.activeBadge}>Prêt</span>
      </div>
      <div className={styles.qualiReparRow}>
        <span>Label QualiRépar</span>
        <strong>Certifié</strong>
      </div>
      <div className={styles.qualiReparRow}>
        <span>N° Label</span>
        <strong>QR-2026-991</strong>
      </div>
      <div className={styles.qualiReparRow}>
        <span>Facture associée</span>
        <strong>F-2026-04</strong>
      </div>
      <div className={styles.qualiReparRow}>
        <span>Mise en décharge</span>
        <strong>Oui (15 EUR)</strong>
      </div>
    </div>
  );
}

const dateOptions = [
  { iso: "2026-06-22", label: "Lun 22 juin" },
  { iso: "2026-06-23", label: "Mar 23 juin" },
  { iso: "2026-06-24", label: "Mer 24 juin" },
  { iso: "2026-06-25", label: "Jeu 25 juin" },
  { iso: "2026-06-26", label: "Ven 26 juin" },
  { iso: "2026-06-27", label: "Sam 27 juin" },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [benefitIndex, setBenefitIndex] = useState(2);
  const [workshopIndex, setWorkshopIndex] = useState(2);
  const [annual, setAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const touchStart = useRef(0);
  const heroVisual = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = heroVisual.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = Math.min(window.scrollY * 0.055, 28);
        node.style.setProperty("--parallax", `${offset}px`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const moveBenefit = (direction: number) => {
    setBenefitIndex((current) => (current + direction + benefits.length) % benefits.length);
  };

  const onBenefitTouchEnd = (event: TouchEvent) => {
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 45) moveBenefit(distance > 0 ? -1 : 1);
  };

  const scrollToContact = (plan = "") => {
    setSelectedPlan(plan);
    document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name) nextErrors.name = "Indiquez votre nom.";
    if (!email) nextErrors.email = "Indiquez votre e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Vérifiez le format de l’e-mail.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setFormSuccess(true);
  };

  const confirmBooking = () => {
    if (!selectedDate || !selectedTime) return;
    setBookingSuccess(true);
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <nav className={styles.desktopNav} aria-label="Navigation principale">
            <a href="#produit">Produit</a>
            <a href="#demo">Démo</a>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#contact">Contact</a>
          </nav>
          <button className={styles.headerCta} type="button" onClick={() => scrollToContact()}>
            Demander une démo
          </button>
          <button
            className={styles.menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        <div id="mobile-navigation" className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}>
          {[
            ["Produit", "#produit"],
            ["Démo", "#demo"],
            ["Fonctionnalités", "#fonctionnalites"],
            ["Tarifs", "#tarifs"],
            ["Contact", "#contact"],
          ].map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              scrollToContact();
            }}
          >
            Demander une démo
          </button>
        </div>
      </header>

      <section className={styles.hero} id="produit">
        <div className={styles.heroGrid}>
          <Reveal className={styles.heroCopy}>
            <span className={styles.heroBadge}>
              <span />
              La gestion d’atelier, réinventée
            </span>
            <h1>
              Passez votre
              <br />
              atelier en mode pro.
            </h1>
            <p>
              Behar Tech Pro centralise, automatise et sécurise la gestion de votre atelier. Moins d’administratif, plus
              de sérénité, un contrôle total.
            </p>
            <div className={styles.heroPoints}>
              <span>
                <ShieldCheck /> Faites confiance à une solution sécurisée et fiable.
              </span>
              <span>
                <BarChart3 /> Gardez le contrôle sur chaque réparation et chaque vente.
              </span>
              <span>
                <Users /> Offrez une expérience client fluide et professionnelle.
              </span>
            </div>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} type="button" onClick={() => scrollToContact()}>
                Demander une démo <ArrowRight size={17} />
              </button>
              <a className={styles.secondaryButton} href="#demo">
                Voir la démo interactive <ArrowRight size={16} />
              </a>
            </div>
          </Reveal>

          <div className={styles.heroVisual} ref={heroVisual}>
            <div className={styles.desktopMockup}>
              <Image
                src="/mockups/mockup-reconditionnement.png"
                alt="Dashboard de reconditionnement Behar Tech Pro sur écran"
                fill
                priority
                sizes="(max-width: 1050px) 90vw, 52vw"
                className={styles.mockupImage}
              />
            </div>
            <div className={styles.tabletMockup}>
              <Image
                src="/mockups/mockup-atelier-comptoir.png"
                alt="Accueil comptoir Behar Tech Pro sur tablette"
                fill
                priority
                sizes="(max-width: 1050px) 58vw, 32vw"
                className={styles.mockupImage}
              />
            </div>
            <div className={styles.phoneMockup}>
              <Image
                src="/mockups/hero-mobile-suivi.png"
                alt="Suivi de réparation Behar Tech Pro sur téléphone"
                fill
                priority
                sizes="(max-width: 1050px) 30vw, 16vw"
                className={styles.mockupImage}
              />
            </div>
            <div className={`${styles.floatingStat} ${styles.statRepair}`}>
              <span>
                <PackageCheck />
              </span>
              <div>
                <small>Réparations aujourd’hui</small>
                <strong>12</strong>
                <em>+3 vs hier</em>
              </div>
            </div>
            <div className={`${styles.floatingStat} ${styles.statDelay}`}>
              <span>
                <Clock3 />
              </span>
              <div>
                <small>Délai moyen</small>
                <strong>1,2 j</strong>
                <em>−18 % vs semaine dernière</em>
              </div>
            </div>
            <div className={`${styles.floatingStat} ${styles.statSatisfaction}`}>
              <span>
                <CircleCheck />
              </span>
              <div>
                <small>Taux de satisfaction</small>
                <strong>98 %</strong>
                <em>Clients satisfaits</em>
              </div>
            </div>
          </div>
        </div>

        <Reveal className={styles.trustBar} delay={180}>
          <div className={styles.trustLead}>
            <ShieldCheck />
            <span>
              <strong>+1 200 ateliers</strong>
              <small>nous font déjà confiance</small>
            </span>
          </div>
          <div>
            <Building2 />
            <span>Hébergé en Europe</span>
          </div>
          <div>
            <LockKeyhole />
            <span>Données sécurisées</span>
          </div>
          <div>
            <CircleCheck />
            <span>Sauvegardes automatiques</span>
          </div>
        </Reveal>
        <div className={styles.heroSuitePreview} aria-hidden="true">
          <div>
            <span className={styles.badge}>Tout-en-un</span>
            <h2>Une suite complète pour piloter votre atelier</h2>
          </div>
          <p>
            De l’accueil client à la revente, en passant par les achats et le reconditionnement : tout est connecté,
            tout est maîtrisé.
          </p>
          <div className={styles.heroSuiteIcons}>
            <span>
              <Users />
            </span>
            <span>
              <ReceiptText />
            </span>
            <span>
              <ShieldCheck />
            </span>
          </div>
        </div>
      </section>

      <section className={styles.section} id="demo">
        <SectionHeading
          badge="Votre quotidien, optimisé"
          title="Ce que le logiciel apporte à votre atelier."
          subtitle="Moins d’appels, moins d’administratif, plus de contrôle et une expérience client plus claire."
        />
        <Reveal className={styles.benefitsShell}>
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
            type="button"
            onClick={() => moveBenefit(-1)}
            aria-label="Bénéfice précédent"
          >
            <ArrowLeft />
          </button>
          <div
            className={styles.benefitRail}
            onTouchStart={(event) => {
              touchStart.current = event.touches[0].clientX;
            }}
            onTouchEnd={onBenefitTouchEnd}
          >
            {[-2, -1, 0, 1, 2].map((offset) => {
              const index = (benefitIndex + offset + benefits.length) % benefits.length;
              const benefit = benefits[index];
              const Icon = benefit.icon;
              return (
                <article
                  className={`${styles.benefitCard} ${offset === 0 ? styles.benefitCardActive : ""}`}
                  key={`${benefit.title}-${offset}`}
                  aria-hidden={offset !== 0}
                >
                  <div className={styles.benefitCopy}>
                    <div className={styles.iconBubble}>
                      <Icon />
                    </div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.subtitle}</p>
                    <ul>
                      {benefit.bullets.map((bullet) => (
                        <li key={bullet}>
                          <CheckCircle2 /> {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {benefit.image === "code" ? (
                    <QualiReparInterface />
                  ) : (
                    <div className={styles.benefitMockupWrap}>
                      <Image
                        src={benefit.image}
                        alt={benefit.title}
                        fill
                        sizes="(max-width: 650px) 86vw, 42vw"
                        className={styles.benefitMockupImage}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <button
            className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
            type="button"
            onClick={() => moveBenefit(1)}
            aria-label="Bénéfice suivant"
          >
            <ArrowRight />
          </button>
          <nav className={styles.dots} aria-label="Pagination des bénéfices">
            {benefits.map((benefit, index) => (
              <button
                type="button"
                key={benefit.title}
                aria-label={`Afficher ${benefit.title}`}
                className={index === benefitIndex ? styles.dotActive : ""}
                onClick={() => setBenefitIndex(index)}
              />
            ))}
          </nav>
          <p className={styles.swipeHint}>
            <span>⇆</span> Faites glisser pour découvrir tous les bénéfices
          </p>
        </Reveal>
      </section>

      <section className={`${styles.section} ${styles.toolsSection}`} id="fonctionnalites">
        <SectionHeading
          badge="Tout-en-un"
          title="Quatre outils pour développer votre atelier."
          subtitle="Paiement, prise de rendez-vous, prix de référence et protection anti-litige : tout est connecté pour gagner du temps et renforcer la confiance."
        />
        <div className={styles.toolsGrid}>
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <Reveal key={tool.title} delay={index * 80}>
                <article className={styles.toolCard}>
                  <div className={styles.toolHeader}>
                    <span className={styles.iconBubble}>
                      <Icon />
                    </span>
                    <span className={styles.toolHeading}>
                      <strong>{tool.title}</strong>
                      <small>{tool.subtitle}</small>
                    </span>
                    {tool.badge && <span className={styles.toolBadge}>{tool.badge}</span>}
                  </div>
                  <ul className={styles.toolBullets}>
                    {tool.bullets.map((bullet) => (
                      <li key={bullet}>
                        <CheckCircle2 /> {bullet}
                      </li>
                    ))}
                  </ul>
                  <div className={styles.toolMockupWrap}>
                    <Image
                      src={tool.image}
                      alt={tool.title}
                      fill
                      sizes="(max-width: 850px) 88vw, 23vw"
                      className={styles.toolMockupImage}
                    />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
        <div className={styles.toolsFooter}>
          <div className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span className={styles.dotVisualActive} />
            <span />
            <span />
            <span />
          </div>
          <p>
            <ShieldCheck /> Un écosystème simple, premium et conçu pour les ateliers exigeants.
          </p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.workshopSection}`}>
        <SectionHeading
          badge="Tout-en-un"
          title="Un logiciel pour chaque type d’atelier."
          subtitle="Du comptoir à la revente, en passant par l’intervention mobile et le multi-site."
        />
        <Reveal>
          <div className={styles.workshopStage}>
            <button
              className={styles.stageArrow}
              type="button"
              aria-label="Mode précédent"
              onClick={() => setWorkshopIndex((workshopIndex - 1 + workshopModes.length) % workshopModes.length)}
            >
              <ArrowLeft />
            </button>
            <div className={styles.workshopSideRail}>
              {workshopModes
                .filter((_, index) => index !== workshopIndex)
                .map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      type="button"
                      className={styles.workshopSideCard}
                      key={mode.title}
                      tabIndex={-1}
                      onClick={() => setWorkshopIndex(workshopModes.indexOf(mode))}
                    >
                      <span className={styles.iconBubble}>
                        <Icon />
                      </span>
                      <strong>{mode.title}</strong>
                      <span className={styles.workshopSideImage}>
                        <Image src={mode.image} alt="" fill sizes="240px" />
                      </span>
                    </button>
                  );
                })}
            </div>
            <div className={styles.workshopMain}>
              <div className={styles.workshopIntro}>
                <div className={styles.iconBubble}>
                  {(() => {
                    const Icon = workshopModes[workshopIndex].icon;
                    return <Icon />;
                  })()}
                </div>
                <div>
                  <h3>{workshopModes[workshopIndex].title}</h3>
                  <p>{workshopModes[workshopIndex].description}</p>
                </div>
              </div>
              {workshopModes[workshopIndex].bullets ? (
                <ul className={styles.workshopBullets}>
                  {workshopModes[workshopIndex].bullets.map((bullet) => (
                    <li key={bullet}>
                      <CheckCircle2 /> {bullet}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.workshopStats}>
                  {workshopModes[workshopIndex].stats?.map((stat) => (
                    <div key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>
                        {Number.isInteger(stat.value)
                          ? stat.value.toLocaleString("fr-FR")
                          : stat.value.toFixed(1).replace(".", ",")}
                        {stat.suffix}
                      </strong>
                      <small>Suivi en temps réel</small>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.workshopImageWrap}>
                <Image
                  src={workshopModes[workshopIndex].image}
                  alt={workshopModes[workshopIndex].title}
                  fill
                  sizes="(max-width: 650px) 88vw, 72vw"
                  className={styles.workshopMockupImage}
                />
              </div>
            </div>
            <button
              className={styles.stageArrow}
              type="button"
              aria-label="Mode suivant"
              onClick={() => setWorkshopIndex((workshopIndex + 1) % workshopModes.length)}
            >
              <ArrowRight />
            </button>
          </div>
          <div className={styles.dots}>
            {workshopModes.map((mode, index) => (
              <button
                type="button"
                key={mode.title}
                aria-label={`Afficher ${mode.title}`}
                className={workshopIndex === index ? styles.dotActive : ""}
                onClick={() => setWorkshopIndex(index)}
              />
            ))}
          </div>
          <p className={styles.workshopFooter}>
            Un écosystème complet adapté à votre métier, pour gagner du temps, augmenter votre rentabilité et offrir une
            expérience client irréprochable.
          </p>
        </Reveal>
      </section>

      <section className={`${styles.section} ${styles.pricingSection}`} id="tarifs">
        <SectionHeading
          badge="Simple et transparent"
          title="Des tarifs simples, pensés pour chaque atelier."
          subtitle="Commencez gratuitement, passez en Pro quand votre atelier grandit."
        />
        <Reveal className={styles.billingToggleWrap}>
          <div className={styles.billingToggle}>
            <button type="button" className={!annual ? styles.billingActive : ""} onClick={() => setAnnual(false)}>
              Mensuel
            </button>
            <button type="button" className={annual ? styles.billingActive : ""} onClick={() => setAnnual(true)}>
              Annuel
            </button>
          </div>
          <span>2 mois offerts</span>
        </Reveal>
        <div className={styles.pricingGrid}>
          {plans.map((plan, index) => (
            <Reveal key={plan.name} delay={index * 80}>
              <article className={`${styles.planCard} ${plan.popular ? styles.planPopular : ""}`}>
                {plan.popular && <span className={styles.popularBadge}>Le plus choisi</span>}
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <div className={styles.planPrice}>
                  <strong>{annual ? plan.annual : plan.monthly}</strong>
                  <span>{annual ? "/ an" : "/ mois"}</span>
                </div>
                <small className={styles.annualNote}>
                  {annual ? plan.annualNote || "Toujours gratuit" : "Facturation mensuelle"}
                </small>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check /> {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={plan.popular ? styles.primaryButton : styles.planButton}
                  type="button"
                  onClick={() => scrollToContact(plan.name)}
                >
                  {plan.cta}
                </button>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className={styles.pricingTrust}>
          <span>
            <CircleCheck /> Sans engagement
          </span>
          <span>
            <ArrowRight /> Changez d’offre à tout moment
          </span>
          <span>
            <ShieldCheck /> Données sécurisées
          </span>
        </Reveal>
      </section>

      <section className={`${styles.section} ${styles.contactSection}`} id="contact">
        <SectionHeading
          badge="Parlons de votre atelier"
          title="Passez à l’étape suivante."
          subtitle="Demandez vos tarifs, posez vos questions ou prenez directement rendez-vous."
        />
        <Reveal className={styles.contactPanel}>
          <div className={styles.contactReasons}>
            <span className={styles.cardKicker}>Pourquoi nous contacter ?</span>
            <h3>Une réponse claire, adaptée à votre façon de travailler.</h3>
            {[
              [Sparkles, "Démo personnalisée", "Découvrez Behar Tech Pro adapté à votre atelier."],
              [Clock3, "Réponse rapide", "Notre équipe vous répond sous 24 h ouvrées."],
              [Headphones, "Accompagnement atelier", "Un support dédié pour vous à chaque étape."],
            ].map(([Icon, title, text]) => (
              <div className={styles.reason} key={String(title)}>
                <span>
                  <Icon />
                </span>
                <div>
                  <strong>{String(title)}</strong>
                  <p>{String(text)}</p>
                </div>
              </div>
            ))}
          </div>

          <form className={styles.contactForm} onSubmit={submitContact} noValidate>
            <div className={styles.formTitle}>
              <Mail />
              <div>
                <h3>Recevoir les informations</h3>
                <p>Quelques détails suffisent pour vous répondre utilement.</p>
              </div>
            </div>
            <div className={styles.formRow}>
              <label>
                Nom *<input name="name" autoComplete="name" aria-invalid={Boolean(formErrors.name)} />
              </label>
              <label>
                Atelier
                <input name="workshop" autoComplete="organization" />
              </label>
            </div>
            {formErrors.name && <span className={styles.fieldError}>{formErrors.name}</span>}
            <div className={styles.formRow}>
              <label>
                E-mail *
                <input name="email" type="email" autoComplete="email" aria-invalid={Boolean(formErrors.email)} />
              </label>
              <label>
                Téléphone
                <input name="phone" type="tel" autoComplete="tel" />
              </label>
            </div>
            {formErrors.email && <span className={styles.fieldError}>{formErrors.email}</span>}
            <label>
              Message
              <textarea
                name="message"
                defaultValue={selectedPlan ? `Je souhaite en savoir plus sur l’offre ${selectedPlan}.` : ""}
                key={selectedPlan}
                rows={4}
              />
            </label>
            <button className={styles.primaryButton} type="submit">
              Recevoir les informations <ArrowRight />
            </button>
            {formSuccess && (
              <div className={styles.successMessage}>
                <CheckCircle2 /> Votre demande a bien été envoyée. Nous vous recontactons rapidement.
              </div>
            )}
          </form>

          <div className={styles.bookingCard}>
            <div className={styles.formTitle}>
              <CalendarDays />
              <div>
                <h3>Prendre rendez-vous</h3>
                <p>Choisissez simplement votre créneau de démo.</p>
              </div>
            </div>
            <span className={styles.inputLegend}>Sélectionnez une date</span>
            <div className={styles.dateGrid}>
              {dateOptions.map((date) => (
                <button
                  type="button"
                  key={date.iso}
                  className={selectedDate === date.iso ? styles.dateActive : ""}
                  onClick={() => {
                    setSelectedDate(date.iso);
                    setBookingSuccess(false);
                  }}
                >
                  {date.label}
                </button>
              ))}
            </div>
            <span className={styles.inputLegend}>Sélectionnez une heure</span>
            <div className={styles.timeGrid}>
              {timeSlots.map((time) => (
                <button
                  type="button"
                  key={time}
                  className={selectedTime === time ? styles.timeActive : ""}
                  onClick={() => {
                    setSelectedTime(time);
                    setBookingSuccess(false);
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
            <button
              className={styles.bookingButton}
              type="button"
              disabled={!selectedDate || !selectedTime}
              onClick={confirmBooking}
            >
              Prendre rendez-vous
            </button>
            {bookingSuccess && (
              <div className={styles.successMessage}>
                <CheckCircle2 /> Votre créneau est réservé pour la démo.
              </div>
            )}
          </div>
        </Reveal>

        <div className={styles.contactCards}>
          <Reveal>
            <a href="mailto:contact@behartechpro.fr">
              <Mail />
              <span>
                <small>Par e-mail</small>
                <strong>contact@behartechpro.fr</strong>
              </span>
              <ArrowRight />
            </a>
          </Reveal>
          <Reveal delay={80}>
            <a href="tel:+33612345678">
              <Phone />
              <span>
                <small>Par téléphone</small>
                <strong>06 12 34 56 78</strong>
              </span>
              <ArrowRight />
            </a>
          </Reveal>
          <Reveal delay={160}>
            <button type="button" onClick={() => scrollToContact("grille tarifaire")}>
              <ReceiptText />
              <span>
                <small>Pour les tarifs</small>
                <strong>Demandez votre grille adaptée à votre atelier.</strong>
              </span>
              <ArrowRight />
            </button>
          </Reveal>
        </div>
        <Reveal className={styles.finalTrust}>
          <span>
            <CircleCheck /> Sans engagement
          </span>
          <span>
            <Clock3 /> Réponse sous 24 h ouvrées
          </span>
          <span>
            <ShieldCheck /> Données sécurisées
          </span>
        </Reveal>
      </section>

      <footer className={styles.footer}>
        <Brand />
        <p>La gestion d’atelier, en mode pro.</p>
        <a href="#produit">
          Retour en haut <ArrowRight />
        </a>
      </footer>
    </main>
  );
}
