import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

export default function BrandLogo({
  size = 32,
  priority = false,
  className = "",
  imageClassName = "",
}: BrandLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="e service logo"
        width={size}
        height={size}
        priority={priority}
        className={`h-full w-full object-contain ${imageClassName}`}
      />
    </span>
  );
}
