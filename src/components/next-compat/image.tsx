import type { CSSProperties, ImgHTMLAttributes } from "react";

type NextImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
};

/**
 * Drop-in replacement for `next/image` used during the TanStack Start migration.
 * Renders a plain <img> while preserving next/image's `fill` layout behaviour.
 */
export default function Image({
  fill,
  priority,
  quality: _quality,
  unoptimized: _unoptimized,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  sizes: _sizes,
  className,
  style,
  loading,
  ...rest
}: NextImageProps) {
  const fillStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
    : {};

  const hasObjectFit = /(^|\s)object-(contain|cover|fill|none|scale-down)/.test(className ?? "");
  const resolvedClassName = fill && !hasObjectFit ? `${className ?? ""} object-cover`.trim() : className;

  return (
    <img
      {...rest}
      className={resolvedClassName}
      decoding="async"
      loading={priority ? "eager" : loading}
      style={{ ...fillStyle, ...style }}
    />
  );
}
