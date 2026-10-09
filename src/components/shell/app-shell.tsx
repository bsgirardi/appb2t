"use client";
import { Alert } from "@/components/ui/alert";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Box,
  Calculator,
  Settings2,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
  UserRound,
  Menu,
} from "lucide-react";
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
import { Brand } from "./brand";
import type { CompanyIdentityDTO } from "@/domain/appearance/types";
import { defaultAppearance } from "@/domain/appearance/validation";
export function AppShell({
  actor,
  identity = { ...defaultAppearance, logoUrl: null },
  children,
}: {
  actor: Actor;
  identity?: CompanyIdentityDTO;
  children: ReactNode;
}) {
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
    <nav
      aria-label="Menu principal"
      data-open={menuOpen}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
      }}
    >
      {[
        ["/clientes", "Clientes"],
        ["/orcamentos", "Orçamentos"],
        ["/vendas", "Vendas"],
        ["/producao", "Produção"],
        ["/estoque", "Estoque"],
      ].map(([href, label]) => (
        <Button
          key={href}
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start"
        >
          <Link
            href={href}
            aria-current={path.startsWith(href) ? "page" : undefined}
            className={path.startsWith(href) ? "nav-item active" : "nav-item"}
          >
            <Box size={19} />
            {label}
          </Link>
        </Button>
      ))}
      {actor.role === "ADMIN" && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start"
        >
          <Link
            href="/rentabilidade"
            aria-current={
              path.startsWith("/rentabilidade") ? "page" : undefined
            }
            className={
              path.startsWith("/rentabilidade") ? "nav-item active" : "nav-item"
            }
          >
            <Box size={19} />
            Rentabilidade
          </Link>
        </Button>
      )}
      {actor.role === "ADMIN" && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start"
        >
          <Link
            aria-current={path === "/financeiro" ? "page" : undefined}
            className={
              path.startsWith("/financeiro") ? "nav-item active" : "nav-item"
            }
            href="/financeiro"
          >
            <Box size={19} />
            Financeiro
          </Link>
        </Button>
      )}
      {actor.role === "ADMIN" && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start"
        >
          <Link
            aria-current={
              path === "/configuracoes/aparencia" ? "page" : undefined
            }
            className={
              path === "/configuracoes/aparencia"
                ? "nav-item active"
                : "nav-item"
            }
            href="/configuracoes/aparencia"
          >
            <Settings2 size={19} />
            Aparência
          </Link>
        </Button>
      )}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <Link
          aria-current={path === "/calculadora" ? "page" : undefined}
          className={path === "/calculadora" ? "nav-item active" : "nav-item"}
          href="/calculadora"
        >
          <Calculator size={19} />
          Calculadora
          <span className="nav-marker" />
        </Link>
      </Button>
      {actor.role === "ADMIN" && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start"
        >
          <Link
            aria-current={path === "/configuracoes" ? "page" : undefined}
            className={
              path.startsWith("/configuracoes") &&
              path !== "/configuracoes/aparencia"
                ? "nav-item active"
                : "nav-item"
            }
            href="/configuracoes"
          >
            <Settings2 size={19} />
            Configurações
          </Link>
        </Button>
      )}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <Link
          aria-current={path === "/produtos" ? "page" : undefined}
          className={
            path.startsWith("/produtos") ? "nav-item active" : "nav-item"
          }
          href="/produtos"
        >
          <Box size={19} />
          Produtos
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <Link
          aria-current={path === "/" ? "page" : undefined}
          className="nav-item"
          href="/"
        >
          <ArrowUpRight size={19} />
          Abrir loja
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <Link
          aria-current={path === "/colecoes" ? "page" : undefined}
          className={
            path.startsWith("/colecoes") ? "nav-item active" : "nav-item"
          }
          href="/colecoes"
        >
          <Box size={19} />
          Coleções
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <Link
          aria-current={path === "/conta" ? "page" : undefined}
          className={path === "/conta" ? "nav-item active" : "nav-item"}
          href="/conta"
        >
          <UserRound size={19} />
          Minha conta
        </Link>
      </Button>
    </nav>
  );
  return (
    <div className="app-shell admin-ui font-store text-sm">
      <a href="#admin-content" className="store-skip">
        Pular para o conteúdo
      </a>
      <Sidebar aria-label="Área administrativa">
        <Link href="/calculadora" aria-label={`${identity.name} início`}>
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
          <SheetContent side="left" className="admin-ui font-store">
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
            <strong>
              {path.startsWith("/producao")
                ? "Produção e entrega"
                : path.startsWith("/estoque")
                  ? "Estoque"
                  : path.startsWith("/financeiro")
                    ? "Financeiro"
                    : path.startsWith("/clientes")
                      ? "Clientes"
                      : path.startsWith("/orcamentos")
                        ? "Orçamentos"
                        : path.startsWith("/vendas")
                          ? "Vendas"
                          : path.startsWith("/colecoes")
                            ? "Coleções"
                            : path.startsWith("/configuracoes")
                              ? "Configurações"
                              : path.startsWith("/produtos")
                                ? "Produtos"
                                : path === "/conta"
                                  ? "Minha conta"
                                  : "Calculadora de custos"}
            </strong>
          </span>
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
