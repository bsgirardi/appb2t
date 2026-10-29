"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  ShoppingCart,
  Factory,
  CalendarDays,
  Package,
  Calculator,
  Wallet,
  ChartNoAxesCombined,
  Settings2,
  UserRound,
  ArrowUpRight,
  Boxes,
  Layers,
  History,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; admin?: boolean };
const groups: { label: string; items: Item[]; admin?: boolean }[] = [
  {
    label: "Vendas",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/solicitacoes", label: "Solicitações", icon: FileText },
      { href: "/negociacoes", label: "Negociações", icon: Users },
      { href: "/orcamentos", label: "Orçamentos", icon: FileText },
      { href: "/vendas", label: "Vendas", icon: ShoppingCart },
      { href: "/pontos-de-venda", label: "Pontos de venda", icon: Package },
      { href: "/produtos", label: "Produtos", icon: Boxes },
      { href: "/kits", label: "Kits", icon: Boxes },
      { href: "/colecoes", label: "Coleções", icon: Layers },
    ],
  },
  {
    label: "Produção",
    items: [
      { href: "/producao", label: "Ordens e entregas", icon: Factory },
      { href: "/planejamento", label: "Planejamento", icon: CalendarDays },
      { href: "/estoque", label: "Estoque", icon: Package },
      { href: "/calculadora", label: "Calculadora", icon: Calculator },
    ],
  },
  {
    label: "Financeiro",
    admin: true,
    items: [
      { href: "/financeiro", label: "Visão financeira", icon: Wallet },
      { href: "/financeiro/lancamentos", label: "Lançamentos", icon: FileText },
      {
        href: "/financeiro/movimentos",
        label: "Movimentações",
        icon: ArrowUpRight,
      },
      { href: "/financeiro/contas", label: "Contas", icon: Wallet },
      {
        href: "/rentabilidade",
        label: "Rentabilidade",
        icon: ChartNoAxesCombined,
      },
    ],
  },
];
const utilities: Item[] = [
  { href: "/atualizacoes", label: "Atualizações", icon: History },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings2,
    admin: true,
  },
  {
    href: "/configuracoes/aparencia",
    label: "Aparência",
    icon: Settings2,
    admin: true,
  },
  { href: "/conta", label: "Minha conta", icon: UserRound },
  { href: "/", label: "Abrir loja", icon: ArrowUpRight },
];
const dashboard: Item = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
};
const allItems = [dashboard, ...groups.flatMap((g) => g.items), ...utilities];
function matches(path: string, href: string) {
  return path === href || (href !== "/" && path.startsWith(`${href}/`));
}
export function navigationTitle(path: string) {
  return (
    [...allItems]
      .sort((a, b) => b.href.length - a.href.length)
      .find((i) => matches(path, i.href))?.label ?? "Gestão"
  );
}
export function AdminNavigation({
  path,
  admin,
  onNavigate,
}: {
  path: string;
  admin: boolean;
  onNavigate: () => void;
}) {
  const visible = groups.filter((g) => !g.admin || admin);
  const activeHref = [...allItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => matches(path, i.href))?.href;
  function item({ href, label, icon: Icon }: Item) {
    return (
      <Button
        key={href}
        asChild
        variant="ghost"
        size="sm"
        className="w-full justify-start"
      >
        <Link
          href={href}
          onClick={onNavigate}
          aria-current={activeHref === href ? "page" : undefined}
          className={cn("nav-item", activeHref === href && "active")}
        >
          <Icon data-icon="inline-start" aria-hidden="true" />
          {label}
        </Link>
      </Button>
    );
  }
  return (
    <nav aria-label="Menu principal" className="admin-navigation">
      {item(dashboard)}
      <Accordion
        key={`groups:${path}`}
        type="multiple"
        defaultValue={visible
          .filter((g) => g.items.some((i) => matches(path, i.href)))
          .map((g) => g.label)}
      >
        {visible.map((group) => (
          <AccordionItem
            value={group.label}
            key={group.label}
            className="border-0"
          >
            <AccordionTrigger className="px-2 py-3">
              {group.label}
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="flex flex-col gap-1 pl-2">
                {group.items.map(item)}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Separator className="my-3" />
      {utilities.filter((i) => !i.admin || admin).map(item)}
    </nav>
  );
}
