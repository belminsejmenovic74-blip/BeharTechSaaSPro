"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { Header } from "./header";
import { Footer } from "./footer";
import styles from "./landing-page.module.css";

/* ------------------------------------------------------------------ */
/* Données (offres + diagnostic + prise de rendez-vous)                */
/* ------------------------------------------------------------------ */

type Plan = {
  name: string;
  subtitle: string;
  price: string;
  unit: string;
  cta: string;
  recommended?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Gratuit",
    subtitle: "Pour démarrer simplement",
    price: "0€",
    unit: "/ mois",
    cta: "Commencer",
    features: [
      "1 appareil connecté",
      "10 réparations / mois",
      "10 SMS inclus",
      "Suivi client & QR Code",
      "Devis & Factures",
      "Support par email",
    ],
  },
  {
    name: "Starter",
    subtitle: "Pour les petits ateliers",
    price: "29€",
    unit: "/ mois",
    cta: "Choisir Starter",
    features: [
      "2 appareils connectés",
      "Réparations illimitées",
      "30 SMS inclus",
      "Suivi client & QR Code",
      "Devis & Factures",
      "Support prioritaire",
    ],
  },
  {
    name: "Pro",
    subtitle: "Pour les ateliers en croissance",
    price: "49€",
    unit: "/ mois",
    cta: "Choisir Pro",
    recommended: true,
    features: [
      "4 appareils connectés",
      "Réparations illimitées",
      "150 SMS inclus",
      "Suivi client & QR Code",
      "Devis & Factures",
      "Support prioritaire",
      "Export comptable",
    ],
  },
  {
    name: "Business",
    subtitle: "Pour les ateliers exigeants",
    price: "99€",
    unit: "/ mois",
    cta: "Choisir Business",
    features: [
      "Appareils illimités",
      "Réparations illimitées",
      "250 SMS inclus",
      "Suivi client & QR Code",
      "Devis & Factures",
      "Support dédié",
      "Export comptable",
    ],
  },
  {
    name: "Setup Atelier",
    subtitle: "On configure pour vous",
    price: "99€",
    unit: "/ atelier",
    cta: "En savoir plus",
    features: [
      "Configuration complète",
      "Paramètres personnalisés",
      "Formation incluse",
      "Import de vos données",
      "Accompagnement",
      "Gain de temps immédiat",
    ],
  },
];

const diagnosticQuestions = [
  ["Combien de réparations faites-vous par mois ?", ["0–20", "20–50", "50–100", "100+"]],
  ["Comment suivez-vous vos réparations aujourd’hui ?", ["Papier", "Excel", "WhatsApp", "Logiciel"]],
  [
    "Combien d’appels clients recevez-vous pour le suivi ?",
    ["Très peu", "Chaque semaine", "Tous les jours", "Trop souvent"],
  ],
  ["Faites-vous du rachat / reconditionnement ?", ["Non", "Parfois", "Régulièrement", "Oui"]],
  ["Ce qui vous prend le plus de temps ?", ["Suivi client", "Documents", "Stock", "Reconditionnement"]],
] as const;

const contactDays = [
  ["Lun.", "16", "Juin"],
  ["Mar.", "17", "Juin"],
  ["Mer.", "18", "Juin"],
  ["Jeu.", "19", "Juin"],
  ["Ven.", "20", "Juin"],
] as const;

const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

/* ------------------------------------------------------------------ */
/* Sections optionnelles — hors tunnel, disponibles pour réintégration */
/* ------------------------------------------------------------------ */

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className={styles.pricingSection} id="tarifs">
      <p className={styles.sectionKicker}>Tarifs</p>
      <h2>Simple, transparent, sans engagement.</h2>
      <p>
        Choisissez l’offre Behar Tech Pro adaptée à votre atelier. Toutes les offres incluent les outils essentiels pour
        gagner du temps, mieux suivre vos réparations et offrir une expérience plus professionnelle à vos clients.
      </p>
      <div className={styles.billingToggle}>
        <button
          type="button"
          aria-pressed={annual}
          aria-label="Facturation annuelle"
          className={annual ? styles.switchOn : ""}
          onClick={() => setAnnual((value) => !value)}
        >
          <span />
        </button>
        <span>Annuel</span>
        <strong>2 MOIS OFFERTS</strong>
      </div>
      <div className={styles.planGrid}>
        {plans.map((plan) => (
          <article className={`${styles.planCard} ${plan.recommended ? styles.planRecommended : ""}`} key={plan.name}>
            {plan.recommended && <span className={styles.recommendedBadge}>RECOMMANDÉ</span>}
            <h3>{plan.name}</h3>
            <p>{plan.subtitle}</p>
            <div className={styles.planPrice}>
              <strong>{plan.price}</strong>
              <span>{plan.unit}</span>
            </div>
            <a href="/contact">{plan.cta}</a>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CheckCircle2 /> {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DiagnosticSection() {
  const [answers, setAnswers] = useState<Record<number, string>>({
    0: "50–100",
    1: "WhatsApp",
    2: "Tous les jours",
    3: "Régulièrement",
    4: "Suivi client",
  });

  const recommended = useMemo(() => {
    const volume = answers[0];
    if (volume === "0–20") return { plan: "Gratuit ou Starter", score: 62 };
    if (volume === "20–50") return { plan: "Starter", score: 70 };
    if (volume === "100+") return { plan: "Business", score: 86 };
    return { plan: "Pro", score: 78 };
  }, [answers]);

  return (
    <section className={styles.diagnosticSection}>
      <p className={styles.sectionKicker}>DIAGNOSTIC ATELIER</p>
      <h2>Trouvez l’offre adaptée à votre atelier.</h2>
      <p>
        Répondez à quelques questions et découvrez l’offre Behar Tech Pro la plus logique pour votre volume, votre
        organisation et vos besoins.
      </p>
      <div className={styles.diagnosticGrid}>
        <div className={styles.questionCard}>
          {diagnosticQuestions.map(([question, options], questionIndex) => (
            <div className={styles.questionRow} key={question}>
              <span>{questionIndex + 1}.</span>
              <strong>{question}</strong>
              <div>
                {options.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={answers[questionIndex] === option ? styles.choiceActive : ""}
                    onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: option }))}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button className={styles.fullButton} type="button">
            Lancer le diagnostic
          </button>
        </div>
        <div className={styles.resultCard}>
          <span>RÉSULTAT</span>
          <h3>
            Score atelier <strong>{recommended.score} / 100</strong>
          </h3>
          <p>
            Votre atelier est déjà actif, mais vous perdez encore du temps sur le suivi client, les documents et
            l’organisation quotidienne.
          </p>
          <div className={styles.resultKpis}>
            <article>
              <Clock3 />
              <strong>6 à 10 h</strong>
              <span>de temps récupérable / mois</span>
            </article>
            <article>
              <Users />
              <strong>Moins d’appels</strong>
              <span>grâce au suivi client & QR Code</span>
            </article>
            <article>
              <Star />
              <strong>Offre conseillée</strong>
              <span>{recommended.plan} — 49€ / mois</span>
            </article>
          </div>
          <div className={styles.recommendation}>
            <PackageCheck />
            <div>
              <strong>Recommandé : {recommended.plan}</strong>
              <span>L’offre la plus adaptée pour gagner du temps, mieux suivre et faire croître votre atelier.</span>
            </div>
            <a href="/#tarifs">Voir l’offre recommandée</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact (utilisé par la route /contact)                             */
/* ------------------------------------------------------------------ */

export function ContactExperience({ standalone = false }: { standalone?: boolean }) {
  const [contactTab, setContactTab] = useState<"message" | "meeting">("message");
  const [messageSent, setMessageSent] = useState(false);
  const [meetingSent, setMeetingSent] = useState(false);
  const [selectedDay, setSelectedDay] = useState(2);
  const [selectedTime, setSelectedTime] = useState("11:00");

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessageSent(true);
  };

  return (
    <section className={`${styles.contactSection} ${standalone ? styles.contactStandalone : ""}`} id="contact">
      <p className={styles.sectionKicker}>CONTACTEZ-NOUS</p>
      <h1>Parlons de votre atelier.</h1>
      <p>Une question, un projet ou besoin d’un accompagnement ? Notre équipe vous répond rapidement.</p>
      <div className={styles.contactTabs}>
        <button
          type="button"
          className={contactTab === "message" ? styles.contactTabActive : ""}
          onClick={() => setContactTab("message")}
        >
          <Mail /> Envoyer un message
        </button>
        <button
          type="button"
          className={contactTab === "meeting" ? styles.contactTabActive : ""}
          onClick={() => setContactTab("meeting")}
        >
          <CalendarDays /> Prendre rendez-vous
        </button>
      </div>
      <div className={styles.contactGrid}>
        <form className={styles.contactPanel} onSubmit={submitMessage}>
          <Mail />
          <h2>Envoyer un message</h2>
          <p>Nous vous répondons en moins de 24h.</p>
          <label>
            Nom complet
            <input name="name" placeholder="Votre nom" required />
          </label>
          <label>
            Email professionnel
            <input name="email" type="email" placeholder="votre@email.com" required />
          </label>
          <label>
            Nom de votre atelier
            <input name="workshop" placeholder="Nom de votre boutique" />
          </label>
          <label>
            Sujet
            <select name="subject" defaultValue="">
              <option value="" disabled>
                Choisir un sujet
              </option>
              <option>Découvrir Behar Tech Pro</option>
              <option>Demander une démonstration</option>
              <option>Aide au choix de l’offre</option>
              <option>Setup Atelier</option>
              <option>Autre demande</option>
            </select>
          </label>
          <label>
            Votre message
            <textarea name="message" placeholder="Décrivez votre besoin, votre projet ou votre question..." />
          </label>
          <small>
            <ShieldCheck /> Vos informations sont sécurisées et ne seront jamais partagées.
          </small>
          <button className={styles.fullButton} type="submit">
            Envoyer le message <ArrowRight />
          </button>
          {messageSent && (
            <strong className={styles.successState}>Message envoyé, nous vous répondons rapidement.</strong>
          )}
        </form>
        <div className={styles.contactPanel}>
          <CalendarDays />
          <h2>Prendre rendez-vous</h2>
          <p>Réservez un créneau pour échanger avec un expert.</p>
          <div className={styles.meetingBenefits}>
            <article>
              <Clock3 />
              <strong>Échange personnalisé</strong>
              <span>30 minutes d’échange</span>
            </article>
            <article>
              <CheckCircle2 />
              <strong>Sans engagement</strong>
              <span>Conseils adaptés</span>
            </article>
            <article>
              <Users />
              <strong>Expert dédié</strong>
              <span>Recommandations personnalisées</span>
            </article>
          </div>
          <h3>1. Choisissez un jour</h3>
          <div className={styles.dayPicker}>
            <button type="button" aria-label="Jour précédent">
              <ChevronLeft />
            </button>
            {contactDays.map(([weekday, day, month], index) => (
              <button
                type="button"
                key={day}
                className={selectedDay === index ? styles.dayActive : ""}
                onClick={() => setSelectedDay(index)}
              >
                <span>{weekday}</span>
                <strong>{day}</strong>
                <small>{month}</small>
              </button>
            ))}
            <button type="button" aria-label="Jour suivant">
              <ChevronRight />
            </button>
          </div>
          <h3>2. Choisissez un horaire</h3>
          <div className={styles.timePicker}>
            {timeSlots.map((slot) => (
              <button
                type="button"
                key={slot}
                className={selectedTime === slot ? styles.timeActive : ""}
                onClick={() => setSelectedTime(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
          <div className={styles.durationBox}>
            <CalendarCheck />
            <span>
              <strong>Durée : 30 minutes</strong>
              En visio ou par téléphone selon votre préférence.
            </span>
          </div>
          <button className={styles.fullButton} type="button" onClick={() => setMeetingSent(true)}>
            Confirmer le rendez-vous
          </button>
          {meetingSent && (
            <strong className={styles.successState}>Votre demande de rendez-vous a été enregistrée.</strong>
          )}
        </div>
      </div>
      <div className={styles.contactCards}>
        {[
          { icon: Mail, title: "Email", value: "contact@behartech.pro", text: "Réponse sous 24h" },
          { icon: Phone, title: "Téléphone", value: "+33 7 56 90 35 20", text: "Lun - Ven : 9h - 18h" },
          { icon: MessageCircle, title: "Chat en direct", value: "Disponible dans l’app", text: "Réponse immédiate" },
          { icon: MapPin, title: "Basé en Europe", value: "Vos données sont hébergées", text: "en UE et en Suisse" },
        ].map(({ icon: ContactIcon, title, value, text }) => (
          <article key={title}>
            <ContactIcon />
            <div>
              <strong>{title}</strong>
              <span>{value}</span>
              <small>{text}</small>
            </div>
          </article>
        ))}
      </div>
      <span className={styles.hiddenConnectNote}>
        Structure prête à connecter à Resend, SendGrid, Beevo ou une intégration calendrier.
      </span>
    </section>
  );
}

export function ContactPage() {
  return (
    <main className={styles.page}>
      <Header compact />
      <ContactExperience standalone />
      <Footer />
    </main>
  );
}
