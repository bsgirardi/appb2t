"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicProductDTO } from "@/domain/products/types";
import { whatsappLink } from "@/domain/products/storefront";
import { formatBRL } from "@/domain/calculation/calculate";
import Link from "next/link";
import { addInquiry } from "@/lib/inquiry-store";
export function ProductContact({
  product,
  phone,
  email,
  url,
}: {
  product: PublicProductDTO;
  phone: string;
  email: string;
  url: string;
}) {
  const [color, setColor] = useState(""),
    [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1),
    [notice, setNotice] = useState("");
  const unavailable = product.availability === "UNAVAILABLE";
  const ready =
    (!product.colors?.length || !!color) && (!product.sizes?.length || !!size);
  const message = [
    unavailable
      ? `Olá! Gostaria de saber quando ${product.name} estará disponível novamente.`
      : `Olá! Tenho interesse em ${product.name}, anunciado por ${(product.price === null ? "Sob consulta" : formatBRL(product.price))}. Gostaria de confirmar disponibilidade, prazo e entrega.`,
    product.sku && `Código: ${product.sku}`,
    color && `Cor: ${color}`,
    size && `Tamanho: ${size}`,
    url,
  ]
    .filter(Boolean)
    .join("\n");
  const whatsapp = whatsappLink(phone, message);
  const contact =
    whatsapp ||
    (email
      ? `mailto:${email}?subject=${encodeURIComponent(`${unavailable ? "Disponibilidade de" : "Interesse em"} ${product.name}`)}&body=${encodeURIComponent(message)}`
      : null);
  const label = unavailable
    ? "Consultar reposição"
    : whatsapp
      ? "Pedir pelo WhatsApp ↗"
      : "Consultar por e-mail";
  return (
    <div className="store-options">
      {[
        {
          values: product.colors,
          value: color,
          set: setColor,
          label: "Cor",
          id: "order-color",
        },
        {
          values: product.sizes,
          value: size,
          set: setSize,
          label: "Tamanho",
          id: "order-size",
        },
      ].map((option) =>
        option.values?.length ? (
          <div className="field" key={option.id}>
            <Label htmlFor={option.id}>{option.label}</Label>
            <NativeSelect
              id={option.id}
              value={option.value}
              onChange={(e) => option.set(e.target.value)}
            >
              <option value="">Selecione</option>
              {option.values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null,
      )}
      {contact ? (
        ready ? (
          <Button asChild variant="outline" className="w-full rounded-xl">
            <a
              href={contact}
              target={whatsapp ? "_blank" : undefined}
              rel={whatsapp ? "noopener noreferrer" : undefined}
            >
              {label}
            </a>
          </Button>
        ) : (
          <>
            <Button type="button" className="w-full rounded-xl" disabled>
              {label}
            </Button>
            <p className="store-note">
              Selecione as opções acima para continuar.
            </p>
          </>
        )
      ) : (
        <p>Contato de atendimento ainda não informado.</p>
      )}
      {!unavailable && (
        <div className="store-add-list">
          <Label htmlFor="inquiry-quantity">Quantidade para orçamento</Label>
          <Input
            id="inquiry-quantity"
            type="number"
            min={1}
            max={99}
            step={1}
            value={Number.isNaN(quantity) ? "" : quantity}
            onChange={(e) => {
              setQuantity(e.target.valueAsNumber);
              setNotice("");
            }}
          />
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={
              !ready ||
              !Number.isInteger(quantity) ||
              quantity < 1 ||
              quantity > 99
            }
            onClick={() => {
              try {
                addInquiry({ productId: product.id, color, size, quantity });
                setNotice("Produto adicionado à lista.");
              } catch (e) {
                setNotice((e as Error).message);
              }
            }}
          >
            Adicionar à lista de orçamento
          </Button>
          {!ready && (
            <p className="store-note">
              Escolha cor e tamanho quando disponíveis.
            </p>
          )}
          {notice && (
            <p role="status">
              {notice}{" "}
              <Link href="/portfolio/orcamento">Ver minha lista →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
