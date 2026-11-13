import { cn } from "@/lib/utils";

type P = { src: (w: number) => string; alt: string };

/** An Unsplash photo with a responsive srcset. Decorative photos pass alt="" via `decorative`. */
export function Photo({ photo, className, sizes = "100vw", decorative = false, priority = false }: { photo: P; className?: string; sizes?: string; decorative?: boolean; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.src(1600)}
      srcSet={[640, 1080, 1600, 2400].map((w) => `${photo.src(w)} ${w}w`).join(", ")}
      sizes={sizes}
      alt={decorative ? "" : photo.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("size-full object-cover grayscale", className)}
    />
  );
}
