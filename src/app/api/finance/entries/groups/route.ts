import { z } from "zod";
import { endpoint, ok, jsonBody } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { createEntryGroup } from "@/server/finance/entries";
import { entrySchema } from "@/domain/finance/validation";
import { installmentSchema } from "@/domain/commerce/validation";
const schema = z
  .object({
    entry: entrySchema,
    installments: z.array(installmentSchema).min(1).max(120),
    operationKey: z.string().min(8).max(160),
  })
  .strict();
export async function POST(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    const body = schema.parse(await jsonBody(request, { maxBytes: 65536 }));
    return ok(
      await createEntryGroup(
        actor,
        body.entry,
        body.installments,
        body.operationKey,
      ),
    );
  });
}
