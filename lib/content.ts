// Everything the site says lives here; components only lay it out.

export const person = {
  name: "Caleb-Livingstone Emmanuel",
  handle: "caystone",
  // "Creator", as pronounced, and a motto: to the stars on the wings of a pig.
  pronunciation: "/kriːˈeɪtə/",
  motto: "Ad astra per alas porci",
  mottoMeaning: "To the stars on the wings of a pig",
  // Robots move, software thinks, material science decides what lasts.
  line: { lead: "I build things that", words: ["move", "think", "last"] },
  intro:
    "Robots, software, material science, and the companies around all three. Here's what's on the bench, what I'm reading, and what I'm building with Khrona.",
};

export type Field = "robotics" | "software" | "materials" | "company";

export const fields: { key: Field; label: string; note: string }[] = [
  { key: "robotics", label: "Robotics", note: "self-taught, and still learning out loud" },
  { key: "software", label: "Software", note: "the part that makes the rest useful" },
  { key: "materials", label: "Material Science", note: "reading for now" },
  { key: "company", label: "Companies", note: "where it all has to work for real" },
];

export type Entry = {
  // Stable: notes are tagged with it, so don't rename once notes exist.
  key: string;
  no: string;
  title: string;
  field: Field;
  status: "Building" | "In progress" | "Exploring" | "Reading";
  body: string;
  margin: string;
  sketch: "company" | "arm" | "hexapod" | "wheels" | "autonomy" | "regen" | "swarm" | "loop" | "book";
  link?: { href: string; label: string };
};

export const bench: Entry[] = [
  {
    key: "khrona", no: "01", title: "KhronaHQ", field: "company", status: "Building", sketch: "company",
    body: "KhronaHQ buys African tech companies that have real customers but have stalled, and runs them for the long term on one shared platform: finance, billing, analytics and infrastructure that every company plugs into.",
    margin: "Lagos · Cotonou",
    link: { href: "https://khronahq.com", label: "khronahq.com" },
  },
  {
    key: "arm", no: "02", title: "Arm", field: "robotics", status: "In progress", sketch: "arm",
    body: "A robot arm, end to end: the kinematics, the control, and getting the gripper to land where the maths says it should.",
    margin: "notes + footage when it moves",
  },
  {
    key: "hexapod", no: "03", title: "Hexapod", field: "robotics", status: "In progress", sketch: "hexapod",
    body: "Six legs, one body. Gaits, balance and uneven ground: the interesting problems start when the floor isn't flat.",
    margin: "notes as it learns to walk",
  },
  {
    key: "two-wheeler", no: "04", title: "Two-wheeler", field: "robotics", status: "In progress", sketch: "wheels",
    body: "A two-wheeled robot, from the motors and the control loop up.",
    margin: "on the bench now",
  },
  {
    key: "autonomy", no: "05", title: "Autonomous systems", field: "robotics", status: "Exploring", sketch: "autonomy",
    body: "Machines that sense, decide and act on their own, and what that changes about how people and goods move, across very different sectors.",
    margin: "mobility first",
  },
  {
    key: "regen", no: "06", title: "Regenerative braking", field: "robotics", status: "Exploring", sketch: "regen",
    body: "Recovering the energy a vehicle spends slowing down, instead of losing it as heat. Paired with autonomy, a way to make getting around cheaper and go further.",
    margin: "braking that charges",
  },
  {
    key: "swarm", no: "07", title: "Swarm", field: "robotics", status: "In progress", sketch: "swarm",
    body: "Many simple robots, one behaviour. No leader: each follows a few local rules, and the group does the rest.",
    margin: "the dots at the top of this page run the same idea",
  },
  {
    key: "rl", no: "08", title: "Reinforcement learning", field: "software", status: "Reading", sketch: "loop",
    body: "Agents that learn by trying and being rewarded, not by being told. Reading everything I can on it, and the thread I keep pulling across the arm, the hexapod, the two-wheeler and the swarm.",
    margin: "obsessed, honestly",
  },
  {
    key: "materials", no: "09", title: "Material Science", field: "materials", status: "Reading", sketch: "book",
    body: "How what something is made of decides what it can do. Reading for now; notes will land here as reading turns into experiments.",
    margin: "reading list soon",
  },
];

// Where I work, and what I've built for each.
export type Org = "inairis" | "excelsior" | "partyra";

export const work: {
  roles: { key: Org; name: string; role: string; what: string; href: string }[];
  built: { name: string; for: Org; what: string; href: string }[];
} = {
  roles: [
    { key: "inairis", name: "Inairis", role: "Technical Product Manager", what: "A boutique software studio in Paris: strategy, design, web, mobile and AI.", href: "https://inairis.com" },
    { key: "excelsior", name: "Excelsior Africa", role: "Technical Product Manager", what: "Seed funding and technical support for West African entrepreneurs.", href: "https://excelsior-africa.com" },
    { key: "partyra", name: "Partyra", role: "Independent contractor", what: "Discover events and buy tickets. I build their mobile and web apps.", href: "https://partyra.com" },
  ],
  built: [
    { name: "Melrys", for: "inairis", what: "Set up your company in France and hand over your accounting: invoicing, billing and the paperwork.", href: "https://www.melrys.fr" },
    { name: "Passage", for: "inairis", what: "A VPN for China: one key, three devices, unlimited data.", href: "https://passageway.fr" },
    { name: "SourcingPick", for: "inairis", what: "Between the factory and the ship: sourcing, quality checks, consolidation and sea freight out of Guangzhou.", href: "https://sourcingpick.com" },
    { name: "Excelsior Africa", for: "excelsior", what: "Seed funding and technical support for West African entrepreneurs, from their first steps.", href: "https://excelsior-africa.com" },
    { name: "Excelsior Distribution", for: "excelsior", what: "Helps companies, investors and institutions design, structure and launch economic initiatives in African markets.", href: "https://excelsior-distribution.com" },
    { name: "Partyra", for: "partyra", what: "Discover events and buy tickets: the mobile app and the website.", href: "https://partyra.com" },
    // The CFI project (Inairis) joins this list once it has its domain.
  ],
};

export const elsewhere = [
  { label: "GitHub", href: "https://github.com/caystone99" },
  { label: "X", href: "https://x.com/caystone_99" },
];

// Where the clock and weather in the top bar are for.
export const place = { city: "Cotonou", country: "Benin", tz: "Africa/Porto-Novo", lat: 6.3703, lon: 2.3912 };

// Notes can also be about something that isn't on the bench.
export const otherTopics = [{ key: "general", title: "General" }];
export const topics = [...bench.map((e) => ({ key: e.key, title: e.title })), ...otherTopics];
export const topicTitle = (key: string) => topics.find((t) => t.key === key)?.title ?? key;
