import type { Metadata } from "next";
import { getPublicAppearance } from "@/server/appearance";
import "./design.css";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const identity = await getPublicAppearance();
  return {
    title: `${identity.name} · Gestão`,
    description: identity.slogan,
    robots: { index: false, follow: false },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
