import { SafeImage } from "./SafeImage";

/**
 * A category's picture from the ERP, sized by `className` (`cat-chip-thumb`,
 * `dc-thumb`, `cat-subdrop-thumb`). Nothing renders when there is none, or
 * when it fails to load.
 */
export function CategoryThumb({ src, className }: { src: string | undefined; className: string }) {
  if (!src) return null;
  return <SafeImage src={src} alt="" width={48} height={48} className={className} fallback={null} />;
}
