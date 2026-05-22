import { useEffect, useState } from "react";

export function usePostalCities(postalCode: string, country: string) {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only search if country is France and postal code is 5 digits
    if (country !== "France" || postalCode.length !== 5) {
      setCities([]);
      return;
    }

    const fetchCities = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}`);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (Array.isArray(data)) {
          setCities(data.map((c: any) => c.nom));
        } else {
          setCities([]);
        }
      } catch (err) {
        console.error("Failed to fetch cities", err);
        setCities([]);
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(fetchCities, 300); // debounce
    return () => clearTimeout(timeout);
  }, [postalCode, country]);

  return { cities, loading };
}

export async function fetchPostalCodeByCity(city: string, country: string): Promise<string | null> {
  if (!city || country !== "France") return null;
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(city)}&boost=population&limit=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0 && data[0].codesPostaux && data[0].codesPostaux.length > 0) {
      return data[0].codesPostaux[0];
    }
  } catch (err) {
    console.error("Failed to fetch postal code", err);
  }
  return null;
}
