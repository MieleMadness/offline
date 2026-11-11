import type { ArchiveReport } from "./archive";

export interface FeedPost {
  id: string;
  timestamp: number | null;
  author: string | null;
  text: string;
  mediaCount: number;
  mediaPaths?: string[];
  sourcePath: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  timestamp: number | null;
  text: string;
  attachments: number;
  mediaPaths?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  participants: string[];
  lastTimestamp: number | null;
  messages: ChatMessage[];
}

export interface DataRecord {
  title: string;
  detail: string;
  timestamp: number | null;
  sourcePath: string;
}

export interface DataCategory {
  id: string;
  label: string;
  fileCount: number;
  records: DataRecord[];
}

export interface SocialArchive {
  posts: FeedPost[];
  conversations: Conversation[];
  dataCategories: DataCategory[];
  filesRead: number;
  jsonFilesRead: number;
  htmlFilesRead: number;
  formatHint: string;
  filesSkipped: number;
  warnings: string[];
}

export interface ImportedArchive {
  report: ArchiveReport;
  social: SocialArchive;
}

function validDate(seconds: number | null): Date | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return null;
  const result = new Date(seconds * 1000);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function dateLabel(seconds: number | null, mode: "short" | "full" = "short"): string {
  const date = validDate(seconds);
  if (!date) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, mode === "full"
    ? { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" },
  ).format(date);
}

export function clockLabel(seconds: number | null): string {
  const date = validDate(seconds);
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export function yearOf(seconds: number | null): string {
  const date = validDate(seconds);
  return date ? String(date.getFullYear()) : "unknown";
}

export function availableYears(posts: readonly FeedPost[]): string[] {
  return [...new Set(posts.map((post) => yearOf(post.timestamp)))]
    .sort((a, b) => a === "unknown" ? 1 : b === "unknown" ? -1 : Number(b) - Number(a));
}

export function filterPosts(
  posts: readonly FeedPost[],
  search: string,
  year: string,
  mediaOnly: boolean,
): FeedPost[] {
  const needle = search.trim().toLocaleLowerCase();
  return posts.filter((post) => {
    if (year !== "all" && yearOf(post.timestamp) !== year) return false;
    if (mediaOnly && post.mediaCount < 1) return false;
    return !needle ||
      post.text.toLocaleLowerCase().includes(needle) ||
      (post.author ?? "").toLocaleLowerCase().includes(needle);
  });
}

export function filterConversations(conversations: readonly Conversation[], search: string): Conversation[] {
  const needle = search.trim().toLocaleLowerCase();
  if (!needle) return [...conversations];
  return conversations.filter((chat) =>
    chat.title.toLocaleLowerCase().includes(needle) ||
    chat.participants.some((name) => name.toLocaleLowerCase().includes(needle)) ||
    chat.messages.some((message) =>
      message.text.toLocaleLowerCase().includes(needle) ||
      message.sender.toLocaleLowerCase().includes(needle),
    ),
  );
}


/** Profile-scoped, pure filtering: the UI never indexes other family members' threads. */
export function availableMessageYears(messages: readonly ChatMessage[]): string[] {
  return [...new Set(messages.map(message => yearOf(message.timestamp)))]
    .sort((a, b) => a === "unknown" ? 1 : b === "unknown" ? -1 : Number(b) - Number(a));
}

export interface ThreadFilterOptions {
  sender?: string;
  fromDate?: string;
  throughDate?: string;
}

export function availableMessageSenders(messages: readonly ChatMessage[]): string[] {
  return [...new Set(messages.map(message => message.sender))].sort((a,b) => a.localeCompare(b));
}

/** Date picker dates are local calendar days, matching rendered message dates. */
function dayBoundary(input: string, nextDay: boolean): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const [year, month, day] = input.split("-").map(Number);
  const checked = new Date(year!, month! - 1, day);
  if (checked.getFullYear() !== year || checked.getMonth() + 1 !== month || checked.getDate() !== day) {
    return null;
  }
  return new Date(year!, month! - 1, day! + (nextDay ? 1 : 0)).getTime() / 1000;
}

export function filterThreadMessages(
  messages: readonly ChatMessage[], search: string, year: string, withAttachments: boolean,
  options: ThreadFilterOptions = {},
): ChatMessage[] {
  const needle = search.trim().toLocaleLowerCase();
  const from = options.fromDate ? dayBoundary(options.fromDate, false) : null;
  const until = options.throughDate ? dayBoundary(options.throughDate, true) : null;
  if ((options.fromDate && from === null) || (options.throughDate && until === null)) return [];
  if (from !== null && until !== null && from >= until) return [];
  return messages.filter(message => {
    if (year !== "all" && yearOf(message.timestamp) !== year) return false;
    if (withAttachments && message.attachments < 1) return false;
    if (options.sender && options.sender !== "all" && message.sender !== options.sender) return false;
    if (from !== null && (message.timestamp === null || message.timestamp < from)) return false;
    if (until !== null && (message.timestamp === null || message.timestamp >= until)) return false;
    return !needle || message.text.toLocaleLowerCase().includes(needle) ||
      message.sender.toLocaleLowerCase().includes(needle);
  });
}

export interface MessageDay {
  key: string;
  label: string;
  messages: ChatMessage[];
}

export function messageDays(messages: readonly ChatMessage[]): MessageDay[] {
  const result: MessageDay[] = [];
  for (const message of messages) {
    const date = validDate(message.timestamp);
    const key = date ? [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-") : "unknown";
    const label = date
      ? new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(date)
      : "Date unavailable";
    const last = result[result.length - 1];
    if (last?.key === key) last.messages.push(message);
    else result.push({ key, label, messages: [message] });
  }
  return result;
}

export function avatarInitials(name: string | null | undefined): string {
  const words = (name || "Archive").trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => (word[0] ?? "").toUpperCase()).join("") || "A";
}

export function meaningfulCount(archive: SocialArchive): number {
  return archive.posts.length +
    archive.conversations.reduce((total, chat) => total + chat.messages.length, 0) +
    archive.dataCategories.reduce((total, category) => total + category.records.length, 0);
}
