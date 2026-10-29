import { expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { db } from "@/lib/db";
import { fixture } from "./fixtures";
import { setupDatabase } from "./setup";
import { executeAdCommand } from "@/server/advertising/commands";
import { getAdDraft } from "@/server/advertising/queries";
import { exportAdDraft } from "@/server/advertising/export";
const { captured } = vi.hoisted(() => ({ captured: vi.fn() }));
vi.mock("@/server/advertising/export-package", async (original) => {
  const actual =
    await original<typeof import("@/server/advertising/export-package")>();
  return {
    ...actual,
    buildAdPackage: async (
      c: import("@/server/advertising/export-package").AdExportCapture,
    ) => {
      await captured(c);
      return actual.buildAdPackage(c);
    },
  };
});
setupDatabase();
it("exports the captured reviewed version without attributing it to a later edit", async () => {
  const { actor, product } = await fixture();
  let d = await executeAdCommand(actor, undefined, {
    action: "CREATE",
    operationKey: "create-operation-0001",
    productId: product.id,
    channel: "INSTAGRAM",
    internalName: "Teste",
  });
  d = await executeAdCommand(actor, d.id, {
    action: "REVIEW",
    expectedVersion: d.version,
    confirmed: true,
  });
  let release!: () => void, ready!: () => void;
  const gate = new Promise<void>((r) => (release = r)),
    started = new Promise<void>((r) => (ready = r));
  captured.mockImplementationOnce(() => {
    ready();
    return gate;
  });
  const pending = exportAdDraft(actor, d.id, d.version);
  await started;
  const changed = await executeAdCommand(actor, d.id, {
    action: "UPDATE",
    expectedVersion: d.version,
    fields: {
      internalName: d.internalName,
      title: d.title,
      body: "NOVA VERSÃO",
      imageIds: d.imageIds,
    },
  });
  await db.product.update({
    where: { id: product.id },
    data: { version: { increment: 1 }, name: "Outro nome" },
  });
  release();
  const result = await pending,
    zip = unzipSync(result.bytes);
  expect(strFromU8(zip["texto.txt"])).not.toContain("NOVA VERSÃO");
  expect(JSON.parse(strFromU8(zip["referencia.json"])).draftVersion).toBe(
    d.version,
  );
  const current = await getAdDraft(actor, d.id);
  expect(current.version).toBe(changed.version);
  expect(current.reviewIsCurrent).toBe(false);
  expect(current.lastExport?.draftVersion).toBe(d.version);
});
