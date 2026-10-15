import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { db } from "@/lib/db";
import { setupDatabase } from "./setup";
setupDatabase();
it("adds site defaults while preserving the existing identity and admin palette", async () => {
  const schema = "appearance_migration_" + randomUUID().replaceAll("-", "");
  const migration = "202610140001_separate_appearance_palettes";
  const folders = (await readdir("prisma/migrations", { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO "' + schema + '"');
      for (const folder of folders.filter((name) => name < migration)) {
        const sql = await readFile(
          "prisma/migrations/" + folder + "/migration.sql",
          "utf8",
        );
        for (const statement of sql.split(";").filter((part) => part.trim()))
          await tx.$executeRawUnsafe(statement);
      }
      await tx.$executeRawUnsafe(`INSERT INTO "CompanyAppearance" (id,name,"shortName",slogan,email,phone,address,footer,"lightPrimary","lightAccent","darkPrimary","darkAccent","updatedAt","updatedById",version)
      VALUES (1,'Existing company','EC','','','','','','#224455','#b68b39','#ffffff','#eac473',NOW(),'existing-user',7)`);
      const sql = await readFile(
        "prisma/migrations/" + migration + "/migration.sql",
        "utf8",
      );
      await tx.$executeRawUnsafe(sql);
      const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT * FROM "CompanyAppearance"',
      );
      expect(rows[0]).toMatchObject({
        name: "Existing company",
        version: 7,
        updatedById: "existing-user",
        lightPrimary: "#224455",
        lightAccent: "#b68b39",
        darkPrimary: "#ffffff",
        darkAccent: "#eac473",
        siteLightPrimary: "#0066cc",
        siteLightAccent: "#ff7a00",
        siteDarkPrimary: "#79b8ff",
        siteDarkAccent: "#ff7a00",
      });
      await tx.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
    },
    { timeout: 30000 },
  );
});
