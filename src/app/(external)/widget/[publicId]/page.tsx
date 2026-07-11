import type { Metadata } from "next";

import { WidgetApp } from "@/components/widget/widget-app";

// Application iframe du widget public. Rendue hors chrome applicatif, jamais
// indexée : la configuration active est résolue côté client via l'API publique.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prise de rendez-vous",
  robots: { index: false, follow: false },
};

export default async function WidgetPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <WidgetApp publicId={publicId} />;
}
