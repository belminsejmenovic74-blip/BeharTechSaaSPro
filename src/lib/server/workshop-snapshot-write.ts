export type WorkshopSnapshotWriteInput = {
  workshopId: string;
  recoveryCode: string;
  licenseKey: string;
  workshopName?: string | null;
  deviceLabel?: string;
  state: Record<string, unknown>;
  stateSizeBytes: number;
  schemaVersion: number;
};

/**
 * Payload autorisé pour workshop_snapshots.
 * `license_key_normalized` est une colonne GENERATED ALWAYS : l'envoyer via
 * PostgREST fait échouer tout l'upsert en 400.
 */
export function buildWorkshopSnapshotWrite(input: WorkshopSnapshotWriteInput) {
  return {
    workshop_id: input.workshopId,
    recovery_code: input.recoveryCode,
    license_key: input.licenseKey,
    workshop_name: input.workshopName ?? null,
    device_label: input.deviceLabel ?? "Navigateur",
    state: input.state,
    state_size_bytes: input.stateSizeBytes,
    schema_version: input.schemaVersion,
  };
}
