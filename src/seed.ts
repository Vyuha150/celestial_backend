// Seeds the database with the Celestial catalog content that currently
// lives hardcoded in the frontend's src/data/products.ts, converting each
// free-text pricing "tier" into a real Product with a numeric price.
// Run with: npm run seed
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { connectDb, disconnectDb } from "./config/db.js";
import { Category } from "./models/Category.js";
import { Product } from "./models/Product.js";
import { Page } from "./models/Page.js";
import { Setting } from "./models/Setting.js";
import { generateSku } from "./utils/orderNumber.js";
import { logger } from "./config/logger.js";

function parsePrice(raw: string): number {
  const num = Number(raw.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(num)) throw new Error(`Could not parse price "${raw}"`);
  return num;
}

type SeedTier = {
  name: string;
  price: string;
  cadence: string;
  highlight?: boolean;
  perks: string[];
  cta: string;
};

type SeedCategory = {
  slug: string;
  title: string;
  tagline: string;
  image: string;
  heroImage?: string;
  heroSprite?: { url: string; frames: number; cols: number; rows: number; aspect: number };
  items: string[];
  hero: { eyebrow: string; headline: string; italic: string; pitch: string; badge: string };
  stats: { value: string; label: string }[];
  benefits: { icon: string; title: string; body: string }[];
  infographic: { title: string; bars: { label: string; value: number; suffix?: string }[] };
  tiers: SeedTier[];
  faqs: { q: string; a: string }[];
  social: { quote: string; by: string; role: string };
};

const baseFaqs = [
  {
    q: "When will I feel results?",
    a: "Most operators report measurable shifts in energy and clarity inside 14 days. Full biomarker movement: 60–90 days.",
  },
  {
    q: "Is this third-party verified?",
    a: "Every lot is HPLC-tested by an independent ISO 17025 lab. Certificates of analysis ship with each order.",
  },
  {
    q: "Can I stack with my existing protocol?",
    a: "Yes. Our concierge team builds a synergy map with your current regimen — no antagonistic pairings, no wasted molecules.",
  },
];

// Content mirrors src/data/products.ts in the frontend repo, minus the
// Vite-bundled image imports — `image`/`heroImage` here are placeholder
// paths; upload the real files via POST /admin/products/:id/images (or
// point these at your CDN) once the catalog is live.
const seedCategories: SeedCategory[] = [
  {
    slug: "core-performance-stack",
    title: "Core Performance Stack",
    tagline: "The daily operating system. Foundational molecules for the elite human.",
    image: "/static/categories/cat-core.jpg",
    heroImage: "/static/categories/p-ritual-greens-hero.png",
    heroSprite: { url: "/static/categories/ritual-greens-turntable-v4.webp", frames: 72, cols: 9, rows: 8, aspect: 304 / 489 },
    items: [
      "Precision greens complex (v.12+)",
      "Complete amino acid matrix",
      "Mitochondrial energy formula",
      "Cognitive performance blend",
      "Adaptogen stress protocol",
      "Circadian rhythm sleep stack",
      "VO2 max support formula",
    ],
    hero: {
      eyebrow: "Category 01 — Foundation",
      headline: "Run your biology",
      italic: "like a flagship.",
      pitch: "Seven precision formulas. One coherent operating system. Engineered for the operator who refuses 80%.",
      badge: "Best-seller · 4.9 ★ (2,184)",
    },
    stats: [
      { value: "+38%", label: "Sustained energy (D90)" },
      { value: "−42%", label: "Cortisol AM spike" },
      { value: "99.97%", label: "Active purity" },
      { value: "14d", label: "First measurable shift" },
    ],
    benefits: [
      { icon: "⚡", title: "All-day cellular energy", body: "Mitochondrial co-factors stacked at clinical doses — not marketing doses." },
      { icon: "◎", title: "Cognitive clarity", body: "Nootropic blend dialled for 6+ hour focus blocks without crash." },
      { icon: "✦", title: "Stress-resilient state", body: "Adaptogenic matrix flattens cortisol curves within 21 days." },
    ],
    infographic: {
      title: "Measured impact at Day 90",
      bars: [
        { label: "Sustained energy", value: 38, suffix: "%" },
        { label: "Sleep quality (HRV)", value: 27, suffix: "%" },
        { label: "Focus duration", value: 46, suffix: "%" },
        { label: "Recovery rate", value: 33, suffix: "%" },
      ],
    },
    tiers: [
      { name: "Single Lot", price: "$340", cadence: "/ one-time", perks: ["1 month supply", "Lot certificate", "Concierge onboarding"], cta: "Order single lot" },
      { name: "Quarterly Protocol", price: "$890", cadence: "/ 90 days", highlight: true, perks: ["Save 13%", "Quarterly biomarker review", "Priority allocation", "Sleeve refill case"], cta: "Lock my protocol" },
      { name: "Founder's Annual", price: "$3,200", cadence: "/ year", perks: ["Save 21%", "2 diagnostic kits included", "Private formulator hour", "Engraved aluminium vault"], cta: "Apply for allocation" },
    ],
    faqs: baseFaqs,
    social: { quote: "I replaced 11 bottles with one stack. My morning is finally quiet.", by: "Dr. M. Halden", role: "Performance physician, Zürich" },
  },
  {
    slug: "bioavailability-capsules",
    title: "Bioavailability-Enhanced Capsules",
    tagline: "Liposomal & nano-delivery. Up to 8× absorption versus standard isolates.",
    image: "/static/categories/cat-bio.jpg",
    items: [
      "Liposomal Vitamin C",
      "Nanoemulsion CoQ10",
      "Magnesium glycinate (chelated)",
      "Zinc bisglycinate complex",
      "D3+K2 in MCT oil softgel",
      "Methylated B12 sublingual",
      "Berberine precision capsule",
    ],
    hero: {
      eyebrow: "Category 02 — Delivery",
      headline: "Absorption is",
      italic: "the protocol.",
      pitch: "Liposomal and nano-delivery vehicles that move molecules past the gut wall — up to 8× the bioavailability of standard isolates.",
      badge: "Clinically proven · 8× absorption",
    },
    stats: [
      { value: "8×", label: "Absorption vs. isolates" },
      { value: "94%", label: "Cellular uptake" },
      { value: "0", label: "Synthetic emulsifiers" },
      { value: "120nm", label: "Mean particle size" },
    ],
    benefits: [
      { icon: "◉", title: "Liposomal envelope", body: "Phospholipid bilayer escorts each molecule directly through cellular membranes." },
      { icon: "▲", title: "Chelated minerals", body: "Bound to amino acids for clean uptake — zero gastric burden." },
      { icon: "✶", title: "Methylated co-factors", body: "Pre-activated forms (B12, folate) bypass MTHFR bottlenecks entirely." },
    ],
    infographic: {
      title: "Bioavailability vs. standard market isolates",
      bars: [
        { label: "Vitamin C (liposomal)", value: 92, suffix: "%" },
        { label: "CoQ10 (nano)", value: 86, suffix: "%" },
        { label: "Magnesium (chelated)", value: 78, suffix: "%" },
        { label: "B12 (methylated)", value: 88, suffix: "%" },
      ],
    },
    tiers: [
      { name: "Essential Three", price: "$220", cadence: "/ month", perks: ["C · Mg · D3+K2", "30-day supply", "Glass vessel"], cta: "Start essentials" },
      { name: "Full Bio Stack", price: "$420", cadence: "/ month", highlight: true, perks: ["All 7 capsules", "Save 15%", "Travel sleeve", "Concierge"], cta: "Take the full stack" },
      { name: "House Account", price: "$1,150", cadence: "/ quarter", perks: ["Save 22%", "Auto-replenish", "Lot pre-allocation"], cta: "Open house account" },
    ],
    faqs: baseFaqs,
    social: { quote: "My iron rebuilt in 6 weeks. Nothing oral has ever moved my labs like this.", by: "Sloane R.", role: "Endurance athlete · Boulder" },
  },
  {
    slug: "precision-powders",
    title: "Precision Powders",
    tagline: "Micro-filtered, third-party verified. Built for serious athletes.",
    image: "/static/categories/cat-powders.jpg",
    items: [
      "Whey isolate (grass-fed, micro-filtered)",
      "Collagen peptides Type I+III",
      "Creatine monohydrate (Creapure® grade)",
      "Beta-glucan immune complex",
      "Reishi + Lion's Mane dual extract",
      "Colostrum protein blend",
      "Electrolyte precision formula",
    ],
    hero: {
      eyebrow: "Category 03 — Performance",
      headline: "Powdered",
      italic: "by laboratory.",
      pitch: "Cold cross-flow micro-filtered isolates. Pharmaceutical mixing tolerances. Macros that pass any audit, taste that doesn't.",
      badge: "Athlete-grade · NSF Certified",
    },
    stats: [
      { value: "92%", label: "Protein purity" },
      { value: "<1g", label: "Lactose / serving" },
      { value: "Creapure®", label: "Source-verified" },
      { value: "0", label: "Artificial sweeteners" },
    ],
    benefits: [
      { icon: "▣", title: "Cold-filtered isolate", body: "Native protein architecture preserved — full BCAA spectrum, zero denaturation." },
      { icon: "◈", title: "Mushroom dual-extract", body: "Hot-water + ethanol pull captures both polysaccharides and triterpenes." },
      { icon: "○", title: "Engineered electrolytes", body: "Sodium · potassium · magnesium ratio modelled on plasma osmolality." },
    ],
    infographic: {
      title: "Per-serving macro & purity profile",
      bars: [
        { label: "Whey isolate purity", value: 92, suffix: "%" },
        { label: "Collagen Type I+III bioactive peptides", value: 84, suffix: "%" },
        { label: "Creatine monohydrate (Creapure®)", value: 99, suffix: "%" },
        { label: "Mushroom β-glucan content", value: 32, suffix: "%" },
      ],
    },
    tiers: [
      { name: "Single Tin", price: "$78", cadence: "/ tin", perks: ["30 servings", "Aluminium tin", "Aluminium scoop"], cta: "Order tin" },
      { name: "Training Block", price: "$210", cadence: "/ 3 tins", highlight: true, perks: ["Save 10%", "Mix & match flavours", "Shaker included"], cta: "Build my block" },
      { name: "Season Subscription", price: "$680", cadence: "/ 12 tins", perks: ["Save 18%", "Coach call (1hr)", "Refill cadence"], cta: "Lock my season" },
    ],
    faqs: baseFaqs,
    social: { quote: "I've audited a dozen isolates. This is the cleanest macro I've ever specced.", by: "Coach J. Pérez", role: "S&C, Olympic team" },
  },
  {
    slug: "functional-beverages",
    title: "Functional Beverages — Premium RTD",
    tagline: "Ready-to-drink performance. Engineered, never just bottled.",
    image: "/static/categories/cat-beverages.jpg",
    items: [
      "Nootropic focus shot (30ml)",
      "Adaptogen recovery drink",
      "NMN longevity elixir",
      "Hydrogen-rich mineral water",
      "Collagen glow drink",
      "Prebiotic + probiotic sparkling drink",
      "Ashwagandha KSM-66® latte",
    ],
    hero: {
      eyebrow: "Category 04 — Ritual",
      headline: "Performance,",
      italic: "uncorked.",
      pitch: "Pour, drink, perform. Functional liquids dosed at clinical thresholds — never the watered-down wellness aisle.",
      badge: "Cold-chain shipped · Glass only",
    },
    stats: [
      { value: "300mg", label: "NMN per elixir" },
      { value: "0g", label: "Added sugar" },
      { value: "1.6ppm", label: "Dissolved H₂" },
      { value: "Glass", label: "Zero plastic" },
    ],
    benefits: [
      { icon: "♢", title: "Nootropic shot", body: "Caffeine + L-theanine + alpha-GPC — 30ml of measured wakefulness." },
      { icon: "≋", title: "Hydrogen water", body: "Molecular H₂ at 1.6ppm — antioxidant signalling, no aftertaste." },
      { icon: "✺", title: "NMN longevity elixir", body: "Pharmaceutical-grade NMN, stabilised in citrate matrix." },
    ],
    infographic: {
      title: "Dose vs. retail wellness average",
      bars: [
        { label: "NMN per serving (mg)", value: 300, suffix: "mg" },
        { label: "Adaptogen extract ratio", value: 80, suffix: ":1" },
        { label: "Probiotic CFU (billions)", value: 50, suffix: "B" },
        { label: "Marine collagen (g)", value: 10, suffix: "g" },
      ],
    },
    tiers: [
      { name: "Tasting Flight", price: "$96", cadence: "/ 12 bottles", perks: ["One of each", "Concierge guide", "Cold-chain shipping"], cta: "Order tasting flight" },
      { name: "Weekly Ritual", price: "$240", cadence: "/ 36 bottles", highlight: true, perks: ["Curated selection", "Save 12%", "Recurring delivery"], cta: "Begin ritual" },
      { name: "Cellar Subscription", price: "$820", cadence: "/ quarter", perks: ["Save 20%", "Private allocation", "Glass return programme"], cta: "Reserve cellar" },
    ],
    faqs: baseFaqs,
    social: { quote: "The focus shot replaced two espressos and an afternoon nootropic. Cleaner, longer, calmer.", by: "L. Okafor", role: "Founder, fund manager" },
  },
  {
    slug: "smart-gummies-strips",
    title: "Smart Gummies & Strips",
    tagline: "Discreet delivery. Clinical doses. Couture-grade flavor.",
    image: "/static/categories/cat-gummies.jpg",
    items: [
      "NAD+ longevity gummy",
      "Melatonin + L-theanine sleep gummy",
      "Lion's Mane cognitive gummy",
      "Astaxanthin antioxidant gummy",
      "Oral dissolving zinc strip",
      "B12 sublingual strip",
      "Iron bisglycinate gummy",
    ],
    hero: {
      eyebrow: "Category 05 — Discreet",
      headline: "Clinical dose.",
      italic: "Couture flavour.",
      pitch: "Pectin-base gummies and dissolving strips that finally take dosage seriously. No corn syrup. No theatre.",
      badge: "Sugar-free · pectin-based",
    },
    stats: [
      { value: "250mg", label: "NAD+ per gummy" },
      { value: "0g", label: "Refined sugar" },
      { value: "30s", label: "Strip dissolve time" },
      { value: "Pectin", label: "Plant-based base" },
    ],
    benefits: [
      { icon: "✿", title: "Real clinical doses", body: "Same milligrams as our capsules — just a more pleasurable delivery." },
      { icon: "❍", title: "Sublingual strips", body: "Bypass first-pass metabolism for vitamins that fail orally." },
      { icon: "✸", title: "Couture flavour profile", body: "Developed with a Michelin pastry team. Yuzu. Bergamot. Black fig." },
    ],
    infographic: {
      title: "Active dose per piece (mg)",
      bars: [
        { label: "NAD+ gummy", value: 250, suffix: "mg" },
        { label: "Lion's Mane gummy", value: 500, suffix: "mg" },
        { label: "Iron bisglycinate", value: 27, suffix: "mg" },
        { label: "B12 sublingual strip", value: 1000, suffix: "µg" },
      ],
    },
    tiers: [
      { name: "Sample Tin", price: "$58", cadence: "/ tin", perks: ["20 pieces · mixed", "Tin packaging", "Travel-friendly"], cta: "Try the tin" },
      { name: "Monthly Box", price: "$160", cadence: "/ month", highlight: true, perks: ["Full daily dose", "Save 14%", "Refill subscription"], cta: "Start monthly box" },
      { name: "Cabinet Stock", price: "$540", cadence: "/ quarter", perks: ["Save 22%", "Engraved aluminium tin", "Concierge"], cta: "Stock my cabinet" },
    ],
    faqs: baseFaqs,
    social: { quote: "Finally a gummy I can give clients without flinching at the label.", by: "Dr. A. Fontaine", role: "Functional medicine, Paris" },
  },
  {
    slug: "luxury-ready-to-consume",
    title: "Luxury Ready-to-Consume",
    tagline: "Macros, locked. Flavor, refined. Performance, edible.",
    image: "/static/categories/cat-luxury.jpg",
    items: [
      "Precision nutrition bar (macros locked)",
      "Ketogenic fat bomb",
      "Protein chef's selection box",
      "Nootropic dark chocolate",
      "Functional mushroom cacao",
      "High-DHA smoked salmon snack",
      "Advanced whey parfait cup",
    ],
    hero: {
      eyebrow: "Category 06 — Edible",
      headline: "Macros, locked.",
      italic: "Pleasure, intact.",
      pitch: "Ready-to-consume nutrition designed by a Michelin-trained kitchen and a sports biochemist. Audit-grade, joy-grade.",
      badge: "Chef-developed · macro-precise",
    },
    stats: [
      { value: "22g", label: "Protein per bar" },
      { value: "<2g", label: "Net carbs" },
      { value: "70%", label: "Single-origin cacao" },
      { value: "0", label: "Industrial seed oils" },
    ],
    benefits: [
      { icon: "◆", title: "Macro lock", body: "Protein-fat-carb tolerances within ±0.4g per piece — verified per batch." },
      { icon: "✦", title: "Single-origin cacao", body: "Nootropic dark chocolate built around theobromine and a tested L-theanine pairing." },
      { icon: "❖", title: "DHA snack range", body: "High-DHA salmon and roe options for cognitive lipid loading on the move." },
    ],
    infographic: {
      title: "Per-serving precision profile",
      bars: [
        { label: "Protein per bar (g)", value: 22, suffix: "g" },
        { label: "Net carbs (g)", value: 2, suffix: "g" },
        { label: "DHA per snack (mg)", value: 850, suffix: "mg" },
        { label: "Cacao polyphenols (mg)", value: 420, suffix: "mg" },
      ],
    },
    tiers: [
      { name: "Tasting Box", price: "$86", cadence: "/ box", perks: ["12 pieces curated", "Includes tasting notes"], cta: "Order tasting box" },
      { name: "Weekly Pantry", price: "$220", cadence: "/ week", highlight: true, perks: ["Lunch + snack rotation", "Save 11%", "Cold-chain"], cta: "Stock my pantry" },
      { name: "Concierge Pantry", price: "$760", cadence: "/ month", perks: ["Bespoke menu", "Private chef call", "Save 18%"], cta: "Book concierge" },
    ],
    faqs: baseFaqs,
    social: { quote: "It eats like a tasting menu and tracks like a lab. Both, finally.", by: "M. Beaufort", role: "Hotelier, Geneva" },
  },
  {
    slug: "diagnostic-protocols",
    title: "Diagnostic & Protocol Kits",
    tagline: "Measurement is the protocol. Test, iterate, flourish.",
    image: "/static/categories/cat-diagnostic.jpg",
    items: [
      "At-home biomarker test kit",
      "30-day performance protocol box",
      "Seasonal immunity protocol kit",
      "Gut microbiome + probiotic pairing kit",
      "Athlete's quarterly refill subscription",
      "Corporate wellness stack kit",
    ],
    hero: {
      eyebrow: "Category 07 — Measure",
      headline: "Measurement",
      italic: "is the protocol.",
      pitch: "Quarterly bloodwork. Microbiome mapping. Closed-loop iteration. Your biology, finally on a dashboard.",
      badge: "ISO 17025 · CLIA-certified labs",
    },
    stats: [
      { value: "62", label: "Biomarkers measured" },
      { value: "48h", label: "Result turnaround" },
      { value: "Q4×", label: "Iteration cadence" },
      { value: "1:1", label: "Clinician review" },
    ],
    benefits: [
      { icon: "◐", title: "62-biomarker panel", body: "Hormones, inflammation, lipids, micronutrients, metabolic — one draw." },
      { icon: "❂", title: "Microbiome map", body: "16S + shotgun sequencing paired with personalised probiotic pull." },
      { icon: "▤", title: "Closed-loop protocol", body: "Each result auto-adjusts your stack. No guessing. No standing still." },
    ],
    infographic: {
      title: "What we measure",
      bars: [
        { label: "Hormone panel coverage", value: 18, suffix: " markers" },
        { label: "Inflammation & immunity", value: 12, suffix: " markers" },
        { label: "Metabolic & lipids", value: 16, suffix: " markers" },
        { label: "Micronutrients", value: 16, suffix: " markers" },
      ],
    },
    tiers: [
      { name: "Single Panel", price: "$420", cadence: "/ test", perks: ["62 biomarkers", "Clinician PDF", "Stack recommendation"], cta: "Order panel" },
      { name: "Quarterly Iteration", price: "$1,380", cadence: "/ year", highlight: true, perks: ["4 panels / yr", "Save 18%", "Live clinician hour"], cta: "Begin iteration" },
      { name: "Concierge Protocol", price: "$4,400", cadence: "/ year", perks: ["Quarterly + microbiome", "Dedicated physician", "Stack supplied"], cta: "Apply for concierge" },
    ],
    faqs: baseFaqs,
    social: { quote: "We finally stopped guessing. Every quarter the stack tightens.", by: "K. Tanaka", role: "CEO · Series C" },
  },
];

const seedPages = [
  { slug: "home", title: "Home — Landing", route: "/", status: "published" as const },
  { slug: "products", title: "Products Index", route: "/products", status: "published" as const },
  { slug: "brand-new", title: "Brand New", route: "/brand-new", status: "published" as const },
  { slug: "universe", title: "Customization", route: "/universe", status: "published" as const },
  { slug: "science", title: "Science", route: "/science", status: "published" as const },
  { slug: "protocol", title: "Protocol", route: "/protocol", status: "published" as const },
  { slug: "journal", title: "Journal", route: "/journal", status: "published" as const },
];

const DEFAULT_STOCK = 150;

// Seeding logic only — no connect/disconnect, so it can also be called
// from scripts/dev-memory-db.ts against an already-open connection.
export async function execSeed(): Promise<void> {
  logger.info("Seeding database...");

  await Setting.findOneAndUpdate({ key: "store" }, { key: "store" }, { upsert: true });

  for (const seedCat of seedCategories) {
    const { tiers, ...categoryData } = seedCat;
    const category = await Category.findOneAndUpdate({ slug: seedCat.slug }, categoryData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    for (const tier of tiers) {
      const existing = await Product.findOne({ category: category._id, name: tier.name });
      if (existing) continue;

      await Product.create({
        category: category._id,
        sku: generateSku(`${seedCat.slug}-${tier.name}`),
        name: tier.name,
        cadence: tier.cadence,
        price: parsePrice(tier.price),
        stock: DEFAULT_STOCK,
        status: "live",
        perks: tier.perks,
        highlight: tier.highlight ?? false,
        cta: tier.cta,
      });
    }

    logger.info(`Seeded category "${seedCat.title}" with ${tiers.length} product(s)`);
  }

  for (const page of seedPages) {
    await Page.findOneAndUpdate({ slug: page.slug }, page, { upsert: true });
  }

  logger.info("Seed complete. Create the first admin via POST /auth/bootstrap-admin.");
}

// Only run as a standalone CLI script (`npm run seed`) — not when imported
// by scripts/dev-memory-db.ts, which manages the connection itself.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  connectDb()
    .then(execSeed)
    .then(disconnectDb)
    .catch((err) => {
      logger.error({ err }, "Seed failed");
      process.exit(1);
    });
}
