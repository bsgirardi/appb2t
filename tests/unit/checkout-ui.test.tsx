// @vitest-environment jsdom
import {cleanup,render,screen} from "@testing-library/react";
import {afterEach,expect,it} from "vitest";
import {CheckoutSummary} from "@/components/checkout/checkout-summary";
import type {CheckoutReview} from "@/domain/checkout/types";
afterEach(cleanup);
const review:CheckoutReview={id:"c",version:1,fingerprint:"a".repeat(64),route:"REVIEW",lines:[],groups:[],delivery:{mode:"TEAM_SHIPPING",address:{recipient:"Ana",postalCode:"01001000",street:"Rua A",number:"1",complement:"",district:"Centro",city:"São Paulo",state:"SP"}},pickupAddress:"",shipping:null,discount:"0.00",total:null,paymentTerms:"Externo",installments:[],reasons:["Frete pela equipe"],deliveryModes:["TEAM_SHIPPING"],contact:{name:"Ana",phone:"",email:"ana@example.test",preferredChannel:"email"}};
it("never presents pending freight as a closed total and separates production from transport",()=>{
 render(<CheckoutSummary review={review}/>);
 expect(screen.getByText(/Total após conferência/i)).toBeTruthy();
 expect(screen.getByText(/Frete a definir pela equipe/i)).toBeTruthy();
 expect(screen.getByText(/prazo de transporte/i)).toBeTruthy();
});
