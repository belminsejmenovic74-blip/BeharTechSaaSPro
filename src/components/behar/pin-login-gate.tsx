"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { ArrowLeft, ChevronRight, Lock, LogIn, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { type CurrentUser, useBeharStore } from "@/lib/behar-store";
import { safeReturnTo } from "@/lib/stock-label-url";
import { cn } from "@/lib/utils";

/**
 * Garde de session à deux étapes :
 * 1. Sélecteur d'utilisateur (liste de tous les comptes actifs).
 * 2. Saisie du code PIN pour le compte choisi.
 *
 * - Si aucune session active, affiche le sélecteur.
 * - Une fois l'utilisateur sélectionné, affiche le pavé PIN.
 * - Sinon, rend les enfants.
 */
export function PinLoginGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionUserId = useBeharStore((s) => s.sessionUserId);
  const users = useBeharStore((s) => s.users);
  const workshopInfo = useBeharStore((s) => s.workshopInfo);
  const loginWithUserPin = useBeharStore((s) => s.loginWithUserPin);
  const _hasHydrated = useBeharStore((s) => s._hasHydrated);
  const setHasHydrated = useBeharStore((s) => s.setHasHydrated);
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false);

  useEffect(() => {
    if (_hasHydrated) return;
    const t = window.setTimeout(() => {
      setHydrationTimedOut(true);
      setHasHydrated(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, [_hasHydrated, setHasHydrated]);

  const validSession = useMemo(() => {
    if (!sessionUserId) return false;
    const user = users.find((u) => u.id === sessionUserId);
    return Boolean(user?.active);
  }, [sessionUserId, users]);

  if (!_hasHydrated && !hydrationTimedOut) {
    return <div className="flex min-h-svh items-center justify-center bg-white text-[#6B6B6B]">Chargement…</div>;
  }

  if (!validSession) {
    // Le gérant principal hérite du nom configuré dans Atelier si le compte
    // utilisateur n'a pas été personnalisé (encore "Gérant" par défaut).
    const managerDisplayName =
      (workshopInfo?.managerSignature && workshopInfo.managerSignature.trim()) ||
      (workshopInfo?.name && workshopInfo.name.trim()) ||
      "";
    const visibleUsers = users
      .filter((u) => u.active)
      .map((u) => {
        if (u.role !== "admin") return u;
        const isDefault = !u.name?.trim() || u.name.trim() === "Gérant";
        if (isDefault && managerDisplayName) {
          return { ...u, name: managerDisplayName };
        }
        return u;
      });
    return (
      <LoginFlow
        users={visibleUsers}
        onLogin={(userId, pin) => {
          const result = loginWithUserPin(userId, pin);
          if (result.ok) {
            const requestedReturnTo =
              typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("returnTo");
            router.replace(safeReturnTo(requestedReturnTo, pathname || "/dashboard"));
          }
          return result;
        }}
      />
    );
  }

  return <>{children}</>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  LoginFlow – orchestrates user selection → PIN entry                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function LoginFlow({
  users,
  onLogin,
}: Readonly<{
  users: CurrentUser[];
  onLogin: (userId: string, pin: string) => { ok: boolean; reason?: "invalid" | "disabled"; user?: CurrentUser };
}>) {
  const [selectedUser, setSelectedUser] = useState<CurrentUser | null>(null);

  if (!selectedUser) {
    return <UserSelectorScreen users={users} onSelect={(user) => setSelectedUser(user)} />;
  }

  return (
    <PinEntryScreen
      user={selectedUser}
      onBack={() => setSelectedUser(null)}
      onSubmit={(pin) => onLogin(selectedUser.id, pin)}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Role helpers                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function roleLabel(role: string) {
  if (role === "admin") return "Gérant";
  if (role === "technician") return "Technicien";
  if (role === "frontdesk") return "Accueil";
  return "Compte";
}

function roleSubtitle(role: string, displayName: string) {
  // Si le nom affiché correspond au libellé du rôle (pas de personnalisation
  // côté atelier), on garde un sous-titre informatif au lieu de répéter.
  const label = roleLabel(role);
  if (displayName.trim().toLowerCase() === label.toLowerCase()) {
    if (role === "admin") return "Compte principal";
    return label;
  }
  return label;
}

function avatarColor(role: string): string {
  if (role === "admin") return "bg-[#2A9D8F] text-white";
  if (role === "technician") return "bg-[#6366F1] text-white";
  return "bg-[#FFFFFF] text-white";
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Screen 1 — User selector                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

function UserSelectorScreen({
  users,
  onSelect,
}: Readonly<{
  users: CurrentUser[];
  onSelect: (user: CurrentUser) => void;
}>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-white px-5 py-10">
      <div className="w-full max-w-[480px]">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="font-bold text-[#1A1916] text-[44px] tracking-[-0.03em] leading-none">Bonjour</h1>
          <p className="mt-3 text-[#6B6B6B] text-[15px]">Choisissez votre compte</p>
        </div>

        {/* User cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {users.map((user) => {
            const avatar = avatarColor(user.role);
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onSelect(user)}
                className="group flex items-center gap-4 rounded-[20px] border border-[#FFFFFF] bg-white px-4 py-4 text-left shadow-[0_1px_4px_rgba(26,25,22,0.04)] transition active:scale-[0.98] hover:border-[#DADADA] hover:shadow-[0_4px_16px_rgba(26,25,22,0.08)]"
              >
                {/* Avatar */}
                <span
                  className={cn("grid size-12 shrink-0 place-items-center rounded-full text-[18px] font-bold", avatar)}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#1A1916] text-[15px] leading-tight">{user.name}</p>
                  <p className="mt-0.5 text-[#6B6B6B] text-[12px] font-medium">{roleSubtitle(user.role, user.name)}</p>
                </div>

                {/* Arrow */}
                <ChevronRight
                  className="size-4 shrink-0 text-[#A3A3A3] transition group-hover:text-[#6B6B6B]"
                  strokeWidth={2}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Screen 2 — PIN entry for a specific user                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

function PinEntryScreen({
  user,
  onBack,
  onSubmit,
}: Readonly<{
  user: CurrentUser;
  onBack: () => void;
  onSubmit: (pin: string) => { ok: boolean; reason?: "invalid" | "disabled" };
}>) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string>("");
  const avatar = avatarColor(user.role);
  const roleGreetings = useBeharStore((s) => s.roleGreetings);
  // Locks one random greeting for this mount (doesn't change on every render/keystroke)
  const greeting = useMemo(() => {
    const messages = roleGreetings[user.role as keyof typeof roleGreetings] || [];
    if (messages.length === 0) return "";
    return messages[Math.floor(Math.random() * messages.length)];
  }, [user.role, roleGreetings]);

  // Keep a stable ref to onSubmit to avoid stale closures in the effect
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  });

  const submit = (value: string) => {
    const result = onSubmitRef.current(value);
    if (!result.ok) {
      setError(result.reason === "disabled" ? "Ce compte est désactivé. Contactez le gérant." : "Code PIN incorrect.");
      setPin("");
      return;
    }
    setError("");
    setPin("");
    toast.success(`Bienvenue, ${user.name} !`);
  };

  // Auto-submit at exactly 4 digits — MUST be in useEffect, not inside setPin updater
  // to avoid "setState during render" error
  useEffect(() => {
    if (pin.length === 4) {
      submit(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const onDigit = (digit: string) => {
    setError("");
    // Simple update — no side effects, no store calls inside setState
    setPin((current) => (current.length < 6 ? current + digit : current));
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
    <div className="flex min-h-svh items-center justify-center bg-white px-5 py-10">
      <div className="w-full max-w-[380px]">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="mb-6 flex items-center gap-1.5 text-[#6B6B6B] text-[13px] font-medium transition hover:text-[#1A1916]"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Changer d'utilisateur
        </button>

        {/* User identity */}
        <div className="mb-7 flex flex-col items-center text-center">
          <span
            className={cn(
              "mb-4 grid size-16 place-items-center rounded-full text-[26px] font-bold shadow-[0_4px_16px_rgba(26,25,22,0.12)]",
              avatar,
            )}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <h1 className="font-bold text-[#1A1916] text-[28px] tracking-[-0.02em] leading-tight">
            Bonjour {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-[#6B6B6B] text-[12px] font-medium">{roleLabel(user.role)}</p>
          {greeting && (
            <p className="mt-3 max-w-[300px] text-[#6B6B6B] text-[14px] leading-snug italic">« {greeting} »</p>
          )}
        </div>

        <div className="rounded-[24px] border border-[#FFFFFF] bg-white p-6 shadow-[0_2px_8px_rgba(26,25,22,0.04)]">
          {/* PIN dots */}
          <div className="flex justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "grid h-12 w-10 place-items-center rounded-[12px] border text-[20px] font-semibold transition-all duration-150",
                  pin[i]
                    ? "border-[#2A9D8F]/50 bg-[#FFFFFF] text-[#1A1916] scale-105"
                    : "border-[#E8E8E5] bg-[#FFFFFF] text-[#A3A3A3]",
                  error && "border-[#DC3545]/40 bg-[#FFFFFF]",
                )}
              >
                {pin[i] ? "•" : ""}
              </span>
            ))}
          </div>
          {error && (
            <p className="mt-3 text-center text-[#DC3545] text-[13px] font-medium animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </p>
          )}

          {/* Numpad */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => onDigit(digit)}
                className="h-14 rounded-[16px] bg-[#FFFFFF] font-semibold text-[#1A1916] text-[22px] transition active:scale-95 active:bg-[#FFFFFF] hover:bg-[#FFFFFF]"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={onBackspace}
              className="h-14 rounded-[16px] bg-[#FFFFFF] font-medium text-[#6B6B6B] text-[13px] transition active:scale-95 active:bg-[#FFFFFF] hover:bg-[#FFFFFF]"
            >
              ⌫
            </button>
            <button
              type="button"
              onClick={() => onDigit("0")}
              className="h-14 rounded-[16px] bg-[#FFFFFF] font-semibold text-[#1A1916] text-[22px] transition active:scale-95 active:bg-[#FFFFFF] hover:bg-[#FFFFFF]"
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
                  : "bg-[#FFFFFF] text-[#A3A3A3]",
              )}
            >
              <LogIn className="mx-auto size-5" />
            </button>
          </div>

          {/* Keyboard fallback */}
          <div className="mt-5 flex items-center gap-2">
            <Lock className="size-4 text-[#6B6B6B]" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              autoFocus
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onValidate();
              }}
              placeholder="Saisie clavier"
              className="h-10 flex-1 rounded-[12px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
            />
            <button
              type="button"
              onClick={() => {
                setPin("");
                setError("");
              }}
              className="grid size-10 place-items-center rounded-[12px] text-[#6B6B6B] hover:bg-[#FFFFFF]"
              title="Effacer"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-[#8A8A8A] text-[12px]">Entrez votre code PIN à 4 chiffres.</p>
      </div>
    </div>
  );
}
