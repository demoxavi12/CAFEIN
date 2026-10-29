import { motion, useReducedMotion } from "motion/react";
import { SectionHeading } from "../components/SectionHeading";
import { MenuDishCard } from "../digital-menu/MenuDishCard";
import { useLiveMenu } from "../digital-menu/adminStore";
import type { MenuItem } from "../data/menu";
import { EASE_OUT } from "../lib/motion";

interface Props {
  onSelect: (item: MenuItem) => void;
}

const featuredMenuIds = [
  "biscoff-cheesecake",
  "alfredo-penne",
  "pistachio-latte",
  "vietnamese-iced-coffee",
  "burger-aloo-tikki",
  "greek-salad",
];

export function MenuSection({ onSelect }: Props) {
  const { items, loading, error } = useLiveMenu();
  const reduceMotion = useReducedMotion();
  const featuredItems = featuredMenuIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item) => item !== undefined);

  return (
    <section
      id="menu"
      aria-labelledby="menu-title"
      className="relative bg-espresso py-20 sm:py-28 lg:py-36"
    >
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <SectionHeading
            id="menu-title"
            eyebrow="The Menu"
            title="Poured, pressed"
            italic="& plated."
            className="lg:col-span-7"
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:mt-14 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {loading ? (
            <p role="status" className="col-span-full py-8 text-center text-sm text-ivory/55">Loading the current menu…</p>
          ) : error ? (
            <p role="alert" className="col-span-full py-8 text-center text-sm text-ivory/55">The menu is temporarily unavailable.</p>
          ) : featuredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                ease: EASE_OUT,
                delay: reduceMotion ? 0 : (index % 3) * 0.06,
              }}
              className="min-w-0"
            >
              <MenuDishCard
                item={item}
                quantityInTray={0}
                onSelect={onSelect}
                onAdd={() => undefined}
                onRemove={() => undefined}
                showTrayActions={false}
              />
            </motion.div>
          ))}
        </div>

        <div className="mt-9 flex justify-center sm:mt-12">
          <a
            href="/menu"
            className="btn btn-ghost group min-h-12 px-5 text-[0.72rem] sm:text-[0.78rem]"
          >
            Explore the full menu
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </a>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ivory/15 pt-5 text-xs leading-relaxed text-ivory/60 sm:flex-row sm:justify-between"></div>
      </div>
    </section>
  );
}
