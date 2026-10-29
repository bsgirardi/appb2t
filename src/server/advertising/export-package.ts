import sharp from "sharp";
import { zipSync, strToU8 } from "fflate";
import { AppError } from "@/lib/errors";
import type { AdChannel } from "@/domain/advertising/types";
export interface AdExportCapture {
  draftId:string;draftVersion:number;channel:AdChannel;title:string;body:string;
  product:{id:string;name:string;sku:string};generatedAt:string;photos:{id:string;position:number;bytes:Uint8Array}[];
}
export function assertAdImageBudget(sizes:number[]) {
  if(!sizes.length||sizes.length>10||sizes.some(s=>!Number.isSafeInteger(s)||s<=0)||sizes.reduce((a,b)=>a+b,0)>30*1024*1024)
    throw new AppError("VALIDATION","Selecione de 1 a 10 fotos, com até 30 MiB no total. Reduza a seleção e tente novamente.");
}
export function assertAdJpegSize(size:number) {
  if(size<=0||size>5*1024*1024) throw new AppError("VALIDATION","Uma foto excede 5 MiB após a conversão. Revise a seleção.");
}
export async function buildAdPackage(c:AdExportCapture):Promise<Uint8Array> {
  assertAdImageBudget(c.photos.map(p=>p.bytes.byteLength));
  const manifest={product:{id:c.product.id,name:c.product.name,sku:c.product.sku},channel:c.channel,draftId:c.draftId,draftVersion:c.draftVersion,generatedAt:c.generatedAt};
  const files:Record<string,Uint8Array>={"texto.txt":strToU8(`${c.title}\n\n${c.body}`),"referencia.json":strToU8(JSON.stringify(manifest,null,2))};
  for(const [index,photo] of c.photos.entries()) {
    let bytes:Buffer;
    try {bytes=await sharp(photo.bytes,{limitInputPixels:40_000_000,failOn:"warning"}).rotate().resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).flatten({background:"#ffffff"}).jpeg({quality:90}).toBuffer();}
    catch {throw new AppError("VALIDATION","Uma foto não pôde ser convertida. Confira as fotos na ficha do produto.");}
    assertAdJpegSize(bytes.byteLength);files[`fotos/${String(index+1).padStart(2,"0")}.jpg`]=bytes;
  }
  return zipSync(files,{level:0});
}
