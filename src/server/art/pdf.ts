import { Worker } from "node:worker_threads";
import { join } from "node:path";
// Keep the external parser in Next's standalone dependency trace.
import "@cantoo/pdf-lib";
import { AppError } from "@/lib/errors";

// Evaluated in a separate V8 isolate: hostile parser workloads never block HTTP.
const workerSource = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const requireFromApp = require('node:module').createRequire(workerData.packageJson);
const { PDFDocument, PDFDict, PDFArray, PDFStream, PDFName } = requireFromApp('@cantoo/pdf-lib');
(async () => {
  const bytes = workerData.bytes;
  const start = Buffer.from(bytes.subarray(0, 8)).toString('ascii');
  const end = Buffer.from(bytes.subarray(Math.max(0, bytes.length - 64))).toString('ascii').trimEnd();
  if (!start.startsWith('%PDF-') || !end.endsWith('%%EOF')) throw Error('structure');
  const doc = await PDFDocument.load(bytes, { throwOnInvalidObject: true, updateMetadata: false });
  if (doc.isEncrypted || doc.context.trailerInfo.Encrypt || doc.getPageCount() < 1 || doc.getPageCount() > 500) throw Error('document');
  const forbidden = new Set(['A','AA','OpenAction','JS','JavaScript','Launch','EmbeddedFiles','EmbeddedFile','EF','AF','XFA','RichMedia','Movie','Sound','GoToR','GoToE','SubmitForm','ImportData','URI']);
  const seen = new Set(); let count = 0;
  function inspect(obj, depth = 0) {
    if (!obj || seen.has(obj)) return;
    if (++count > 100000 || depth > 100) throw Error('complexity');
    seen.add(obj);
    if (obj instanceof PDFName && forbidden.has(obj.decodeText())) throw Error('active');
    if (obj instanceof PDFStream) inspect(obj.dict, depth + 1);
    if (obj instanceof PDFDict) for (const [key, value] of obj.entries()) {
      if (forbidden.has(key.decodeText())) throw Error('active');
      inspect(value, depth + 1);
    }
    if (obj instanceof PDFArray) for (let i = 0; i < obj.size(); i++) inspect(obj.get(i), depth + 1);
  }
  for (const [, obj] of doc.context.enumerateIndirectObjects()) inspect(obj);
  parentPort.postMessage(true);
})().catch(() => parentPort.postMessage(false));
`;

export async function validatePassivePdf(bytes: Uint8Array): Promise<void> {
  const valid = await new Promise<boolean>((resolve) => {
    const worker = new Worker(workerSource, {
      eval: true,
      workerData: { bytes, packageJson: join(process.cwd(), "package.json") },
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 16,
        stackSizeMb: 4,
      },
    });
    let done = false;
    const finish = (value: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(value);
    };
    const timer = setTimeout(() => finish(false), 5000);
    worker.once("message", (value) => finish(value === true));
    worker.once("error", () => finish(false));
    worker.once("exit", () => finish(false));
  });
  if (!valid)
    throw new AppError(
      "VALIDATION",
      "PDF inválido, protegido, complexo ou com recursos ativos. Envie um PDF estático de até 500 páginas.",
    );
}
