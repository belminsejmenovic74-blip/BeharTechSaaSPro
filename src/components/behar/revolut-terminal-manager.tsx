"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

type Credentials = { workshopId: string; licenseKey: string };
type Location = { id: string; name: string };
type AvailableTerminal = { id: string; name: string };
type SavedTerminal = {
  id: string;
  terminal_id: string;
  terminal_name: string;
  location_id: string;
  connected_at: string;
};

export function RevolutTerminalManager({
  credentials,
  isOpen,
  onClose,
}: Readonly<{ credentials: Credentials | null; isOpen: boolean; onClose: () => void }>) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [available, setAvailable] = useState<AvailableTerminal[]>([]);
  const [saved, setSaved] = useState<SavedTerminal[]>([]);
  const [locationId, setLocationId] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [terminalName, setTerminalName] = useState("");
  const [loading, setLoading] = useState(false);

  const callTerminals = useCallback(
    async (body: Record<string, unknown>) => {
      if (!credentials) throw new Error("Licence atelier indisponible.");
      const response = await fetch("/api/external-payments/revolut-terminals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...credentials, ...body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Opération Revolut Terminal impossible.");
      return result;
    },
    [credentials],
  );

  const discover = useCallback(
    async (nextLocationId: string) => {
      if (!nextLocationId) {
        setAvailable([]);
        return;
      }
      const result = await callTerminals({ operation: "discover", locationId: nextLocationId });
      const terminals = (result.terminals || []) as AvailableTerminal[];
      setAvailable(terminals);
      setTerminalId(terminals[0]?.id || "");
      setTerminalName(terminals[0]?.name || "");
    },
    [callTerminals],
  );

  const load = useCallback(async () => {
    if (!isOpen || !credentials) return;
    setLoading(true);
    try {
      const result = await callTerminals({ operation: "list" });
      const nextLocations = (result.locations || []) as Location[];
      setLocations(nextLocations);
      setSaved(result.terminals || []);
      const nextLocationId = nextLocations[0]?.id || "";
      setLocationId(nextLocationId);
      await discover(nextLocationId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [callTerminals, credentials, discover, isOpen]);

  useEffect(() => void load(), [load]);

  const selectLocation = async (nextLocationId: string) => {
    setLocationId(nextLocationId);
    setLoading(true);
    try {
      await discover(nextLocationId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Découverte impossible.");
    } finally {
      setLoading(false);
    }
  };

  const selectTerminal = (nextTerminalId: string) => {
    setTerminalId(nextTerminalId);
    setTerminalName(available.find((terminal) => terminal.id === nextTerminalId)?.name || "Revolut Terminal");
  };

  const associate = async () => {
    setLoading(true);
    try {
      await callTerminals({ operation: "associate", locationId, terminalId, terminalName: terminalName.trim() });
      toast.success("Revolut Terminal associé à cette boutique.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Association impossible.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (terminal: SavedTerminal) => {
    if (!window.confirm(`Dissocier le terminal « ${terminal.terminal_name} » ?`)) return;
    setLoading(true);
    try {
      await callTerminals({ operation: "remove", terminalId: terminal.terminal_id });
      toast.success("Revolut Terminal dissocié.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dissociation impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gérer les terminaux Revolut" maxWidth="max-w-xl">
      <div className="space-y-5">
        <p className="text-[#667085] text-sm leading-relaxed">
          Choisissez une location physique puis un Terminal en mode « Pay at Counter ». Seuls leurs identifiants et le
          nom local sont conservés pour cette boutique.
        </p>

        <div className="grid gap-3 rounded-[16px] border border-[#E4E7EC] bg-[#F9FAFB] p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Location Revolut</span>
            <select
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              disabled={loading || locations.length === 0}
              onChange={(event) => void selectLocation(event.target.value)}
              value={locationId}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#101828]">Terminal disponible</span>
            <select
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              disabled={loading || available.length === 0}
              onChange={(event) => selectTerminal(event.target.value)}
              value={terminalId}
            >
              {available.map((terminal) => (
                <option key={terminal.id} value={terminal.id}>
                  {terminal.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            <span className="font-semibold text-[#101828]">Nom dans Behar Tech Pro</span>
            <input
              className="h-11 rounded-[12px] border border-[#E4E7EC] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              maxLength={80}
              onChange={(event) => setTerminalName(event.target.value)}
              placeholder="Comptoir principal"
              value={terminalName}
            />
          </label>
          <PrimaryButton
            className="justify-center sm:col-span-2"
            disabled={loading || !locationId || !terminalId || !terminalName.trim()}
            onClick={associate}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Associer le terminal
          </PrimaryButton>
        </div>

        {!locations.length && !loading ? (
          <p className="rounded-[14px] border border-[#F0D9A7] bg-[#FFF8E8] p-3 text-[#6B5125] text-xs">
            Aucune location physique n’est disponible. Créez-la dans Revolut Business avant d’associer un terminal.
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-[#101828] text-sm">Terminaux de cette boutique</h3>
            <button
              className="inline-flex items-center gap-1 text-[#167B70] text-xs"
              disabled={loading}
              onClick={() => void load()}
              type="button"
            >
              <RefreshCw className="size-3.5" /> Actualiser
            </button>
          </div>
          {saved.length ? (
            saved.map((terminal) => (
              <div
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E4E7EC] bg-white p-3"
                key={terminal.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#101828] text-sm">{terminal.terminal_name}</p>
                  <p className="truncate font-mono text-[#98A2B3] text-[10px]">{terminal.terminal_id}</p>
                  <p className="truncate text-[#98A2B3] text-[10px]">
                    {locations.find((location) => location.id === terminal.location_id)?.name || terminal.location_id}
                  </p>
                </div>
                <button
                  aria-label={`Dissocier ${terminal.terminal_name}`}
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#E4E7EC] text-[#667085] hover:border-red-200 hover:text-red-600"
                  disabled={loading}
                  onClick={() => void remove(terminal)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-[14px] border border-dashed border-[#D9D9D4] p-4 text-center text-[#98A2B3] text-sm">
              Aucun Revolut Terminal associé.
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
