// Extracts og:image (or twitter:image) from a URL with a short timeout.
// Falls back to null — callers handle the missing image case.

const FETCH_TIMEOUT_MS = 4000;

export async function extractOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IntelliXBot/1.0)" },
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const html = await res.text();

    const patterns = [
      /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1] && match[1].startsWith("http")) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

// Extracts OG images for an array of news snippets in parallel.
// Returns array of { url, ogImage } — ogImage is null when unavailable.
export async function extractOgImages(
  snippets: Array<{ url: string }>,
): Promise<Array<{ url: string; ogImage: string | null }>> {
  return Promise.all(
    snippets.map(async (s) => ({ url: s.url, ogImage: await extractOgImage(s.url) })),
  );
}
