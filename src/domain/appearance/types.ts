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
export interface PublicAppearanceDTO extends CompanyIdentityDTO {
  lightPrimary: string;
  lightAccent: string;
  darkPrimary: string;
  darkAccent: string;
}
export interface AppearanceDTO extends PublicAppearanceDTO {
  version: number;
}
