import { z } from "zod";
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(160).default(""),
});
