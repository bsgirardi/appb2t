import type { AdChannel, AdSourceSnapshot, AdSuggestion } from "./types";
const availability = {
  AVAILABLE: "Disponível para pedidos. Consulte as condições.",
  MADE_TO_ORDER: "Produzido sob encomenda.",
  CONSULT: "Consulte a disponibilidade.",
  UNAVAILABLE: "Indisponível para pedidos no momento.",
};
export function suggestAd(
  s: AdSourceSnapshot,
  channel: AdChannel,
): AdSuggestion {
  const warnings: string[] = [];
  const blocks = [
    channel === "WHATSAPP" ? `Conheça ${s.name}` : s.name,
    s.personalizable
      ? "Personalização disponível. Consulte as opções e condições."
      : "",
    s.minimumQuantity > 1
      ? `Quantidade mínima: ${s.minimumQuantity} unidades por configuração.`
      : "",
    availability[s.availability],
    s.leadTimeDays
      ? `Prazo de produção: ${s.leadTimeDays} dias. Entrega a combinar.`
      : "",
    s.shortDescription || s.description,
    s.specifications,
    s.colors.length ? `Cores: ${s.colors.join(", ")}` : "",
    s.sizes.length ? `Tamanhos: ${s.sizes.join(", ")}` : "",
  ];
  const cta =
    channel === "INSTAGRAM"
      ? "Gostou? Peça seu orçamento e consulte valores e condições."
      : "Posso ajudar com um orçamento? Consulte valores e condições.";
  let body = "";
  for (const block of blocks.filter(Boolean)) {
    if (body.length + block.length + cta.length + 4 > 5000) {
      warnings.push(
        "Um trecho longo da ficha não foi incluído. Confira a descrição antes de revisar.",
      );
      continue;
    }
    body += (body ? "\n\n" : "") + block;
  }
  body += "\n\n" + cta;
  if (s.availability === "UNAVAILABLE")
    warnings.push(
      "Produto indisponível para pedidos. Confira a divulgação planejada.",
    );
  if (!s.active)
    warnings.push(
      "Produto não publicado no catálogo. Confira a divulgação planejada.",
    );
  return { title: s.name, body, warnings };
}
