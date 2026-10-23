import { appUrl } from "@/lib/env";
export const draftCookie="b2t_checkout_draft";
export const scopedCookie=(id:string)=>`b2t_checkout_${id}`;
export function readCheckoutCookie(request:Request,name:string):string|null {
 const values=(request.headers.get("cookie")??"").split(";").map(x=>x.trim()).filter(x=>x.startsWith(`${name}=`));
 if(values.length!==1)return null;const value=values[0].slice(name.length+1);return /^[a-f0-9]{64}$/.test(value)?value:null;
}
export function checkoutCookie(name:string,token:string):string {return `${name}=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Strict${appUrl().protocol==="https:"?"; Secure":""}`;}
