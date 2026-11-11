import { describe, expect, it } from "vitest";
import {
  availableYears, avatarInitials, filterConversations, filterPosts,
  meaningfulCount, messageDays, type Conversation, type FeedPost, type SocialArchive,
} from "./social-model";

const posts: FeedPost[] = [
  { id: "1", timestamp: 1600000000, author: "Robin", text: "Family holiday", mediaCount: 2, sourcePath: "posts.json" },
  { id: "2", timestamp: null, author: null, text: "Hello!", mediaCount: 0, sourcePath: "posts2.json" },
];
const chats: Conversation[] = [{
  id: "a", title: "Pat", participants: ["Pat", "Robin"], lastTimestamp: 1700000000,
  messages: [
    { id: "1", sender: "Pat", text: "Coffee tomorrow?", timestamp: 1699999900, attachments: 0 },
    { id: "2", sender: "Robin", text: "Sure!", timestamp: 1700000000, attachments: 0 },
  ],
}];

describe("social archive UI helpers", () => {
  it("filters posts by year, media and keyword without changing source", () => {
    expect(availableYears(posts)).toEqual(["2020", "unknown"]);
    expect(filterPosts(posts, "holiday", "2020", true).map((x) => x.id)).toEqual(["1"]);
    expect(filterPosts(posts, "hello", "all", false).map((x) => x.id)).toEqual(["2"]);
    expect(posts).toHaveLength(2);
  });

  it("finds conversations by person or message content", () => {
    expect(filterConversations(chats, "PAT")).toHaveLength(1);
    expect(filterConversations(chats, "coffee")).toHaveLength(1);
    expect(filterConversations(chats, "unmatched")).toHaveLength(0);
  });

  it("groups chronological messages by local date", () => {
    const days = messageDays(chats[0]!.messages);
    expect(days.reduce((sum, day) => sum + day.messages.length, 0)).toBe(2);
  });

  it("provides fallback avatars and bounded content counts", () => {
    expect(avatarInitials("Robin Doe")).toBe("RD");
    expect(avatarInitials(null)).toBe("A");
    const archive: SocialArchive = {
      posts, conversations: chats, dataCategories: [], filesRead: 2, jsonFilesRead: 2, htmlFilesRead: 0, formatHint: "JSON", filesSkipped: 0, warnings: [],
    };
    expect(meaningfulCount(archive)).toBe(4);
  });
});
