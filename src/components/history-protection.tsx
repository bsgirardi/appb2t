"use client";
import { useEffect } from "react";
import { startHistoryProtection } from "@/lib/history-protection";

export function HistoryProtection() {
  useEffect(() => {
    startHistoryProtection();
  }, []);
  return null;
}
