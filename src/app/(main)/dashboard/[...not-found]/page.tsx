// Static export requires generateStaticParams for all dynamic routes.
// We pre-generate a single fallback path; the web server's 404 handles everything else.
export function generateStaticParams() {
  return [{ "not-found": ["404"] }];
}

export default function DashboardNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">Page introuvable.</h1>
      <p className="text-muted-foreground">Cette section sera disponible dans une prochaine version.</p>
    </div>
  );
}
