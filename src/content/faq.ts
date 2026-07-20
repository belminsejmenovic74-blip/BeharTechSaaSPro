// ══════════════════════════════════════════════════════════════════════════
//  Contenu de la page /faq/ (PRD §4).
//  ⚠ STRUCTURE À REMPLIR : Belmin fournit les 20 questions de lancement.
//  Remplacez le tableau ci-dessous — la page et le JSON-LD FAQPage s'adaptent.
// ══════════════════════════════════════════════════════════════════════════

export type FaqEntry = { question: string; answer: string };

export const FAQ: FaqEntry[] = [
	{
		question: "Qu'est-ce que Behar Tech Pro ?",
		answer:
			"Behar Tech Pro est un logiciel de gestion pour ateliers de réparation de smartphones. Il réunit le suivi client, les devis et factures, le suivi des réparations et l'encaissement dans un seul outil."
	},
	{
		question: 'Behar Tech Pro est-il disponible dès maintenant ?',
		answer:
			"La prévente de la cohorte fondatrice est ouverte. Vous pouvez créer un compte pour rejoindre le lancement et être prévenu de l'ouverture de l'essai gratuit."
	}
];
