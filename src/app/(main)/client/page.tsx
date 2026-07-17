import { ClientPortalContent, type ClientSection } from "@/components/behar/client-portal-content";

const SECTIONS = new Set<ClientSection>([
  "accueil",
  "offre",
  "sms",
  "emails",
  "documents",
  "widgets",
  "paiements",
  "equipe",
  "boutiques",
]);

export default async function ClientPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = await searchParams;
  const rawSection = Array.isArray(query.section) ? query.section[0] : query.section;
  const section = rawSection && SECTIONS.has(rawSection as ClientSection) ? (rawSection as ClientSection) : "accueil";
  return <ClientPortalContent section={section} />;
}
