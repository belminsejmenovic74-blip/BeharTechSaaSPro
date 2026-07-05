import { ArrowRight } from "lucide-react";

import { landingContent } from "@/content/landing";

import styles from "./landing-page.module.css";

/** CTA final — simple, premium, très aéré. */
export function FinalCTA() {
  const { title, subtitle, buttons } = landingContent.finalCta;

  return (
    <section className={styles.finalCta}>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className={styles.finalCtaButtons}>
        {buttons.map((button) => (
          <a
            key={button.label}
            href={button.href}
            className={button.variant === "primary" ? styles.primaryCta : styles.ghostCta}
          >
            {button.label}
            {button.variant === "primary" && <ArrowRight />}
          </a>
        ))}
      </div>
    </section>
  );
}
