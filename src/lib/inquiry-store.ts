"use client";
import { useMemo, useSyncExternalStore } from "react";
import {
  inquiryItemsSchema,
  mergeInquiryItem,
  type InquiryItem,
} from "@/domain/products/inquiry";
const key = "b2t:inquiry:v1";
const event = "b2t:inquiry-change";
let fallback = "[]";
let memoryOnly = false;
function snapshot() {
  if (memoryOnly) return fallback;
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    memoryOnly = true;
    return fallback;
  }
}
function parse(value: string): InquiryItem[] {
  if (value.length > 16384) return [];
  try {
    return inquiryItemsSchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}
function subscribe(listener: () => void) {
  const storage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) {
      fallback = "[]";
      listener();
    }
  };
  window.addEventListener("storage", storage);
  window.addEventListener(event, listener);
  return () => {
    window.removeEventListener("storage", storage);
    window.removeEventListener(event, listener);
  };
}
export function writeInquiry(items: InquiryItem[]) {
  const value = JSON.stringify(inquiryItemsSchema.parse(items));
  fallback = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryOnly = true;
    /* Still usable in this page when storage is unavailable. */
  }
  window.dispatchEvent(new Event(event));
}
export function addInquiry(item: InquiryItem) {
  writeInquiry(mergeInquiryItem(parse(snapshot()), item));
}
export function useInquiry() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  return useMemo(() => parse(raw), [raw]);
}
