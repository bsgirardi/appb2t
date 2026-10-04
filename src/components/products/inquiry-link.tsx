"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInquiry } from "@/lib/inquiry-store";
export function InquiryLink() {
  const items = useInquiry();
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Button asChild variant="outline" className="rounded-full">
      <Link href="/portfolio/orcamento">
        <ShoppingBag aria-hidden="true" />
        Minha lista{quantity > 0 ? ` (${quantity})` : ""}
      </Link>
    </Button>
  );
}
