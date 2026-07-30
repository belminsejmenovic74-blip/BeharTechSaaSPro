import { NextResponse } from "next/server";
import { z } from "zod";

import { deriveCapabilities } from "@/lib/capabilities";
import { isValidRegistrationNumber, registrationNumberForStorage } from "@/lib/registration-number";
import { getWorkshopCapabilityContext } from "@/lib/server/capabilities";
import { authorizeWorkshopLicense } from "@/lib/server/workshop-license-auth";

export const dynamic = "force-dynamic";

/**
 * Enregistrement de l'immatriculation d'un atelier.
 *
 * Seul point d'écriture de `workshops.has_billing` accessible au client. Le
 * choix soumis à l'onboarding y transite ; le serveur revalide le format du
 * numéro et refuse toute élévation sans numéro valide. Le retrait de la
 * capacité (`true` -> `false`) n'est jamais accepté ici : il est réservé à la
 * console super-admin.
 */
const requestSchema = z.object({
  workshopId: z.string().min(1),
  licenseKey: z.string().min(1),
  country: z.enum(["FR", "CH"]).default("FR"),
  registered: z.boolean(),
  registrationNumber: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête d’immatriculation invalide." }, { status: 400 });
  }
  const { workshopId, licenseKey, country, registered } = parsed.data;

  const auth = await authorizeWorkshopLicense(workshopId, licenseKey);
  if (auth instanceof Response) return auth;
  const { admin } = auth;

  const { data: workshop, error: readError } = await admin
    .from("workshops")
    .select("has_billing,siret")
    .eq("id", workshopId)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: "Lecture atelier impossible." }, { status: 503 });
  if (!workshop) return NextResponse.json({ error: "Atelier introuvable." }, { status: 404 });

  let update: { has_billing: boolean; siret: string | null };
  if (registered) {
    // Revalidation serveur : un client ne peut pas obtenir la facturation en
    // postant `registered: true` avec un numéro absent ou mal formé.
    if (!isValidRegistrationNumber(country, parsed.data.registrationNumber)) {
      return NextResponse.json(
        {
          error: "invalid_registration_number",
          message:
            country === "CH"
              ? "IDE / UID invalide : format CHE-123.456.789 attendu."
              : "SIRET invalide : 14 chiffres requis, hors valeurs de test.",
        },
        { status: 400 },
      );
    }
    update = {
      has_billing: true,
      siret: registrationNumberForStorage(country, parsed.data.registrationNumber),
    };
  } else {
    // Sens unique : on n'accepte jamais de retirer une capacité déjà accordée.
    if (workshop.has_billing === true) {
      return NextResponse.json(
        {
          error: "billing_downgrade_forbidden",
          message: "La facturation déjà active ne peut pas être retirée depuis l’application.",
        },
        { status: 403 },
      );
    }
    update = { has_billing: false, siret: null };
  }

  const { error: writeError } = await admin.from("workshops").update(update).eq("id", workshopId);
  if (writeError) {
    console.error("[behar-registration] workshop update failed", { code: writeError.code, workshopId });
    return NextResponse.json({ error: "Enregistrement de l’immatriculation impossible." }, { status: 500 });
  }

  try {
    const context = await getWorkshopCapabilityContext(admin, workshopId, auth.session?.licenseId);
    return NextResponse.json(context, { headers: { "cache-control": "private, no-store" } });
  } catch {
    // L'écriture a abouti : on ne fait pas échouer l'appel sur la relecture.
    return NextResponse.json({
      capabilities: deriveCapabilities({ billingEnabled: update.has_billing }),
      registrationNumber: update.siret,
    });
  }
}
