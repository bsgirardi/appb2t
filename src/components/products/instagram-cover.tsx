"use client";
import { useState } from "react";
import Image from "next/image";
export function InstagramCover({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="instagram-image-unavailable">
      <span>Imagem temporariamente indisponível</span>
      <span>Abra a publicação no Instagram</span>
    </div>
  ) : (
    <Image
      src={src}
      alt={alt}
      width={640}
      height={640}
      sizes="(max-width: 599px) 100vw, (max-width: 1023px) 50vw, 33vw"
      unoptimized={src.startsWith("/api/")}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
