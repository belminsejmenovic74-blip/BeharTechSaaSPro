// ══════════════════════════════════════════════════════════════════════════
//  Contenu par défaut — DA Behar Tech Pro (Apple / Stripe / Linear).
//  Sert de seed initial ET de valeur de "Réinitialiser" dans l'admin.
//  NE PAS modifier pour éditer le site : passer par /admin.
// ══════════════════════════════════════════════════════════════════════════
import type { SiteContent } from './types';

// Les écrans/slides omettent quelques champs optionnels à l'exécution (device,
// tabIcon, subtitle vides…) : `as SiteContent` accepte ces omissions, l'UI les
// traite comme "vide/false", et l'admin les édite avec un typage strict.
export const DEFAULT_CONTENT = {
	theme: {
		background: '#FAFAF8',
		text: '#1A1916',
		muted: '#6B6B6B',
		accent: '#2A9D8F',
		button: '#2A9D8F',
		card: '#FFFFFF',
		radius: 20,
		shadow: 'soft',
		glass: true
	},

	pages: [
		{
			id: 'p-demo',
			slug: 'exemple',
			title: 'Page exemple',
			bg: '#FAFAF8',
			maxWidth: 760,
			blocks: [
				{
					id: 'b1',
					type: 'heading',
					text: 'Ma nouvelle page',
					fontSize: 46,
					fontWeight: 700,
					color: '#1A1916',
					align: 'center',
					paddingY: 24,
					paddingX: 16
				},
				{
					id: 'b2',
					type: 'text',
					text: 'Clique sur un bloc pour le modifier : texte, taille, couleurs, icône, espacement…',
					fontSize: 18,
					color: '#6B6B6B',
					align: 'center',
					paddingY: 6,
					paddingX: 16
				},
				{
					id: 'b3',
					type: 'icon',
					icon: 'sparkles',
					fontSize: 40,
					color: '#2A9D8F',
					align: 'center',
					paddingY: 16
				},
				{
					id: 'b4',
					type: 'button',
					text: 'Commencer',
					href: '/dashboard',
					bg: '#2A9D8F',
					color: '#FFFFFF',
					align: 'center',
					radius: 12,
					paddingY: 20
				}
			]
		}
	],

	seo: {
		title: 'Behar Tech Pro — Le logiciel premium pour ateliers de réparation',
		description:
			'Behar Tech Pro centralise votre atelier de réparation : suivi client, QR code, devis & factures, reconditionnement et encaissement dans un seul outil.',
		image: 'https://i.pinimg.com/736x/85/9a/92/859a92a2629f912010a0a72270aefedc.jpg',
		url: 'https://startup-sve.vercel.app',
		keywords:
			'logiciel réparation, atelier réparation, suivi client, devis facture, reconditionnement, QR code, SAV smartphone'
	},

	header: {
		brand: 'BEHAR • TECH',
		badge: 'PRO',
		nav: [
			{ label: 'Fonctionnalités', href: '#pense' },
			{ label: 'Tarifs', href: '#pricing' },
			{ label: 'Ressources', href: '#' }
		],
		loginLabel: 'Connexion',
		loginHref: '/connexion',
		ctaLabel: 'Essayer gratuitement',
		ctaHref: '/inscription'
	},

	hero: {
		badge: '',
		title: 'Transformez votre atelier.',
		subtitle: 'Gagnez du temps. Gagnez des clients.\nCentralisez votre atelier dans un seul outil.',
		ctaLabel: 'Essayer gratuitement',
		ctaHref: '/inscription',
		showImage: false,
		image: '/imgs/mockup-dashboard.png'
	},

	stats: {
		kicker: 'ILS NOUS FONT CONFIANCE',
		subtitle: 'Une plateforme connectée à tous les outils utiles de votre atelier.',
		items: [
			{ id: 'st1', value: '20 boutiques', label: 'utilisent nos services', visible: true },
			{ id: 'st2', value: 'UE + Suisse', label: 'disponible', icon: 'globe', visible: true },
			{ id: 'st3', value: '3 h', label: 'de temps gagné par semaine', visible: true },
			{
				id: 'st4',
				value: '+1,4',
				label: 'de note Google en moyenne',
				icon: 'google',
				visible: true
			},
			{ id: 'st5', value: '+18 %', label: 'de chiffre d’affaires', visible: true }
		]
	},

	showcases: {
		A: {
			id: 'A',
			layout: 'screen',
			tabStyle: 'dots',
			titleLines: ['Pensé pour chaque besoin', 'de votre boutique.'],
			slides: [
				{
					id: 'a-dashboard',
					tab: 'Dashboard / Accueil',
					sideTitle: 'Dashboard / Accueil',
					img: '/imgs/mockup-dashboard.png',
					portrait: false,
					visible: true,
					bullets: [
						'Vue complète de l’activité',
						'Chiffre d’affaires et suivi',
						'Dossiers à encaisser',
						'Pilotage quotidien'
					]
				},
				{
					id: 'a-comptoir',
					tab: 'Comptoir',
					sideTitle: 'Comptoir',
					img: '/imgs/mockup-comptoir.png',
					portrait: false,
					device: true,
					visible: true,
					bullets: [
						'Encaissement rapide',
						'Vente d’accessoires en 3 taps',
						'Prise en charge express',
						'Scanner QR et recherche dossier'
					]
				},
				{
					id: 'a-mobile',
					tab: 'Mobile',
					sideTitle: 'Mobile',
					img: '/imgs/mockup-a-mobile.png',
					portrait: true,
					device: true,
					visible: true,
					bullets: [
						'Votre atelier dans la poche',
						'Suivi des dossiers en temps réel',
						'Pipeline réparations mobile',
						'Rendez-vous et notifications'
					]
				},
				{
					id: 'a-atelier',
					tab: 'Mode atelier',
					sideTitle: 'Mode atelier',
					img: '/imgs/mockup-a-atelier.png',
					portrait: false,
					visible: true,
					bullets: [
						'File d’attente en kanban',
						'Reçu, diagnostic, réparation, test',
						'Alertes retards et blocages',
						'Charge atelier en un coup d’œil'
					]
				}
			]
		},
		B: {
			id: 'B',
			layout: 'screen',
			tabStyle: 'filled',
			titleLines: ['Gagnez du temps.', 'Gagnez des clients grâce à nos services.'],
			subtitle:
				'Des outils intelligents pour automatiser, centraliser et développer votre activité.',
			sideTitle: 'Avantages réparateur',
			slides: [
				{
					id: 'b-ocr',
					tab: 'IA & documents OCR',
					tabIcon: 'sparkles',
					img: '/imgs/mockup-b-ocr.png',
					portrait: false,
					visible: true,
					bullets: [
						'Moins d’administratif',
						'Stock mis à jour automatiquement',
						'Prix d’achat enregistrés',
						'Factures liées aux pièces'
					]
				},
				{
					id: 'b-rachat',
					tab: 'Rachat & reconditionnement',
					tabIcon: 'refreshCcw',
					img: '/imgs/mockup-b-rachat.png',
					portrait: false,
					visible: true,
					bullets: [
						'Achats simplifiés par l’IA',
						'Prix d’achat configurables',
						'Marge mieux maîtrisée',
						'Cycle reconditionnement centralisé'
					]
				},
				{
					id: 'b-suivi',
					tab: 'Suivi & support',
					tabIcon: 'activity',
					img: '/imgs/mockup-b-suivi.png',
					portrait: false,
					visible: true,
					bullets: [
						'Suivi centralisé',
						'Pièces liées à leur facture',
						'Historique complet et horodaté',
						'Transparence de l’achat à la vente'
					]
				},
				{
					id: 'b-widget',
					tab: 'Widget rendez-vous',
					tabIcon: 'calendarClock',
					img: '/imgs/mockup-b-widget.png',
					portrait: false,
					visible: true,
					bullets: [
						'Plus de rendez-vous clients',
						'Réservations depuis votre site',
						'Notifications automatiques',
						'Zéro saisie manuelle'
					]
				}
			]
		},
		C: {
			id: 'C',
			layout: 'phone',
			tabStyle: 'filled',
			titleLines: ['On pense à vos clients'],
			subtitleTeal: 'Expérience plus professionnelle',
			description:
				'Au lieu d’un papier perdu ou d’un message WhatsApp flou, le client a un vrai suivi digital, comme dans un service premium.',
			sideTitle: 'Avantages client',
			slides: [
				{
					id: 'c-suivi',
					tab: 'Suivi de réparation',
					tabIcon: 'activity',
					img: '/imgs/mockup-c-suivi.png',
					visible: true,
					bullets: [
						'Suivi clair et rassurant',
						'SMS et email automatiques',
						'Documents accessibles',
						'Contact direct avec l’atelier'
					],
					cards: [
						{
							id: 'c-suivi-1',
							icon: 'messageSquare',
							title: 'SMS envoyé',
							text: 'Vous êtes notifié à chaque étape.',
							visible: true
						},
						{
							id: 'c-suivi-2',
							icon: 'fileText',
							title: 'Documents accessibles',
							text: 'Facture, certificat et photos en quelques clics.',
							visible: true
						},
						{
							id: 'c-suivi-3',
							icon: 'mail',
							title: 'Email envoyé',
							text: 'Suivi automatique par email.',
							visible: true
						},
						{
							id: 'c-suivi-4',
							icon: 'bellRing',
							title: 'Prêt à récupérer',
							text: 'Estimation de date et notification dès que c’est prêt.',
							visible: true
						}
					]
				},
				{
					id: 'c-recond',
					tab: 'Téléphone reconditionné',
					tabIcon: 'smartphone',
					img: '/imgs/mockup-c-recond.png',
					visible: true,
					bullets: [
						'Tests détaillés',
						'Facture et certificat',
						'Photos de l’appareil',
						'Confiance à l’achat'
					],
					cards: [
						{
							id: 'c-recond-1',
							icon: 'shieldCheck',
							title: '80 points testés',
							text: 'Contrôle qualité complet.',
							visible: true
						},
						{
							id: 'c-recond-2',
							icon: 'receipt',
							title: 'Facture accessible',
							text: 'Disponible à tout moment.',
							visible: true
						},
						{
							id: 'c-recond-3',
							icon: 'badgeCheck',
							title: 'Certificat disponible',
							text: 'Preuve du reconditionnement.',
							visible: true
						},
						{
							id: 'c-recond-4',
							icon: 'camera',
							title: 'Photos de l’appareil',
							text: 'État réel avant achat.',
							visible: true
						}
					]
				},
				{
					id: 'c-sms',
					tab: 'SMS & email',
					tabIcon: 'mail',
					img: '/imgs/mockup-c-sms.png',
					visible: true,
					bullets: [
						'Notifications automatiques',
						'Moins d’appels entrants',
						'Client rassuré',
						'Communication claire'
					],
					cards: [
						{
							id: 'c-sms-1',
							icon: 'messageSquare',
							title: 'SMS automatique',
							text: 'Envoyé à chaque changement.',
							visible: true
						},
						{
							id: 'c-sms-2',
							icon: 'mail',
							title: 'Email automatique',
							text: 'Récapitulatif clair.',
							visible: true
						},
						{
							id: 'c-sms-3',
							icon: 'bellRing',
							title: 'Prêt à récupérer',
							text: 'Le client sait quand venir.',
							visible: true
						},
						{
							id: 'c-sms-4',
							icon: 'activity',
							title: 'Alerte immédiate',
							text: 'Aucune information oubliée.',
							visible: true
						}
					]
				},
				{
					id: 'c-avis',
					tab: 'Avis Google',
					tabIcon: 'star',
					img: '/imgs/mockup-c-avis.png',
					visible: true,
					bullets: [
						'Plus d’avis clients',
						'Image plus professionnelle',
						'Lien d’avis simplifié',
						'Meilleure note Google'
					],
					cards: [
						{
							id: 'c-avis-1',
							icon: 'star',
							title: 'Demande d’avis simplifiée',
							text: 'En un tap après la réparation.',
							visible: true
						},
						{
							id: 'c-avis-2',
							icon: 'link',
							title: 'Lien envoyé automatiquement',
							text: 'Aucune démarche pour vous.',
							visible: true
						},
						{
							id: 'c-avis-3',
							icon: 'trendingUp',
							title: 'Plus de notes 5 étoiles',
							text: 'Votre réputation grandit.',
							visible: true
						},
						{
							id: 'c-avis-4',
							icon: 'badgeCheck',
							title: 'Image plus professionnelle',
							text: 'Vous vous démarquez.',
							visible: true
						}
					]
				}
			]
		}
	},

	integrations: {
		kicker: 'ILS NOUS FONT CONFIANCE',
		titleStrong: 'Ils nous font confiance.',
		titleMuted: 'Pourquoi pas vous ?',
		subtitle:
			'Des intégrations utiles pour automatiser votre atelier, informer vos clients et encaisser simplement.',
		items: [
			{
				id: 'int-sms',
				name: 'Beevo SMS',
				desc: 'Envoi automatique de SMS',
				logo: '/imgs/beevo-sms-logo.png',
				visible: true
			},
			{
				id: 'int-email',
				name: 'Beevo E-mail',
				desc: 'E-mails transactionnels',
				logo: '/imgs/beevo-email-logo.png',
				visible: true
			},
			{
				id: 'int-amazon',
				name: 'Amazon IA',
				desc: 'OCR & lecture automatique',
				logo: '/imgs/amazon-logo.png',
				visible: true
			},
			{
				id: 'int-quali',
				name: 'Label Quali Répar',
				desc: 'Gestion des aides réparation',
				logo: '/imgs/label-quali-repar-logo.png',
				visible: true
			},
			{
				id: 'int-stripe',
				name: 'Stripe',
				desc: 'Paiements en ligne',
				logo: '/imgs/stripe-logo.png',
				visible: true
			},
			{
				id: 'int-sumup',
				name: 'SumUp',
				desc: 'Encaissement en boutique',
				logo: '/imgs/sumup-logo.png',
				visible: true
			}
		]
	},

	pricing: {
		kicker: 'Tarifs',
		title: 'Simple, transparent, sans engagement.',
		subtitle: 'Choisissez l’offre Behar Tech Pro adaptée à votre atelier.',
		intervalNote: '2 MOIS OFFERTS',
		plans: [
			{
				id: 'price_free',
				name: 'Gratuit',
				description: 'Pour démarrer et tester l’outil sur un premier appareil.',
				buttonText: 'Commencer',
				buttonHref: '/inscription',
				features: [
					'1 appareil connecté',
					'10 réparations / mois',
					'10 SMS inclus',
					'Suivi client & QR Code',
					'Devis & Factures',
					'Support email'
				],
				monthlyPrice: 0,
				yearlyPrice: 0,
				isMostPopular: false,
				visible: true
			},
			{
				id: 'price_starter',
				name: 'Starter',
				description: 'Pour les petits ateliers qui veulent l’essentiel.',
				buttonText: 'Choisir Starter',
				buttonHref: '/inscription',
				features: [
					'2 appareils connectés',
					'Réparations illimitées',
					'30 SMS inclus',
					'Suivi client & QR Code',
					'Devis & Factures',
					'Support prioritaire'
				],
				monthlyPrice: 2900,
				yearlyPrice: 29000,
				isMostPopular: false,
				visible: true
			},
			{
				id: 'price_pro',
				name: 'Pro',
				description: 'Le plus choisi par les ateliers en croissance.',
				buttonText: 'Choisir Pro',
				buttonHref: '/inscription',
				features: [
					'4 appareils connectés',
					'Réparations illimitées',
					'150 SMS inclus',
					'Suivi client & QR Code',
					'Devis & Factures',
					'Support prioritaire',
					'Export comptable'
				],
				monthlyPrice: 4900,
				yearlyPrice: 49000,
				isMostPopular: true,
				visible: true
			},
			{
				id: 'price_business',
				name: 'Business',
				description: 'Pour les ateliers multi-postes et le volume.',
				buttonText: 'Choisir Business',
				buttonHref: '/inscription',
				features: [
					'Appareils illimités',
					'Réparations illimitées',
					'250 SMS inclus',
					'Suivi client & QR Code',
					'Devis & Factures',
					'Support dédié',
					'Export comptable'
				],
				monthlyPrice: 9900,
				yearlyPrice: 99000,
				isMostPopular: false,
				visible: true
			}
		],
		setup: {
			name: 'Setup Atelier',
			description: 'Installation clé en main de votre atelier, réalisée par notre équipe.',
			features: [
				'Configuration complète',
				'Paramètres perso',
				'Formation incluse',
				'Import de vos données',
				'Accompagnement'
			],
			price: '99€',
			note: 'paiement unique',
			buttonText: 'En savoir plus',
			buttonHref: '#cta',
			visible: true
		}
	},

	footer: {
		brand: 'BEHAR • TECH',
		tagline: '',
		newsletterTitle: 'Restez informé',
		newsletterPlaceholder: 'Votre e-mail',
		newsletterButton: 'S’inscrire',
		columns: [
			{
				label: 'Produit',
				items: [
					{ label: 'Fonctionnalités', href: '#pense' },
					{ label: 'Tarifs', href: '#pricing' },
					{ label: 'Mises à jour', href: '/' },
					{ label: 'Sécurité', href: '/' }
				]
			},
			{
				label: 'Ressources',
				items: [
					{ label: 'Blog', href: '/' },
					{ label: 'Guides', href: '/' },
					{ label: 'Centre d’aide', href: '/' },
					{ label: 'API', href: '/' }
				]
			},
			{
				label: 'Entreprise',
				items: [
					{ label: 'À propos', href: '/' },
					{ label: 'Contact', href: '/' },
					{ label: 'Mentions légales', href: '/' },
					{ label: 'Politique de confidentialité', href: '/' }
				]
			}
		],
		copyright: 'Behar Tech Pro'
	},

	sections: [
		{ id: 'hero', label: 'Hero', visible: true },
		{ id: 'stats', label: 'Ils nous font confiance (chiffres)', visible: true },
		{ id: 'showcaseA', label: 'Pensé pour chaque besoin', visible: true },
		{ id: 'showcaseB', label: 'Gagnez du temps (services)', visible: true },
		{ id: 'showcaseC', label: 'On pense à vos clients', visible: true },
		{ id: 'integrations', label: 'Intégrations / API', visible: true },
		{ id: 'pricing', label: 'Tarifs', visible: true }
	]
} as SiteContent;
