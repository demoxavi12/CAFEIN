/**
 * Configurable business information.
 *
 * Anything set to `null` has NOT been supplied/verified yet. The UI hides it or
 * shows a clearly-labelled placeholder. Never fill these with guesses.
 */
export interface OpeningHours {
  days: string;
  hours: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface BusinessInfo {
  name: string;
  tagline: string;
  motto: string;
  hero: { eyebrow: string; headline: [string, string]; copy: string };
  address: string | null;
  /** e.g. "https://maps.google.com/?q=..." — official link from the café */
  directionsUrl: string | null;
  /** Google Maps embed src (https://www.google.com/maps/embed?pb=...) */
  mapEmbedUrl: string | null;
  phone: string | null;
  email: string | null;
  hours: OpeningHours[] | null;
  socials: SocialLink[];
}

export const business: BusinessInfo = {
  name: "Cafe In",
  // From the supplied logo
  tagline: "Coffee • Vibes • Memories",
  motto: "Brew it. Love it. Live it!",
  hero: {
    eyebrow: "Coffee • Vibes • Memories",
    // Provisional hero copy — edit freely
    headline: ["Your moment.", "Your coffee."],
    copy: "Lantern light, emerald velvet and a menu poured with care — from the first espresso to the last slice of cheesecake.",
  },
  address: "Near ICICI Bank, Nabarangpur, Odisha 764059",
  mapEmbedUrl:
    "https://maps.google.com/maps?q=19.2197471,82.5474848&z=18&output=embed",

  directionsUrl:
    "https://www.google.com/maps/place/Cafein/@19.2200316,82.5466146,197m/data=!3m1!1e3!4m14!1m7!3m6!1s0x3a3ab99a6b9a9057:0xda492166d46e1e29!2sCafein!8m2!3d19.2197471!4d82.5474848!16s%2Fg%2F11zcxnknrd!3m5!1s0x3a3ab99a6b9a9057:0xda492166d46e1e29!8m2!3d19.2197471!4d82.5474848!16s%2Fg%2F11zcxnknrd?hl=en-US&entry=ttu",
  phone: "+91 824 962 6400",
  email: null,
  hours: [{ days: "Opening time", hours: "9:00 AM onwards" }],
  socials: [],
};
