import Image from "next/image";
import { cn } from "~/lib/utils";

const LOGOS = {
  mark: {
    src: "/assets/nie-logo-simple-transparent.png",
    alt: "",
  },
  wordmark: {
    src: "/assets/nie-logo-transparent.png",
    alt: "Notion Image Exporter",
  },
} as const;

const SIZES = {
  sm: "size-12",
  md: "size-16",
  lg: "size-28 md:size-32",
} as const;

type BrandLogoProps = {
  variant?: keyof typeof LOGOS;
  size?: keyof typeof SIZES;
  className?: string;
};

export function BrandLogo({
  variant = "mark",
  size = "md",
  className,
}: BrandLogoProps) {
  const logo = LOGOS[variant];

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={1024}
      height={1024}
      priority={variant === "wordmark"}
      className={cn("shrink-0 object-contain", SIZES[size], className)}
    />
  );
}
