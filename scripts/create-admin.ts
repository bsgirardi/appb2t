import { input, password } from "@inquirer/prompts";
import { z } from "zod";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/server/auth/password";
async function main() {
  const name = z
    .string()
    .trim()
    .min(2)
    .max(100)
    .parse(await input({ message: "Nome do administrador:" }));
  const email = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .parse(await input({ message: "E-mail:" }));
  const secret = await password({
    message: "Senha (12–128 caracteres):",
    mask: true,
  });
  const confirm = await password({ message: "Repita a senha:", mask: true });
  if (secret !== confirm) throw new Error("As senhas não coincidem.");
  const passwordHash = await hashPassword(secret);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(823701)`;
    if (await tx.user.count({ where: { role: "ADMIN" } }))
      throw new Error(
        "Administrador já existente. Use a área de usuários para criar outros acessos.",
      );
    await tx.user.create({
      data: { name, email, passwordHash, role: "ADMIN" },
    });
  });
  console.log("Administrador criado. Entre com o e-mail e a senha informados.");
}
main()
  .catch((e) => {
    console.error(
      e instanceof Error
        ? e.message
        : "Não foi possível criar o administrador.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
