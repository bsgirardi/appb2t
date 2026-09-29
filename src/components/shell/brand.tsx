import Image from "next/image";
import { Box } from "lucide-react";
import type { CompanyIdentityDTO } from "@/domain/appearance/types";
import { defaultAppearance } from "@/domain/appearance/validation";
export function Brand({
  identity = { ...defaultAppearance, logoUrl: null },
}: {
  identity?: CompanyIdentityDTO;
}) {
  return (
    <div className="brand">
      {identity.logoUrl ? (
        <Image
          src={identity.logoUrl}
          width={48}
          height={48}
          unoptimized
          alt={`Logo de ${identity.name}`}
          style={{ objectFit: "contain" }}
        />
      ) : (
        <span className="brand-icon">
          <Box size={25} strokeWidth={1.7} />
        </span>
      )}
      <span>
        {identity.shortName || identity.name}
        <span className="brand-sub">{identity.name}</span>
      </span>
    </div>
  );
}
