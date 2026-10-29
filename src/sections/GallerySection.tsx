import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { gallery, type GalleryItem } from "../data/gallery";
import { Lightbox } from "../components/Lightbox";
import { RevealImage } from "../components/RevealImage";
import { SectionHeading } from "../components/SectionHeading";

const ratio = {
  tall: "aspect-[3/4]",
  wide: "aspect-[4/3]",
  square: "aspect-square",
};
const desktopColumnWidths = [
  "w-[clamp(160px,14vw,208px)]",
  "w-[clamp(176px,16vw,232px)]",
];
const desktopColumns = gallery.reduce<Array<Array<{ item: GalleryItem; index: number }>>>(
  (columns, item, index) => {
    const columnIndex = Math.floor(index / 2);
    if (!columns[columnIndex]) columns[columnIndex] = [];
    columns[columnIndex].push({ item, index });
    return columns;
  },
  [],
);

function GalleryPhoto({
  item,
  index,
  onOpen,
  reduceMotion,
  desktop = false,
}: {
  item: GalleryItem;
  index: number;
  onOpen: () => void;
  reduceMotion: boolean;
  desktop?: boolean;
}) {
  return (
    <li
      className={`${desktop ? "w-full min-w-0" : "mb-4 inline-block w-full break-inside-avoid"} min-w-0`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
        aria-label={`Open image: ${item.caption}`}
      >
        <span className="relative block overflow-hidden bg-mocha">
          <RevealImage
            image={item.image}
            eager={index < 2}
            className={ratio[item.span]}
            imgClassName={
              reduceMotion
                ? ""
                : "transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.035]"
            }
          />
          {!reduceMotion && (
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-espresso/0 transition-colors duration-500 group-hover:bg-espresso/10"
            />
          )}
        </span>
        <span className="mt-3 flex min-w-0 items-baseline justify-between gap-2 text-left">
          <span className="min-w-0 break-words text-sm leading-snug text-ivory/85 sm:text-base">
            {item.caption}
          </span>
          <span className="label shrink-0 text-xs text-ivory/55">
            {
              String(index + 1).padStart(
                2,
                "0",
              ) /* taste-skill-ignore: retain the existing gallery frame number */
            }
          </span>
        </span>
      </button>
    </li>
  );
}

export function GallerySection() {
  const [index, setIndex] = useState<number | null>(null);
  const [travel, setTravel] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduceMotion = useReducedMotion();
  const pinned = desktop && !reduceMotion;
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, (progress) => -travel * progress);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!pinned || !viewport || !track) return;

    const measure = () => {
      const nextTravel = Math.max(0, track.scrollWidth - viewport.clientWidth);
      setTravel((current) =>
        Math.abs(current - nextTravel) < 1 ? current : nextTravel,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [pinned]);

  return (
    <section
      id="gallery"
      aria-labelledby="gallery-title"
      className="relative bg-espresso py-20 text-ivory sm:py-28 lg:py-32"
    >
      <div className="container-x">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <SectionHeading
            id="gallery-title"
            eyebrow="Gallery"
            title="Moments"
            italic="in amber."
          />
        </div>
      </div>

      {pinned ? (
        <div
          ref={sceneRef}
          className="relative mt-12 sm:mt-16"
          style={{ height: `calc(100svh + ${travel}px)` }}
        >
          <div
            ref={viewportRef}
            className="sticky top-0 flex h-svh items-center overflow-hidden"
          >
            <motion.ul
              ref={trackRef}
              style={{
                x,
                paddingInline:
                  "max(var(--gutter), calc((100vw - var(--container)) / 2 + var(--gutter)))",
              }}
              className="flex w-max flex-none list-none items-center gap-1.5"
            >
              {desktopColumns.map((column, columnIndex) => (
                <li
                  key={column[0].item.image.src}
                  className={`${desktopColumnWidths[columnIndex % desktopColumnWidths.length]} flex-none`}
                >
                  <ul className="flex list-none flex-col gap-1.5">
                    {column.map(({ item, index: photoIndex }) => (
                      <GalleryPhoto
                        key={item.image.src}
                        item={item}
                        index={photoIndex}
                        onOpen={() => setIndex(photoIndex)}
                        reduceMotion={false}
                        desktop
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </motion.ul>
          </div>
        </div>
      ) : (
        <ul className="container-x mt-10 columns-2 gap-x-2 sm:mt-14 sm:gap-x-3 lg:columns-2 lg:gap-x-8">
          {gallery.map((item, i) => (
            <GalleryPhoto
              key={item.image.src}
              item={item}
              index={i}
              onOpen={() => setIndex(i)}
              reduceMotion={Boolean(reduceMotion)}
            />
          ))}
        </ul>
      )}

      <Lightbox
        items={gallery}
        index={index}
        onClose={() => setIndex(null)}
        onIndex={setIndex}
      />
    </section>
  );
}
