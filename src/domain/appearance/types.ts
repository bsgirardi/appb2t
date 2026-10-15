import type { SiteColors } from "./site-colors";
export interface CompanyIdentityDTO {
  name: string;
  shortName: string;
  slogan: string;
  email: string;
  phone: string;
  address: string;
  footer: string;
  logoUrl: string | null;
}
export interface AppearancePalette {
  lightPrimary: string;
  lightAccent: string;
  darkPrimary: string;
  darkAccent: string;
}
export interface PublicAppearanceDTO
  extends CompanyIdentityDTO, AppearancePalette, Partial<SiteColors> {
  storefront?: import("./storefront").StorefrontConfig;
}
export interface AppearanceDTO extends PublicAppearanceDTO {
  version: number;
}
