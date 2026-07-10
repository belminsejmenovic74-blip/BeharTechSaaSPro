"use client";

import { useMemo, useState } from "react";

import {
  Check,
  ChevronRight,
  KeyRound,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/behar/page-shell";
import { PrimaryButton, SecondaryButton } from "@/components/behar/primitives";
import { type CurrentUser, type PermissionKey, permissionKeys, type UserRole, useBeharStore } from "@/lib/behar-store";
import { cn } from "@/lib/utils";

type Mode = "list" | "create" | "edit" | "permissions" | "audit" | "greetings";

// Groupes UI des permissions
const permissionGroups: Array<{ title: string; keys: PermissionKey[] }> = [
  {
    title: "Tableau de bord",
    keys: ["canViewDashboard", "canViewFullDashboard"],
  },
  {
    title: "Réparations",
    keys: [
      "canViewRepairs",
      "canCreateRepair",
      "canEditRepair",
      "canDeleteRepair",
      "canChangeRepairStatus",
      "canAddDiagnosis",
      "canAddTechnicalNotes",
      "canViewTechnicalNotes",
    ],
  },
  {
    title: "Clients",
    keys: ["canViewClients", "canCreateClient", "canEditClient", "canDeleteClient"],
  },
  {
    title: "Devis & Factures",
    keys: [
      "canViewQuotes",
      "canCreateQuote",
      "canEditQuote",
      "canAcceptQuote",
      "canViewInvoices",
      "canCreateInvoice",
      "canEditInvoice",
    ],
  },
  {
    title: "Paiements",
    keys: ["canViewPayments", "canMarkPaymentPaid", "canCancelPayment"],
  },
  {
    title: "Stock",
    keys: [
      "canViewStock",
      "canManageStock",
      "canUseStockItem",
      "canViewPurchasePrice",
      "canViewMargin",
      "canViewSupplier",
    ],
  },
  {
    title: "Ventes",
    keys: [
      "canViewSales",
      "canCreateSale",
      "canEditSale",
      "canCancelSale",
      "canRefundSale",
      "canApplyDiscount",
      "canChangeSalePrice",
      "canViewSalesStats",
      "canExportSales",
    ],
  },
  {
    title: "Documents",
    keys: ["canViewDocuments", "canDownloadDocuments", "canViewInternalDocuments"],
  },
  {
    title: "Paramètres & Équipe",
    keys: ["canViewSettings", "canEditSettings", "canManageUsers", "canManageRoles"],
  },
  {
    title: "Données sensibles & Audit",
    keys: ["canExportData", "canImportData", "canBackupData", "canViewAuditLog", "canViewNotifications"],
  },
];

const PERMISSION_LABELS: Partial<Record<PermissionKey, string>> = {
  canViewDashboard: "Voir le tableau de bord",
  canViewFullDashboard: "Voir les KPI complets",
  canViewRepairs: "Voir les réparations",
  canCreateRepair: "Créer une réparation",
  canEditRepair: "Modifier une réparation",
  canDeleteRepair: "Supprimer une réparation",
  canChangeRepairStatus: "Changer le statut",
  canAddDiagnosis: "Ajouter un diagnostic",
  canAddTechnicalNotes: "Ajouter des notes techniques",
  canViewTechnicalNotes: "Voir les notes techniques",
  canViewClients: "Voir les clients",
  canCreateClient: "Créer un client",
  canEditClient: "Modifier un client",
  canDeleteClient: "Supprimer un client",
  canViewQuotes: "Voir les devis",
  canCreateQuote: "Créer un devis",
  canEditQuote: "Modifier un devis",
  canAcceptQuote: "Accepter un devis",
  canViewInvoices: "Voir les factures",
  canCreateInvoice: "Créer une facture",
  canEditInvoice: "Modifier une facture",
  canViewPayments: "Voir les paiements",
  canMarkPaymentPaid: "Indiquer un règlement",
  canCancelPayment: "Annuler / rembourser",
  canViewStock: "Voir le stock",
  canManageStock: "Gérer le stock",
  canUseStockItem: "Utiliser une pièce",
  canViewPurchasePrice: "Voir le prix d'achat",
  canViewMargin: "Voir la marge",
  canViewSupplier: "Voir le fournisseur",
  canViewSales: "Voir les ventes",
  canCreateSale: "Créer une vente",
  canEditSale: "Modifier une vente",
  canCancelSale: "Annuler une vente",
  canRefundSale: "Rembourser une vente",
  canApplyDiscount: "Appliquer une remise",
  canChangeSalePrice: "Modifier le prix de vente",
  canViewSalesStats: "Voir les stats de vente",
  canExportSales: "Exporter les ventes",
  canViewDocuments: "Voir les documents",
  canDownloadDocuments: "Télécharger les documents",
  canViewInternalDocuments: "Voir les documents internes",
  canViewSettings: "Voir les paramètres",
  canEditSettings: "Modifier les paramètres",
  canManageUsers: "Gérer l'équipe",
  canManageRoles: "Modifier les permissions",
  canExportData: "Exporter les données",
  canImportData: "Importer des données",
  canBackupData: "Sauvegarder",
  canViewAuditLog: "Voir l'historique d'activité",
  canViewNotifications: "Voir les notifications",
};

const roleLabel = (role: UserRole) => (role === "admin" ? "Gérant" : role === "technician" ? "Technicien" : "Accueil");

export default function TeamPage() {
  const currentUser = useBeharStore((s) => s.currentUser);
  const users = useBeharStore((s) => s.users);
  const hasPermission = useBeharStore((s) => s.hasPermission);
  const addUser = useBeharStore((s) => s.addUser);
  const updateUser = useBeharStore((s) => s.updateUser);
  const deactivateUser = useBeharStore((s) => s.deactivateUser);
  const reactivateUser = useBeharStore((s) => s.reactivateUser);
  const deleteUser = useBeharStore((s) => s.deleteUser);
  const resetUserPin = useBeharStore((s) => s.resetUserPin);
  const setUserPermission = useBeharStore((s) => s.setUserPermission);
  const resetUserPermissions = useBeharStore((s) => s.resetUserPermissions);
  const auditLogs = useBeharStore((s) => s.auditLogs);

  const canManage = hasPermission("canManageUsers");
  const canManageRolesPerm = hasPermission("canManageRoles");
  const canViewAudit = hasPermission("canViewAuditLog");

  const [mode, setMode] = useState<Mode>("list");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = useMemo(() => users.find((u) => u.id === selectedUserId) ?? null, [users, selectedUserId]);

  if (!canManage) {
    return (
      <PageShell title="Équipe" subtitle="Accès restreint.">
        <div className="mx-auto max-w-[480px] rounded-[20px] border border-[#E8E8E5] bg-white p-10 text-center shadow-[0_2px_8px_rgba(26,25,22,0.04)]">
          <ShieldCheck className="mx-auto size-10 text-[#A3A3A3]" />
          <p className="mt-4 font-semibold text-[#1A1916] text-[18px] tracking-tight">Permission requise</p>
          <p className="mt-1.5 text-[#6B6B6B] text-[14px]">Seul le gérant peut accéder à la gestion de l'équipe.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Équipe & permissions"
      subtitle="Membres, rôles et autorisations."
      actions={
        <>
          <SecondaryButton className="h-10" onClick={() => setMode("greetings")}>
            <MessageCircle className="size-4" /> Messages
          </SecondaryButton>
          {canViewAudit && (
            <SecondaryButton className="h-10" onClick={() => setMode("audit")}>
              Historique
            </SecondaryButton>
          )}
          <PrimaryButton
            className="h-10"
            onClick={() => {
              setSelectedUserId(null);
              setMode("create");
            }}
          >
            <Plus className="size-4" /> Ajouter un membre
          </PrimaryButton>
        </>
      }
    >
      {mode === "list" && (
        <TeamList
          users={users}
          currentUserId={currentUser.id}
          onEdit={(id) => {
            setSelectedUserId(id);
            setMode("edit");
          }}
          onPermissions={(id) => {
            setSelectedUserId(id);
            setMode("permissions");
          }}
          onToggleActive={(id, active) => {
            if (active) reactivateUser(id);
            else deactivateUser(id);
            toast.success(active ? "Membre réactivé" : "Membre désactivé");
          }}
          onDelete={(id) => {
            if (!window.confirm("Supprimer ce membre ? Cette action est définitive.")) return;
            deleteUser(id);
            toast.success("Membre supprimé");
          }}
          onResetPin={(id) => {
            const newPin = window.prompt("Nouveau code PIN (4 à 6 chiffres) :");
            if (!newPin) return;
            const clean = newPin.replace(/\D/g, "").slice(0, 6);
            if (clean.length < 4) {
              toast.error("PIN trop court (4 chiffres minimum)");
              return;
            }
            resetUserPin(id, clean);
            toast.success("PIN réinitialisé");
          }}
          canManageRoles={canManageRolesPerm}
        />
      )}

      {(mode === "create" || mode === "edit") && (
        <MemberForm
          mode={mode}
          initial={selectedUser}
          onCancel={() => setMode("list")}
          onSave={(payload) => {
            if (mode === "create") {
              if (!payload.pin || payload.pin.length < 4) {
                toast.error("PIN obligatoire (4 chiffres minimum)");
                return;
              }
              const id = addUser({ name: payload.name, role: payload.role, pin: payload.pin });
              if (id) {
                toast.success("Membre ajouté");
                setMode("list");
              } else {
                toast.error("Création impossible (permissions)");
              }
            } else if (selectedUserId) {
              updateUser(selectedUserId, { name: payload.name, role: payload.role });
              toast.success("Membre mis à jour");
              setMode("list");
            }
          }}
        />
      )}

      {mode === "permissions" && selectedUser && (
        <PermissionsEditor
          user={selectedUser}
          canEdit={canManageRolesPerm}
          onClose={() => setMode("list")}
          onToggle={(key, value) => setUserPermission(selectedUser.id, key, value)}
          onReset={() => {
            if (!window.confirm("Réinitialiser aux permissions du rôle ?")) return;
            resetUserPermissions(selectedUser.id);
            toast.success("Permissions remises au rôle");
          }}
        />
      )}

      {mode === "audit" && <AuditLogView logs={auditLogs} onClose={() => setMode("list")} />}

      {mode === "greetings" && <GreetingsEditor onClose={() => setMode("list")} />}
    </PageShell>
  );
}

function TeamList({
  users,
  currentUserId,
  onEdit,
  onPermissions,
  onToggleActive,
  onDelete,
  onResetPin,
  canManageRoles,
}: Readonly<{
  users: CurrentUser[];
  currentUserId: string;
  onEdit: (id: string) => void;
  onPermissions: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onResetPin: (id: string) => void;
  canManageRoles: boolean;
}>) {
  return (
    <div className="space-y-3">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        return (
          <div
            key={user.id}
            className={cn(
              "rounded-[18px] border bg-white p-4 transition shadow-[0_1px_2px_rgba(26,25,22,0.03)]",
              user.active ? "border-[#FFFFFF]" : "border-[#FFFFFF] bg-[#FFFFFF] opacity-80",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[#FFFFFF] font-semibold text-[#2A9D8F] text-[15px]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A1916] text-[15px] tracking-tight">
                    {user.name}
                    {isSelf && <span className="ml-2 text-[#6B6B6B] text-[12px]">(vous)</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-[7px] border border-[#E8E8E5] bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#1A1916] text-[11px]">
                      {roleLabel(user.role)}
                    </span>
                    {user.active ? (
                      <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#147065] text-[11px]">
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#FFFFFF] px-2 py-0.5 font-medium text-[#B42318] text-[11px]">
                        Désactivé
                      </span>
                    )}
                    <span className="text-[#6B6B6B] text-[11px]">
                      PIN&nbsp;{user.pin ? "•".repeat(user.pin.length) : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onResetPin(user.id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-[12.5px] hover:bg-[#FFFFFF]"
                >
                  <KeyRound className="size-3.5" /> PIN
                </button>
                {canManageRoles && (
                  <button
                    type="button"
                    onClick={() => onPermissions(user.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-[12.5px] hover:bg-[#FFFFFF]"
                  >
                    <ShieldCheck className="size-3.5" /> Permissions
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(user.id)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E8E8E5] bg-white px-3 text-[#1A1916] text-[12.5px] hover:bg-[#FFFFFF]"
                >
                  <Pencil className="size-3.5" /> Modifier
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(user.id, !user.active)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px]",
                    user.active
                      ? "border-[#E8E8E5] bg-white text-[#1A1916] hover:bg-[#FFFFFF]"
                      : "border-[#2A9D8F]/40 bg-[#FFFFFF] text-[#147065] hover:bg-[#FFFFFF]",
                  )}
                >
                  {user.active ? "Désactiver" : "Réactiver"}
                </button>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => onDelete(user.id)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#FDD8D8] bg-white px-3 text-[#B42318] text-[12.5px] hover:bg-[#FFFFFF]"
                  >
                    <Trash2 className="size-3.5" /> Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemberForm({
  mode,
  initial,
  onCancel,
  onSave,
}: Readonly<{
  mode: "create" | "edit";
  initial: CurrentUser | null;
  onCancel: () => void;
  onSave: (payload: { name: string; role: UserRole; pin?: string }) => void;
}>) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "technician");
  const [pin, setPin] = useState("");

  return (
    <div className="mx-auto max-w-[640px] space-y-4 rounded-[20px] border border-[#FFFFFF] bg-white p-6 shadow-[0_2px_8px_rgba(26,25,22,0.04)]">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1A1916] text-[18px] tracking-tight">
          {mode === "create" ? "Nouveau membre" : "Modifier le membre"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="grid size-9 place-items-center rounded-full text-[#6B6B6B] hover:bg-[#FFFFFF]"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[#1A1916] text-[13px] font-medium">Nom *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Sarah, Mehdi, Comptoir 1…"
            className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[#1A1916] text-[13px] font-medium">Rôle *</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(["admin", "technician", "frontdesk"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-[14px] border bg-white px-3.5 py-3 text-left transition",
                  role === r ? "border-[#2A9D8F] bg-[#FFFFFF]" : "border-[#E8E8E5] hover:bg-[#FFFFFF]",
                )}
              >
                <span className="font-semibold text-[#1A1916] text-[14px]">{roleLabel(r)}</span>
                <span className="text-[#6B6B6B] text-[11.5px] leading-snug">
                  {r === "admin"
                    ? "Accès complet, paramètres, équipe."
                    : r === "technician"
                      ? "Réparations, diagnostics, clients."
                      : "Clients, RDV, dépôt, paiements."}
                </span>
              </button>
            ))}
          </div>
        </div>

        {mode === "create" && (
          <div>
            <label className="mb-1.5 block text-[#1A1916] text-[13px] font-medium">Code PIN * (4 à 6 chiffres)</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Ex : 1234"
              inputMode="numeric"
              className="h-11 w-full rounded-[12px] border border-[#E8E8E5] bg-white px-3.5 text-[#1A1916] text-sm outline-none focus:border-[#2A9D8F]"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <SecondaryButton className="h-10" onClick={onCancel}>
          Annuler
        </SecondaryButton>
        <PrimaryButton
          className="h-10"
          onClick={() => {
            if (!name.trim()) {
              toast.error("Nom obligatoire");
              return;
            }
            onSave({ name: name.trim(), role, pin: mode === "create" ? pin : undefined });
          }}
        >
          <Check className="size-4" /> Enregistrer
        </PrimaryButton>
      </div>
    </div>
  );
}

function PermissionsEditor({
  user,
  canEdit,
  onClose,
  onToggle,
  onReset,
}: Readonly<{
  user: CurrentUser;
  canEdit: boolean;
  onClose: () => void;
  onToggle: (key: PermissionKey, value: boolean) => void;
  onReset: () => void;
}>) {
  const effective = user.permissions;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#FFFFFF] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.03)]">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center text-[#2A9D8F]">
            <UserCog className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-[#1A1916] text-[16px] tracking-tight">{user.name}</p>
            <p className="text-[#6B6B6B] text-[12.5px]">Rôle : {roleLabel(user.role)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton className="h-10" onClick={onReset}>
            Réinitialiser au rôle
          </SecondaryButton>
          <SecondaryButton className="h-10" onClick={onClose}>
            Retour
          </SecondaryButton>
        </div>
      </div>

      {!canEdit && (
        <div className="rounded-[14px] border border-[#E8E8E5] bg-[#FFFFFF] px-4 py-3 text-[#6B6B6B] text-[13px]">
          Vous n'avez pas la permission `canManageRoles`. Les permissions ci-dessous sont en lecture seule.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {permissionGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-[20px] border border-[#FFFFFF] bg-white p-5 shadow-[0_1px_2px_rgba(26,25,22,0.03)]"
          >
            <h3 className="font-semibold text-[#1A1916] text-[14px] tracking-tight">{group.title}</h3>
            <div className="mt-3 space-y-1">
              {group.keys.map((key) => {
                if (!permissionKeys.includes(key)) return null;
                const value = Boolean(effective[key]);
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-[12px] px-3 py-2 transition",
                      canEdit ? "hover:bg-[#FFFFFF]" : "cursor-default",
                    )}
                  >
                    <span className="text-[#1A1916] text-[13.5px]">{PERMISSION_LABELS[key] ?? key}</span>
                    <input
                      type="checkbox"
                      checked={value}
                      disabled={!canEdit}
                      onChange={(e) => onToggle(key, e.target.checked)}
                      className="accent-[#2A9D8F] size-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogView({
  logs,
  onClose,
}: Readonly<{
  logs: Array<{
    id: string;
    actorName: string;
    actorRole: UserRole;
    action: string;
    targetType: string;
    targetId: string;
    message: string;
    createdAt: string;
  }>;
  onClose: () => void;
}>) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1A1916] text-[18px] tracking-tight">Historique d'activité</h2>
        <SecondaryButton className="h-10" onClick={onClose}>
          Retour
        </SecondaryButton>
      </div>
      <div className="rounded-[20px] border border-[#FFFFFF] bg-white shadow-[0_1px_2px_rgba(26,25,22,0.03)] overflow-hidden">
        {logs.length === 0 ? (
          <p className="px-5 py-10 text-center text-[#6B6B6B] text-sm">Aucune action enregistrée pour le moment.</p>
        ) : (
          <ul className="divide-y divide-[#FFFFFF]">
            {[...logs]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .slice(0, 200)
              .map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-5 py-3">
                  <ChevronRight className="mt-1 size-3.5 text-[#A3A3A3]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[#1A1916] text-[13.5px]">
                      <span className="font-semibold">{log.actorName}</span>
                      <span className="ml-1.5 rounded-[7px] border border-[#E8E8E5] bg-[#FFFFFF] px-1.5 py-0.5 font-medium text-[#6B6B6B] text-[10.5px]">
                        {roleLabel(log.actorRole)}
                      </span>
                      <span className="ml-2 text-[#6B6B6B]">{log.message}</span>
                    </p>
                    <p className="mt-0.5 text-[#6B6B6B] text-[11.5px]">
                      {log.action} · {new Date(log.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GreetingsEditor({ onClose }: Readonly<{ onClose: () => void }>) {
  const roleGreetings = useBeharStore((s) => s.roleGreetings);
  const updateRoleGreetings = useBeharStore((s) => s.updateRoleGreetings);
  const resetRoleGreetings = useBeharStore((s) => s.resetRoleGreetings);
  const [activeRole, setActiveRole] = useState<UserRole>("admin");
  // Texte brut multilignes — chaque ligne = un message
  const [draft, setDraft] = useState<Record<UserRole, string>>({
    admin: roleGreetings.admin.join("\n"),
    technician: roleGreetings.technician.join("\n"),
    frontdesk: roleGreetings.frontdesk.join("\n"),
  });

  const handleSave = () => {
    const messages = draft[activeRole]
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);
    updateRoleGreetings(activeRole, messages);
    toast.success(`Messages ${roleName(activeRole)} sauvegardés (${messages.length})`);
  };

  const handleReset = () => {
    if (!window.confirm(`Restaurer les messages d'origine pour le rôle ${roleName(activeRole)} ?`)) return;
    resetRoleGreetings(activeRole);
    // Recharger le brouillon depuis le store après reset
    setTimeout(() => {
      const fresh = useBeharStore.getState().roleGreetings[activeRole];
      setDraft((d) => ({ ...d, [activeRole]: fresh.join("\n") }));
    }, 0);
    toast.success("Messages remis à l'origine");
  };

  const tabs: { role: UserRole; label: string }[] = [
    { role: "admin", label: "Gérant" },
    { role: "technician", label: "Technicien" },
    { role: "frontdesk", label: "Accueil" },
  ];

  const count = draft[activeRole]
    .split("\n")
    .map((m) => m.trim())
    .filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="rounded-[20px] border border-[#E8E8E5] bg-white shadow-[0_2px_8px_rgba(26,25,22,0.04)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#FFFFFF] p-5">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 text-[#2A9D8F]" />
              <h2 className="font-semibold text-[#1A1916] text-[19px] tracking-tight">Messages d'accueil</h2>
            </div>
            <p className="mt-1 text-[#6B6B6B] text-[13px]">
              Personnalisez les messages affichés sur l'écran de connexion, par rôle. Un message par ligne.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-[12px] border border-[#E8E8E5] bg-white text-[#6B6B6B] transition hover:bg-[#FFFFFF]"
            aria-label="Fermer"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </div>

        {/* Role tabs */}
        <div className="flex gap-1.5 border-b border-[#FFFFFF] px-5 pt-3">
          {tabs.map((t) => (
            <button
              key={t.role}
              type="button"
              onClick={() => setActiveRole(t.role)}
              className={cn(
                "rounded-t-[10px] px-4 py-2 text-[13px] font-medium transition border-b-2 -mb-px",
                activeRole === t.role
                  ? "border-[#2A9D8F] text-[#1A1916]"
                  : "border-transparent text-[#6B6B6B] hover:text-[#1A1916]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="p-5">
          <p className="mb-2 text-[#6B6B6B] text-[12px]">
            {count} message{count > 1 ? "s" : ""} — un par ligne. Vide = messages par défaut restaurés.
          </p>
          <textarea
            value={draft[activeRole]}
            onChange={(e) => setDraft((d) => ({ ...d, [activeRole]: e.target.value }))}
            rows={14}
            className="w-full resize-y rounded-[12px] border border-[#E8E8E5] bg-white p-3 text-[14px] text-[#1A1916] leading-relaxed outline-none transition focus:border-[#2A9D8F]/60 focus:ring-4 focus:ring-[#2A9D8F]/10"
            placeholder="Un message par ligne…"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <SecondaryButton className="h-10" onClick={handleReset}>
              <RotateCcw className="size-4" /> Restaurer les messages d'origine
            </SecondaryButton>
            <div className="flex gap-2">
              <SecondaryButton className="h-10" onClick={onClose}>
                Annuler
              </SecondaryButton>
              <PrimaryButton className="h-10" onClick={handleSave}>
                <Check className="size-4" /> Enregistrer
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function roleName(role: UserRole): string {
  if (role === "admin") return "Gérant";
  if (role === "technician") return "Technicien";
  return "Accueil";
}
