export type DeviceImageInput = {
  brand?: string | null;
  category?: string | null;
  model?: string | null;
  type?: string | null;
};

export type DeviceKind =
  | "iphone"
  | "ipad"
  | "macbook"
  | "samsung-galaxy"
  | "google-pixel"
  | "xiaomi-smartphone"
  | "laptop"
  | "sony-ps5"
  | "xbox-series"
  | "nintendo-switch"
  | "smartphone"
  | "tablet"
  | "console";

const DEVICE_IMAGES: Record<DeviceKind, string> = {
  iphone: "/assets/devices/apple-iphone.png",
  ipad: "/assets/devices/apple-ipad.png",
  macbook: "/assets/devices/apple-macbook.png",
  "samsung-galaxy": "/assets/devices/samsung-galaxy.png",
  "google-pixel": "/assets/devices/google-pixel.png",
  "xiaomi-smartphone": "/assets/devices/xiaomi-smartphone.png",
  laptop: "/assets/devices/laptop-generic.png",
  "sony-ps5": "/assets/devices/sony-ps5.png",
  "xbox-series": "/assets/devices/xbox-series.png",
  "nintendo-switch": "/assets/devices/nintendo-switch.png",
  smartphone: "/assets/devices/smartphone-generic.png",
  tablet: "/assets/devices/tablet-generic.png",
  console: "/assets/devices/console-generic.png",
};

const SMARTPHONE_TERMS = ["smartphone", "telephone", "mobile", "phone"];
const TABLET_TERMS = ["tablette", "tablet", "tab"];
const COMPUTER_TERMS = ["ordinateur", "laptop", "notebook", "pc portable", "pc", "windows", "computer"];
const CONSOLE_TERMS = ["console", "gaming console", "console de jeu"];

const IPHONE_MODEL_TERMS = [
  "iphone",
  "iphone se",
  "iphone x",
  "iphone xr",
  "iphone xs",
  "iphone 11",
  "iphone 12",
  "iphone 13",
  "iphone 14",
  "iphone 15",
  "iphone 16",
];
const IPHONE_VARIANT_TERMS = ["pro max", "pro", "plus", "mini"];
const IPAD_TERMS = ["ipad", "ipad air", "ipad pro", "ipad mini"];
const MAC_TERMS = ["macbook", "macbook air", "macbook pro", "imac", "mac mini", "mac studio"];
const SAMSUNG_TERMS = ["samsung", "galaxy", "galaxy s", "galaxy a", "galaxy note", "galaxy z", "fold", "flip"];
const GOOGLE_TERMS = ["google", "pixel", "pixel 6", "pixel 7", "pixel 8", "pixel 9", "nexus"];
const XIAOMI_TERMS = [
  "xiaomi",
  "redmi",
  "poco",
  "mi 10",
  "mi 11",
  "mi 12",
  "mi 13",
  "mi 14",
  "note 10",
  "note 11",
  "note 12",
  "note 13",
];
const PLAYSTATION_TERMS = ["ps4", "ps5", "playstation 4", "playstation 5", "ps4 slim", "ps4 pro", "ps5 slim", "ps5 pro"];
const XBOX_TERMS = ["xbox one", "xbox one s", "xbox one x", "xbox series s", "xbox series x", "series s", "series x", "xbox"];
const NINTENDO_TERMS = ["nintendo", "switch", "switch oled", "switch lite"];

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export const normalizeBrand = normalizeText;
export const normalizeModel = normalizeText;
export const normalizeType = normalizeText;

type MatchContext = {
  all: string;
  allCompact: string;
  brand: string;
  brandCompact: string;
  model: string;
  modelCompact: string;
  type: string;
  typeCompact: string;
};

function compact(value: string) {
  return value.replace(/\s+/g, "");
}

function hasTerm(haystack: string, compactHaystack: string, term: string) {
  const normalized = normalizeText(term);
  return haystack.includes(normalized) || compactHaystack.includes(compact(normalized));
}

function hasAny(haystack: string, compactHaystack: string, terms: string[]) {
  return terms.some((term) => hasTerm(haystack, compactHaystack, term));
}

function buildContext(input: DeviceImageInput): MatchContext {
  const brand = normalizeBrand(input.brand);
  const model = normalizeModel(input.model);
  const type = normalizeType([input.type, input.category].filter(Boolean).join(" "));
  const all = normalizeText([brand, model, type].filter(Boolean).join(" "));
  return {
    all,
    allCompact: compact(all),
    brand,
    brandCompact: compact(brand),
    model,
    modelCompact: compact(model),
    type,
    typeCompact: compact(type),
  };
}

function modelHas(ctx: MatchContext, terms: string[]) {
  return hasAny(ctx.model, ctx.modelCompact, terms);
}

function brandHas(ctx: MatchContext, terms: string[]) {
  return hasAny(ctx.brand, ctx.brandCompact, terms);
}

function typeHas(ctx: MatchContext, terms: string[]) {
  return hasAny(ctx.type, ctx.typeCompact, terms);
}

function isSmartphoneType(ctx: MatchContext) {
  return typeHas(ctx, SMARTPHONE_TERMS);
}

function isTabletType(ctx: MatchContext) {
  return typeHas(ctx, TABLET_TERMS);
}

function isComputerType(ctx: MatchContext) {
  return typeHas(ctx, COMPUTER_TERMS);
}

function isConsoleType(ctx: MatchContext) {
  return typeHas(ctx, CONSOLE_TERMS);
}

export function getDeviceKind(input: DeviceImageInput): DeviceKind {
  const ctx = buildContext(input);
  const appleBrand = brandHas(ctx, ["apple", "iphone"]);
  const modelLooksIphone = modelHas(ctx, IPHONE_MODEL_TERMS);
  const modelLooksIphoneVariant = modelHas(ctx, IPHONE_VARIANT_TERMS) && (appleBrand || isSmartphoneType(ctx));

  if (modelHas(ctx, IPAD_TERMS)) return "ipad";
  if (modelHas(ctx, MAC_TERMS)) return "macbook";
  if (modelLooksIphone || (modelLooksIphoneVariant && !isTabletType(ctx) && !isComputerType(ctx))) return "iphone";
  if (modelHas(ctx, PLAYSTATION_TERMS)) return "sony-ps5";
  if (modelHas(ctx, XBOX_TERMS)) return "xbox-series";
  if (modelHas(ctx, NINTENDO_TERMS)) return "nintendo-switch";
  if (modelHas(ctx, SAMSUNG_TERMS)) return "samsung-galaxy";
  if (modelHas(ctx, GOOGLE_TERMS)) return "google-pixel";
  if (modelHas(ctx, XIAOMI_TERMS)) return "xiaomi-smartphone";

  if (appleBrand) {
    if (isTabletType(ctx)) return "ipad";
    if (isComputerType(ctx)) return "macbook";
    if (isSmartphoneType(ctx) || !isConsoleType(ctx)) return "iphone";
  }

  if (brandHas(ctx, SAMSUNG_TERMS)) return "samsung-galaxy";
  if (brandHas(ctx, GOOGLE_TERMS)) return "google-pixel";
  if (brandHas(ctx, XIAOMI_TERMS)) return "xiaomi-smartphone";
  if (brandHas(ctx, ["playstation"]) || (brandHas(ctx, ["sony"]) && !isSmartphoneType(ctx) && !isTabletType(ctx) && !isComputerType(ctx))) return "sony-ps5";
  if (brandHas(ctx, ["xbox"]) || (brandHas(ctx, ["microsoft"]) && !isSmartphoneType(ctx) && !isTabletType(ctx) && !isComputerType(ctx))) return "xbox-series";
  if (brandHas(ctx, ["nintendo"])) return "nintendo-switch";

  if (isSmartphoneType(ctx)) return "smartphone";
  if (isTabletType(ctx)) return "tablet";
  if (isComputerType(ctx)) return "laptop";
  if (isConsoleType(ctx)) return "console";
  return "smartphone";
}

export function getDeviceImage(input: DeviceImageInput): string {
  return DEVICE_IMAGES[getDeviceKind(input)];
}

export function isAppleDevice(input: DeviceImageInput): boolean {
  return ["iphone", "ipad", "macbook"].includes(getDeviceKind(input));
}

export function isConsoleDevice(input: DeviceImageInput): boolean {
  return ["sony-ps5", "xbox-series", "nintendo-switch", "console"].includes(getDeviceKind(input));
}
