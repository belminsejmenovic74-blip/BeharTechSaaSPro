"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Lock, LogIn, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

/**
 * Garde de session par code PIN.
 *
 * - Si aucune session (sessionUserId vide), affiche un écran de saisie PIN.
 * - Si la session est invalidée (utilisateur supprimé / désactivé), retombe sur l'écran PIN.
 * - Sinon, rend les enfants normalement.
 */
export function PinLoginGate({ children }: Readonly<{ children: ReactNode }>) {
  const sessionUserId = useBeharStore((s) => s.sessionUserId);
  const users = useBeharStore((s) => s.users);
  const loginWithPin = useBeharStore((s) => s.loginWithPin);
  const _hasHydrated = useBeharStore((s) => s._hasHydrated);

  const validSession = useMemo(() => {
    if (!sessionUserId) return false;
    const user = users.find((u) => u.id === sessionUserId);
    return Boolean(user?.active);
  }, [sessionUserId, users]);

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAFAF8] text-[#6B6B6B]">
        Chargement…
      </div>
    );
  }

  if (!validSession) {
    return <PinLoginScreen onSuccess={(pin) => loginWithPin(pin)} />;
  }

  return <>{children}</>;
}

function PinLoginScreen({
  onSuccess,
}: Readonly<{
  onSuccess: (pin: string) => { ok: boolean; reason?: "invalid" | "disabled" };
}>) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>("");
  const users = useBeharStore((s) => s.users);

  // Hint pour la démo : pas les vraies valeurs, juste un indicateur que des PINs existent
  const demoHints = users
    .filter((u) => u.active && u.pin)
    .map((u) => `${u.name} (${u.role === "admin" ? "Gérant" : u.role === "technician" ? "Tech." : "Accueil"})`)
    .join(" · ");

  const submit = (value: string) => {
    const result = onSuccess(value);
    if (!result.ok) {
      if (result.reason === "disabled") {
        setError("Ce compte est désactivé. Contactez le gérant.");
      } else {
        setError("Code PIN invalide.");
      }
      setPin("");
      return;
    }
    setError("");
    setPin("");
    toast.success("Bienvenue !");
  };

  const onDigit = (digit: string) => {
    setError("");
    setPin((current) => {
      if (current.length >= 6) return current;
      const next = current + digit;
      if (next.length === 4) {
        // tentative à 4 chiffres ; si invalide on garde la possibilité de continuer à 6
        const r = onSuccess(next);
        if (r.ok) {
          return "";
        }
        // continue à saisir pour PIN 5-6
      }
      return next;
    });
  };

  const onBackspace = () => {
    setError("");
    setPin((c) => c.slice(0, -1));
  };

  const onValidate = () => {
    if (!pin) return;
    submit(pin);
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#FAFAF8] px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="mb-5 grid size-14 place-items-center rounded-[18px] bg-[#EAF6F2] text-[#2A9D8F]">
            <ShieldCheck className="size-7" strokeWidth={2} />
          </span>
          <h1 className="font-semibold text-[#1A1916] text-[26px] tracking-tight">Behar Tech Pro</h1>
          <p className="mt-1.5 text-[#6B6B6B] text-[14px]">Connectez-vous avec votre code interne.</p>
        </div>

        <div className="rounded-[24px] border border-[#F1F1EF] bg-white p-6 shadow-[0_2px_8px_rgba(26,25,22,0.04)]">
          {/* Affichage du PIN */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "grid h-12 w-10 place-items-center rounded-[12px] border text-[20px] font-semibold",
                  pin[i]
                    ? "border-[#2A9D8F]/50 bg-[#EAF6F2] text-[#1A1916]"
                    : "border-[#E7E4DC] bg-[#FAFAF8] text-[#CDCBC5]",
                )}
              >
                {pin[i] ? "•" : ""}
              </span>
            ))}
          </div>
          {error && (
            <p className="mt-3 text-center text-[#DC3545] text-[13px] font-medium">{error}</p>
          )}

          {/* Pavé numérique */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => onDigit(digit)}
                className="h-14 rounded-[16px] bg-[#FAFAF8] font-semibold text-[#1A1916] text-[22px] transition active:scale-95 active:bg-[#F1F1EF]"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={onBackspace}
              className="h-14 rounded-[16px] bg-[#FAFAF8] font-medium text-[#6B6B6B] text-[13px] transition active:scale-95 active:bg-[#F1F1EF]"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => onDigit("0")}
              className="h-14 rounded-[16px] bg-[#FAFAF8] font-semibold text-[#1A1916] text-[22px] transition active:scale-95 active:bg-[#F1F1EF]"
            >
              0
            </button>
            <button
              type="button"
              onClick={onValidate}
              disabled={!pin}
              className={cn(
                "h-14 rounded-[16px] font-semibold text-[14px] transition active:scale-95",
                pin
                  ? "bg-[#2A9D8F] text-white shadow-[0_2px_8px_rgba(42,157,143,0.25)]"
                  : "bg-[#F1F1EF] text-[#CDCBC5]",
              )}
            >
              <LogIn className="mx-auto size-5" />
            </button>
          </div>

          {/* Saisie clavier alternative */}
          <div className="mt-5 flex items-center gap-2">
            <Lock className="size-4 text-[#8A8984]" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onValidate();
              }}
              placeholder="Saisie clavier"
              className="h-10 flex-1 rounded-[12px] border border-[#E7E4DC] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
            />
            <button
              type="button"
              onClick={() => {
                setPin("");
                setError("");
              }}
              className="grid size-10 place-items-center rounded-[12px] text-[#6B6B6B] hover:bg-[#F6F7F4]"
              title="Réinitialiser"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>

        {demoHints && (
          <p className="mt-5 text-center text-[#8A8984] text-[12px] leading-relaxed">
            Démo : Gérant 0000 · Technicien 1234 · Accueil 5678 · Stagiaire 9999
          </p>
        )}
      </div>
    </div>
  );
}

