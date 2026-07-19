import type { ReactNode } from "react";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="behar-app min-h-svh bg-white text-[#1A1916]">{children}</div>;
}
