import { useCallback, useEffect, useState } from "react";

import type { HelpContent } from "@/lib/supabase/help-content-types";

export function useHelpContents(params?: {
  audience?: "behar_customers" | "internal_team";
  status?: "draft" | "published";
  visibility?: "public" | "internal" | "admin";
}) {
  const [data, setData] = useState<HelpContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContents = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (params?.audience) qs.append("audience", params.audience);
      if (params?.status) qs.append("status", params.status);
      if (params?.visibility) qs.append("visibility", params.visibility);

      const res = await fetch(`/api/help-center?${qs.toString()}`);
      if (!res.ok) throw new Error("Erreur de chargement");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erreur inconnue"));
    } finally {
      setLoading(false);
    }
  }, [params?.audience, params?.status, params?.visibility]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  return { data, loading, error, refetch: fetchContents };
}

export function useHelpContent(id: string) {
  const [data, setData] = useState<HelpContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setLoading(true);

    fetch(`/api/help-center/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Introuvable");
        return res.json();
      })
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch((err) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { data, loading, error };
}
