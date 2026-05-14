import { CheckCircle2, FileText, Receipt, Smartphone, UserRound, WalletCards } from "lucide-react";

export const workshopInfo = {
  name: "Behar Tech",
  address: "2 rue de la Zone",
  postalCity: "74100 Annemasse",
  country: "France",
  siret: "000 000 000 00000",
  email: "contact@behartechpro.fr",
  phone: "06 12 34 56 78",
};

export const demoScenario = {
  shop_id: "shop_atelier_belmin",
  client: {
    id: "customer_belmin",
    name: "Belmin",
    phone: "06 12 34 56 78",
    email: "belmin@example.com",
  },
  repair: {
    id: "repair_belmin_iphone13",
    number: "R-2026-0518",
    device: "iPhone 13",
    issue: "Écran cassé",
    initialStatus: "Reçu",
    status: "En réparation",
    date: "21 mai 2026",
    time: "10:15",
    notes: "Le client souhaite conserver le True Tone.",
    visualState: "Écran cassé, appareil allumé",
    accessories: "Aucun",
  },
  part: {
    part: "Écran iPhone 13",
    reference: "IP13-SCR",
    purchasePrice: "80,00 €",
    salePrice: "150,00 €",
    margin: "70,00 €",
    stockBefore: 12,
    stockAfter: 11,
    supplier: "MobileParts France",
  },
  labor: {
    label: "Main d’œuvre",
    quotePrice: "30,00 €",
    invoicePrice: "40,00 €",
  },
  option: {
    label: "Protection écran optionnel",
    price: "10,00 €",
  },
  quote: {
    number: "DV-2048",
    total: "190,00 €",
    validity: "30 jours",
  },
  invoice: {
    number: "FA-2026-084",
    status: "Payée",
    payment: "Simulé",
    method: "Stripe Checkout simulé",
    paidAt: "21 mai 2026 à 14:32",
    total: "190,00 €",
  },
  margins: {
    part: "70,00 €",
    total: "100,00 €",
  },
};

export const demoSteps = [
  {
    id: "client",
    title: "Nouveau client",
    description: "Créer Belmin avec téléphone et email.",
    icon: UserRound,
  },
  {
    id: "repair",
    title: "Nouvelle réparation",
    description: "Créer l’iPhone 13 écran cassé et passer en réparation.",
    icon: Smartphone,
  },
  {
    id: "quote",
    title: "Devis",
    description: "Générer le devis public sans marge interne.",
    icon: FileText,
  },
  {
    id: "invoice",
    title: "Facture",
    description: "Convertir le devis en facture client.",
    icon: Receipt,
  },
  {
    id: "payment",
    title: "Paiement simulé",
    description: "Marquer la facture comme payée.",
    icon: WalletCards,
  },
  {
    id: "documents",
    title: "Documents générés",
    description: "Ouvrir les documents imprimables.",
    icon: FileText,
  },
  {
    id: "summary",
    title: "Résumé final",
    description: "Afficher le dossier complet et les marges.",
    icon: CheckCircle2,
  },
];

export const demoTimeline = [
  "10:15 — Client créé",
  "10:16 — Réparation créée",
  "10:20 — Diagnostic terminé",
  "10:25 — Devis généré",
  "10:30 — Devis accepté",
  "11:00 — Réparation démarrée",
  "14:20 — Facture générée",
  "14:32 — Paiement simulé reçu",
  "14:35 — SMS simulé envoyé",
  "14:40 — Appareil prêt",
];

export const demoDocuments = [
  {
    id: "intake",
    title: "Bon de prise en charge",
    description: "Document de dépôt à signer par le client et l’atelier.",
  },
  {
    id: "quote",
    title: "Devis #DV-2048",
    description: "Devis public sans prix d’achat ni marge.",
  },
  {
    id: "invoice",
    title: "Facture #FA-2026-084",
    description: "Facture client payée, sans données internes.",
  },
  {
    id: "receipt",
    title: "Reçu de paiement",
    description: "Reçu Stripe Checkout simulé.",
  },
  {
    id: "internal",
    title: "Fiche intervention interne",
    description: "Document atelier avec marge, stock et notes technicien.",
  },
  {
    id: "summary",
    title: "Résumé démo Behar Tech",
    description: "Récapitulatif complet du parcours de démonstration.",
  },
] as const;

export type DemoDocumentId = (typeof demoDocuments)[number]["id"];

export const demoStatusHistory = ["Reçu", "Diagnostic", "Réparation", "Test final", "Prêt"];

export const demoImportRows = [
  {
    reference: "IP13-SCR",
    part: "Écran iPhone 13",
    category: "Écrans",
    purchasePrice: "80,00 €",
    salePrice: "150,00 €",
    stock: 12,
    threshold: 5,
    supplier: "MobileParts France",
    action: "Mettre à jour",
  },
  {
    reference: "IP13-BAT",
    part: "Batterie iPhone 13",
    category: "Batteries",
    purchasePrice: "35,00 €",
    salePrice: "69,00 €",
    stock: 18,
    threshold: 5,
    supplier: "MobileParts France",
    action: "Créer",
  },
  {
    reference: "USB-C-CKT",
    part: "Connecteur de charge USB-C",
    category: "Connecteurs",
    purchasePrice: "3,20 €",
    salePrice: "9,90 €",
    stock: 50,
    threshold: 15,
    supplier: "TechParts Global",
    action: "Ignorer",
  },
];
