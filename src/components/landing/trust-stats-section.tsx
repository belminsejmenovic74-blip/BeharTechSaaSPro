import { landingContent } from "@/content/landing";

import { Icon } from "./_shared";
import styles from "./landing-page.module.css";

/**
 * Section confiance / statistiques — entrée du tunnel.
 * Chiffres alignés horizontalement, séparateurs verticaux fins, icônes propres.
 */
export function TrustStatsSection() {
  const { kicker, stats } = landingContent.trustStats;

  return (
    <section className={styles.statsTrust}>
      <p className={styles.sectionKicker}>{kicker}</p>
      <div className={styles.statsLine}>
        {stats.map((stat) => (
          <div key={stat.value}>
            {stat.icon && <Icon name={stat.icon} />}
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
