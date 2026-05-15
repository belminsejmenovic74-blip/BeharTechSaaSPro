"use client";

import { useEffect } from "react";

import { setupAutoSync } from "@/lib/cloud-sync";

/**
 * Démarre l'auto-sync Supabase au montage. Ne rend rien visuel.
 * À placer une fois dans le dashboard layout.
 */
export function AutoSyncProvider() {
  useEffect(() => {
    setupAutoSync();
  }, []);
  return null;
}
