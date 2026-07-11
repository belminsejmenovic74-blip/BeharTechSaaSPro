"use client";

// Petit hook de chargement de liste avec annulation. Les étapes appareil et
// problème enchaînent des appels catalogue filtrés (catégorie → marque →
// modèle → problème) ; ce hook gère l'état loading/error et annule la requête
// précédente à chaque changement de dépendance.

import { useCallback, useEffect, useRef, useState } from "react";

type AsyncListState<T> = {
  items: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useAsyncList<T>(loader: (signal: AbortSignal) => Promise<T[]>, deps: unknown[]): AsyncListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Chargement impossible.");
        setLoading(false);
      });
    return () => controller.abort();
    // Les dépendances de chargement sont fournies par l'appelant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  return { items, loading, error, reload };
}
