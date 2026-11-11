import { useEffect, useMemo, useRef, useState } from "react";
import { File, LockKeyhole, MessageCircle, MessagesSquare } from "lucide-react";
import { formatNumber } from "../archive";
import { clockLabel, dateLabel, filterConversations, messageDays, type ImportedArchive } from "../social-model";
import { Avatar, EmptyState, timeISOString } from "./Shared";

export default function Messages({ archive, query }: { archive: ImportedArchive; query: string }) {
  const chats = useMemo(() => filterConversations(archive.social.conversations, query), [archive, query]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = chats.find((chat) => chat.id === selected) ?? chats[0];
  const visibleMessages = current?.messages.slice(-500) ?? [];
  const groups = messageDays(visibleMessages);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [current?.id]);

  return <div className="soc-content soc-messages-page">
    <div className="soc-page-heading"><h1>Conversations<span>.</span></h1>
      <p>Find your people and revisit messages organized by person and date.</p></div>
    <div className="soc-inbox">
      <aside className="soc-thread-list" aria-label="Conversations">
        <div className="soc-thread-title">All conversations <span>{formatNumber(chats.length)}</span></div>
        {chats.map((chat) => {
          const latest = chat.messages[chat.messages.length - 1];
          return <button type="button" key={chat.id} className={"soc-thread " + (current?.id === chat.id ? "active" : "")}
            onClick={() => setSelected(chat.id)} aria-current={current?.id === chat.id ? "true" : undefined}>
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
          <div className="soc-chat-messages" ref={scroll}>
            {current.messages.length > visibleMessages.length && <p className="soc-chat-limited">Showing the 500 most recent messages in this conversation.</p>}
            {groups.length === 0 && <EmptyState icon={MessageCircle} title="No readable messages">
              This conversation was exported without messages that Offline can display yet.
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
                    {message.attachments > 0 && <span className="soc-attachment"><File size={14} aria-hidden="true"/>
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
