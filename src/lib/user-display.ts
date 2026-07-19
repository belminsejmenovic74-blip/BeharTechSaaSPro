const GENERIC_ACCOUNT_NAMES = new Set(["gérant", "gerant", "technicien", "accueil", "stagiaire", "utilisateur"]);

export function getUserFirstName(name: string, id = "") {
  const normalizedName = name.trim();
  const firstName = normalizedName.split(/\s+/)[0] || "Utilisateur";

  if (!GENERIC_ACCOUNT_NAMES.has(normalizedName.toLocaleLowerCase("fr"))) return firstName;

  const idName = id.split("_").filter(Boolean)[1];
  if (!idName) return firstName;
  return `${idName.charAt(0).toUpperCase()}${idName.slice(1).toLocaleLowerCase("fr")}`;
}
