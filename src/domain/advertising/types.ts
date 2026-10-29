import type { Availability } from "@/domain/products/commercial";
export type AdChannel = "INSTAGRAM" | "WHATSAPP";
export type AdStatus = "DRAFT" | "REVIEWED" | "ARCHIVED";
export interface AdSourceSnapshot {
  schemaVersion: 1;
  productId: string;
  productVersion: number;
  name: string;
  sku: string;
  active: boolean;
  shortDescription: string;
  description: string;
  specifications: string;
  colors: string[];
  sizes: string[];
  availability: Availability;
  leadTimeDays: number | null;
  minimumQuantity: number;
  personalizable: boolean;
  images: { id: string; url: string; position: number }[];
}
export type AdSourceInput = Omit<
  AdSourceSnapshot,
  "schemaVersion" | "productId" | "productVersion"
> & { id: string; version: number };
export type AdFields = {
  internalName: string;
  title: string;
  body: string;
  imageIds: string[];
};
export type AdSuggestion = { title: string; body: string; warnings: string[] };
export type AdReviewState = {
  status: AdStatus;
  version: number;
  reviewedVersion: number | null;
  source: AdSourceSnapshot;
  imageIds: string[];
};
export interface AdDraftDTO extends AdFields {
  id: string;
  productId: string;
  channel: AdChannel;
  status: AdStatus;
  version: number;
  source: AdSourceSnapshot;
  currentSource: AdSourceSnapshot;
  productChanged: boolean;
  missingPhotoIds: string[];
  reviewIsCurrent: boolean;
  reviewedAt: string | null;
  updatedAt: string;
  lastExport: { draftVersion: number; createdAt: string } | null;
}
export type AdLibraryQuery = {
  search: string;
  channel?: AdChannel;
  status?: AdStatus;
  page: number;
};
export type AdLibraryPage = {
  drafts: AdDraftDTO[];
  total: number;
  page: number;
  pages: number;
};
export type AdCommand = import("zod").infer<
  typeof import("./validation").adCommandSchema
>;
