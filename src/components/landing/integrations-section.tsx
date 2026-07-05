import Image from "next/image";

import { landingContent } from "@/content/landing";

import styles from "./landing-page.module.css";

/**
 * Section intégrations / API — sortie du tunnel.
 * Logos alignés horizontalement, séparateurs verticaux fins, beaucoup d'espace.
 */
export function IntegrationsSection() {
  const { kicker, title, subtitle, logos } = landingContent.integrations;

  return (
    <section className={styles.integrationSection}>
      <p className={styles.sectionKicker}>{kicker}</p>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className={styles.integrationLine}>
        {logos.map((item) => (
          <article key={item.name}>
            <div className={styles.logoBox}>
              <Image src={item.logo} alt={`Logo ${item.name}`} fill sizes="170px" />
            </div>
            <h3>{item.name}</h3>
            <span>{item.text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
