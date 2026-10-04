// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  storefrontSchema,
  defaultStorefront,
} from "@/domain/appearance/storefront";
import { StoreInformationEditor } from "@/components/settings/store-information-editor";
import { StoreFaq } from "@/components/products/store-faq";
it("associates FAQ triggers and answers and supports keyboard navigation", () => {
  render(
    <StoreFaq
      items={[
        { question: "Como pedir?", answer: "Prepare a lista." },
        { question: "Outra pergunta?", answer: "Outra resposta." },
      ]}
    />,
  );
  const first = screen.getByRole("button", { name: "Como pedir?" });
  first.focus();
  fireEvent.click(first);
  expect(first.getAttribute("aria-expanded")).toBe("true");
  expect(
    document.getElementById(first.getAttribute("aria-controls")!)?.textContent,
  ).toBe("Prepare a lista.");
  fireEvent.keyDown(first, { key: "ArrowDown" });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Outra pergunta?" }),
  );
});
afterEach(cleanup);
it("defaults older saved configs and rejects incomplete/oversized FAQ or SEO", () => {
  expect(storefrontSchema.parse({ aboutText: "Existente" })).toMatchObject({
    faq: [],
    seoTitle: "",
    seoDescription: "",
    aboutText: "Existente",
  });
  for (const input of [
    { faq: [{ question: "", answer: "Resposta" }] },
    { faq: [{ question: "Pergunta", answer: " " }] },
    { faq: Array(13).fill({ question: "Pergunta", answer: "Resposta" }) },
    { seoTitle: "a".repeat(71) },
    { seoDescription: "a".repeat(171) },
  ])
    expect(storefrontSchema.safeParse(input).success).toBe(false);
});
it("edits and reorders FAQ content without losing SEO fields", () => {
  function Form() {
    const [value, onChange] = useState(defaultStorefront);
    return <StoreInformationEditor value={value} onChange={onChange} />;
  }
  render(<Form />);
  fireEvent.change(
    screen.getByLabelText("Título do catálogo para buscadores"),
    { target: { value: "Minha loja" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Adicionar pergunta" }));
  fireEvent.change(screen.getByLabelText("Pergunta 1"), {
    target: { value: "Primeira" },
  });
  fireEvent.change(screen.getByLabelText("Resposta 1"), {
    target: { value: "Texto um" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar pergunta" }));
  fireEvent.change(screen.getByLabelText("Pergunta 2"), {
    target: { value: "Segunda" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Subir pergunta 2" }));
  expect((screen.getByLabelText("Pergunta 1") as HTMLInputElement).value).toBe(
    "Segunda",
  );
  expect(
    (screen.getByLabelText("Resposta 2") as HTMLTextAreaElement).value,
  ).toBe("Texto um");
  fireEvent.click(screen.getByRole("button", { name: "Remover pergunta 1" }));
  expect((screen.getByLabelText("Pergunta 1") as HTMLInputElement).value).toBe(
    "Primeira",
  );
  expect(
    (
      screen.getByLabelText(
        "Título do catálogo para buscadores",
      ) as HTMLInputElement
    ).value,
  ).toBe("Minha loja");
});
