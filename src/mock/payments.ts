import { CreditCard, Link2, Percent, WalletCards } from "lucide-react";

export const paymentKpis = [
  {
    shop_id: "shop_atelier_belmin",
    label: "Encaissements du mois",
    value: "9 480 €",
    trend: "12,5 %",
    helper: "vs mois dernier",
    icon: WalletCards,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Paiements en attente",
    value: "3",
    trend: "2 à relancer",
    helper: "liens non payés",
    icon: CreditCard,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Taux de paiement en ligne",
    value: "62 %",
    trend: "8,4 pts",
    helper: "vs mois dernier",
    icon: Percent,
  },
  {
    shop_id: "shop_atelier_belmin",
    label: "Liens envoyés",
    value: "27",
    trend: "5 cette semaine",
    helper: "simulation Stripe",
    icon: Link2,
  },
];

export const transactions = [
  {
    id: "payment_pay_2026_0587",
    shop_id: "shop_atelier_belmin",
    customer: "Belmin",
    reference: "PAY-2026-0587",
    mode: "Stripe Checkout",
    status: "Réussi",
    amount: "190,00 €",
    date: "Aujourd'hui, 14:32",
    repair: "iPhone 13 - Écran cassé",
  },
  {
    id: "payment_pay_2026_0586",
    shop_id: "shop_atelier_belmin",
    customer: "Julien R.",
    reference: "PAY-2026-0586",
    mode: "Lien de paiement",
    status: "En attente",
    amount: "89,00 €",
    date: "Aujourd'hui, 09:20",
    repair: "Galaxy S21 - Batterie",
  },
  {
    id: "payment_pay_2026_0585",
    shop_id: "shop_atelier_belmin",
    customer: "Laura P.",
    reference: "PAY-2026-0585",
    mode: "Carte atelier",
    status: "Réussi",
    amount: "259,00 €",
    date: "Hier, 16:10",
    repair: "iPhone 12 - Batterie",
  },
];

export const selectedPayment = transactions[0];
