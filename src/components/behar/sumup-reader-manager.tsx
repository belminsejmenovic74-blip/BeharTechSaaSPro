"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Modal, PrimaryButton, SecondaryButton } from "@/components/behar/primitives";

type Credentials = { workshopId: string; licenseKey: string };
type Reader = { id: string; reader_id: string; reader_name: string; connected_at: string };

export function SumUpReaderManager({
  credentials,
  isOpen,
  onClose,
}: Readonly<{ credentials: Credentials | null; isOpen: boolean; onClose: () => void }>) {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [pairingCode, setPairingCode] = useState("");
  const [readerName, setReaderName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const callReaders = useCallback(
    async (body: Record<string, unknown>) => {
      if (!credentials) throw new Error("Licence atelier indisponible.");
      const response = await fetch("/api/external-payments/readers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...credentials, ...body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Opération terminal impossible.");
      return result;
    },
    [credentials],
  );

  const load = useCallback(async () => {
    if (!isOpen || !credentials) return;
    setLoading(true);
    try {
      const result = await callReaders({ operation: "list" });
      setReaders(result.readers || []);
      setEnabled(Boolean(result.terminalDispatchEnabled));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [callReaders, credentials, isOpen]);

  useEffect(() => void load(), [load]);

  const pair = async () => {
    setLoading(true);
    try {
      await callReaders({ operation: "pair", pairingCode: pairingCode.trim(), readerName: readerName.trim() });
      setPairingCode("");
      setReaderName("");
      toast.success("Terminal SumUp associé à cette boutique.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Association impossible.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (reader: Reader) => {
    if (!window.confirm(`Dissocier le terminal « ${reader.reader_name} » ?`)) return;
    setLoading(true);
    try {
      await callReaders({ operation: "remove", readerId: reader.reader_id });
      toast.success("Terminal SumUp dissocié.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dissociation impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gérer les terminaux SumUp" maxWidth="max-w-xl">
      <div className="space-y-5">
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          Lancez l’association sur votre Solo, puis saisissez le code affiché. Seuls l’identifiant technique et le nom
          du terminal sont conservés pour cette boutique.
        </p>

        {!enabled ? (
          <p className="rounded-[14px] border border-[#F0D9A7] bg-[#FFF8E8] p-4 text-[#6B5125] text-sm">
            L’envoi terminal est désactivé dans cet environnement.
          </p>
        ) : null}

        <div className="grid gap-3 rounded-[16px] border border-[#E8E8E5] bg-[#FAFAF8] p-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#1A1916]">Nom du terminal</span>
            <input
              className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 outline-none focus:border-[#2A9D8F]"
              maxLength={80}
              onChange={(event) => setReaderName(event.target.value)}
              placeholder="Comptoir principal"
              value={readerName}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-[#1A1916]">Code d’association</span>
            <input
              autoCapitalize="characters"
              className="h-11 rounded-[12px] border border-[#E8E8E5] bg-white px-3 font-mono uppercase outline-none focus:border-[#2A9D8F]"
              maxLength={9}
              onChange={(event) => setPairingCode(event.target.value.toUpperCase())}
              placeholder="4WLFDSBF"
              value={pairingCode}
            />
          </label>
          <PrimaryButton
            className="justify-center sm:col-span-2"
            disabled={!enabled || loading || !readerName.trim() || !/^[A-Za-z0-9]{8,9}$/.test(pairingCode.trim())}
            onClick={pair}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Associer le Solo
          </PrimaryButton>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[#1A1916] text-sm">Terminaux de cette boutique</h3>
          {readers.length ? (
            readers.map((reader) => (
              <div
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E8E8E5] bg-white p-3"
                key={reader.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#1A1916] text-sm">{reader.reader_name}</p>
                  <p className="truncate font-mono text-[#8A8A8A] text-[10px]">{reader.reader_id}</p>
                </div>
                <button
                  aria-label={`Dissocier ${reader.reader_name}`}
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#E8E8E5] text-[#6B6B6B] hover:border-red-200 hover:text-red-600"
                  disabled={loading}
                  onClick={() => remove(reader)}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-[14px] border border-dashed border-[#D9D9D4] p-4 text-center text-[#8A8A8A] text-sm">
              Aucun terminal associé.
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
