import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Área restrita — Sabores do Sul",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
