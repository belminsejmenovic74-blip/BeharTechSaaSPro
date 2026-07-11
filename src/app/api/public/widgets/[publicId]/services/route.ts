import { handleCatalog, handleOptions } from "@/lib/server/widget-public-handlers";
export const dynamic = "force-dynamic";
export const OPTIONS = handleOptions;
export function GET(request: Request, route: { params: Promise<{ publicId: string }> }) {
  return handleCatalog(request, route, "services");
}
