// Pont de session entre le site public (behartechpro.fr, auth Supabase) et le
// SaaS (app.behartechpro.fr, licence + PIN).
//
// Principe : après connexion, le site public génère un CODE de transfert
// à usage unique et courte durée (nonce imprévisible, PAS un token/refresh/secret
// Supabase). Le SaaS échange ce code — une seule fois — contre la clé de licence
// de l'atelier, puis active la licence localement. Aucun token n'apparaît jamais
// dans l'URL ; le code est invalidé dès qu'il est consommé.
//
// Dépendance côté base (à finaliser par l'automatisation) : la RPC
// `redeem_workshop_handoff(p_code)` et le mapping compte → licence. Voir
// supabase/migrations/…_workshop_session_handoff.sql et docs/session-handoff.md.

const HANDOFF_PARAM = "bthk";

export type RedeemedHandoff = {
  licenseKey: string;
  plan?: string;
  status?: string;
  workshopId?: string;
  role?: string;
};

/** Lit le code de transfert présent dans l'URL (ou null). */
export function readHandoffCode(): string | null {
  if (typeof window === "undefined") return null;
  const code = new URLSearchParams(window.location.search).get(HANDOFF_PARAM);
  if (!code) return null;
  // Un code légitime est un nonce hex assez long : on ignore tout le reste.
  return /^[a-f0-9]{24,}$/i.test(code) ? code : null;
}

export function readHandoffReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

/** Retire le code de transfert de l'URL sans recharger la page. */
export function clearHandoffCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(HANDOFF_PARAM)) return;
  url.searchParams.delete(HANDOFF_PARAM);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

/**
 * Échange le code contre la clé de licence via la RPC Supabase (usage unique).
 * Renvoie la clé ou null si le code est absent/expiré/déjà consommé, ou si la
 * RPC n'est pas encore déployée (dégradation propre : le SaaS demandera la clé).
 */
export async function redeemWorkshopHandoff(code: string): Promise<RedeemedHandoff | null> {
  try {
    const response = await fetch("/api/auth/handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as RedeemedHandoff;
    return data.licenseKey?.trim() ? data : null;
  } catch {
    return null;
  }
}
