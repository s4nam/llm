/** Extract YouTube video ID from various URL formats. */
export function parseYoutubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0].split("?")[0];
      return id.length === 11 ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname.startsWith("/watch")) {
        const v = u.searchParams.get("v");
        return v && v.length === 11 ? v : null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      // /embed/{id}, /shorts/{id}, /v/{id}
      if (parts.length >= 2 && ["embed", "shorts", "v"].includes(parts[0])) {
        const id = parts[1];
        return id.length === 11 ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidYoutubeUrl(url: string): boolean {
  return parseYoutubeId(url) !== null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = parseYoutubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}
