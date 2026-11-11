import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, FileText, Image as ImageIcon, LockKeyhole, Sparkles } from "lucide-react";
import { fileName, formatNumber } from "../archive";
import { availableYears, dateLabel, filterPosts, type ImportedArchive } from "../social-model";
import { Avatar, EmptyState, timeISOString } from "./Shared";

function monthLabel(timestamp: number | null): string {
  if (timestamp === null) return "Undated memories";
  const date = new Date(timestamp * 1000);
  if (!Number.isFinite(date.valueOf())) return "Undated memories";
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

export default function Feed({ archive, query }: { archive: ImportedArchive; query: string }) {
  const [year, setYear] = useState("all");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(80);
  const years = useMemo(() => availableYears(archive.social.posts), [archive]);
  const posts = useMemo(
    () => filterPosts(archive.social.posts, query, year, mediaOnly),
    [archive, query, year, mediaOnly],
  );
  const visiblePosts = posts.slice(0, visibleCount);
  let previousMonth = "";
  return <div className="soc-content soc-feed-layout">
    <section className="soc-feed-main" aria-labelledby="feed-title">
      <div className="soc-page-heading"><h1 id="feed-title">Your timeline<span>.</span></h1>
        <p>Revisit posts and moments included in your download, newest first.</p></div>
      <div className="soc-feed-filters">
        <label className="soc-select-wrap"><CalendarDays size={15} aria-hidden="true"/>
          <span className="sr-only">Filter by year</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">All years</option>
            {years.map((value) => <option key={value} value={value}>{value === "unknown" ? "Unknown date" : value}</option>)}
          </select><ChevronDown size={14} aria-hidden="true"/>
        </label>
        <label className={"soc-chip " + (mediaOnly ? "selected" : "")}>
          <input type="checkbox" checked={mediaOnly} onChange={(e) => setMediaOnly(e.target.checked)}/>
          <ImageIcon size={15} aria-hidden="true"/> Posts with media
        </label>
        <span className="soc-result-count">{formatNumber(posts.length)} posts</span>
      </div>
      {posts.length === 0 ? <EmptyState icon={CalendarDays} title={archive.social.posts.length ? "No posts match those filters" : "Your timeline is ready"}>
        {archive.social.posts.length
          ? "Try another year, clear the search, or show posts without attachments."
          : "We couldn't find supported Facebook post records in this ZIP. Export posts as JSON, with your complete date range, to build your timeline."}
      </EmptyState> : <div className="soc-feed-list">{visiblePosts.map((post) => {
        const month = monthLabel(post.timestamp);
        const showMonth = previousMonth !== month;
        previousMonth = month;
        return <div key={post.id}>
          {showMonth && <div className="soc-month-divider"><span>{month}</span><div/></div>}
          <article className="soc-post">
            <div className="soc-post-heading">
              <Avatar name={post.author || "Archived post"}/>
              <div className="soc-post-author"><strong>{post.author || "Archived post"}</strong>
                <time dateTime={timeISOString(post.timestamp)}>{dateLabel(post.timestamp, "full")}</time></div>
              <span className="soc-post-origin">Archived post</span>
            </div>
            {post.text && <p className="soc-post-text">{post.text}</p>}
            {post.mediaCount > 0 && <div className="soc-media-placeholder">
              <ImageIcon size={27} aria-hidden="true"/>
              <div><strong>{formatNumber(post.mediaCount)} media reference{post.mediaCount === 1 ? "" : "s"}</strong>
                <span>Media previews are coming in a later version.</span></div>
            </div>}
            <footer className="soc-post-meta"><FileText size={14} aria-hidden="true"/>
              <span title={post.sourcePath}>{fileName(post.sourcePath)}</span>
              <span>Original ZIP unchanged</span></footer>
          </article>
        </div>;
      })}{visiblePosts.length < posts.length && <button type="button" className="soc-show-more"
        onClick={() => setVisibleCount((current) => current + 80)}>
        Show more posts ({formatNumber(posts.length - visiblePosts.length)} remaining)
      </button>}</div>}
    </section>
    <aside className="soc-feed-rail" aria-label="Archive summary">
      <div className="soc-side-panel">
        <span className="soc-panel-icon"><Sparkles size={21} aria-hidden="true"/></span>
        <h2>A timeline worth keeping.</h2>
        <p>Each post is arranged by its export timestamp. Everything stays on your own computer.</p>
        <div className="soc-stat-list">
          <div><span>Posts</span><strong>{formatNumber(archive.social.posts.length)}</strong></div>
          <div><span>Messages</span><strong>{formatNumber(archive.social.conversations.reduce((n, c) => n + c.messages.length, 0))}</strong></div>
          <div><span>Years found</span><strong>{formatNumber(years.filter((x) => x !== "unknown").length)}</strong></div>
        </div>
      </div>
      <div className="soc-note-panel"><LockKeyhole size={18} aria-hidden="true"/>
        <div><strong>Private by design</strong><p>No Facebook login, file modification, or cloud upload.</p></div>
      </div>
    </aside>
  </div>;
}
