"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductThumbnailProps {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { px: 40, box: "w-10 h-10", icon: 16 },
  md: { px: 48, box: "w-12 h-12", icon: 20 },
  lg: { px: 80, box: "w-20 h-20", icon: 26 },
} as const;

export function ProductThumbnail({
  src,
  alt,
  size = "sm",
  className = "",
}: ProductThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { px, box, icon } = SIZE_MAP[size];
  const cleanSrc = src?.trim() || null;
  const showImage = Boolean(cleanSrc) && failedSrc !== cleanSrc;
  const isLocalPreview = Boolean(
    cleanSrc && (cleanSrc.startsWith("blob:") || cleanSrc.startsWith("data:"))
  );

  return (
    <div
      className={`${box} rounded-lg border border-line bg-zinc-50 flex items-center justify-center shrink-0 overflow-hidden ${className}`}
    >
      {showImage && cleanSrc ? (
        <Image
          src={cleanSrc}
          alt={alt}
          width={px}
          height={px}
          unoptimized={isLocalPreview}
          onError={() => setFailedSrc(cleanSrc)}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted/70"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      )}
    </div>
  );
}
