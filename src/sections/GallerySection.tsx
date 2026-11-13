import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { gallery, type GalleryItem, type GalleryLayout } from "../data/gallery";
import { Lightbox } from "../components/Lightbox";
import { RevealImage } from "../components/RevealImage";
import { SectionHeading } from "../components/SectionHeading";

const layoutAspect: Record<GalleryLayout, string> = {
  "large-portrait": "3 / 4",
  "small-portrait": "4 / 5",
  "large-landscape": "4 / 3",
  "small-landscape": "3 / 2",
  square: "1 / 1",
  "tall-vertical": "2 / 3",
  "wide-horizontal": "16 / 9",
};
const desktopWidths: Record<GalleryLayout, string> = {
  "large-portrait": "w-[clamp(190px,16vw,250px)]",
  "small-portrait": "w-[clamp(150px,12vw,190px)]",
  "large-landscape": "w-[clamp(245px,21vw,330px)]",
  "small-landscape": "w-[clamp(190px,15vw,245px)]",
  square: "w-[clamp(170px,14vw,220px)]",
  "tall-vertical": "w-[clamp(160px,13vw,210px)]",
  "wide-horizontal": "w-[clamp(265px,23vw,360px)]",
};

function arrangeDesktopColumns(items: GalleryItem[]) {
  type PlacedItem = { item: GalleryItem; index: number; row: number };
  const columns = new Map<number, PlacedItem[]>();
  const unplaced: PlacedItem[] = [];

  items.forEach((item, index) => {
    const placed = item.placement;
    if (placed && Number.isInteger(placed.column) && placed.column > 0 && Number.isInteger(placed.row) && placed.row > 0) {
      const column = columns.get(placed.column) ?? [];
      if (!column.some((entry) => entry.row === placed.row)) {
        column.push({ item, index, row: placed.row });
        columns.set(placed.column, column);
        return;
      }
    }
    unplaced.push({ item, index, row: 0 });
  });

  let columnNumber = 1;
  let rowNumber = 1;
  for (const entry of unplaced) {
    while (columns.get(columnNumber)?.some((placed) => placed.row === rowNumber)) {
      rowNumber += 1;
      if (rowNumber > 2) {
        columnNumber += 1;
        rowNumber = 1;
      }
    }
    const column = columns.get(columnNumber) ?? [];
    column.push({ ...entry, row: rowNumber });
    columns.set(columnNumber, column);
    rowNumber += 1;
    if (rowNumber > 2) {
      columnNumber += 1;
      rowNumber = 1;
    }
  }

  return [...columns.entries()]
    .sort(([left], [right]) => left - right)
    .map(([columnNumberForKey, entries]) => ({
      id: `gallery-column-${columnNumberForKey}`,
      items: entries.sort((left, right) => left.row - right.row),
    }));
}

const desktopColumns = arrangeDesktopColumns(gallery);

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
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <li
      className={`${desktop ? desktopWidths[item.layout] : "mb-4 inline-block w-full break-inside-avoid"} min-w-0`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bronze"
        aria-label={`Open image: ${item.caption}`}
      >
        <span
          className="relative block overflow-hidden bg-mocha"
          style={{ aspectRatio: item.aspectRatio ?? layoutAspect[item.layout] }}
        >
          {imageFailed ? (
            <span className="absolute inset-0 flex items-center justify-center bg-mocha px-5 text-center text-sm text-ivory/60">
              {item.caption}
            </span>
          ) : (
            <RevealImage
              image={item.image}
              eager={index < 2}
              onError={() => setImageFailed(true)}
              className="h-full w-full"
              imgClassName={
                reduceMotion
                  ? ""
                  : "transition-transform duration-[1.2s] ease-[var(--ease-out-soft)] group-hover:scale-[1.035]"
              }
            />
          )}
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
              String(item.number).padStart(2, "0")
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
      className="relative bg-espresso py-16 text-ivory sm:py-20 lg:py-24"
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

      {gallery.length === 0 ? (
        <p className="container-x mt-8 text-ivory/70">Gallery photographs will appear here soon.</p>
      ) : pinned ? (
        <div
          ref={sceneRef}
          className="relative mt-8 sm:mt-12"
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
              {desktopColumns.map((column) => (
                <li
                  key={column.id}
                  className="flex-none"
                >
                  <ul className="flex list-none flex-col gap-1.5">
                    {column.items.map(({ item, index: photoIndex }) => (
                      <GalleryPhoto
                        key={item.id}
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
        <ul className="container-x mt-8 columns-2 gap-x-2 sm:mt-10 sm:gap-x-3 lg:columns-2 lg:gap-x-8">
          {gallery.map((item, i) => (
            <GalleryPhoto
              key={item.id}
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
