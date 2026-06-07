function imageKey(...values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function realProductImage(name = "", category = "") {
  const hay = imageKey(name, category);

  if (hay.includes("support") && hay.includes("voiture")) return "/assets/products/real/support-voiture.png";
  if (hay.includes("batterie externe") || hay.includes("power bank")) return "/assets/products/real/batterie-externe.png";
  if (hay.includes("ecouteur") || hay.includes("airpod") || hay.includes("casque")) return "/assets/products/real/ecouteurs.png";
  if (hay.includes("chargeur") || hay.includes("adaptateur") || hay.includes("secteur")) return "/assets/products/real/charger-usb-c.png";
  if (hay.includes("lightning")) return "/assets/products/real/cable-lightning.png";
  if (hay.includes("cable") || hay.includes("usb")) return "/assets/products/real/cable-usb-c.png";
  if (hay.includes("verre") || hay.includes("protection") || hay.includes("film")) return "/assets/products/real/verre-trempe.png";
  if (hay.includes("coque") || hay.includes("etui") || hay.includes("housse")) return "/assets/products/real/coque-iphone.png";
  return "";
}

export function realDeviceImage(brand = "", model = "", type = "") {
  const hay = imageKey(brand, model, type);
  if (hay.includes("samsung") || hay.includes("galaxy")) return "/assets/products/real/galaxy-s23.png";
  if (hay.includes("apple") || hay.includes("iphone")) return "/assets/products/real/iphone-15.png";
  return "";
}
