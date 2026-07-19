"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

type Credentials = { workshopId: string; licenseKey: string };
type Location = { id: string; name: string; currency: string | null };
type Terminal = {
  id: string;
  device_id: string;
  terminal_name: string;
  location_id: string;
  connected_at: string;
};

export function SquareTerminalManager({
  credentials,
  isOpen,
  onClose,
}: Readonly<{ credentials: Credentials | null; isOpen: boolean; onClose: () => void }>) {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [terminalName, setTerminalName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(false);

  const callTerminals = useCallback(
    async (body: Record<string, unknown>) => {
      if (!credentials) throw new Error("Licence atelier indisponible.");
      const response = await fetch("/api/external-payments/square-terminals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...credentials, ...body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Opération Square Terminal impossible.");
      return result;
    },
    [credentials],
  );

  const load = useCallback(async () => {
    if (!isOpen || !credentials) return;
    setLoading(true);
    try {
      const result = await callTerminals({ operation: "list" });
      setTerminals(result.terminals || []);
      setLocations(result.locations || []);
      setLocationId((current) => current || result.locations?.[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [callTerminals, credentials, isOpen]);

  useEffect(() => void load(), [load]);

  const associate = async () => {
    setLoading(true);
    try {
      await callTerminals({
        operation: "associate",
        deviceId: deviceId.trim(),
        locationId,
        terminalName: terminalName.trim(),
      });
      setDeviceId("");
      setTerminalName("");
      toast.success("Square Terminal associé à cette boutique.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Association impossible.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (terminal: Terminal) => {
    if (!window.confirm(`Dissocier le terminal « ${terminal.terminal_name} » ?`)) return;
    setLoading(true);
    try {
      await callTerminals({ operation: "remove", deviceId: terminal.device_id });
      toast.success("Square Terminal dissocié.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dissociation impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gérer mes Square Terminal" maxWidth="max-w-xl">
      <div className="space-y-5">
        <p className="text-[#667085] text-sm leading-relaxed">
          Associez l’identifiant de votre appareil à un établissement Square. Seuls son identifiant technique, son nom
          et son établissement sont conservés pour cette boutique.
        </p>

        <div className="grid gap-3 rounded-[16px] border border-[#E4E7EC] bg-[#F9FAFB] p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Nom du terminal</span>
            <input
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              maxLength={80}
              onChange={(event) => setTerminalName(event.target.value)}
              placeholder="Comptoir principal"
              value={terminalName}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Device ID Square</span>
            <input
              autoComplete="off"
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 font-mono outline-none focus:border-[#2A9D8F]"
              maxLength={128}
              onChange={(event) => setDeviceId(event.target.value)}
              placeholder="Identifiant du terminal"
              value={deviceId}
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-[#101828]">Établissement Square</span>
            <select
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              onChange={(event) => setLocationId(event.target.value)}
              value={locationId}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.currency ? ` · ${location.currency}` : ""}
                </option>
              ))}
            </select>
          </label>
          <PrimaryButton
            className="justify-center sm:col-span-2"
            disabled={loading || !terminalName.trim() || deviceId.trim().length < 6 || !locationId}
            onClick={associate}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Associer le terminal
          </PrimaryButton>
        </div>

        <p className="rounded-[14px] border border-[#F0D9A7] bg-[#FFF8E8] p-3 text-[#6B5125] text-xs leading-relaxed">
          En Sandbox, utilisez un Device ID de terminal virtuel Square. Un terminal physique ne fonctionne qu’en
          production.
        </p>

        <div className="space-y-2">
          <h3 className="font-semibold text-[#101828] text-sm">Terminaux de cette boutique</h3>
          {terminals.length ? (
            terminals.map((terminal) => (
              <div
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-3"
                key={terminal.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#101828] text-sm">{terminal.terminal_name}</p>
                  <p className="truncate font-mono text-[#98A2B3] text-[10px]">{terminal.device_id}</p>
                  <p className="truncate text-[#98A2B3] text-[10px]">
                    {locations.find((location) => location.id === terminal.location_id)?.name || terminal.location_id}
                  </p>
                </div>
                <button
                  aria-label={`Dissocier ${terminal.terminal_name}`}
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#E4E7EC] text-[#667085] hover:border-red-200 hover:text-red-600"
                  disabled={loading}
                  onClick={() => remove(terminal)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-[14px] border border-dashed border-[#D9D9D4] p-4 text-center text-[#98A2B3] text-sm">
              Aucun Square Terminal associé.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <SecondaryButton onClick={onClose}>Fermer</SecondaryButton>
        </div>
      </div>
    </Modal>
  );
}
