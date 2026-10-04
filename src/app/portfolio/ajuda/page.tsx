import { StoreInformationPage } from "@/components/products/store-information-page";
import { storeInformation } from "@/server/store-information";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return (await storeInformation("ajuda")).metadata;
}
export default function HelpPage() {
  return <StoreInformationPage kind="ajuda" />;
}
