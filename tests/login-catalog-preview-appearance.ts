import { defaultAppearance } from "@/domain/appearance/validation";
export async function getPublicAppearance() {
  return {
    ...defaultAppearance,
    logoUrl: null,
    phone: "",
    email: "",
    address: "",
  };
}
