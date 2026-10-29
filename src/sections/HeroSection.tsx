import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, type MouseEvent, type PointerEvent } from "react";
import { business } from "../data/business";
import { RevealText } from "../components/RevealText";
import { LogoMedallion } from "../components/LogoMedallion";
import { EmberBackground } from "../components/EmberBackground";
import { useLowPower } from "../hooks/useMediaQuery";
import { EASE_CINEMA, EASE_OUT } from "../lib/motion";
import { scrollToId } from "../lib/scroll";
import { useIntro } from "../lib/intro";

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const lowPower = useLowPower();
  const { ready } = useIntro();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yTall = useTransform(scrollYProgress, [0, 1], [0, lowPower ? 0 : -28]);
  const yWide = useTransform(scrollYProgress, [0, 1], [0, lowPower ? 0 : 18]);
  const yText = useTransform(scrollYProgress, [0, 1], [0, lowPower ? 0 : 10]);
  const pointerX = useSpring(useMotionValue(0), {
    stiffness: 90,
    damping: 24,
    mass: 0.35,
  });
  const pointerY = useSpring(useMotionValue(0), {
    stiffness: 90,
    damping: 24,
    mass: 0.35,
  });
  const mainScale = useTransform(
    scrollYProgress,
    [0, 1],
    [reduceMotion ? 1 : lowPower ? 1.015 : 1.035, 1],
  );
  const supportingX = useTransform(pointerX, (value) => -value * 0.7);
  const supportingY = useTransform(pointerY, (value) => -value * 0.7);

  const moveImages = (event: PointerEvent<HTMLDivElement>) => {
    if (lowPower || reduceMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 6);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 6);
  };

  const resetImages = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const go = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToId(id);
  };

  const [line1, line2] = business.hero.headline;

  return (
    <section
      id="top"
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-espresso text-ivory lg:flex lg:min-h-[100svh] lg:items-center"
    >
      <picture aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
        <source
          media="(max-width: 767px)"
          srcSet="/images/interior-lantern-pendant.webp"
        />
        <img
          src="/images/lantern.jpeg"
          alt=""
          width={4096}
          height={1864}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[58%_center]"
        />
      </picture>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 76% 42%,rgba(126,72,37,0.16),transparent 47%),linear-gradient(90deg,rgba(18,12,9,0.88) 0%,rgba(22,14,10,0.78) 50%,rgba(20,13,9,0.68) 100%)" /* taste-skill-ignore: atmospheric espresso grading preserves headline contrast over the real cafe photograph. */,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_22%,rgba(12,8,6,0.38)_100%)]"
      />
      <EmberBackground />

      <svg aria-hidden="true" className="pointer-events-none absolute top-7 left-7 z-10 hidden h-[92px] w-[88px] text-[#b99355]/80 lg:block" viewBox="0 0 88 92" fill="none">
        <path d="M87 1H1V91" stroke="currentColor" strokeWidth="1" />
      </svg>
      <svg aria-hidden="true" className="pointer-events-none absolute right-7 bottom-7 z-10 hidden h-[92px] w-[88px] rotate-180 text-[#b99355]/80 lg:block" viewBox="0 0 88 92" fill="none">
        <path d="M87 1H1V91" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="container-x relative z-10 grid w-full items-center gap-10 pt-28 pb-16 sm:gap-12 sm:pt-32 lg:grid-cols-12 lg:gap-10 lg:pt-44 lg:pb-12">
        <motion.div
          style={{ y: yText }}
          className="relative z-10 mx-auto w-full max-w-[560px] lg:col-span-6 lg:mx-0"
        >
          <div className="mb-5 flex flex-col items-center gap-6 sm:mb-7 lg:mb-8 lg:items-center lg:gap-7">
            <div className="w-[88px] shrink-0 sm:w-[104px] lg:w-[118px]">
              {ready && (
                <LogoMedallion play delay={0} layoutId="cafe-in-logo" />
              )}
            </div>
            <motion.p
              className="label flex items-center justify-center gap-3 text-center text-[#e0bb79] sm:text-[0.78rem]"
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={
                reduceMotion
                  ? undefined
                  : ready
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: -8 }
              }
              transition={{
                duration: 0.45,
                ease: EASE_OUT,
                delay: reduceMotion ? 0 : 0.08,
              }}
            >
              <>
                <span aria-hidden="true" className="text-xl leading-none text-[#c69a54]">—</span>
                {business.hero.eyebrow}
              </>
            </motion.p>
          </div>

          <h1
            id="hero-title"
            className="display text-balance max-w-[10ch] text-[clamp(2.55rem,10.2vw,4.2rem)] text-ivory sm:text-[clamp(3.5rem,8vw,5.8rem)] lg:max-w-[11ch] lg:text-[clamp(4rem,6.1vw,6.8rem)]"
          >
            <RevealText
              text={line1}
              play={ready}
              delay={0.08}
              stagger={0.05}
              className="block"
            />
            <RevealText
              text={line2}
              play={ready}
              delay={0.16}
              stagger={0.05}
              className="block"
              wordClassName="italic text-ivory"
            />
          </h1>

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : ready ? "show" : "hidden"}
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.16, delayChildren: 0.62 },
              },
            }}
          >
            <motion.p
              className="mt-5 max-w-[52ch] text-base leading-relaxed text-ivory-2 sm:mt-6 sm:text-lg lg:text-[1.15rem] lg:leading-[1.65]"
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.45, ease: EASE_OUT },
                },
              }}
            >
              {business.hero.copy}
            </motion.p>
            <motion.div
              className="mt-6 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:gap-4"
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.45, ease: EASE_OUT },
                },
              }}
            >
              <a
                href="?view=menu"
                onClick={(event) => {
                  event.preventDefault();
                  window.history.pushState({}, "", "?view=menu");
                  window.dispatchEvent(new Event("popstate"));
                }}
                className="btn btn-primary group min-h-14 bg-[#d7ad6b] px-7 text-espresso before:bg-[#e8c17f] hover:text-espresso focus-visible:text-espresso sm:min-h-16"
              >
                Explore Our Menu
                <span
                  aria-hidden="true"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </a>
              <a href="#visit" onClick={go("visit")} className="btn btn-ghost">
                Find Us
              </a>
            </motion.div>
            <motion.p
              className="mt-5 font-['Caveat',cursive] text-[1.8rem] leading-none text-[#e7d7bd] sm:text-[2rem]"
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.45, ease: EASE_OUT },
                },
              }}
            >
              {business.motto}
            </motion.p>
          </motion.div>
        </motion.div>

        <div
          onPointerMove={moveImages}
          onPointerLeave={resetImages}
          className="relative mx-auto w-full max-w-[620px] lg:-translate-y-4 lg:col-span-6 lg:h-[min(690px,76svh)] lg:max-w-none"
        >
          <motion.figure
            layoutId={ready ? "photo-dining" : undefined}
            style={{ y: yTall }}
            className="relative aspect-[1.22/1] w-full overflow-hidden rounded-t-[47%] rounded-b-sm bg-mocha shadow-[0_35px_90px_-44px_rgba(0,0,0,0.85)] ring-1 ring-[#c59a62]/55 lg:absolute lg:top-0 lg:right-0 lg:h-[91%] lg:w-[88%] lg:aspect-auto"
          >
            <motion.div
              className="h-full w-full overflow-hidden rounded-t-[47%] rounded-b-sm"
              initial={
                reduceMotion
                  ? false
                  : { clipPath: "inset(0 0 100% 0 round 260px 260px 2px 2px)", opacity: 0.92 }
              }
              animate={
                reduceMotion
                  ? undefined
                  : ready
                    ? { clipPath: "inset(0 0 0% 0 round 260px 260px 2px 2px)", opacity: 1 }
                    : { clipPath: "inset(0 0 100% 0 round 260px 260px 2px 2px)", opacity: 0.92 }
              }
              transition={{
                duration: 0.95,
                ease: EASE_CINEMA,
                delay: reduceMotion ? 0 : 0.08,
              }}
            >
              <motion.img
                src="/images/sitiing.jpeg"
                alt="Cafe In's dining room, with its botanical mural, pendant lights, wooden tables and emerald chairs"
                width={4096}
                height={1864}
                fetchPriority="high"
                decoding="async"
                className="frame-img"
                style={{
                  x: pointerX,
                  y: pointerY,
                  scale: mainScale,
                  objectPosition: "48% 54%",
                }}
              />
            </motion.div>
          </motion.figure>

          <motion.figure
            layoutId={ready ? "photo-lantern" : undefined}
            style={{ y: yWide }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={
              reduceMotion ? undefined : ready ? { opacity: 1 } : { opacity: 0 }
            }
            whileHover={reduceMotion || lowPower ? undefined : { scale: 1.02 }}
            transition={{
              duration: 0.7,
              ease: EASE_OUT,
              delay: reduceMotion ? 0 : 0.2,
            }}
            className="absolute right-0 bottom-[4%] z-10 w-[31%] max-w-[190px] rounded-sm bg-mocha p-[3px] shadow-[0_24px_55px_-26px_rgba(0,0,0,0.9)] ring-1 ring-[#d0a960]/80 lg:right-[1%] lg:bottom-[3%] lg:left-auto lg:w-[32%]"
          >
            <motion.div
              className="aspect-[3/4] overflow-hidden rounded-sm"
              initial={reduceMotion ? false : { y: 14 }}
              animate={reduceMotion ? undefined : ready ? { y: 0 } : { y: 14 }}
              transition={{
                duration: 0.7,
                ease: EASE_OUT,
                delay: reduceMotion ? 0 : 0.2,
              }}
            >
              <motion.img
                src="/images/interior-lantern-pendant.webp"
                alt="Close view of a glowing geometric pendant lantern at Cafe In"
                width={453}
                height={707}
                loading="lazy"
                decoding="async"
                className="frame-img"
                style={{
                  x: supportingX,
                  y: supportingY,
                  objectPosition: "48% 48%",
                }}
              />
            </motion.div>
            <motion.figcaption
              className="label mt-3 ml-auto w-max whitespace-nowrap text-right text-[0.7rem] tracking-[0.12em] text-[#f1d39a]"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={
                reduceMotion
                  ? undefined
                  : ready
                    ? { opacity: 1 }
                    : { opacity: 0 }
              }
              transition={{ delay: reduceMotion ? 0 : 0.45, duration: 0.4 }}
            >
              Inside Cafe In
            </motion.figcaption>
          </motion.figure>
        </div>
      </div>

      <motion.a
        href="#specials"
        onClick={go("specials")}
        className="label absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-3 text-[#e0c69a] transition-colors hover:text-ivory focus-visible:text-ivory lg:flex"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={
          reduceMotion ? undefined : ready ? { opacity: 1 } : { opacity: 0 }
        }
        transition={{ delay: reduceMotion ? 0 : 0.45, duration: 0.4 }}
      >
        Scroll
        <motion.span
          aria-hidden="true"
          className="block h-12 w-px origin-top bg-[#c49a58]/75"
          initial={reduceMotion ? false : { scaleY: 0 }}
          animate={reduceMotion ? undefined : ready ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.45 }}
        />
      </motion.a>
    </section>
  );
}
