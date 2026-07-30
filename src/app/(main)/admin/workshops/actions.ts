"use server";

import { revalidatePath } from "next/cache";

import {
  isValidRegistrationNumber,
  registrationNumberForStorage,
  type RegistrationCountry,
} from "@/lib/registration-number";
import { ADMIN_ACTOR, isAdminSession, openAdminSession } from "@/lib/server/admin-auth";
import { isLegacySchemaError } from "@/lib/server/capabilities";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type AdminWorkshopRow = {
  id: string;
  name: string;
  commercialName: string | null;
  country: string;
  siret: string | null;
  hasBilling: boolean;
  plan: string | null;
  createdAt: string;
};

export type AdminActionResult = { success: boolean; message?: string };

export async function loginWorkshopAdmin(password: string): Promise<AdminActionResult> {
  return openAdminSession(password);
}

export async function isWorkshopAdminAuthed(): Promise<boolean> {
  return isAdminSession();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function workshopCountry(value: unknown): RegistrationCountry {
  return String(value ?? "FR").toUpperCase() === "CH" ? "CH" : "FR";
}

export async function fetchAdminWorkshops(): Promise<AdminWorkshopRow[]> {
  if (!(await isAdminSession())) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("id,name,commercial_name,country,siret,has_billing,created_at")
    .order("created_at", { ascending: false });
  if (isLegacySchemaError(error)) {
    // Message explicite plutôt qu'une liste vide, qui ferait croire à un
    // problème de clé Supabase alors que seule la migration manque.
    // Un fichier « use server » n'exporte que des fonctions : pas de classe
    // d'erreur dédiée, la console se contente du message.
    throw new Error(
      "Migration de capacité non appliquée : exécutez 20260729231517_add_workshop_billing_capability.sql avant d’utiliser cette console.",
    );
  }
  if (error) {
    console.error("[admin-workshops] fetch failed", error.message);
    return [];
  }

  const ids = (workshops ?? []).map((workshop) => workshop.id);
  const { data: licenses } = ids.length
    ? await supabase.from("license_keys").select("workshop_id,plan").in("workshop_id", ids)
    : { data: [] as Array<{ workshop_id: string; plan: string }> };
  const planByWorkshop = new Map((licenses ?? []).map((license) => [license.workshop_id, license.plan]));

  return (workshops ?? []).map((workshop) => ({
    id: workshop.id,
    name: workshop.name,
    commercialName: workshop.commercial_name,
    country: workshopCountry(workshop.country),
    siret: workshop.siret,
    hasBilling: workshop.has_billing === true,
    plan: planByWorkshop.get(workshop.id) ?? null,
    createdAt: workshop.created_at,
  }));
}

type AuditEntry = { field: string; previous: string | null; next: string | null };

async function recordAudit(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  workshopId: string,
  entries: AuditEntry[],
) {
  const rows = entries
    .filter((entry) => entry.previous !== entry.next)
    .map((entry) => ({
      workshop_id: workshopId,
      actor: ADMIN_ACTOR,
      field: entry.field,
      previous_value: entry.previous,
      next_value: entry.next,
    }));
  if (!rows.length) return;
  const { error } = await supabase.from("workshop_capability_audit").insert(rows);
  // Le journal ne doit pas masquer une écriture réussie, mais son échec doit
  // être visible : une modification de capacité non tracée est un incident.
  if (error) console.error("[admin-workshops] audit insert failed", error.message);
}

/**
 * Renseigne l'immatriculation et bascule la capacité de facturation.
 *
 * C'est le seul chemin autorisé pour repasser `has_billing` de `true` à
 * `false` : l'application cliente ne peut jamais retirer une capacité accordée.
 */
export async function setWorkshopRegistration(input: {
  workshopId: string;
  registrationNumber: string;
  hasBilling: boolean;
}): Promise<AdminActionResult> {
  if (!(await isAdminSession())) return { success: false, message: "Non autorisé" };
  if (!UUID_RE.test(input.workshopId)) return { success: false, message: "Atelier invalide." };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, message: "Supabase non configuré." };

  const { data: workshop, error: readError } = await supabase
    .from("workshops")
    .select("country,siret,has_billing")
    .eq("id", input.workshopId)
    .maybeSingle();
  if (readError) return { success: false, message: readError.message };
  if (!workshop) return { success: false, message: "Atelier introuvable." };

  const country = workshopCountry(workshop.country);
  let siret: string | null = null;
  if (input.hasBilling) {
    if (!isValidRegistrationNumber(country, input.registrationNumber)) {
      return {
        success: false,
        message:
          country === "CH"
            ? "IDE / UID invalide : format CHE-123.456.789 attendu."
            : "SIRET invalide : 14 chiffres requis, hors valeurs de test.",
      };
    }
    siret = registrationNumberForStorage(country, input.registrationNumber);
  } else {
    // Sans facturation, on conserve un numéro déjà saisi s'il est valide :
    // la contrainte base ne l'interdit pas et l'effacer perdrait une donnée.
    siret = isValidRegistrationNumber(country, input.registrationNumber)
      ? registrationNumberForStorage(country, input.registrationNumber)
      : null;
  }

  const { error: writeError } = await supabase
    .from("workshops")
    .update({ siret, has_billing: input.hasBilling })
    .eq("id", input.workshopId);
  if (writeError) return { success: false, message: writeError.message };

  await recordAudit(supabase, input.workshopId, [
    { field: "siret", previous: workshop.siret ?? null, next: siret },
    {
      field: "has_billing",
      previous: String(workshop.has_billing === true),
      next: String(input.hasBilling),
    },
  ]);

  revalidatePath("/admin/workshops");
  return { success: true };
}

export async function setWorkshopPlan(input: { workshopId: string; plan: string }): Promise<AdminActionResult> {
  if (!(await isAdminSession())) return { success: false, message: "Non autorisé" };
  if (!UUID_RE.test(input.workshopId)) return { success: false, message: "Atelier invalide." };
  const plan = input.plan.trim();
  if (!plan) return { success: false, message: "Forfait requis." };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, message: "Supabase non configuré." };

  const { data: license, error: readError } = await supabase
    .from("license_keys")
    .select("id,plan")
    .eq("workshop_id", input.workshopId)
    .maybeSingle();
  if (readError) return { success: false, message: readError.message };
  if (!license) return { success: false, message: "Aucune licence rattachée à cet atelier." };

  const { error: writeError } = await supabase.from("license_keys").update({ plan }).eq("id", license.id);
  if (writeError) return { success: false, message: writeError.message };

  await recordAudit(supabase, input.workshopId, [{ field: "plan", previous: license.plan ?? null, next: plan }]);

  revalidatePath("/admin/workshops");
  return { success: true };
}

export type AdminAuditRow = {
  id: string;
  field: string;
  previousValue: string | null;
  nextValue: string | null;
  actor: string;
  createdAt: string;
};

export async function fetchWorkshopAudit(workshopId: string): Promise<AdminAuditRow[]> {
  if (!(await isAdminSession())) return [];
  if (!UUID_RE.test(workshopId)) return [];
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("workshop_capability_audit")
    .select("id,field,previous_value,next_value,actor,created_at")
    .eq("workshop_id", workshopId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[admin-workshops] audit fetch failed", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    field: row.field,
    previousValue: row.previous_value,
    nextValue: row.next_value,
    actor: row.actor,
    createdAt: row.created_at,
  }));
}
