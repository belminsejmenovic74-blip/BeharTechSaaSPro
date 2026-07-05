import type { CSSProperties } from "react";

import type { TunnelArcConfig } from "@/content/landing";

import styles from "./landing-page.module.css";

/**
 * Transition "tunnel" : un vrai demi-cercle (arc de cercle exact) rempli d'un
 * dégradé doux. La forme est garantie circulaire car on masque un dégradé plein
 * avec un `radial-gradient` de rayon = circleSize / 2 → aucune approximation.
 *
 *  - direction "down" : le demi-cercle bombe vers le bas (descend vers la
 *    section suivante) → entrée du tunnel, placé sous une section.
 *  - direction "up"   : demi-cercle inversé, bombe vers le haut (on sort du
 *    tunnel) → placé au-dessus de la section suivante.
 *
 * Le centre du cercle est posé hors du bandeau :
 *  - "down" : centre au-dessus  → on voit la calotte basse (bombée vers le bas)
 *  - "up"   : centre en dessous → on voit la calotte haute (bombée vers le haut)
 */
export function TunnelArc({
  direction,
  gradientColors,
  height = 360,
  circleSize = 1400,
  opacity = 1,
  position = "static",
}: TunnelArcConfig) {
  const radius = circleSize / 2;
  // Position verticale du centre du cercle, dans le repère du bandeau.
  const centerY = direction === "down" ? height - radius : radius;

  // Dégradé : plus clair côté "extérieur", plus chaud (beige) côté "tunnel".
  // On inverse les arrêts pour la sortie afin que le beige reste côté tunnel.
  const stops = direction === "up" ? [...gradientColors].reverse() : gradientColors;

  const style = {
    opacity,
    "--arc-height": `${height}px`,
    "--arc-radius": `${radius}px`,
    "--arc-center-y": `${centerY}px`,
    "--arc-gradient": `linear-gradient(180deg, ${stops.join(", ")})`,
  } as CSSProperties;

  return <div className={styles.tunnelArc} data-position={position} style={style} aria-hidden />;
}
