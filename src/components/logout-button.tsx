"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/client-api";
import { Notice } from "./ui/field";
export function LogoutButton() {
  const router = useRouter(),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function logout() {
    setPending(true);
    setError("");
    try {
      await api("/api/auth/logout", {});
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }
  return (
    <div>
      {error && <Notice>{error}</Notice>}
      <button className="button secondary" onClick={logout} disabled={pending}>
        <LogOut size={16} />
        Sair da conta
      </button>
    </div>
  );
}
