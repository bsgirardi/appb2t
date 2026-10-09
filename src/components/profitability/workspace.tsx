"use client";
import { useRouter } from "next/navigation";
import type {
  SaleProfitabilityDTO,
  AssessmentDTO,
} from "@/domain/profitability/types";
import { RevisionForm } from "./revision-form";
import { AssessmentHistory } from "./assessment-history";
export function ProfitabilityWorkspace({
  value,
  actorId,
  channels,
  assessments,
}: {
  value: SaleProfitabilityDTO;
  actorId: string;
  channels: { id: string; name: string; version: number }[];
  assessments: AssessmentDTO[];
}) {
  const router = useRouter();
  return (
    <>
      <RevisionForm
        value={value}
        actorId={actorId}
        channels={channels}
        onDone={() => router.refresh()}
      />
      <AssessmentHistory
        saleId={value.saleId}
        items={assessments}
        currentHash={value.factsHash}
        onDone={() => router.refresh()}
      />
    </>
  );
}
