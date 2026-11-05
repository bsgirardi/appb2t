import type { Metadata } from "next";
import { getPublicAppearance } from "@/server/appearance";
import "./design.css";
import { ThemeController } from "@/components/theme-toggle";
import { HistoryProtection } from "@/components/history-protection";
import { themeBootstrap } from "@/lib/theme-preference";
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <HistoryProtection />
        <ThemeController />
        {children}
      </body>
    </html>
  );
}
