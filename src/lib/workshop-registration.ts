"use client";

import type { RegistrationCountry } from "@/lib/registration-number";

export type RegistrationChoice = "" | "registered" | "none";

export type WorkshopRegistrationInput = {
  workshopId: string;
  licenseKey: string;
  country: RegistrationCountry;
  registered: boolean;
  registrationNumber?: string;
};

/**
 * Transmet le choix d'immatriculation au serveur, seul habilité à écrire
 * `has_billing`. L'échec est volontairement remonté : sans cet appel, un compte
 * resterait sans facturation alors que l'utilisateur a déclaré son entreprise.
 */
export async function submitWorkshopRegistration(input: WorkshopRegistrationInput): Promise<void> {
  const response = await fetch("/api/behar/registration", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message || "Immatriculation non enregistrée.");
  }
}
