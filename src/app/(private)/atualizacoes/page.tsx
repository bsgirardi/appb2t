import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { releases } from "@/lib/releases";
import { APP_VERSION } from "@/lib/version";

export const metadata: Metadata = { title: "Atualizações" };

export default function UpdatesPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVOLUÇÃO DO SISTEMA</div>
          <h1>Atualizações</h1>
          <p>Veja o que chegou e o que melhorou para sua equipe.</p>
        </div>
        <Badge variant="secondary">Versão atual: {APP_VERSION}</Badge>
      </div>
      <div className="flex max-w-4xl flex-col gap-6">
        {releases.map((release) => (
          <Card asChild key={release.version}>
            <article aria-labelledby={`release-${release.version}`}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">Versão {release.version}</Badge>
                  <time
                    dateTime={release.date}
                    className="text-sm text-muted-foreground"
                  >
                    {release.date.split("-").reverse().join("/")}
                  </time>
                </div>
                <CardTitle>
                  <h2 id={`release-${release.version}`}>{release.title}</h2>
                </CardTitle>
                <CardDescription>
                  {release.version === APP_VERSION
                    ? "Novidades desta versão do sistema."
                    : "Histórico de melhorias para sua equipe."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {release.sections.map((section) => (
                  <section key={section.title} className="flex flex-col gap-2">
                    <h3 className="font-medium">{section.title}</h3>
                    <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
                      {section.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </CardContent>
            </article>
          </Card>
        ))}
      </div>
    </>
  );
}
