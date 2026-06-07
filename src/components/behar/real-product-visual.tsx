import { Package, Smartphone } from "lucide-react";
import Image from "next/image";

import { realDeviceImage, realProductImage } from "@/lib/real-product-images";
import { cn } from "@/lib/utils";
import { getDeviceImage } from "@/lib/visual-assets";

function ProductImage({
  className,
  fallback,
  src,
}: Readonly<{
  className?: string;
  fallback: "device" | "product";
  src: string;
  }>) {
  return (
    <span aria-hidden className={cn("relative grid shrink-0 place-items-center overflow-hidden bg-white text-[#2A9D8F]", className)}>
      {src ? (
        <Image alt="" className="object-contain" fill sizes="160px" src={src} />
      ) : fallback === "device" ? (
        <Smartphone className="size-7" />
      ) : (
        <Package className="size-7" />
      )}
    </span>
  );
}

export function RealProductVisual({
  category,
  className,
  name,
}: Readonly<{
  category?: string;
  className?: string;
  name: string;
}>) {
  return <ProductImage className={className} fallback="product" src={realProductImage(name, category)} />;
}

export function RealDeviceVisual({
  brand,
  category,
  className,
  model,
  type,
}: Readonly<{
  brand?: string;
  category?: string;
  className?: string;
  model?: string;
  type?: string;
}>) {
  return (
    <ProductImage
      className={className}
      fallback="device"
      src={getDeviceImage({ brand, category, model, type }) || realDeviceImage(brand, model, type)}
    />
  );
}
