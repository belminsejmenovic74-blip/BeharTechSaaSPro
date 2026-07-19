#!/usr/bin/env node
/**
 * Provisionne l'instance ERPNext pour la synchronisation BEHAR TECH PRO :
 * champs personnalisés (Customer/Supplier/Item), groupes par défaut et
 * vérification de la société + listes de prix.
 *
 * Usage : node scripts/erpnext-provision.mjs
 * Lit ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET depuis
 * l'environnement ou .env.local. Idempotent : ne recrée rien qui existe.
 */
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    /* pas de .env.local : on suppose que l'environnement est déjà posé */
  }
}

loadEnvLocal();

const BASE_URL = process.env.ERPNEXT_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.ERPNEXT_API_KEY;
const API_SECRET = process.env.ERPNEXT_API_SECRET;

if (!BASE_URL || !API_KEY || !API_SECRET) {
  console.error("ERPNEXT_BASE_URL, ERPNEXT_API_KEY et ERPNEXT_API_SECRET sont requis.");
  process.exit(1);
}

async function api(method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      accept: "application/json",
      authorization: `token ${API_KEY}:${API_SECRET}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    let details = text;
    try {
      const parsed = JSON.parse(text);
      details = parsed.exception || parsed.message || text;
    } catch {}
    throw new Error(`${method} ${path} → ${response.status} : ${String(details).slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function exists(doctype, filters) {
  const params = new URLSearchParams({
    fields: JSON.stringify(["name"]),
    filters: JSON.stringify(filters),
    limit_page_length: "1",
  });
  const { data } = await api("GET", `/api/resource/${encodeURIComponent(doctype)}?${params}`);
  return data[0]?.name;
}

async function ensureCustomField(dt, fieldname, label, fieldtype, extra = {}) {
  const found = await exists("Custom Field", [
    ["dt", "=", dt],
    ["fieldname", "=", fieldname],
  ]);
  if (found) {
    console.log(`= Champ ${dt}.${fieldname} déjà présent`);
    return;
  }
  await api("POST", "/api/resource/Custom%20Field", {
    dt,
    fieldname,
    label,
    fieldtype,
    insert_after: "customer_name",
    ...extra,
  });
  console.log(`+ Champ ${dt}.${fieldname} créé`);
}

async function ensureGroupDoc(doctype, nameField, name, parentField, parentValue) {
  const found = await exists(doctype, [[nameField, "=", name]]);
  if (found) {
    console.log(`= ${doctype} « ${name} » déjà présent`);
    return;
  }
  await api("POST", `/api/resource/${encodeURIComponent(doctype)}`, {
    [nameField]: name,
    [parentField]: parentValue,
    is_group: 0,
  });
  console.log(`+ ${doctype} « ${name} » créé`);
}

async function main() {
  const user = await api("GET", "/api/method/frappe.auth.get_logged_user");
  console.log(`Connecté à ${BASE_URL} en tant que ${user.message}\n`);

  // Champs d'idempotence + métier (voir src/lib/server/erpnext/mappers.ts)
  await ensureCustomField("Customer", "custom_identifiant_client_behar_tech_pro", "Identifiant client BEHAR TECH PRO", "Data", { unique: 1, no_copy: 1, read_only: 1, search_index: 1 });
  await ensureCustomField("Customer", "custom_boutique_rattachee", "Boutique rattachée", "Data");
  await ensureCustomField("Customer", "custom_consentement_marketing", "Consentement marketing", "Check");

  await ensureCustomField("Supplier", "custom_identifiant_fournisseur_behar_tech_pro", "Identifiant fournisseur BEHAR TECH PRO", "Data", { unique: 1, no_copy: 1, read_only: 1, search_index: 1, insert_after: "supplier_name" });
  await ensureCustomField("Supplier", "custom_siret", "SIRET", "Data", { insert_after: "supplier_name" });
  await ensureCustomField("Supplier", "custom_tva_intracommunautaire", "TVA intracommunautaire", "Data", { insert_after: "supplier_name" });
  await ensureCustomField("Supplier", "custom_references_fournisseur", "Références fournisseur", "Small Text", { insert_after: "supplier_name" });

  await ensureCustomField("Item", "custom_identifiant_article_behar_tech_pro", "Identifiant article BEHAR TECH PRO", "Data", { unique: 1, no_copy: 1, read_only: 1, search_index: 1, insert_after: "item_name" });
  await ensureCustomField("Item", "custom_type_dappareil", "Type d'appareil", "Data", { insert_after: "item_name" });
  await ensureCustomField("Item", "custom_modele_appareil", "Modèle d'appareil", "Data", { insert_after: "item_name" });
  await ensureCustomField("Item", "custom_qualite", "Qualité", "Data", { insert_after: "item_name" });
  await ensureCustomField("Item", "custom_garantie_en_mois", "Garantie (mois)", "Int", { insert_after: "item_name" });
  await ensureCustomField("Item", "custom_compatibilite", "Compatibilité", "Small Text", { insert_after: "item_name" });

  console.log("");
  await ensureGroupDoc("Customer Group", "customer_group_name", process.env.ERPNEXT_DEFAULT_CUSTOMER_GROUP || "Particuliers", "parent_customer_group", "All Customer Groups");
  await ensureGroupDoc("Supplier Group", "supplier_group_name", process.env.ERPNEXT_DEFAULT_SUPPLIER_GROUP || "Fournisseurs BEHAR TECH PRO", "parent_supplier_group", "All Supplier Groups");
  await ensureGroupDoc("Item Group", "item_group_name", process.env.ERPNEXT_DEFAULT_ITEM_GROUP || "Articles synchronisés BEHAR TECH PRO", "parent_item_group", "All Item Groups");

  console.log("");
  const companies = await api("GET", `/api/resource/Company?fields=${encodeURIComponent('["name","default_currency"]')}`);
  console.log("Sociétés ERPNext :", companies.data.map((c) => `${c.name} (${c.default_currency})`).join(", ") || "aucune");

  for (const priceList of [process.env.ERPNEXT_SELLING_PRICE_LIST || "Standard Selling", process.env.ERPNEXT_BUYING_PRICE_LIST || "Standard Buying"]) {
    const found = await exists("Price List", [["name", "=", priceList]]);
    console.log(`${found ? "=" : "!"} Liste de prix « ${priceList} » ${found ? "présente" : "ABSENTE — à créer ou à configurer via ERPNEXT_*_PRICE_LIST"}`);
  }

  console.log("\nProvisionnement terminé.");
}

main().catch((error) => {
  console.error(`\nÉchec : ${error.message}`);
  process.exit(1);
});
