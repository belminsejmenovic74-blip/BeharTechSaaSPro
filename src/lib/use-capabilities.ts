"use client";

import { useEffect, useSyncExternalStore } from "react";

import { PENDING_CAPABILITIES, type Capabilities } from "@/lib/capabilities";

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

let currentSnapshot = pendingSnapshot;
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
      emit();
    })
    .catch(() => {
      currentSnapshot = { ...pendingSnapshot, ready: true, unverified: true };
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
