import { useState, type CSSProperties } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Field, TextareaField, Notice } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { ChartStyle } from "@/components/ui/chart";
import { AuthForm } from "@/components/auth-form";
import { StorefrontShell } from "@/components/products/storefront-shell";
import { ProductCatalog } from "@/components/products/product-catalog";
import { CatalogFilterForm } from "@/components/products/catalog-filter-form";
import { defaultAppearance } from "@/domain/appearance/validation";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { FilterPanel } from "@/components/admin/filter-panel";
import { AdminForm } from "@/components/admin/admin-form";
import { ContextEditor } from "@/components/admin/context-editor";
import { AdminThemeProvider } from "@/components/admin/admin-theme";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import "@/app/design.css";

const params = new URLSearchParams(location.search);
const theme = params.get("theme");
if (theme === "light" || theme === "dark")
  document.documentElement.dataset.theme = theme;

function Preview() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(params.has("dialog"));
  const [editorOpen, setEditorOpen] = useState(false);
  const palette = (
    params.has("extreme")
      ? {
          "--light-primary": "#ffffff",
          "--light-on-primary": "#000000",
          "--dark-primary": "#000000",
          "--dark-on-primary": "#ffffff",
        }
      : params.has("palette")
        ? {
            "--light-primary": "#663399",
            "--light-on-primary": "#ffffff",
            "--dark-primary": "#e5b8ff",
            "--dark-on-primary": "#191020",
          }
        : {}
  ) as CSSProperties;
  if (params.get("view") === "login")
    return (
      <section
        className="login-page admin-theme font-admin"
        onSubmitCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="login-panel">
          <div className="login-box">
            <h1>Acesso · prévia sem envio</h1>
            <AuthForm />
          </div>
        </div>
      </section>
    );
  if (params.get("view") === "catalog") {
    const context = { search: "", collection: "", order: "nome", page: 1 };
    return (
      <StorefrontShell
        identity={{ ...defaultAppearance, logoUrl: null, phone: "" }}
      >
        <section style={{ padding: 16 }}>
          <h1>Catálogo sintético</h1>
          <CatalogFilterForm context={context} collections={[]} />
          <ProductCatalog
            products={
              params.has("empty")
                ? []
                : [
                    {
                      id: "synthetic",
                      name: "Produto sintético com nome extenso para conferir leitura no celular",
                      description:
                        "Amostra sem foto e sem dados comerciais reais.",
                      price: "0",
                      paymentTerms: "Condição sintética",
                      imageUrl: "",
                      images: [],
                    },
                  ]
            }
          />
        </section>
      </StorefrontShell>
    );
  }
  return (
    <main
      className={
        params.has("store") ? "storefront" : "admin-ui admin-theme font-admin"
      }
      style={{ ...palette, padding: 16, maxWidth: 900, margin: "auto" }}
    >
      <h1>Revisão transversal · dados sintéticos</h1>
      <button type="button" onClick={() => setCount(count + 1)}>
        Controle nativo: {count}
      </button>
      <Button onClick={() => setCount(count + 1)}>
        Controle React: {count}
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Controles compartilhados</CardTitle>
        </CardHeader>
        <CardContent>
          <Field
            label="Nome extenso do produto para conferir quebra de linha"
            name="name"
            hint="Ajuda do campo"
            error={
              params.has("error")
                ? "Confira o nome informado antes de continuar."
                : undefined
            }
            defaultValue="Produto sintético"
          />
          <TextareaField
            label="Observações"
            defaultValue={"Texto extenso para leitura e rolagem interna. ".repeat(
              20,
            )}
          />
          <label htmlFor="choice">Disponibilidade</label>
          <NativeSelect id="choice" defaultValue="">
            <option value="">Selecione</option>
            <option>Disponível</option>
          </NativeSelect>
          <label>
            <Checkbox /> Aceito a opção sintética
          </label>
          <Button disabled>Indisponível</Button>
          <Button disabled aria-busy="true">
            Salvando…
          </Button>
          <Badge variant="outline">
            Estado com descrição extensa para testar quebra no celular
          </Badge>
          <Notice kind="info">Nenhuma operação real será executada.</Notice>
          <Tabs defaultValue="one">
            <TabsList>
              <TabsTrigger value="one">Informações</TabsTrigger>
              <TabsTrigger value="two">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="one">
              Sem registros sintéticos adicionais.
            </TabsContent>
            <TabsContent value="two">Histórico vazio.</TabsContent>
          </Tabs>
          <label id="combo-label">Produto sintético</label>
          <Combobox items={["Peça azul", "Peça verde"]}>
            <ComboboxInput aria-labelledby="combo-label" showClear />
            <ComboboxContent
              className={
                params.has("portalTheme")
                  ? "admin-ui admin-theme font-admin"
                  : undefined
              }
              style={params.has("portalTheme") ? palette : undefined}
            >
              <ComboboxEmpty>Nenhum produto</ComboboxEmpty>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <FilterPanel>
            <AdminForm
              requiredGuide={false}
              onSubmit={(e) => e.preventDefault()}
            >
              <Field
                label="Filtro em edição"
                name="draft"
                defaultValue="Rascunho sintético"
              />
              <Button type="submit">Aplicar prévia</Button>
            </AdminForm>
          </FilterPanel>
          <Table aria-label="Amostras sintéticas">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Produto</TableHead>
                <TableHead scope="col">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  Nome longo de produto sintético para verificar rolagem
                  horizontal interna
                </TableCell>
                <TableCell>Disponível</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Abrir menu sintético</Button>
            </SheetTrigger>
            <SheetContent
              className="admin-ui admin-theme font-admin"
              style={palette}
            >
              <SheetTitle>Menu sintético</SheetTitle>
              <SheetDescription>Verificação de foco e paleta.</SheetDescription>
              <Button>Ação sintética</Button>
            </SheetContent>
          </Sheet>
        </CardContent>
      </Card>
      <ChartStyle
        id="audit"
        config={{ sample: { theme: { light: "#0066cc", dark: "#ff7a00" } } }}
      />
      <div
        data-chart="audit"
        style={{
          background: "var(--color-sample)",
          padding: 24,
          color: "white",
        }}
      >
        Amostra config.theme: azul claro / laranja escuro
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Abrir diálogo</Button>
        </DialogTrigger>
        <DialogContent
          className="admin-ui admin-theme font-admin"
          style={palette}
        >
          <DialogTitle>Diálogo sintético</DialogTitle>
          <DialogDescription>Verificação de portal e foco.</DialogDescription>
          <Field label="Campo no portal" />
          {params.has("long") &&
            Array.from({ length: 24 }, (_, index) => (
              <Field
                key={index}
                label={`Referência sintética extensa ${index + 1}`}
              />
            ))}
          <Button>Confirmar prévia</Button>
        </DialogContent>
      </Dialog>
      <Button onClick={() => setEditorOpen(true)}>
        Editar contexto sintético
      </Button>
      <AdminThemeProvider style={palette}>
        <ContextEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          title="Contexto sintético"
        >
          <Field label="Rascunho do contexto" defaultValue="Original" />
        </ContextEditor>
      </AdminThemeProvider>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
