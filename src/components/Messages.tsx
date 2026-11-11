import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, File, Image as ImageIcon, LockKeyhole, MessageCircle, MessagesSquare, Search, SlidersHorizontal, X } from "lucide-react";
import { formatNumber } from "../archive";
import { availableMessageSenders, availableMessageYears, clockLabel, dateLabel, filterConversations, filterThreadMessages, messageDays, type ImportedArchive } from "../social-model";
import { Avatar, EmptyState, timeISOString } from "./Shared";
import { MediaStrip } from "./ArchivePhoto";

export default function Messages({ archive, query, sourceZip }: { archive: ImportedArchive; query: string; sourceZip: string | null }) {
  const chats = useMemo(() => filterConversations(archive.social.conversations, query), [archive, query]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = chats.find(chat => chat.id === selected) ?? chats[0];
  const [messageSearch, setMessageSearch] = useState("");
  const [year, setYear] = useState("all");
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [sender, setSender] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const [showExtra, setShowExtra] = useState(false);
  const [windowSize, setWindowSize] = useState(250);
  const years = useMemo(() => availableMessageYears(current?.messages ?? []), [current]);
  const senders = useMemo(() => availableMessageSenders(current?.messages ?? []), [current]);
  const hasInvalidRange = Boolean(fromDate && throughDate && fromDate > throughDate);
  const advancedCount = Number(sender !== "all") + Number(Boolean(fromDate)) + Number(Boolean(throughDate));
  const filtered = useMemo(() => filterThreadMessages(
    current?.messages ?? [], messageSearch, year, attachmentsOnly, {sender, fromDate, throughDate},
  ), [current, messageSearch, year, attachmentsOnly, sender, fromDate, throughDate]);
  const visibleMessages = filtered.slice(-windowSize);
  const groups = messageDays(visibleMessages);
  const scroll = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [current?.id, messageSearch, year, attachmentsOnly, sender, fromDate, throughDate]);
  useLayoutEffect(() => {
    if (previousHeight.current === null || !scroll.current) return;
    const heightBefore = previousHeight.current;
    previousHeight.current = null;
    scroll.current.scrollTop += scroll.current.scrollHeight - heightBefore;
  }, [windowSize, current?.id]);

  function chooseThread(id: string) {
    setSelected(id);
    setMessageSearch("");
    setYear("all");
    setAttachmentsOnly(false);
    setSender("all");
    setFromDate("");
    setThroughDate("");
    setShowExtra(false);
    setWindowSize(250);
    previousHeight.current = null;
  }

  function clearFilters() {
    setMessageSearch("");
    setYear("all");
    setAttachmentsOnly(false);
    setSender("all");
    setFromDate("");
    setThroughDate("");
    setWindowSize(250);
    previousHeight.current = null;
  }

  function loadOlder() {
    previousHeight.current = scroll.current?.scrollHeight ?? null;
    setWindowSize(current => current + 250);
  }

  return <div className="soc-content soc-messages-page">
    <div className="soc-page-heading"><h1>Conversations<span>.</span></h1>
      <p>Find your people and revisit messages organized by person and date.</p></div>
    <div className="soc-inbox">
      <aside className="soc-thread-list" aria-label="Conversations">
        <div className="soc-thread-title">All conversations <span>{formatNumber(chats.length)}</span></div>
        {chats.map((chat) => {
          const latest = chat.messages[chat.messages.length - 1];
          return <button type="button" key={chat.id} className={"soc-thread " + (current?.id === chat.id ? "active" : "")}
            onClick={() => chooseThread(chat.id)} aria-current={current?.id === chat.id ? "true" : undefined}>
            <Avatar name={chat.title}/>
            <span className="soc-thread-info"><span className="soc-thread-line"><strong title={chat.title}>{chat.title}</strong>
              <time>{dateLabel(chat.lastTimestamp)}</time></span>
              <span className="soc-thread-preview">{latest?.text || (latest?.attachments ? "Shared an attachment" : "No readable messages")}</span>
            </span>
          </button>;
        })}
        {chats.length === 0 && <div className="soc-thread-empty"><MessageCircle size={24}/>
          <strong>No conversations found</strong><p>Try another name or import a Facebook HTML or JSON export that includes messages.</p></div>}
      </aside>
      <section className="soc-chat" aria-label={current ? "Conversation: " + current.title : "Conversation preview"}>
        {current ? <>
          <header className="soc-chat-top"><Avatar name={current.title}/>
            <div><strong>{current.title}</strong><span>{current.participants.length
              ? current.participants.join(", ") : "Participants not included"}</span></div>
            <span className="soc-chat-count">{formatNumber(current.messages.length)} messages</span>
          </header>
          <div className="soc-chat-filters" aria-label="Filter messages in this conversation">
            <label className="soc-chat-search"><Search size={16} aria-hidden="true"/>
              <span className="sr-only">Search within this conversation</span>
              <input type="search" value={messageSearch} placeholder="Search within conversation"
                onChange={event => { setMessageSearch(event.target.value); setWindowSize(250); }}/>
            </label>
            <label className="soc-chat-year"><CalendarDays size={15} aria-hidden="true"/>
              <span className="sr-only">Filter conversation by year</span>
              <select value={year} onChange={event => { setYear(event.target.value); setWindowSize(250); }}>
                <option value="all">All dates</option>
                {years.map(value => <option value={value} key={value}>
                  {value === "unknown" ? "Unknown date" : value}
                </option>)}
              </select>
            </label>
            <label className={"soc-chat-attachments " + (attachmentsOnly ? "selected" : "")}>
              <input type="checkbox" checked={attachmentsOnly}
                onChange={event => { setAttachmentsOnly(event.target.checked); setWindowSize(250); }}/>
              <ImageIcon size={15} aria-hidden="true"/> Attachments
            </label>
            <button type="button" className={"soc-chat-advanced-toggle " + (showExtra ? "active" : "")}
              aria-expanded={showExtra} aria-controls="soc-chat-advanced-filters"
              onClick={() => setShowExtra(value => !value)}>
              <SlidersHorizontal size={15} aria-hidden="true"/>
              More filters{advancedCount ? " (" + advancedCount + ")" : ""}
              <ChevronDown size={14} aria-hidden="true"/>
            </button>
          </div>
          {showExtra && <div id="soc-chat-advanced-filters" className="soc-chat-advanced">
            <label>Participant
              <select value={sender} onChange={event => { setSender(event.target.value); setWindowSize(250); }}>
                <option value="all">All participants</option>
                {senders.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label>From date
              <input type="date" value={fromDate}
                onChange={event => { setFromDate(event.target.value); setWindowSize(250); }}/>
            </label>
            <label>Through date
              <input type="date" min={fromDate || undefined} value={throughDate}
                onChange={event => { setThroughDate(event.target.value); setWindowSize(250); }}/>
            </label>
            <button type="button" className="soc-chat-clear" onClick={clearFilters}
              disabled={!messageSearch && year === "all" && !attachmentsOnly && !advancedCount}>
              <X size={14} aria-hidden="true"/> Clear filters
            </button>
          </div>}
          {hasInvalidRange && <p className="soc-chat-filter-error" role="alert">
            The end date must be on or after the start date.
          </p>}
          <div className="soc-chat-filter-status" role="status">
            {formatNumber(filtered.length)} matching messages
            {advancedCount > 0 && !showExtra ? " · " + advancedCount + " extra filters active" : ""}
          </div>
          <div className="soc-chat-messages" ref={scroll}>
            {filtered.length > visibleMessages.length && <button type="button" className="soc-chat-load-older"
              onClick={loadOlder}>
              Show {formatNumber(Math.min(250, filtered.length - visibleMessages.length))} older messages
              <span>{formatNumber(filtered.length - visibleMessages.length)} more in this conversation</span>
            </button>}
            {groups.length === 0 && <EmptyState icon={MessageCircle}
              title={current.messages.length ? "No messages match these filters" : "No readable messages"}>
              {current.messages.length
                ? "Try another keyword, date or attachment filter."
                : "This conversation was exported without messages that Offline can display yet."}
            </EmptyState>}
            {groups.map((group) => <div key={group.key}>
              <div className="soc-chat-date"><span>{group.label}</span></div>
              {group.messages.map((message) => <article className="soc-message" key={message.id}>
                <Avatar name={message.sender}/>
                <div className="soc-message-main">
                  <div className="soc-message-label"><strong>{message.sender}</strong>
                    <time dateTime={timeISOString(message.timestamp)}>{clockLabel(message.timestamp)}</time></div>
                  <div className="soc-message-bubble">
                    {message.text && <p>{message.text}</p>}
                    {message.mediaPaths?.length ? <MediaStrip zipPath={sourceZip} paths={message.mediaPaths}
                      count={message.attachments} compact/> : null}
                    {message.attachments > 0 && !message.mediaPaths?.length && <span className="soc-attachment">
                      <File size={14} aria-hidden="true"/>
                      {message.attachments} attachment{message.attachments === 1 ? "" : "s"} referenced</span>}
                  </div>
                </div>
              </article>)}
            </div>)}
          </div>
          <div className="soc-readonly-compose"><LockKeyhole size={16} aria-hidden="true"/> Archived conversation — read only.</div>
        </> : <EmptyState icon={MessagesSquare} title="Select a conversation">
          Imported conversations appear here, organized by participant and date.
        </EmptyState>}
      </section>
    </div>
    {archive.social.conversations.length > 0 && <p className="soc-soft-caption">
      Some end-to-end encrypted Messenger history may not be included in a standard Facebook download.</p>}
  </div>;
}
