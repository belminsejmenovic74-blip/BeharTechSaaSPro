/**
 * Behar Tech Pro — Landing "tunnel" content (CMS).
 *
 * Tout le contenu de la landing est piloté depuis ce fichier :
 * titres, sous-titres, textes, avantages (liste de gauche), onglets (à droite),
 * images des mockups, logos, statistiques, CTA, ordre des sections,
 * position/affichage des flèches et direction des demi-cercles ("down" / "up").
 *
 * Aucune couleur / DA n'est définie ici : elle vit dans landing-page.module.css
 * (fond #FAFAF8, texte #1A1916, secondaire #6B6B6B, accent #2A9D8F).
 */

/** Icônes disponibles (mappées vers lucide-react dans ./_shared). */
export type IconName =
  | "layout"
  | "store"
  | "phone"
  | "wrench"
  | "sparkles"
  | "box"
  | "trending"
  | "calendar"
  | "mail"
  | "message"
  | "star"
  | "link"
  | "package"
  | "globe"
  | "clock"
  | "check"
  | "shield"
  | "file"
  | "arrow-right"
  | "google";

const ASSET = "/assets/landing/";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type NavLink = { label: string; href: string };

export type HeaderContent = {
  brand: { name: string; mark: string; pro: string };
  connexion: NavLink;
  cta: NavLink;
};

export type HeroContent = {
  label: string;
  title: string[];
  subtitle: string;
  cta: NavLink;
  image: string;
  imageAlt: string;
};

export type Stat = {
  value: string;
  label: string;
  icon?: IconName;
};

export type TrustStatsContent = {
  kicker: string;
  stats: Stat[];
};

/** Un onglet de showcase = un mockup + ses avantages. */
export type ShowcaseTab = {
  id: string;
  label: string;
  icon: IconName;
  image: string;
  /** Titre de la liste de gauche quand leftTitleMode = "tab". */
  title: string;
  benefits: string[];
  /** Badge affiché en haut à droite pour cet onglet (ex. "Grâce à l'IA Amazon"). */
  badge?: string;
};

/** Carte flottante autour du téléphone (variante "phone"). */
export type FloatingCard = {
  title: string;
  text: string;
  icon: IconName;
  /** Ancrage visuel autour du mockup. */
  anchor: "top-left" | "bottom-left" | "top-right" | "bottom-right";
};

export type ShowcaseContent = {
  id: string;
  /** "desktop" = mockup paysage centré ; "phone" = mockup téléphone + cartes flottantes. */
  variant: "desktop" | "phone";
  title: string[];
  subtitle?: string;
  /** Sous-titre en accent teal (ex. "Expérience plus professionnelle"). */
  accentSubtitle?: string;
  description?: string;
  /** "fixed" = leftTitle constant ; "tab" = titre = titre de l'onglet actif. */
  leftTitleMode: "fixed" | "tab";
  leftTitle?: string;
  tabs: ShowcaseTab[];
  /** Index de l'onglet actif par défaut. */
  defaultTab: number;
  floatingCards?: FloatingCard[];
  showArrows: boolean;
  /** "sides" = une flèche à gauche + une à droite ; "right" = une seule flèche (droite). */
  arrowPosition: "sides" | "right";
  showDots: boolean;
};

export type IntegrationLogo = {
  name: string;
  text: string;
  logo: string;
};

export type IntegrationsContent = {
  kicker: string;
  title: string;
  subtitle: string;
  logos: IntegrationLogo[];
};

export type FinalCtaContent = {
  title: string;
  subtitle: string;
  buttons: Array<NavLink & { variant: "primary" | "ghost" }>;
};

/** Props du demi-cercle de transition (tunnel). */
export type TunnelArcConfig = {
  direction: "down" | "up";
  gradientColors: string[];
  height: number;
  circleSize: number;
  opacity?: number;
  position?: "top" | "bottom" | "static";
};

/** Ordre des sections (piloté ici). */
export type Section =
  | { kind: "hero" }
  | { kind: "trustStats" }
  | { kind: "arc"; ref: keyof LandingContent["arcs"] }
  | { kind: "showcase"; ref: keyof LandingContent["showcases"] }
  | { kind: "integrations" }
  | { kind: "finalCta" };

export type LandingContent = {
  header: HeaderContent;
  hero: HeroContent;
  trustStats: TrustStatsContent;
  showcases: Record<"boutique" | "services" | "clients", ShowcaseContent>;
  arcs: Record<"enter" | "exit", TunnelArcConfig>;
  integrations: IntegrationsContent;
  finalCta: FinalCtaContent;
  sections: Section[];
};

/* ------------------------------------------------------------------ */
/* Contenu                                                             */
/* ------------------------------------------------------------------ */

/** Dégradé de tunnel : teal clair + beige clair + blanc cassé (doux mais visible, pas d'orange fort). */
const TUNNEL_GRADIENT = ["#FBFAF7", "#D2ECE4", "#F0DFC8"];

export const landingContent: LandingContent = {
  header: {
    brand: { name: "BEHAR", mark: "TECH", pro: "PRO" },
    connexion: { label: "Connexion", href: "/dashboard" },
    cta: { label: "Essayer gratuitement", href: "/contact" },
  },

  hero: {
    label: "Le logiciel premium pour ateliers de réparation",
    title: ["Transformez", "votre atelier."],
    subtitle: "Gagnez du temps. Gagnez des clients. Centralisez votre atelier dans un seul outil.",
    cta: { label: "Essayer gratuitement", href: "/contact" },
    image: `${ASSET}hero-dashboard.png`,
    imageAlt: "Aperçu du tableau de bord Behar Tech Pro",
  },

  trustStats: {
    kicker: "ILS NOUS FONT CONFIANCE",
    stats: [
      { value: "20 boutiques", label: "utilisent nos services", icon: "store" },
      { value: "UE + Suisse", label: "disponible", icon: "globe" },
      { value: "3 h", label: "de temps gagné par semaine", icon: "clock" },
      { value: "+1,4", label: "de note Google en moyenne", icon: "google" },
      { value: "+18 %", label: "de chiffre d’affaires", icon: "trending" },
    ],
  },

  showcases: {
    /* 3 — Pensé pour chaque besoin de votre boutique */
    boutique: {
      id: "boutique",
      variant: "desktop",
      title: ["Pensé pour chaque besoin", "de votre boutique."],
      leftTitleMode: "tab",
      defaultTab: 0,
      showArrows: true,
      arrowPosition: "sides",
      showDots: true,
      tabs: [
        {
          id: "dashboard",
          label: "Dashboard / Accueil",
          icon: "layout",
          image: `${ASSET}mode-dashboard.png`,
          title: "Dashboard / Accueil",
          benefits: [
            "Vue complète de l’activité",
            "Chiffre d’affaires et suivi",
            "Dossiers à encaisser",
            "Pilotage quotidien",
          ],
        },
        {
          id: "comptoir",
          label: "Comptoir",
          icon: "store",
          image: `${ASSET}mode-comptoir.png`,
          title: "Comptoir",
          benefits: [
            "Créer un dossier en quelques secondes",
            "Retrouver un client rapidement",
            "Scanner un QR code",
            "Encaisser et générer les documents",
          ],
        },
        {
          id: "mobile",
          label: "Mobile",
          icon: "phone",
          image: `${ASSET}mode-mobile.png`,
          title: "Mobile",
          benefits: [
            "Suivre l’atelier depuis le téléphone",
            "Voir les dossiers du jour",
            "Accéder aux documents",
            "Continuer même en déplacement",
          ],
        },
        {
          id: "atelier",
          label: "Mode atelier",
          icon: "wrench",
          image: `${ASSET}mode-atelier.png`,
          title: "Mode atelier",
          benefits: [
            "File d’attente claire",
            "Statuts de réparation",
            "Dossiers en retard visibles",
            "Test final et prêt à récupérer",
          ],
        },
      ],
    },

    /* 4 — Gagnez du temps / IA & automatisation */
    services: {
      id: "services",
      variant: "desktop",
      title: ["Gagnez du temps. Gagnez des", "clients grâce à nos services."],
      subtitle: "Des outils intelligents pour automatiser, centraliser et développer votre activité.",
      leftTitleMode: "fixed",
      leftTitle: "Avantages réparateur",
      defaultTab: 0,
      showArrows: true,
      arrowPosition: "sides",
      showDots: true,
      tabs: [
        {
          id: "ocr",
          label: "IA & documents OCR",
          icon: "sparkles",
          image: `${ASSET}feature-ocr.png`,
          title: "IA & documents OCR",
          badge: "Grâce à l’IA Amazon",
          benefits: [
            "Moins d’administratif",
            "Stock mis à jour automatiquement",
            "Prix d’achat enregistrés",
            "Factures liées aux pièces",
          ],
        },
        {
          id: "rachat",
          label: "Rachat & reconditionnement",
          icon: "box",
          image: `${ASSET}feature-rachat.png`,
          title: "Rachat & reconditionnement",
          benefits: [
            "Achats téléphone centralisés",
            "Tests et grade",
            "Pièces et marge suivies",
            "Remise en vente plus rapide",
          ],
        },
        {
          id: "suivi",
          label: "Suivi & support",
          icon: "trending",
          image: `${ASSET}feature-suivi.png`,
          title: "Suivi & support",
          benefits: [
            "Moins d’appels entrants",
            "Messages client centralisés",
            "Historique complet",
            "Support plus professionnel",
          ],
        },
        {
          id: "widget",
          label: "Widget rendez-vous",
          icon: "calendar",
          image: `${ASSET}feature-widget.png`,
          title: "Widget rendez-vous",
          benefits: [
            "Plus de rendez-vous clients",
            "Réservations depuis votre site",
            "Notifications automatiques",
            "Zéro saisie manuelle",
          ],
        },
      ],
    },

    /* 5 — On pense à vos clients */
    clients: {
      id: "clients",
      variant: "phone",
      title: ["On pense à vos clients"],
      accentSubtitle: "Expérience plus professionnelle",
      description:
        "Au lieu d’un papier perdu ou d’un message WhatsApp flou, le client a un vrai suivi digital, comme dans un service premium.",
      leftTitleMode: "fixed",
      leftTitle: "Avantages client",
      defaultTab: 2, // "SMS & email"
      showArrows: true,
      arrowPosition: "right",
      showDots: true,
      floatingCards: [
        {
          title: "SMS automatique",
          text: "Le client est notifié à chaque étape.",
          icon: "message",
          anchor: "top-left",
        },
        {
          title: "Email automatique",
          text: "Un email confirme la disponibilité.",
          icon: "mail",
          anchor: "bottom-left",
        },
        { title: "Lien de suivi", text: "Un suivi digital, accessible en un clic.", icon: "link", anchor: "top-right" },
        {
          title: "Prêt à récupérer",
          text: "Alerte dès que l’appareil est prêt.",
          icon: "package",
          anchor: "bottom-right",
        },
      ],
      tabs: [
        {
          id: "suivi-reparation",
          label: "Suivi réparation",
          icon: "trending",
          image: `${ASSET}client-suivi.png`,
          title: "Suivi réparation",
          benefits: [
            "Suivi clair et rassurant",
            "SMS et email automatiques",
            "Documents accessibles",
            "Contact direct avec l’atelier",
          ],
        },
        {
          id: "reconditionne",
          label: "Téléphone reconditionné",
          icon: "phone",
          image: `${ASSET}client-reconditionne.png`,
          title: "Téléphone reconditionné",
          benefits: ["Tests détaillés", "Facture et certificat", "Photos de l’appareil", "Confiance à l’achat"],
        },
        {
          id: "sms-email",
          label: "SMS & email",
          icon: "mail",
          image: `${ASSET}client-notifications.png`,
          title: "SMS & email",
          benefits: [
            "Suivi clair et rassurant",
            "SMS et email automatiques",
            "Documents accessibles",
            "Contact direct avec l’atelier",
          ],
        },
        {
          id: "avis-google",
          label: "Avis Google",
          icon: "star",
          image: `${ASSET}client-google.png`,
          title: "Avis Google",
          benefits: [
            "Plus d’avis clients",
            "Image plus professionnelle",
            "Lien d’avis simplifié",
            "Meilleure note Google",
          ],
        },
      ],
    },
  },

  arcs: {
    // Entrée dans le tunnel : demi-cercle vers le bas, sous la section confiance.
    enter: {
      direction: "down",
      gradientColors: TUNNEL_GRADIENT,
      height: 360,
      circleSize: 1400,
      opacity: 1,
      position: "bottom",
    },
    // Sortie du tunnel : demi-cercle inversé (vers le haut), au-dessus de la section API.
    exit: {
      direction: "up",
      gradientColors: TUNNEL_GRADIENT,
      height: 360,
      circleSize: 1400,
      opacity: 1,
      position: "top",
    },
  },

  integrations: {
    kicker: "ILS NOUS FONT CONFIANCE",
    title: "Ils nous font confiance. Pourquoi pas vous ?",
    subtitle: "Des intégrations utiles pour automatiser votre atelier, informer vos clients et encaisser simplement.",
    logos: [
      { name: "Beevo SMS", text: "Envoi automatique de SMS", logo: `${ASSET}beevo-sms-logo.png` },
      { name: "Beevo E-mail", text: "E-mails transactionnels", logo: `${ASSET}beevo-email-logo.png` },
      { name: "Amazon IA", text: "OCR & lecture automatique", logo: `${ASSET}amazon-logo.png` },
      { name: "Label Quali Répar", text: "Gestion des aides réparation", logo: `${ASSET}label-quali-repar-logo.png` },
      { name: "Stripe", text: "Paiements en ligne", logo: `${ASSET}stripe-logo.png` },
      { name: "SumUp", text: "Encaissement en boutique", logo: `${ASSET}sumup-logo.png` },
    ],
  },

  finalCta: {
    title: "Votre atelier peut tourner plus simplement.",
    subtitle: "Centralisez vos réparations, vos clients, vos documents et votre suivi dans un seul outil.",
    buttons: [
      { label: "Essayer gratuitement", href: "/contact", variant: "primary" },
      { label: "Demander une démo", href: "/contact", variant: "ghost" },
    ],
  },

  /** Parcours du tunnel : confiance → boutique → temps → clients → intégrations → CTA. */
  sections: [
    { kind: "hero" },
    { kind: "trustStats" },
    { kind: "arc", ref: "enter" },
    { kind: "showcase", ref: "boutique" },
    { kind: "showcase", ref: "services" },
    { kind: "showcase", ref: "clients" },
    { kind: "arc", ref: "exit" },
    { kind: "integrations" },
    { kind: "finalCta" },
  ],
};
