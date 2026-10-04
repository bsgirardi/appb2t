import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
export function StoreFaq({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <Accordion type="multiple" className="store-faq">
      {items.map((item, index) => (
        <AccordionItem key={index} value={String(index)}>
          <AccordionTrigger className="text-left break-words">
            {item.question}
          </AccordionTrigger>
          <AccordionContent>
            <p>{item.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
