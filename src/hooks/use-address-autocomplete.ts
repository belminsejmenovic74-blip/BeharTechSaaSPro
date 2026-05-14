import { useState, useEffect } from "react";

export interface AddressFeature {
  label: string;
  name: string;
  postcode: string;
  city: string;
}

export function useAddressAutocomplete(query: string, country: string) {
  const [suggestions, setSuggestions] = useState<AddressFeature[]>([]);

  useEffect(() => {
    if (country !== "France" || query.length < 3) {
      setSuggestions([]);
      return;
    }

    const fetchAddresses = async () => {
      try {
        const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&autocomplete=1&limit=5`);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (data && data.features) {
          setSuggestions(
            data.features.map((f: any) => ({
              label: f.properties.label,
              name: f.properties.name,
              postcode: f.properties.postcode,
              city: f.properties.city,
            }))
          );
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Failed to fetch addresses", err);
        setSuggestions([]);
      }
    };

    const timeout = setTimeout(fetchAddresses, 300);
    return () => clearTimeout(timeout);
  }, [query, country]);

  return { suggestions };
}
