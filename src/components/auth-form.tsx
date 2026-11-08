"use client";
import { Button } from "@/components/ui/button";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client-api";
import { Field, FieldGroup, Notice } from "./ui/field";
export function AuthForm({ mode = "login" }: { mode?: "login" | "password" }) {
  const submitting = useRef(false);
  const router = useRouter(),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      if (mode === "login") {
        await api("/api/auth/login", {
          email: form.get("email"),
          password: form.get("password"),
        });
        router.replace("/dashboard");
        router.refresh();
      } else {
        if (form.get("next") !== form.get("confirm"))
          throw new Error("As senhas não coincidem.");
        await api("/api/account/password", {
          current: form.get("current"),
          next: form.get("next"),
        });
        router.replace("/login?changed=1");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="auth-form" aria-busy={pending}>
      <FieldGroup>
        {mode === "login" ? (
          <>
            <Field
              label="E-mail"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="voce@empresa.com.br"
              required
              maxLength={254}
            />
            <Field
              label="Senha"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              required
              maxLength={128}
            />
          </>
        ) : (
          <>
            <Field
              label="Senha atual"
              name="current"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
            <Field
              label="Nova senha"
              name="next"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              hint="Use entre 12 e 128 caracteres."
            />
            <Field
              label="Repita a nova senha"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </>
        )}
      </FieldGroup>
      {error && <Notice>{error}</Notice>}
      <Button className="full-width" disabled={pending}>
        {pending
          ? mode === "login"
            ? "Entrando no sistema…"
            : "Atualizando senha…"
          : mode === "login"
            ? "Entrar no sistema"
            : "Atualizar senha"}
        {pending ? (
          <LoaderCircle
            data-icon="inline-end"
            aria-hidden="true"
            className="motion-safe:animate-spin"
          />
        ) : (
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        )}
      </Button>
      <span className="sr-only" role="status">
        {pending
          ? mode === "login"
            ? "Entrando no sistema. Aguarde."
            : "Atualizando senha. Aguarde."
          : ""}
      </span>
      <p className="secure-note">
        <LockKeyhole size={13} />
        {mode === "login"
          ? "Acesso exclusivo para pessoas autorizadas."
          : "Você precisará entrar novamente em todos os dispositivos."}
      </p>
    </form>
  );
}
