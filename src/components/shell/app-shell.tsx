"use client";
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
} from "lucide-react";
import type { Actor } from "@/server/auth/session";
import { api } from "@/lib/client-api";
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
  async function exit() {
    try {
      await api("/api/auth/logout", {});
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/calculadora" aria-label={`${identity.name} início`}>
          <Brand identity={identity} />
        </Link>
        <div className="workspace-badge">
          <span className="dot" /> Ambiente da equipe <ShieldCheck size={14} />
        </div>
        <div className="nav-title">ÁREA DE TRABALHO</div>
        <nav aria-label="Menu principal">
          {actor.role === "ADMIN" && (
            <Link
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
          )}
          <Link
            className={path === "/calculadora" ? "nav-item active" : "nav-item"}
            href="/calculadora"
          >
            <Calculator size={19} />
            Calculadora
            <span className="nav-marker" />
          </Link>
          {actor.role === "ADMIN" && (
            <Link
              className={
                path.startsWith("/configuracoes")
                  ? "nav-item active"
                  : "nav-item"
              }
              href="/configuracoes"
            >
              <Settings2 size={19} />
              Configurações
            </Link>
          )}
          <Link
            className={
              path.startsWith("/produtos") ? "nav-item active" : "nav-item"
            }
            href="/produtos"
          >
            <Box size={19} />
            Produtos
          </Link>
          <Link className="nav-item" href="/portfolio">
            <ArrowUpRight size={19} />
            Portfólio público
          </Link>
          <Link
            className={
              path.startsWith("/colecoes") ? "nav-item active" : "nav-item"
            }
            href="/colecoes"
          >
            <Box size={19} />
            Coleções
          </Link>
          <Link
            className={path === "/conta" ? "nav-item active" : "nav-item"}
            href="/conta"
          >
            <UserRound size={19} />
            Minha conta
          </Link>
        </nav>
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
            <button
              className="icon-button"
              aria-label="Sair da conta"
              onClick={exit}
            >
              <LogOut size={17} />
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <strong>
              {path.startsWith("/configuracoes")
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
        <main>{children}</main>
        <footer className="workspace-footer">
          <span>{identity.footer}</span>
          <span>Valores em BRL · Português (Brasil)</span>
        </footer>
      </div>
    </div>
  );
}
