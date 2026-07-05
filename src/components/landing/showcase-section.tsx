"use client";

import { Fragment, useState } from "react";

import Image from "next/image";

import { ArrowLeft, ArrowRight } from "lucide-react";

import type { ShowcaseContent } from "@/content/landing";

import { CheckList, Dots, Icon } from "./_shared";
import styles from "./landing-page.module.css";

/**
 * Bloc showcase générique (blocs 3, 4 et 5).
 *  - variant "desktop" : avantages à gauche · mockup au centre · onglets à droite.
 *  - variant "phone"   : mockup téléphone au centre entouré de cartes flottantes.
 *
 * L'onglet actif pilote le mockup + les avantages. Flèches rondes et points de
 * slider affichés selon la config (showArrows / arrowPosition / showDots).
 */
export function ShowcaseSection({ content }: { content: ShowcaseContent }) {
  const {
    variant,
    title,
    subtitle,
    accentSubtitle,
    description,
    leftTitleMode,
    leftTitle,
    tabs,
    defaultTab,
    floatingCards,
    showArrows,
    arrowPosition,
    showDots,
  } = content;

  const [active, setActive] = useState(defaultTab);
  const tab = tabs[active] ?? tabs[0];
  const listTitle = leftTitleMode === "tab" ? tab.title : (leftTitle ?? tab.title);

  const go = (delta: number) => setActive((current) => (current + tabs.length + delta) % tabs.length);

  const tabsNav = (
    <nav className={styles.verticalTabs} aria-label={title.join(" ")}>
      {tabs.map((item, index) => (
        <button
          type="button"
          key={item.id}
          className={active === index ? styles.tabActive : ""}
          aria-pressed={active === index}
          onClick={() => setActive(index)}
        >
          {leftTitleMode === "tab" && <span />}
          <Icon name={item.icon} />
          {item.label}
        </button>
      ))}
    </nav>
  );

  const arrows = showArrows && (
    <>
      {arrowPosition === "sides" && (
        <button
          className={`${styles.roundArrow} ${styles.roundArrowLeft}`}
          type="button"
          aria-label="Écran précédent"
          onClick={() => go(-1)}
        >
          <ArrowLeft />
        </button>
      )}
      <button className={styles.roundArrow} type="button" aria-label="Écran suivant" onClick={() => go(1)}>
        <ArrowRight />
      </button>
    </>
  );

  return (
    <section className={`${styles.showcaseSection} ${variant === "phone" ? styles.showcasePhone : ""}`}>
      {tab.badge && <span className={styles.amazonBadge}>{tab.badge}</span>}

      <div className={styles.showcaseHead}>
        <h2>
          {title.map((line, index) => (
            <Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </h2>
        {accentSubtitle && <strong className={styles.accentSubtitle}>{accentSubtitle}</strong>}
        {subtitle && <p>{subtitle}</p>}
        {description && <p>{description}</p>}
      </div>

      {variant === "phone" ? (
        <div className={styles.clientGrid}>
          <CheckList title={listTitle} items={tab.benefits} />
          <div className={styles.floatingCards} data-side="left">
            {floatingCards
              ?.filter((card) => card.anchor.endsWith("left"))
              .map((card) => (
                <article key={card.title} data-anchor={card.anchor}>
                  <Icon name={card.icon} />
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
          </div>
          <div className={styles.phoneStage}>
            <Image src={tab.image} alt={`Écran client — ${tab.label}`} fill sizes="(max-width: 900px) 70vw, 340px" />
          </div>
          <div className={styles.floatingCards} data-side="right">
            {floatingCards
              ?.filter((card) => card.anchor.endsWith("right"))
              .map((card) => (
                <article key={card.title} data-anchor={card.anchor}>
                  <Icon name={card.icon} />
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
          </div>
          {tabsNav}
          {arrows}
        </div>
      ) : (
        <div className={styles.showcaseGrid}>
          <CheckList title={listTitle} items={tab.benefits} />
          <div className={styles.showcaseStage}>
            <Image src={tab.image} alt={`Aperçu — ${tab.label}`} fill sizes="(max-width: 900px) 94vw, 900px" />
          </div>
          {tabsNav}
          {arrows}
        </div>
      )}

      {showDots && <Dots count={tabs.length} active={active} onSelect={setActive} />}
    </section>
  );
}
