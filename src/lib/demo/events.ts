import {
  COVER_PALETTES,
  DEFAULT_TIMEZONE,
  type ContactKind,
  type EventCategory,
} from "@/lib/constants";
import type { EventDetail, EventSummary } from "@/lib/types/domain";
import { toInstant, todayKey } from "@/lib/utils/format";

/**
 * Read-only sample content shown when Supabase is not configured.
 * Nothing here is persisted: writes are disabled in preview mode.
 */

export const DEMO_ORGANISER_ID = "0b1ee000-0000-4000-8000-000000000001";
export const DEMO_ORGANISER_NAME = "Oblee Events";

interface Seed {
  title: string;
  category: EventCategory;
  venue: string;
  city: string;
  offset: number;
  time: string;
  description: string;
  tags?: string[];
  palette: number;
  tickets?: Array<[string, number]>;
  tables?: Array<[number, number]>;
  featured?: boolean;
}

const SEEDS: Seed[] = [
  {
    title: "Afro Vibes Night",
    category: "concert",
    venue: "Lekki",
    city: "Lagos",
    offset: 3,
    time: "19:00",
    description: "Live afro music, great drinks and a dance floor that stays full until late.",
    tags: ["afrobeats", "live music"],
    palette: 0,
    tickets: [["Regular", 20000], ["VIP", 45000]],
    tables: [[4, 10], [6, 4]],
    featured: true,
  },
  {
    title: "Beach House Party",
    category: "festival",
    venue: "Ikoyi",
    city: "Lagos",
    offset: 10,
    time: "16:00",
    description: "Sun, sand and sound systems on a private beach with food stalls and games.",
    palette: 1,
    featured: true,
  },
  {
    title: "Lagos Music Fest",
    category: "festival",
    venue: "Victoria Island",
    city: "Lagos",
    offset: 16,
    time: "18:00",
    description: "A full evening of live sets from the city’s best artists across two stages.",
    palette: 2,
    tickets: [["Regular", 35000], ["VIP", 80000], ["VVIP", 150000]],
    tables: [[6, 12]],
    featured: true,
  },
  {
    title: "Sunset Brunch",
    category: "food",
    venue: "Ikoyi",
    city: "Lagos",
    offset: 1,
    time: "12:00",
    description: "Bottomless brunch, amapiano and a sunset terrace with a view.",
    tags: ["brunch", "amapiano"],
    palette: 3,
    tickets: [["Regular", 15000]],
    tables: [[4, 8]],
    featured: true,
  },
  {
    title: "Founders Mixer",
    category: "network",
    venue: "Yaba",
    city: "Lagos",
    offset: 2,
    time: "18:30",
    description: "Meet builders, designers and investors over drinks. Come with a pitch ready.",
    palette: 4,
  },
  {
    title: "Detty Rave",
    category: "music",
    venue: "Lekki",
    city: "Lagos",
    offset: 0,
    time: "21:00",
    description: "Three DJs, one beach and no early exits. Afro house until sunrise.",
    tags: ["rave", "afro house"],
    palette: 0,
    featured: true,
  },
  {
    title: "Lagos Fashion Night",
    category: "fashion_show",
    venue: "Victoria Island",
    city: "Lagos",
    offset: 5,
    time: "19:30",
    description: "A runway show with ten Nigerian designers, live styling and an after-party.",
    palette: 3,
    tickets: [["Regular", 25000], ["VIP", 60000]],
    tables: [[6, 8]],
  },
  {
    title: "Growth Marketing Webinar",
    category: "webinar",
    venue: "Co-Creation Hub, Yaba",
    city: "Lagos",
    offset: 4,
    time: "16:00",
    description: "A live webinar on growing a brand online, with an in-person watch party.",
    palette: 2,
  },
  {
    title: "Okoo Carnival Night",
    category: "carnival",
    venue: "Bodija",
    city: "Ibadan",
    offset: 9,
    time: "16:00",
    description: "Masquerades, street food and live bands across the grounds.",
    palette: 1,
  },
  {
    title: "Owambe Saturday",
    category: "owambe",
    venue: "Ikeja",
    city: "Lagos",
    offset: 6,
    time: "14:00",
    description: "Aso ebi, live band, talking drums and plenty of jollof. Come dressed to shine.",
    palette: 3,
    tickets: [["Regular", 30000], ["VIP", 70000], ["VVIP", 120000]],
    tables: [[10, 6]],
    featured: true,
  },
  {
    title: "Lagos Trade Expo",
    category: "trade_show",
    venue: "Landmark Centre, Victoria Island",
    city: "Lagos",
    offset: 12,
    time: "10:00",
    description: "Meet over 80 exhibitors, from fashion to food to tech, and pick up deals on the day.",
    palette: 4,
  },
  {
    title: "Highlife Night",
    category: "concert",
    venue: "Surulere",
    city: "Lagos",
    offset: 7,
    time: "20:00",
    description: "Classic highlife from a ten-piece band, with palm wine at the bar.",
    palette: 0,
  },
  {
    title: "Street Food Fiesta",
    category: "food",
    venue: "Lekki",
    city: "Lagos",
    offset: 8,
    time: "12:00",
    description: "Forty food stalls, live cooking and a suya contest.",
    palette: 3,
  },
  {
    title: "Abuja Jazz Evening",
    category: "concert",
    venue: "Maitama",
    city: "Abuja",
    offset: 10,
    time: "19:00",
    description: "Smooth jazz under the stars in the garden of a boutique hotel.",
    palette: 2,
    tickets: [["Regular", 18000], ["VIP", 40000]],
    tables: [[4, 10]],
  },
  {
    title: "Fashion Week Preview",
    category: "fashion_show",
    venue: "Ikoyi",
    city: "Lagos",
    offset: 11,
    time: "18:00",
    description: "A first look at next season from emerging Nigerian designers.",
    palette: 3,
  },
  {
    title: "Startup Pitch Webinar",
    category: "webinar",
    venue: "Eko Hotel, Victoria Island",
    city: "Lagos",
    offset: 13,
    time: "15:00",
    description: "Ten founders pitch live while investors give real-time feedback.",
    palette: 2,
  },
  {
    title: "Owambe Sunday Brunch",
    category: "owambe",
    venue: "GRA",
    city: "Port Harcourt",
    offset: 14,
    time: "13:00",
    description: "A relaxed owambe with live music, small chops and dancing.",
    palette: 1,
    tickets: [["Regular", 20000], ["VIP", 50000]],
    tables: [[8, 6]],
  },
  {
    title: "Harmattan Beach Festival",
    category: "festival",
    venue: "Elegushi Beach, Lekki",
    city: "Lagos",
    offset: 15,
    time: "15:00",
    description: "A full day of music, beach games and food on the sand.",
    palette: 1,
  },
  {
    title: "Tech Trade Fair",
    category: "trade_show",
    venue: "Ikeja",
    city: "Lagos",
    offset: 17,
    time: "09:00",
    description: "Gadgets, software and local start-ups, with free workshops all day.",
    palette: 4,
  },
  {
    title: "Calabar Carnival Preview",
    category: "carnival",
    venue: "Calabar",
    city: "Cross River",
    offset: 18,
    time: "16:00",
    description: "Costumes, floats and street bands ahead of the big parade.",
    palette: 1,
  },
  {
    title: "Rooftop Sundowner",
    category: "party",
    venue: "Victoria Island",
    city: "Lagos",
    offset: 19,
    time: "17:30",
    description: "Golden hour cocktails and deep house high above the city.",
    palette: 0,
  },
  {
    title: "Women in Business Mixer",
    category: "network",
    venue: "Wuse 2",
    city: "Abuja",
    offset: 20,
    time: "18:00",
    description: "Meet founders, leaders and mentors over drinks and short talks.",
    palette: 4,
  },
  {
    title: "Amapiano All White",
    category: "party",
    venue: "Lekki",
    city: "Lagos",
    offset: 21,
    time: "21:00",
    description: "Dress in white and dance to amapiano until late.",
    palette: 0,
    tickets: [["Regular", 15000], ["VIP", 35000], ["VVIP", 80000]],
    tables: [[6, 10]],
  },
  {
    title: "Afrobeats Live Concert",
    category: "concert",
    venue: "Tafawa Balewa Square",
    city: "Lagos",
    offset: 24,
    time: "18:00",
    description: "Top Afrobeats acts live on one big stage.",
    palette: 2,
    tickets: [["Regular", 25000], ["VIP", 60000], ["VVIP", 150000]],
    tables: [[10, 8]],
  },
  {
    title: "Ibadan Food and Music Fest",
    category: "festival",
    venue: "Bodija",
    city: "Ibadan",
    offset: 26,
    time: "12:00",
    description: "Local dishes, live bands and a craft market in the heart of Ibadan.",
    palette: 3,
  },
];

function addDays(dateKeyValue: string, days: number): string {
  const [year, month, day] = dateKeyValue.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

let cachedKey = "";
let cached: EventDetail[] = [];

export function demoEvents(now: Date = new Date()): EventDetail[] {
  const key = todayKey(DEFAULT_TIMEZONE, now);
  if (key === cachedKey && cached.length) return cached;

  const base = todayKey(DEFAULT_TIMEZONE, now);
  const events = SEEDS.map((seed, index) => {
    const palette = COVER_PALETTES[seed.palette] ?? COVER_PALETTES[0]!;
    const id = `0b1ee000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const startsAt = toInstant(addDays(base, seed.offset), seed.time, DEFAULT_TIMEZONE);
    return {
      id,
      title: seed.title,
      category: seed.category,
      venue: seed.venue,
      city: seed.city,
      startsAt,
      timezone: DEFAULT_TIMEZONE,
      isFree: !seed.tickets?.length,
      heroImageUrl: null,
      colorFrom: palette[0],
      colorTo: palette[1],
      status: "published" as const,
      organiserId: DEMO_ORGANISER_ID,
      organiserName: DEMO_ORGANISER_NAME,
      tags: seed.tags ?? [],
      isSaved: false,
      description: seed.description,
      securityNote: "On-site security",
      identityNote: "ID required",
      visibility: "public" as const,
      publishedAt: startsAt,
      archivedAt: null,
      tickets: (seed.tickets ?? []).map(([name, price]) => ({ name, price })),
      tables: (seed.tables ?? []).map(([seats, quantity]) => ({ seats, quantity })),
      contacts: [
        { kind: "whatsapp" as ContactKind, caption: "Chat on WhatsApp", countryCode: "+234", value: "8012345678" },
      ],
      organiserAvatarUrl: null,
      isFeatured: Boolean(seed.featured),
      isOwner: false,
      isAdminViewer: false,
      canReport: false,
      isReportedByViewer: false,
    } satisfies EventDetail;
  });

  cachedKey = key;
  cached = events;
  return events;
}

export function demoEventSummaries(now: Date = new Date()): EventSummary[] {
  return demoEvents(now).map(toSummary);
}

export function toSummary(event: EventDetail): EventSummary {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    venue: event.venue,
    city: event.city,
    startsAt: event.startsAt,
    timezone: event.timezone,
    isFree: event.isFree,
    heroImageUrl: event.heroImageUrl,
    colorFrom: event.colorFrom,
    colorTo: event.colorTo,
    status: event.status,
    visibility: event.visibility,
    organiserId: event.organiserId,
    organiserName: event.organiserName,
    tags: [...event.tags],
    isSaved: event.isSaved,
  };
}

export function findDemoEvent(id: string, now: Date = new Date()): EventDetail | null {
  return demoEvents(now).find((event) => event.id === id) ?? null;
}
