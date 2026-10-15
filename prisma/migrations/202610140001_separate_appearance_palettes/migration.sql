-- Add site colors without rewriting the existing administrative palette.
-- Defaults match the currently published storefront, including dark mode.
ALTER TABLE "CompanyAppearance"
ADD COLUMN "siteLightPrimary" TEXT NOT NULL DEFAULT '#0066cc',
ADD COLUMN "siteLightAccent" TEXT NOT NULL DEFAULT '#ff7a00',
ADD COLUMN "siteDarkPrimary" TEXT NOT NULL DEFAULT '#79b8ff',
ADD COLUMN "siteDarkAccent" TEXT NOT NULL DEFAULT '#ff7a00';
