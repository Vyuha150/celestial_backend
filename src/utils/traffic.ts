const SEARCH_ENGINES = ["google.", "bing.", "duckduckgo.", "yahoo."];
const SOCIAL = ["facebook.", "instagram.", "twitter.", "x.com", "tiktok.", "linkedin.", "pinterest."];

export function classifySource(referrer: string | undefined, utmSource: string | undefined): string {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes("email") || s.includes("newsletter")) return "Email";
    if (SOCIAL.some((d) => s.includes(d.replace(".", "")))) return "Social";
    return "Referral";
  }
  if (!referrer) return "Direct";
  const host = safeHost(referrer);
  if (!host) return "Direct";
  if (SEARCH_ENGINES.some((d) => host.includes(d))) return "Organic";
  if (SOCIAL.some((d) => host.includes(d))) return "Social";
  return "Referral";
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}
