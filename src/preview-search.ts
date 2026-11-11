import type { SocialArchive } from "./social-model";
import { yearOf } from "./social-model";

export type PreviewSearchKind = "all" | "post" | "message" | "data";
export type MatchKind = Exclude<PreviewSearchKind, "all">;

export interface PreviewSearchHit {
  id: string;
  kind: MatchKind;
  title: string;
  excerpt: string;
  source: string;
  timestamp: number | null;
}

export interface PreviewSearchPage {
  hits: PreviewSearchHit[];
  total: number;
}

function excerpt(value: string, needle: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= 230) return text || "No readable text supplied.";
  const position = text.toLocaleLowerCase().indexOf(needle);
  const start = position < 0 ? 0 : Math.max(0, position - 65);
  const end = Math.min(text.length, start + 230);
  return (start ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/** Search only the parsed records already loaded for one active family profile.
 * No remote service, cross-profile index, disk write or unbounded result rendering.
 */
export function searchPreview(
  archive: SocialArchive,
  query: string,
  kind: PreviewSearchKind = "all",
  year = "all",
  limit = 50,
): PreviewSearchPage {
  const needle = query.trim().slice(0, 200).toLocaleLowerCase();
  if (!needle) return { hits: [], total: 0 };
  const matches: PreviewSearchHit[] = [];
  const accepts = (candidateKind: MatchKind, timestamp: number | null, text: string): boolean =>
    (kind === "all" || kind === candidateKind) &&
    (year === "all" || yearOf(timestamp) === year) &&
    text.toLocaleLowerCase().includes(needle);

  if (kind === "all" || kind === "post") {
    for (const post of archive.posts) {
      if (accepts("post", post.timestamp, [post.author, post.text, post.sourcePath].join(" "))) {
        matches.push({
          id: "post:" + post.id, kind: "post",
          title: post.author || "Archived post", excerpt: excerpt(post.text, needle),
          source: post.sourcePath, timestamp: post.timestamp,
        });
      }
    }
  }
  if (kind === "all" || kind === "message") {
    for (const chat of archive.conversations) {
      let foundMessage = false;
      for (let index = 0; index < chat.messages.length; index++) {
        const message = chat.messages[index]!;
        // Searching a thread title must not turn all of its messages into matches.
        if (accepts("message", message.timestamp, [message.sender, message.text].join(" "))) {
          foundMessage = true;
          matches.push({
            id: "message:" + chat.id + ":" + message.id + ":" + index, kind: "message",
            title: message.sender + " · " + chat.title,
            excerpt: excerpt(message.text, needle),
            source: "Conversation: " + chat.title, timestamp: message.timestamp,
          });
        }
      }
      // Keep thread names searchable, but return one summary when the message text did not match.
      if (!foundMessage && accepts("message", chat.lastTimestamp,
        [chat.title, chat.participants.join(" ")].join(" "))) {
        matches.push({
          id: "conversation:" + chat.id, kind: "message",
          title: chat.title,
          excerpt: chat.participants.length
            ? "Conversation with " + chat.participants.join(", ")
            : "A conversation from this profile's archive.",
          source: "Conversation: " + chat.title, timestamp: chat.lastTimestamp,
        });
      }
    }
  }
  if (kind === "all" || kind === "data") {
    for (const category of archive.dataCategories) {
      for (let index = 0; index < category.records.length; index++) {
        const record = category.records[index]!;
        if (accepts("data", record.timestamp,
          [category.label, record.title, record.detail, record.sourcePath].join(" "))) {
          matches.push({
            id: "data:" + category.id + ":" + record.sourcePath + ":" + index,
            kind: "data", title: record.title, excerpt: excerpt(record.detail, needle),
            source: record.sourcePath, timestamp: record.timestamp,
          });
        }
      }
    }
  }

  // Sort with undated results last; stable input order breaks equal-timestamp ties.
  matches.sort((a, b) => (b.timestamp ?? -1) - (a.timestamp ?? -1));
  const count = Number.isFinite(limit) ? Math.max(0, Math.min(250, Math.floor(limit))) : 50;
  return { hits: matches.slice(0, count), total: matches.length };
}

export function availableSearchYears(archive: SocialArchive): string[] {
  const years = new Set<string>();
  archive.posts.forEach(post => years.add(yearOf(post.timestamp)));
  archive.conversations.forEach(chat => {
    years.add(yearOf(chat.lastTimestamp));
    chat.messages.forEach(message => years.add(yearOf(message.timestamp)));
  });
  archive.dataCategories.forEach(category => category.records.forEach(record => years.add(yearOf(record.timestamp))));
  return [...years].sort((a, b) => a === "unknown" ? 1 : b === "unknown" ? -1 : Number(b) - Number(a));
}
