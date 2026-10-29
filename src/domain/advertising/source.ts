import type { AdSourceInput, AdSourceSnapshot } from "./types";
export function makeAdSource(p:AdSourceInput):AdSourceSnapshot {
  return {schemaVersion:1,productId:p.id,productVersion:p.version,name:p.name,sku:p.sku,active:p.active,
    shortDescription:p.shortDescription,description:p.description,specifications:p.specifications,
    colors:[...p.colors],sizes:[...p.sizes],availability:p.availability,leadTimeDays:p.leadTimeDays,
    minimumQuantity:p.minimumQuantity,personalizable:p.personalizable,
    images:p.images.map(i=>({id:i.id,url:i.url,position:i.position}))};
}
