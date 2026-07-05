import { landingContent } from "@/content/landing";

import { CMSPreviewConfig } from "./cms-preview-config";
import { FinalCTA } from "./final-cta";
import { Footer } from "./footer";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { IntegrationsSection } from "./integrations-section";
import { ShowcaseSection } from "./showcase-section";
import { TrustStatsSection } from "./trust-stats-section";
import { TunnelArc } from "./tunnel-arc";
import styles from "./landing-page.module.css";

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
              return <ShowcaseSection key={section.ref} content={showcases[section.ref]} />;
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
