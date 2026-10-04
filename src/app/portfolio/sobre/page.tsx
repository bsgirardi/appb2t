import { StoreInformationPage } from "@/components/products/store-information-page";
import { storeInformation } from "@/server/store-information";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return (await storeInformation("sobre")).metadata;
}
export default function AboutPage() {
  return <StoreInformationPage kind="sobre" />;
}
