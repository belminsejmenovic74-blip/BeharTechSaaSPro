import type { Metadata } from "next";
import Script from "next/script";
import { ArrowRight, BatteryCharging, CheckCircle2, Clock3, MapPin, ShieldCheck, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Atelier Horizon — Réparation mobile",
  description: "Page d’exemple d’un site réparateur utilisant le widget Behar Tech Pro.",
  robots: { index: false, follow: false },
};

const services = [
  { icon: Smartphone, title: "Écran cassé", text: "Remplacement rapide avec des pièces sélectionnées." },
  { icon: BatteryCharging, title: "Batterie", text: "Diagnostic et remplacement avec garantie atelier." },
  { icon: ShieldCheck, title: "Diagnostic", text: "Une estimation claire avant toute intervention." },
];

export default async function WidgetExamplePage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;

  return (
    <main className="min-h-screen bg-[#F7F8F5] text-[#17211E]">
      <header className="border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#167B70] text-lg font-black text-white">
              A
            </div>
            <div>
              <p className="font-bold tracking-tight">Atelier Horizon</p>
              <p className="text-xs text-[#68736F]">Réparation mobile & informatique</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#services" className="hover:text-[#167B70]">
              Nos réparations
            </a>
            <a href="#atelier" className="hover:text-[#167B70]">
              L’atelier
            </a>
            <button
              type="button"
              data-behar-widget-open
              className="rounded-full bg-[#17211E] px-5 py-2.5 font-semibold text-white transition hover:bg-[#167B70]"
            >
              Estimer ma réparation
            </button>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute -top-24 right-[-12rem] size-[34rem] rounded-full bg-[#D9EFE9] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#BFE2D9] bg-white px-3 py-1.5 text-xs font-semibold text-[#167B70]">
              <CheckCircle2 className="size-4" /> Diagnostic rapide et prix transparent
            </div>
            <h1 className="text-5xl leading-[1.04] font-black tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Votre appareil mérite une seconde vie.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5D6864]">
              Obtenez une estimation, vérifiez la disponibilité et choisissez votre rendez-vous en quelques minutes.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                data-behar-widget-open
                className="inline-flex items-center gap-2 rounded-full bg-[#167B70] px-6 py-3.5 font-bold text-white shadow-lg shadow-[#167B70]/20 transition hover:-translate-y-0.5 hover:bg-[#126A61]"
              >
                Démarrer mon estimation <ArrowRight className="size-4" />
              </button>
              <a href="#services" className="rounded-full border border-[#D4DAD6] bg-white px-6 py-3.5 font-semibold">
                Voir les services
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#5D6864]">
              <span className="inline-flex items-center gap-2">
                <Clock3 className="size-4 text-[#167B70]" /> Réponse rapide
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#167B70]" /> Réparation garantie
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-[#167B70]" /> Atelier de proximité
              </span>
            </div>
          </div>

          <div className="relative min-h-[390px] rounded-[2rem] bg-[#17211E] p-7 text-white shadow-2xl">
            <div className="absolute inset-3 rounded-[1.55rem] border border-white/10" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-[#8ED3C4]">Votre parcours en ligne</p>
                <p className="mt-3 text-3xl font-bold">Une estimation adaptée à votre appareil.</p>
              </div>
              <div className="space-y-3">
                {[
                  "Choisissez votre appareil",
                  "Décrivez la panne",
                  "Consultez prix et disponibilité",
                  "Réservez votre créneau",
                ].map((label, index) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#8ED3C4] text-sm font-black text-[#17211E]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="text-sm font-bold tracking-widest text-[#167B70] uppercase">Nos services</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Réparer simplement, sans mauvaise surprise.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {services.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-3xl border border-[#E4E8E5] bg-[#FBFCFA] p-6">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#DDF1EC] text-[#167B70]">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 leading-7 text-[#66716D]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="atelier" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-7 rounded-[2rem] bg-[#DDF1EC] p-8 sm:p-12 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-bold text-[#167B70]">Prêt à commencer ?</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight">
              Obtenez votre estimation et votre créneau maintenant.
            </h2>
          </div>
          <button
            type="button"
            data-behar-widget-open
            className="shrink-0 rounded-full bg-[#17211E] px-6 py-3.5 font-bold text-white"
          >
            Ouvrir le widget
          </button>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-white px-5 py-7 text-center text-sm text-[#6A746F]">
        Page d’exemple Behar Tech Pro — le widget utilise la configuration publiée du réparateur.
      </footer>

      <Script src="/widget.js" data-widget-id={publicId} strategy="afterInteractive" />
    </main>
  );
}
