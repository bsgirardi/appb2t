import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import {
  getPublicAppearance,
  getAppearance,
  saveAppearance,
  getAppearanceLogo,
} from "@/server/appearance";
import { defaultAppearance } from "@/domain/appearance/validation";
setupDatabase();
it("provides fallback and publishes only presentation fields", async () => {
  expect((await getPublicAppearance()).shortName).toBe("B2T");
  const admin = await seedUser();
  const input = {
    ...defaultAppearance,
    name: "Empresa nova",
    expectedVersion: 0,
  };
  const saved = await saveAppearance(admin, input, {
    bytes: new Uint8Array([1, 2]),
    mimeType: "image/webp",
  });
  expect(saved.version).toBe(1);
  const published = await getPublicAppearance();
  expect(published.name).toBe("Empresa nova");
  expect(published).not.toHaveProperty("version");
  expect(published).not.toHaveProperty("updatedById");
  expect(published.logoUrl).toContain("/api/appearance/logo");
  await expect(saveAppearance(admin, input)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await saveAppearance(admin, {
    ...input,
    expectedVersion: 1,
    removeLogo: true,
  });
  expect((await getPublicAppearance()).logoUrl).toBeNull();
  await expect(getAppearanceLogo()).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});
it("denies operators without altering public identity", async () => {
  const operator = await seedUser("OPERATOR");
  await expect(getAppearance(operator)).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(
    saveAppearance(operator, { ...defaultAppearance, expectedVersion: 0 }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect((await getPublicAppearance()).shortName).toBe("B2T");
});
it("changes the logo URL after replacing bytes so open pages refresh the image", async () => {
  const admin = await seedUser();
  const first = await saveAppearance(
    admin,
    { ...defaultAppearance, expectedVersion: 0 },
    { bytes: new Uint8Array([1]), mimeType: "image/webp" },
  );
  const second = await saveAppearance(
    admin,
    { ...defaultAppearance, expectedVersion: 1 },
    { bytes: new Uint8Array([2]), mimeType: "image/webp" },
  );
  expect(second.logoUrl).not.toBe(first.logoUrl);
  expect((await getPublicAppearance()).logoUrl).toBe(second.logoUrl);
});

it("persists site and admin palettes independently and protects concurrent edits", async () => {
  const admin = await seedUser();
  const first = await saveAppearance(admin, {
    ...defaultAppearance,
    expectedVersion: 0,
    lightPrimary: "#224455",
    siteLightPrimary: "#663399",
  });
  expect(first).toMatchObject({
    lightPrimary: "#224455",
    siteLightPrimary: "#663399",
  });
  const { logoUrl, version, ...fields } = first;
  void logoUrl;
  await saveAppearance(admin, {
    ...fields,
    expectedVersion: version,
    siteDarkAccent: "#ffffff",
  });
  const saved = await getAppearance(admin);
  expect(saved).toMatchObject({
    lightPrimary: "#224455",
    siteLightPrimary: "#663399",
    siteDarkAccent: "#ffffff",
  });
  await expect(
    saveAppearance(admin, {
      ...fields,
      expectedVersion: version,
      lightPrimary: "#ffffff",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect((await getAppearance(admin)).lightPrimary).toBe("#224455");
});
it("old clients cannot reset previously saved site colors", async () => {
  const admin = await seedUser();
  await saveAppearance(admin, {
    ...defaultAppearance,
    expectedVersion: 0,
    siteLightPrimary: "#663399",
  });
  const {
    siteLightPrimary,
    siteLightAccent,
    siteDarkPrimary,
    siteDarkAccent,
    ...legacy
  } = defaultAppearance;
  void [siteLightPrimary, siteLightAccent, siteDarkPrimary, siteDarkAccent];
  const saved = await saveAppearance(admin, {
    ...legacy,
    lightPrimary: "#224455",
    expectedVersion: 1,
  });
  expect(saved.siteLightPrimary).toBe("#663399");
  expect((await getPublicAppearance()).siteLightPrimary).toBe("#663399");
  expect(saved.lightPrimary).toBe("#224455");
});
