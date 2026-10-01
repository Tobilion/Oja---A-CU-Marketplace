// src/data/heroAvatars.ts
export interface HeroAvatar {
  id: string;
  src: string;
  alt: string;
  chip?: string;
  scale: number;
  orbitSeconds: number; // one locked speed per depth lane, so a lane's
  depth: 1 | 2 | 3;    // formation holds forever instead of lapping into piles
}

export const heroAvatars: HeroAvatar[] = [
  { id: "baker",    src: "/avatars/baker.webp",    alt: "Baker with a cake box",       chip: "Ready in 1 day",   scale: 1.0,  orbitSeconds: 40, depth: 3 },
  { id: "laptop",   src: "/avatars/laptop.webp",   alt: "Laptop seller",               chip: "Pay on delivery",  scale: 0.9,  orbitSeconds: 48, depth: 2 },
  { id: "thrift",   src: "/avatars/thrift.webp",   alt: "Thrift seller with a hanger", chip: "Hall discount",    scale: 1.0,  orbitSeconds: 40, depth: 3 },
  { id: "tutor",    src: "/avatars/tutor.webp",    alt: "Tutor with a textbook",       chip: "4.9 rating",       scale: 1.05, orbitSeconds: 48, depth: 2 },
  { id: "verified", src: "/avatars/verified.webp", alt: "Verified seller",             chip: "Verified seller",  scale: 1.1,  orbitSeconds: 40, depth: 3 },
  { id: "delivery", src: "/avatars/delivery.webp", alt: "Delivery agent",              chip: "On the way",       scale: 0.95, orbitSeconds: 48, depth: 2 },
  { id: "beauty",   src: "/avatars/beauty.webp",   alt: "Beauty and nails",            chip: "Book a slot",      scale: 1.15, orbitSeconds: 56, depth: 1 },
  { id: "designer", src: "/avatars/designer.webp", alt: "Designer with a tablet",      chip: "Print & design",   scale: 1.0,  orbitSeconds: 56, depth: 1 },
  { id: "hostel",   src: "/avatars/hostel.webp",   alt: "Hostel essentials seller",    chip: "Hostel picks",     scale: 1.0,  orbitSeconds: 48, depth: 2 },
  { id: "gadgets",  src: "/avatars/gadgets.webp",  alt: "Gadget seller",               chip: "In stock",         scale: 1.0,  orbitSeconds: 56, depth: 1 },
  { id: "fashion",  src: "/avatars/fashion.webp",  alt: "Fashion seller in a gele",    chip: "New in",           scale: 0.95, orbitSeconds: 48, depth: 2 },
  { id: "laundry",  src: "/avatars/laundry.webp",  alt: "Laundry service",             chip: "Pickup today",     scale: 1.1,  orbitSeconds: 56, depth: 1 },
  // Asset on disk is Wink.webp (capital W). Linux builds are case-sensitive,
  // so the src keeps the exact filename. Do not rename the public file.
  { id: "wink",     src: "/avatars/Wink.webp",     alt: "Campus favourite seller",     chip: "Campus favourite", scale: 0.7,  orbitSeconds: 40, depth: 3 },
];

// Lane speeds: inner ring fastest, outer slowest, so lanes drift past each
// other and the composition never looks frozen. Depth 3: 40s, depth 2: 48s,
// depth 1: 56s. Changed from varied per-avatar speeds because avatars on one
// shared ellipse lapped each other and piled up within minutes.

// Tablet orbit drops these three first, per the hero brief.
export const tabletDroppedIds = ["gadgets", "designer", "hostel"];

export function avatarById(id: string): HeroAvatar | undefined {
  return heroAvatars.find((a) => a.id === id);
}
