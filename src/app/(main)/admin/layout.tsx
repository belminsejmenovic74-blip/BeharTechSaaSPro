import type { ReactNode } from "react";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="behar-app min-h-svh bg-white text-[#101828]">{children}</div>;
}
