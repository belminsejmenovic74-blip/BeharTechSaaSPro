"use client";

import { useEffect, useSyncExternalStore } from "react";

import { deriveCapabilities, PENDING_CAPABILITIES, type Capabilities } from "@/lib/capabilities";

type ClientCapabilitySnapshot = Capabilities & {
  registrationNumber: string | null;
  /**
   * Vrai quand la dernière tentative de vérification a échoué. Les capacités
   * valent alors toutes `false` — choix volontairement fail-closed — mais il
   * s'agit d'une indisponibilité temporaire, pas d'un compte sans facturation.
   * Les deux situations sont indiscernables sans ce drapeau.
   */
  unverified: boolean;
};

const pendingSnapshot: ClientCapabilitySnapshot = {
  ...PENDING_CAPABILITIES,
  registrationNumber: null,
  unverified: false,
};

/**
 * Dernières capacités confirmées par le serveur.
 *
 * L'application est local-first : avant cette couche, afficher ses factures ne
 * dépendait d'aucun appel réseau. Repartir de zéro à chaque chargement rendait
 * l'écran otage d'une session absente ou d'une coupure, et retirait la
 * facturation à un atelier qui y a droit. On conserve donc le dernier résultat
 * vérifié et on le rejoue tant qu'aucun nouveau n'est obtenu.
 *
 * Ce cache ne relâche rien : il ne pilote que l'affichage. Toute écriture
 * commerciale reste refusée côté serveur, qui relit la capacité en base à
 * chaque requête. Un compte jamais vérifié, lui, démarre bien fermé.
 */
const CACHE_KEY = "behar-capabilities-v1";

function readCache(): ClientCapabilitySnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientCapabilitySnapshot;
    if (typeof parsed?.canInvoice !== "boolean") return null;
    return { ...parsed, ready: true, unverified: true };
  } catch {
    return null;
  }
}

/**
 * Traces d'une activité commerciale antérieure à cette couche.
 *
 * Un atelier qui possède déjà des devis, factures ou ventes facturait avant que
 * la capacité n'existe : lui retirer l'écran parce qu'une vérification a échoué
 * est une régression, pas une protection. À l'inverse un compte sans
 * immatriculation ne peut rien créer de commercial — ni par l'interface, ni par
 * le serveur qui refuse l'écriture — donc ces listes restent vides chez lui et
 * il démarre bien fermé.
 */
function hasPriorCommercialActivity(): boolean {
  try {
    const persisted = JSON.parse(localStorage.getItem("behar-tech-local-demo-v3") || "{}") as {
      state?: { invoices?: unknown[]; quotes?: unknown[]; sales?: unknown[] };
    };
    const state = persisted.state ?? {};
    return [state.invoices, state.quotes, state.sales].some((list) => Array.isArray(list) && list.length > 0);
  } catch {
    return false;
  }
}

function writeCache(snapshot: ClientCapabilitySnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...snapshot, unverified: false }));
  } catch {
    // Stockage plein ou navigation privée : le cache est un confort, pas un dû.
  }
}

/** État servi quand le serveur reste muet et qu'aucune vérification n'a abouti. */
function unverifiedFallback(): ClientCapabilitySnapshot {
  if (!hasPriorCommercialActivity()) return { ...pendingSnapshot, ready: true, unverified: true };
  return {
    ...deriveCapabilities({ billingEnabled: true, plan: currentSnapshot.plan }),
    ready: true,
    registrationNumber: currentSnapshot.registrationNumber,
    unverified: true,
  };
}

let currentSnapshot = pendingSnapshot;
// Amorçage au chargement du module côté navigateur : sans lui, le premier rendu
// masquerait la facturation le temps de l'aller-retour, et resterait masqué si
// cet aller-retour n'aboutit jamais.
if (typeof window !== "undefined") {
  currentSnapshot = readCache() ?? currentSnapshot;
}
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCapabilitiesSnapshot(): ClientCapabilitySnapshot {
  return currentSnapshot;
}

export function resetCapabilitiesCache() {
  currentSnapshot = pendingSnapshot;
  loadPromise = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Rien à purger si le stockage est indisponible.
  }
  emit();
}

export function refreshCapabilities(): Promise<void> {
  if (loadPromise) return loadPromise;
  let fallbackIdentity: { workshopId: string; licenseKey: string } | null = null;
  try {
    const persisted = JSON.parse(localStorage.getItem("behar-tech-local-demo-v3") || "{}") as {
      state?: { cloudSync?: { workshopId?: string }; licenseKey?: string };
    };
    const workshopId = persisted.state?.cloudSync?.workshopId;
    const licenseKey = persisted.state?.licenseKey;
    if (workshopId && licenseKey) fallbackIdentity = { workshopId, licenseKey };
  } catch {
    fallbackIdentity = null;
  }

  const load = async () => {
    const sessionResponse = await fetch("/api/behar/capabilities", {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (sessionResponse.ok || !fallbackIdentity) return sessionResponse;
    return fetch("/api/behar/capabilities", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fallbackIdentity),
    });
  };

  loadPromise = load()
    .then(async (response) => {
      if (!response.ok) throw new Error("Capacités indisponibles.");
      const payload = (await response.json()) as {
        capabilities?: Capabilities;
        registrationNumber?: string | null;
      };
      if (!payload.capabilities) throw new Error("Réponse de capacités invalide.");
      currentSnapshot = {
        ...payload.capabilities,
        ready: true,
        registrationNumber: payload.registrationNumber || null,
        unverified: false,
      };
      writeCache(currentSnapshot);
      emit();
    })
    .catch(() => {
      // Le dernier état confirmé prime sur une fermeture aveugle : un atelier
      // déjà vérifié ne perd pas sa facturation parce qu'un appel a échoué.
      currentSnapshot = readCache() ?? unverifiedFallback();
      emit();
    })
    .finally(() => {
      loadPromise = null;
    });
  return loadPromise;
}

export function useCapabilities(): ClientCapabilitySnapshot {
  const snapshot = useSyncExternalStore(subscribe, getCapabilitiesSnapshot, () => pendingSnapshot);
  useEffect(() => {
    if (!snapshot.ready) void refreshCapabilities();
  }, [snapshot.ready]);
  return snapshot;
}
