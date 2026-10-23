import type { Prisma } from "@prisma/client";
import type { CheckoutReviewContent } from "@/domain/checkout/types";
export async function createCheckoutCustomer(tx:Prisma.TransactionClient,id:string,review:CheckoutReviewContent) {
 return tx.customer.create({data:{name:review.contact.name,type:"PERSON",email:review.contact.email,phone:review.contact.phone,address:review.delivery.mode==="PICKUP"?"":Object.values(review.delivery.address).join(", "),notes:`Origem checkout ${id}. Conferir possível duplicidade antes de vincular outros documentos.`}});
}
