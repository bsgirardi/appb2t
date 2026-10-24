"use client";
import { Alert } from "@/components/ui/alert";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import { LogOut, ShieldCheck, ArrowUpRight, Menu } from "lucide-react";
import type { Actor } from "@/server/auth/session";
import { api } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminNavigation, navigationTitle } from "./admin-navigation";
import { Brand } from "./brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { themeVariables } from "@/domain/appearance/theme";
import type {
  AppearancePalette,
  CompanyIdentityDTO,
} from "@/domain/appearance/types";
import { defaultAppearance } from "@/domain/appearance/validation";
export function AppShell({
  actor,
  identity = { ...defaultAppearance, logoUrl: null },
  palette = defaultAppearance,
  children,
}: {
  actor: Actor;
  identity?: CompanyIdentityDTO;
  palette?: AppearancePalette;
  children: ReactNode;
}) {
  const paletteStyle = themeVariables(palette) as CSSProperties;
  const router = useRouter(),
    path = usePathname(),
    [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  async function exit() {
    try {
      await api("/api/auth/logout", {});
      for (const key of Object.keys(sessionStorage))
        if (key.startsWith("b2t:profitability:"))
          sessionStorage.removeItem(key);
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const navigation = (
    <AdminNavigation
      path={path}
      admin={actor.role === "ADMIN"}
      onNavigate={() => setMenuOpen(false)}
    />
  );
  return (
    <div
      className="app-shell admin-ui admin-theme font-admin text-sm"
      style={paletteStyle}
    >
      <a href="#admin-content" className="store-skip">
        Pular para o conteúdo
      </a>
      <Sidebar aria-label="Área administrativa">
        <Link href="/dashboard" aria-label={`${identity.name} início`}>
          <Brand identity={identity} />
        </Link>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="admin-menu-toggle md:hidden"
            >
              <Menu aria-hidden="true" /> Menu
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="admin-ui admin-theme font-admin"
            style={paletteStyle}
          >
            <SheetTitle>Menu principal</SheetTitle>
            <SheetDescription>
              Navegação da equipe {identity.name}
            </SheetDescription>
            {navigation}
          </SheetContent>
        </Sheet>
        <div className="workspace-badge">
          <span className="dot" /> Ambiente da equipe <ShieldCheck size={14} />
        </div>
        <div className="nav-title">ÁREA DE TRABALHO</div>
        <div className="admin-desktop-nav">{navigation}</div>
        <div className="sidebar-bottom">
          <div className="internal-note">
            <ShieldCheck size={19} />
            <div>
              <strong>Seu espaço de produção</strong>
              <p>
                Dados compartilhados.
                <br />
                Acesso seguro para sua equipe.
              </p>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">
              {actor.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{actor.name}</strong>
              <small>
                {actor.role === "ADMIN" ? "Administrador" : "Operador"}
              </small>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className=""
              aria-label="Sair da conta"
              onClick={exit}
            >
              <LogOut size={17} />
            </Button>
          </div>
          {error && <Alert role="alert">{error}</Alert>}
        </div>
      </Sidebar>
      <div className="workspace">
        <header className="topbar">
          <span>
            Gestão <span className="slash">/</span>{" "}
            <strong>{navigationTitle(path)}</strong>
          </span>
          <ThemeToggle />
          <span className="internal-chip">
            <span className="dot" /> Uso interno <ArrowUpRight size={13} />
          </span>
        </header>
        <main id="admin-content" className="min-w-0">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>{identity.footer}</span>
          <span>Valores em BRL · Português (Brasil)</span>
        </footer>
      </div>
    </div>
  );
}
