import { z } from "zod";
import { readableText } from "./colors";
export const defaultAppearance = {
  name: "B2T Print Studio",
  shortName: "B2T",
  slogan: "Precisão em cada camada.",
  email: "",
  phone: "",
  address: "",
  footer: "B2T · Precisão em cada camada.",
  lightPrimary: "#176b59",
  lightAccent: "#b68b39",
  darkPrimary: "#6cdbc0",
  darkAccent: "#eac473",
};
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .refine((value) => {
    try {
      readableText(value);
      return true;
    } catch {
      return false;
    }
  }, "Ajuste a cor para garantir contraste de leitura.");
export const appearanceSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    shortName: z.string().trim().max(30),
    slogan: z.string().trim().max(160),
    email: z.union([z.literal(""), z.email().max(254)]),
    phone: z.string().trim().max(80),
    address: z.string().trim().max(500),
    footer: z.string().trim().max(300),
    lightPrimary: color,
    lightAccent: color,
    darkPrimary: color,
    darkAccent: color,
    expectedVersion: z.number().int().min(0),
    removeLogo: z.boolean().optional(),
  })
  .strict();
