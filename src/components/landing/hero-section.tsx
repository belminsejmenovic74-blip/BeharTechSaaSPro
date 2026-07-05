import { Fragment } from "react";

import Image from "next/image";

import { ArrowRight, Sparkles } from "lucide-react";

import { landingContent } from "@/content/landing";

import { Reveal } from "./_shared";
import styles from "./landing-page.module.css";

/**
 * Hero — précède l'entrée du tunnel. Gros titre noir centré, mockup dashboard
 * dans une fenêtre arrondie avec soft shadow. Fond blanc cassé.
 */
export function HeroSection() {
  const { label, title, subtitle, cta, image, imageAlt } = landingContent.hero;

  return (
    <section className={styles.hero}>
      <Reveal className={styles.heroCenter}>
        <p className={styles.heroLabel}>
          <Sparkles /> {label}
        </p>
        <h1>
          {title.map((line, index) => (
            <Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h1>
        <p>{subtitle}</p>
        <a className={styles.primaryCta} href={cta.href}>
          {cta.label} <ArrowRight />
        </a>
      </Reveal>
      <Reveal className={styles.heroMockupWrap} delay={120}>
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 800px) 96vw, 1180px"
          className={styles.heroMockup}
        />
      </Reveal>
    </section>
  );
}
