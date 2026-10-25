"use client";
import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
const AdminTheme = createContext<CSSProperties | undefined>(undefined);
export const useAdminTheme = () => useContext(AdminTheme);
export function AdminThemeProvider({
  style,
  children,
}: {
  style: CSSProperties;
  children: ReactNode;
}) {
  return <AdminTheme.Provider value={style}>{children}</AdminTheme.Provider>;
}
