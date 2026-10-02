// Reference links (Instagram, TikTok, YouTube…) pasted in a title or note.

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

export function firstUrl(...texts: (string | null | undefined)[]): string | null {
  for (const t of texts) {
    const m = t?.match(URL_RE);
    if (m) return m[0].replace(/[),.;!?]+$/, "");
  }
  return null;
}

/** The text without its links, for showing next to an "Abrir" button. */
export const withoutUrls = (text: string | null | undefined) => (text ?? "").replace(URL_RE, "").replace(/\s+/g, " ").trim();

const SITES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)(facebook\.com|fb\.watch)$/, "Facebook"],
  [/(^|\.)(x\.com|twitter\.com)$/, "X"],
  [/(^|\.)drive\.google\.com$/, "Drive"],
];

/** "Instagram", "TikTok"… or the bare domain. */
export function siteName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SITES.find(([re]) => re.test(host))?.[1] ?? host;
  } catch {
    return "el link";
  }
}
