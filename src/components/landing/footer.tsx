import { ArrowRight } from "lucide-react";

import { landingContent } from "@/content/landing";

import { Brand } from "./_shared";
import styles from "./landing-page.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div>
        <Brand brand={landingContent.header.brand} />
        <p>Le logiciel tout-en-un pour réparateurs de smartphones, ordinateurs et consoles.</p>
        <div className={styles.socialDots}>
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
      <nav>
        <strong>Produit</strong>
        <a href="/#fonctionnalites">Fonctionnalités</a>
        <a href="/#ressources">Mises à jour</a>
        <a href="/#ressources">Sécurité</a>
      </nav>
      <nav>
        <strong>Ressources</strong>
        <a href="/#ressources">Blog</a>
        <a href="/#ressources">Guides</a>
        <a href="/#ressources">Centre d’aide</a>
      </nav>
      <nav>
        <strong>Entreprise</strong>
        <a href="/#ressources">À propos</a>
        <a href="/contact">Contact</a>
        <a href="/#ressources">Mentions légales</a>
      </nav>
      <div className={styles.newsletter}>
        <strong>Restez informé</strong>
        <span>Recevez les nouveautés Behar Tech Pro.</span>
        <label>
          <input placeholder="Votre email" aria-label="Votre email" />
          <button type="button" aria-label="S’inscrire">
            <ArrowRight />
          </button>
        </label>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2026 Behar Tech Pro. Tous droits réservés.</span>
        <span>Fabriqué avec ❤️ pour les réparateurs.</span>
      </div>
    </footer>
  );
}
