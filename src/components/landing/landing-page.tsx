import { landingContent } from "@/content/landing";

import { BoutiqueNeedsSection } from "./boutique-needs-section";
import { ClientExperienceSection } from "./client-experience-section";
import { CMSPreviewConfig } from "./cms-preview-config";
import { FinalCTA } from "./final-cta";
import { Footer } from "./footer";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { IntegrationsSection } from "./integrations-section";
import { OcrDocumentsSection } from "./ocr-documents-section";
import { ShowcaseSection } from "./showcase-section";
import { TrustStatsSection } from "./trust-stats-section";
import { TunnelArc } from "./tunnel-arc";
import styles from "./landing-page.module.css";

/** Blocs showcase rebâtis en composants premium (mockups en vrai code). */
function Showcase({
  refName,
  content,
}: {
  refName: string;
  content: Parameters<typeof ShowcaseSection>[0]["content"];
}) {
  if (refName === "boutique") return <BoutiqueNeedsSection />;
  if (refName === "clients") return <ClientExperienceSection />;
  if (refName === "services") return <OcrDocumentsSection />;
  return <ShowcaseSection content={content} />;
}

// La route /contact réutilise ce composant : on le ré-exporte pour compat.
export { ContactPage } from "./contact-experience";

/**
 * Landing "tunnel" immersif.
 *
 * Parcours vertical : confiance → gestion boutique → gain de temps →
 * expérience client → intégrations → CTA. L'ordre des sections, les demi-cercles
 * et tout le contenu sont pilotés depuis `src/content/landing.ts`.
 */
export function LandingPage() {
  const { sections, arcs, showcases } = landingContent;

  return (
    <main className={styles.page}>
      <Header />
      <div className={styles.tunnel}>
        {sections.map((section, index) => {
          switch (section.kind) {
            case "hero":
              return <HeroSection key="hero" />;
            case "trustStats":
              return <TrustStatsSection key="trustStats" />;
            case "arc":
              return <TunnelArc key={`arc-${section.ref}`} {...arcs[section.ref]} />;
            case "showcase":
              return <Showcase key={section.ref} refName={section.ref} content={showcases[section.ref]} />;
            case "integrations":
              return <IntegrationsSection key="integrations" />;
            case "finalCta":
              return <FinalCTA key="finalCta" />;
            default:
              return <div key={`unknown-${index}`} hidden />;
          }
        })}
      </div>
      <Footer />
      <CMSPreviewConfig />
    </main>
  );
}
