import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMedallion } from "./LogoMedallion";
import { images } from "../data/images";
import { business } from "../data/business";
import { EASE_CINEMA } from "../lib/motion";
import { lockScroll, unlockScroll } from "../lib/scroll";

interface Props {
  onReveal: () => void;
  onDone: () => void;
}

interface PhotoTile {
  front: string;
  back: string;
  layoutId?: string;
}

type IntroPhase =
  | "VIDEO_INTRO"
  | "PHOTO_WALL"
  | "WALL_CLEARANCE"
  | "LOGO_REVEAL"
  | "LOGO_TO_HERO"
  | "COMPLETE";

const CLIPS = [
  { src: "/videos/intro-1.mp4" },
  { src: "/videos/intro-2.mp4" },
  { src: "/videos/intro-3.mp4" },
  { src: "/videos/intro-4.mp4" },
];

// Only genuine local Cafe In photographs. menu-1/menu-2 and logo artwork are excluded.
const PHOTO_SET = [
  images.lantern.src,
  images.burger.src,
  images.greekSalad.src,
  images.diningRoom.src,
  images.mushroomSpaghetti.src,
  images.pistachioLatte.src,
  images.muralWall.src,
  images.icedAmericano.src,
  "/images/optimized/Screenshot_20260812_103550.webp",
  "/images/optimized/Screenshot_20260830_180733.webp",
  images.diningRoom.src,
  "/images/optimized/Screenshot_20260830_180741.webp",
  "/images/optimized/IMG_20260805_230254.webp",
  images.muralWall.src,
  "/images/optimized/Screenshot_20260830_180745.webp",
  "/images/optimized/IMG-20260804-WA0026(1).webp",
  images.buddha.src,
];

const TILES: PhotoTile[] = Array.from({ length: 9 }, (_, index) => ({
  front: PHOTO_SET[index],
  back: PHOTO_SET[index + 9],
  layoutId:
    index === 0
      ? "photo-lantern"
      : index === 3
        ? "photo-dining"
        : index === 6
          ? "photo-mural"
          : undefined,
}));

const ENTRY = [
  [-80, -45],
  [0, -100],
  [90, -48],
  [-100, 0],
  [0, 100],
  [100, 4],
  [-82, 55],
  [-8, 100],
  [85, 52],
];
const TILT = [-2.4, 1.8, -1.3, 1.2, -0.7, 2.1, -1.8, 1.4, -2.2];
const FLIP_INTERVALS = [448, 366, 295, 242, 195, 153, 124, 100];
const CLEARANCE_SECONDS = 0.42;
const LOGO_HOLD_SECONDS = 0.95;
const VIDEO_LOAD_TIMEOUT_MS = 10_000;
const VIDEO_STALL_TIMEOUT_MS = 7_000;
const NEXT_VIDEO_TIMEOUT_MS = 7_000;

function preloadPhoto(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const timeout = window.setTimeout(() => finish(false), 6_000);
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(loaded);
    };

    image.decoding = "async";
    image.fetchPriority = "low";
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(() => finish(true)).catch(() => finish(false));
      } else {
        finish(true);
      }
    };
    image.onerror = () => finish(false);
    image.src = src;
    if (image.complete && image.naturalWidth > 0) finish(true);
  });
}

export function IntroAnimation({ onReveal, onDone }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<IntroPhase>("VIDEO_INTRO");
  const [visible, setVisible] = useState(true);
  const [skipping, setSkipping] = useState(false);
  const [clipIndex, setClipIndex] = useState(0);
  const [startedClipIndex, setStartedClipIndex] = useState(-1);
  const [hasStartedVideo, setHasStartedVideo] = useState(false);
  const [waitingForClip, setWaitingForClip] = useState<number | null>(null);
  const [stalledClipIndex, setStalledClipIndex] = useState(-1);
  const [tileCount, setTileCount] = useState(3);
  const [flip, setFlip] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const phaseRef = useRef<IntroPhase>("VIDEO_INTRO");
  const activeClipIndex = useRef(0);
  const attemptedPlayIndex = useRef(-1);
  const readyPreloadIndex = useRef(-1);
  const failedPreloads = useRef(new Set<number>());
  const waitingForClipRef = useRef<number | null>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const handoffStarted = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  const transition = useCallback((from: IntroPhase, to: IntroPhase) => {
    if (phaseRef.current !== from) return false;
    phaseRef.current = to;
    setPhase(to);
    return true;
  }, []);

  const skip = useCallback(() => {
    if (handoffStarted.current || phaseRef.current === "COMPLETE") return;
    handoffStarted.current = true;
    setSkipping(true);
    phaseRef.current = "LOGO_TO_HERO";
    setPhase("LOGO_TO_HERO");
    onReveal();
    setVisible(false);
  }, [onReveal]);

  const beginLogoHandoff = useCallback(() => {
    if (handoffStarted.current || !transition("LOGO_REVEAL", "LOGO_TO_HERO"))
      return;
    handoffStarted.current = true;
    onReveal();
    setVisible(false);
  }, [onReveal, transition]);

  const advanceClip = useCallback(
    (index: number, skipFollowingClip = false) => {
      if (
        phaseRef.current !== "VIDEO_INTRO" ||
        activeClipIndex.current !== index
      ) return;

      const nextIndex = index + (skipFollowingClip ? 2 : 1);
      waitingForClipRef.current = null;
      setWaitingForClip(null);
      setStalledClipIndex(-1);
      if (nextIndex < CLIPS.length) {
        activeClipIndex.current = nextIndex;
        attemptedPlayIndex.current = -1;
        setClipIndex(nextIndex);
      } else {
        setTileCount(3);
        setFlip(0);
        transition("VIDEO_INTRO", "PHOTO_WALL");
      }
    },
    [transition],
  );

  const attemptPlayback = useCallback((index: number, video: HTMLVideoElement) => {
    if (
      phaseRef.current !== "VIDEO_INTRO" ||
      activeClipIndex.current !== index ||
      attemptedPlayIndex.current === index
    ) return;

    attemptedPlayIndex.current = index;
    void video.play().catch(() => advanceClip(index));
  }, [advanceClip]);

  const markPreloadReady = useCallback((index: number) => {
    readyPreloadIndex.current = index;
    if (waitingForClipRef.current === index) advanceClip(index - 1);
  }, [advanceClip]);

  const handlePreloadError = useCallback((index: number) => {
    failedPreloads.current.add(index);
    if (waitingForClipRef.current === index) advanceClip(index - 1, true);
  }, [advanceClip]);

  useEffect(() => {
    const video = activeVideoRef.current;
    if (
      phase === "VIDEO_INTRO" &&
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      attemptPlayback(clipIndex, video);
    }
  }, [attemptPlayback, clipIndex, phase]);

  useEffect(() => {
    lockScroll();
    return unlockScroll;
  }, []);

  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    if (reduce) {
      const timer = window.setTimeout(skip, 0);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("keydown", onKey);
      };
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [reduce, skip]);

  useEffect(() => {
    if (phase !== "VIDEO_INTRO" || reduce || startedClipIndex === clipIndex) return;
    const currentIndex = clipIndex;
    const timeout = window.setTimeout(
      () => advanceClip(currentIndex),
      VIDEO_LOAD_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [advanceClip, clipIndex, phase, reduce, startedClipIndex]);

  useEffect(() => {
    if (phase !== "VIDEO_INTRO" || reduce || stalledClipIndex !== clipIndex) return;
    const currentIndex = clipIndex;
    const timeout = window.setTimeout(
      () => advanceClip(currentIndex),
      VIDEO_STALL_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [advanceClip, clipIndex, phase, reduce, stalledClipIndex]);

  useEffect(() => {
    if (phase !== "VIDEO_INTRO" || reduce || waitingForClip === null) return;
    const targetIndex = waitingForClip;
    const timeout = window.setTimeout(() => {
      const previousIndex = targetIndex - 1;
      if (activeClipIndex.current === previousIndex) {
        advanceClip(previousIndex, true);
      }
    }, NEXT_VIDEO_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [advanceClip, phase, reduce, waitingForClip]);

  useEffect(() => {
    if (!hasStartedVideo) return;
    let cancelled = false;
    let cursor = 0;
    let timer = 0;
    const photos = [...new Set(PHOTO_SET)];

    const loadBatch = async () => {
      const batch = photos.slice(cursor, cursor + 2);
      cursor += batch.length;
      const results = await Promise.all(batch.map(preloadPhoto));
      if (cancelled) return;

      const failedPhotos = batch.filter((_, index) => !results[index]);
      if (failedPhotos.length) {
        setFailed((current) => new Set([...current, ...failedPhotos]));
      }
      if (cursor < photos.length) timer = window.setTimeout(loadBatch, 100);
    };

    void loadBatch();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasStartedVideo]);

  useEffect(() => {
    if (phase !== "PHOTO_WALL" || reduce) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setTileCount(6), 220));
    timers.push(window.setTimeout(() => setTileCount(9), 470));
    let round = 0;
    let timer = 0;
    const flipNext = () => {
      timer = window.setTimeout(() => {
        round += 1;
        setFlip(round);
        if (round < FLIP_INTERVALS.length) {
          timer = window.setTimeout(flipNext, FLIP_INTERVALS[round]);
        }
      }, FLIP_INTERVALS[round]);
    };
    timers.push(window.setTimeout(flipNext, 690));
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(timer);
    };
  }, [phase, reduce]);

  useEffect(() => {
    if (phase !== "LOGO_REVEAL") return;
    const timer = window.setTimeout(beginLogoHandoff, LOGO_HOLD_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [beginLogoHandoff, phase]);

  const complete = () => {
    if (phaseRef.current !== "LOGO_TO_HERO") return;
    phaseRef.current = "COMPLETE";
    setPhase("COMPLETE");
    onDone();
  };

  return (
    <AnimatePresence onExitComplete={complete}>
      {visible && (
        <motion.div
          className="cafe-intro fixed inset-0 z-[80] isolate overflow-hidden bg-espresso text-ivory"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: skipping ? 0.12 : 0.85, ease: EASE_CINEMA }}
          role="region"
          aria-label="Cafe In cinematic introduction"
        >
          <AnimatePresence mode="wait" initial={false}>
            {phase === "VIDEO_INTRO" && !reduce && (
              <motion.div
                key="video-intro"
                className="cafe-film-stage absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE_CINEMA }}
              >
                <AnimatePresence initial={false}>
                  {(startedClipIndex === clipIndex && clipIndex < CLIPS.length - 1
                    ? [clipIndex, clipIndex + 1]
                    : [clipIndex]
                  ).map((index) => {
                    const active = index === clipIndex;
                    return (
                      <motion.video
                        key={index}
                        ref={(video) => {
                          if (active) activeVideoRef.current = video;
                          else if (activeVideoRef.current === video) activeVideoRef.current = null;
                        }}
                        data-intro-clip={index}
                        className={active ? "cafe-film-video" : "cafe-film-video cafe-film-preload"}
                        src={CLIPS[index].src}
                        muted
                        playsInline
                        preload="auto"
                        onLoadedData={(event) => {
                          if (active) attemptPlayback(index, event.currentTarget);
                        }}
                        onCanPlay={(event) => {
                          if (active) attemptPlayback(index, event.currentTarget);
                          else markPreloadReady(index);
                        }}
                        onPlaying={() => {
                          if (!active || activeClipIndex.current !== index) return;
                          setStartedClipIndex(index);
                          setHasStartedVideo(true);
                          setStalledClipIndex(-1);
                        }}
                        onWaiting={() => {
                          if (active && startedClipIndex === index) setStalledClipIndex(index);
                        }}
                        onEnded={() => {
                          if (!active || activeClipIndex.current !== index) return;
                          const nextIndex = index + 1;
                          if (nextIndex >= CLIPS.length) {
                            advanceClip(index);
                          } else if (readyPreloadIndex.current === nextIndex) {
                            advanceClip(index);
                          } else if (failedPreloads.current.has(nextIndex)) {
                            advanceClip(index, true);
                          } else {
                            waitingForClipRef.current = nextIndex;
                            setWaitingForClip(nextIndex);
                          }
                        }}
                        onError={() => {
                          if (active) advanceClip(index);
                          else handlePreloadError(index);
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: active ? 1 : 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: EASE_CINEMA }}
                        aria-hidden="true"
                      />
                    );
                  })}
                </AnimatePresence>
                <div className="cafe-film-grade pointer-events-none absolute inset-0" />
              </motion.div>
            )}

            {(phase === "PHOTO_WALL" || phase === "WALL_CLEARANCE") &&
              !reduce && (
                <motion.div
                  key="photo-wall"
                  className="cafe-photo-wall absolute inset-0"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={
                    phase === "WALL_CLEARANCE"
                      ? { opacity: 0, scale: 0.96 }
                      : { opacity: 1, scale: 1 }
                  }
                  transition={{
                    duration:
                      phase === "WALL_CLEARANCE" ? CLEARANCE_SECONDS : 0.41,
                    ease: EASE_CINEMA,
                  }}
                  onAnimationComplete={() => {
                    if (phaseRef.current === "WALL_CLEARANCE")
                      transition("WALL_CLEARANCE", "LOGO_REVEAL");
                  }}
                  aria-hidden="true"
                >
                  {TILES.slice(0, tileCount).map((tile, index) => {
                    const axis = index % 3 === 1 ? "rotateX" : "rotateY";
                    const faceAngle = flip % 2 ? 180 : 0;
                    const [fromX, fromY] = ENTRY[index];
                    return (
                      <motion.figure
                        key={tile.front}
                        layoutId={tile.layoutId}
                        className="cafe-photo-tile"
                        style={{ zIndex: index + 1 }}
                        initial={{
                          opacity: 0,
                          x: fromX,
                          y: fromY,
                          scale: 0.72,
                          rotate: TILT[index] * 2,
                        }}
                        animate={
                          phase === "WALL_CLEARANCE"
                            ? { opacity: 0, x: 0, y: 0, scale: 0.94, rotate: 0 }
                            : {
                                opacity: 1,
                                x: 0,
                                y: 0,
                                scale: [
                                  1.02 + (index % 3) * 0.02,
                                  1.06 + (index % 3) * 0.02,
                                  1.03 + (index % 3) * 0.02,
                                ],
                                rotate: [
                                  TILT[index],
                                  TILT[index] + (index % 2 ? 0.5 : -0.5),
                                  TILT[index],
                                ],
                              }
                        }
                        transition={
                          phase === "WALL_CLEARANCE"
                            ? { duration: CLEARANCE_SECONDS, ease: EASE_CINEMA }
                            : {
                                duration: 0.69,
                                delay: index * 0.045,
                                ease: EASE_CINEMA,
                                repeat: Infinity,
                                repeatType: "mirror",
                              }
                        }
                      >
                        <motion.div
                          className="cafe-photo-tile-flipper"
                          animate={{ [axis]: faceAngle }}
                          transition={{
                            duration:
                              FLIP_INTERVALS[
                                Math.min(flip, FLIP_INTERVALS.length - 1)
                              ] / 1000,
                            delay: index * 0.012,
                            ease: EASE_CINEMA,
                          }}
                          onAnimationComplete={() => {
                            if (
                              index === 0 &&
                              flip === FLIP_INTERVALS.length &&
                              phaseRef.current === "PHOTO_WALL"
                            ) {
                              transition("PHOTO_WALL", "WALL_CLEARANCE");
                            }
                          }}
                        >
                          <div className="cafe-photo-tile-face">
                            {!failed.has(tile.front) && (
                              <img
                                src={tile.front}
                                alt=""
                                decoding="async"
                                loading="eager"
                                fetchPriority={index === 0 ? "high" : "low"}
                                onError={() =>
                                  setFailed((current) =>
                                    new Set(current).add(tile.front),
                                  )
                                }
                              />
                            )}
                          </div>
                          <div
                            className="cafe-photo-tile-face cafe-photo-tile-back"
                            style={{
                              transform:
                                axis === "rotateX"
                                  ? "rotateX(180deg)"
                                  : "rotateY(180deg)",
                            }}
                          >
                            {!failed.has(tile.back) && (
                              <img
                                src={tile.back}
                                alt=""
                                decoding="async"
                                loading="eager"
                                fetchPriority="low"
                                onError={() =>
                                  setFailed((current) =>
                                    new Set(current).add(tile.back),
                                  )
                                }
                              />
                            )}
                          </div>
                        </motion.div>
                      </motion.figure>
                    );
                  })}
                </motion.div>
              )}

            {phase === "LOGO_REVEAL" && !reduce && (
              <motion.div
                key="logo-reveal"
                className="cafe-logo-stage absolute inset-0 z-40 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE_CINEMA }}
              >
                <motion.div
                  className="w-[clamp(210px,54vw,360px)]"
                  initial={{ opacity: 0, scale: 0.68, filter: "blur(12px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.65, ease: EASE_CINEMA }}
                >
                  <LogoMedallion play layoutId="cafe-in-logo" />
                  <p className="label mt-5 text-center text-ivory-2">
                    {business.tagline}
                  </p>
                </motion.div>
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 bg-[#fff4df]"
                  initial={{ opacity: 0.38 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "linear" }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="cafe-intro-vignette pointer-events-none absolute inset-0" />
          <button
            ref={skipRef}
            type="button"
            onClick={skip}
            className="label absolute right-5 bottom-6 z-[60] inline-flex min-h-11 items-center rounded-full border border-ivory/35 bg-espresso/55 px-5 text-ivory transition-colors hover:border-ivory sm:top-6 sm:bottom-auto"
          >
            Skip Intro{" "}
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
