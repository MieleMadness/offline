import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Archive,
  ArrowDownToLine,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  File,
  FileImage,
  FileText,
  Film,
  FolderClosed,
  FolderOpen,
  Heart,
  Image,
  Info,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  NotebookText,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  SECTION_IDS,
  SECTION_LABELS,
  fileName,
  filterEntries,
  formatNumber,
  formatSize,
  type ActiveSection,
  type ArchiveEntry,
  type ArchiveReport,
  type SectionId,
} from "./archive";

type Screen = "overview" | "files";
type Sort = "name" | "size";

const CATEGORY_ICONS: Record<SectionId, LucideIcon> = {
  photos: Image,
  videos: Film,
  messages: MessagesSquare,
  posts: NotebookText,
  comments: MessageCircle,
  reactions: Heart,
  friends: UsersRound,
  profile: UserRound,
  other: File,
};

function EntryIcon({ entry }: { entry: ArchiveEntry }) {
  if (entry.section === "photos") return <FileImage aria-hidden="true" size={19} />;
  if (entry.section === "videos") return <Film aria-hidden="true" size={19} />;
  if (["messages", "posts", "comments", "reactions", "friends", "profile"].includes(entry.section)) {
    return <FileText aria-hidden="true" size={19} />;
  }
  return <File aria-hidden="true" size={19} />;
}

function Logo() {
  return (
    <div className="logo-wrap">
      <div className="brand-mark" aria-hidden="true">
        <Archive size={20} strokeWidth={2} />
      </div>
      <div>
        <div className="brand-name">offline<span className="brand-dot">.</span></div>
        <span className="brand-caption">PERSONAL ARCHIVE</span>
      </div>
    </div>
  );
}

function PrivacyNote() {
  return (
    <div className="privacy-note">
      <div className="privacy-icon"><LockKeyhole size={16} aria-hidden="true" /></div>
      <div>
        <strong>Your files stay yours.</strong>
        <span>Everything is inspected on this device. No account connection, no cloud upload.</span>
      </div>
    </div>
  );
}

export default function App() {
  const [report, setReport] = useState<ArchiveReport | null>(null);
  const [screen, setScreen] = useState<Screen>("overview");
  const [section, setSection] = useState<ActiveSection>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => filterEntries(report?.entries ?? [], section, search, sort),
    [report, section, search, sort],
  );

  const viewFiles = (nextSection: ActiveSection) => {
    setSection(nextSection);
    setScreen("files");
    setSearch("");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (report) {
          event.preventDefault();
          setScreen("files");
          searchRef.current?.focus();
        }
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setSearch("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [report]);

  const chooseArchive = async () => {
    if (busy) return;
    setError("");
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "ZIP archives", extensions: ["zip"] }],
      });
      if (!selected || typeof selected !== "string") return;
      setBusy(true);
      const next = await invoke<ArchiveReport>("inspect_archive", { path: selected });
      setReport(next);
      setScreen("overview");
      setSection("all");
      setSearch("");
      setSort("name");
    } catch (reason) {
      setError(
        typeof reason === "string"
          ? reason
          : "Offline could not open this ZIP. Check the file and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const totalFor = (id: SectionId): number =>
    report?.sections.find((item) => item.id === id)?.count ?? 0;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Logo />
        <div className="sidebar-body">
          <div className="nav-heading">WORKSPACE</div>
          <nav aria-label="Workspace">
            <button
              type="button"
              className={`nav-link ${screen === "overview" ? "active" : ""}`}
              onClick={() => setScreen("overview")}
              aria-current={screen === "overview" ? "page" : undefined}
            >
              <FolderClosed aria-hidden="true" size={18} />
              <span>Overview</span>
            </button>
            <button
              type="button"
              className={`nav-link ${screen === "files" && section === "all" ? "active" : ""}`}
              onClick={() => viewFiles("all")}
              disabled={!report}
              aria-current={screen === "files" && section === "all" ? "page" : undefined}
            >
              <Archive aria-hidden="true" size={18} />
              <span>All files</span>
              {report && <span className="nav-count">{formatNumber(report.totalFiles)}</span>}
            </button>
          </nav>

          <div className="nav-heading nav-heading-categories">BROWSE BY TYPE</div>
          <nav aria-label="Archive categories">
            {SECTION_IDS.map((id) => {
              const Icon = CATEGORY_ICONS[id];
              const count = totalFor(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`nav-link ${screen === "files" && section === id ? "active" : ""}`}
                  onClick={() => viewFiles(id)}
                  disabled={!report}
                  aria-current={screen === "files" && section === id ? "page" : undefined}
                >
                  <Icon aria-hidden="true" size={18} />
                  <span>{SECTION_LABELS[id]}</span>
                  {report && <span className="nav-count">{formatNumber(count)}</span>}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-footer-heading"><ShieldCheck size={17} aria-hidden="true" /> Private by design</div>
          <p>Your archive is inspected locally. Original files are never changed.</p>
          <span className="version-line">Offline 0.1.0 · Preview</span>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <span>My library</span>
            <ChevronRight aria-hidden="true" size={15} />
            <strong>{screen === "overview" ? "Overview" : section === "all" ? "All files" : SECTION_LABELS[section]}</strong>
          </div>
          <div className="toolbar-actions">
            <span className="local-status"><span className="status-dot" /> Offline mode</span>
            <button className="top-import" type="button" onClick={chooseArchive} disabled={busy}>
              <ArrowDownToLine size={17} aria-hidden="true" />
              {busy ? "Reading archive…" : report ? "Open another ZIP" : "Import archive"}
            </button>
          </div>
        </header>

        <main className="main-content">
          {error && (
            <div className="error-banner" role="alert">
              <Info size={19} aria-hidden="true" />
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          )}

          {!report ? (
            <section className="welcome-screen" aria-labelledby="welcome-title">
              <div className="welcome-copy">
                <div className="welcome-label">WELCOME TO OFFLINE</div>
                <h1 id="welcome-title">Your history.<br /><em>In your hands.</em></h1>
                <p>
                  A calm, private place for everything you've saved and shared.
                  Start with a Facebook data export. We'll show you what's inside.
                </p>
                <button type="button" className="primary-button" onClick={chooseArchive} disabled={busy}>
                  <FolderOpen size={19} aria-hidden="true" />
                  {busy ? "Reading ZIP…" : "Choose a ZIP archive"}
                  {!busy && <ArrowRight aria-hidden="true" size={17} />}
                </button>
                <span className="welcome-help">No Facebook password needed · ZIP files only for now</span>
              </div>
              <div className="welcome-panel" aria-label="What Offline can inspect">
                <div className="preview-topline">
                  <span className="preview-title"><Archive size={18} aria-hidden="true" /> Inside your archive</span>
                  <span className="preview-badge">ON THIS DEVICE</span>
                </div>
                <div className="preview-list">
                  {[
                    { icon: Image, title: "Photos & videos", subtitle: "The memories you captured" },
                    { icon: MessagesSquare, title: "Conversations", subtitle: "The people and words you shared" },
                    { icon: NotebookText, title: "Posts & activity", subtitle: "Moments across the years" },
                    { icon: UsersRound, title: "Connections", subtitle: "Your personal history, organized" },
                  ].map(({ icon: Icon, title, subtitle }) => (
                    <div className="preview-row" key={title}>
                      <div className="preview-icon"><Icon size={20} aria-hidden="true" /></div>
                      <div><strong>{title}</strong><span>{subtitle}</span></div>
                      <ChevronRight size={17} aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <div className="preview-bottom"><LockKeyhole size={15} aria-hidden="true" /> Read-only inspection. Nothing leaves this computer.</div>
              </div>
              <PrivacyNote />
            </section>
          ) : screen === "overview" ? (
            <section className="loaded-screen" aria-labelledby="overview-heading">
              <div className="eyebrow-line"><CheckCircle2 size={16} aria-hidden="true" /> Archive opened successfully</div>
              <div className="page-heading-row">
                <div>
                  <h1 id="overview-heading">Your archive overview</h1>
                  <p className="page-subtitle">A first look at the files inside your export. Browse by type or search for a filename.</p>
                </div>
                <button type="button" className="secondary-button" onClick={() => viewFiles("all")}>Explore files <ArrowRight size={16} aria-hidden="true" /></button>
              </div>
              <div className="archive-summary">
                <div className="archive-title-row">
                  <div className="archive-icon"><Archive size={22} aria-hidden="true" /></div>
                  <div className="archive-label">
                    <strong title={report.archiveName}>{report.archiveName}</strong>
                    <span>{report.formatHint} · Local ZIP</span>
                  </div>
                  <span className="safe-tag"><ShieldCheck size={15} aria-hidden="true" /> Read only</span>
                </div>
                <div className="summary-grid">
                  <div><span>Files discovered</span><strong>{formatNumber(report.totalFiles)}</strong></div>
                  <div><span>Uncompressed size</span><strong>{formatSize(report.totalUncompressedBytes)}</strong></div>
                  <div><span>Types recognized</span><strong>{formatNumber(report.sections.filter((item) => item.count > 0 && item.id !== "other").length)}</strong></div>
                </div>
              </div>
              <div className="section-title-row">
                <div><h2>Browse your archive</h2><p>Choose a category to see its files.</p></div>
              </div>
              <div className="category-list">
                {report.sections.filter((item) => item.count > 0).map((item) => {
                  const Icon = CATEGORY_ICONS[item.id];
                  return (
                    <button type="button" className="category-row" key={item.id} onClick={() => viewFiles(item.id)}>
                      <div className="category-icon"><Icon size={20} aria-hidden="true" /></div>
                      <div className="category-copy"><strong>{item.label}</strong><span>{formatNumber(item.count)} files</span></div>
                      <span className="category-size">{formatSize(item.bytes)}</span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  );
                })}
                {report.totalFiles === 0 && <div className="empty-list">This ZIP has no files to display.</div>}
              </div>
              <p className="inventory-disclaimer"><Info size={16} aria-hidden="true" /> This preview classifies ZIP filenames only. Message contents, photo previews, and timelines are planned next.</p>
            </section>
          ) : (
            <section className="loaded-screen files-screen" aria-labelledby="files-heading">
              <div className="page-heading-row">
                <div>
                  <h1 id="files-heading">{section === "all" ? "All files" : SECTION_LABELS[section]}</h1>
                  <p className="page-subtitle">Inspect file names and sizes without opening or extracting the original archive.</p>
                </div>
                <span className="file-count">{formatNumber(filtered.length)} shown</span>
              </div>
              <div className="filter-toolbar">
                <label className="search-field">
                  <Search size={18} aria-hidden="true" />
                  <span className="sr-only">Search filenames</span>
                  <input
                    ref={searchRef}
                    type="search"
                    placeholder="Search filenames…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <span className="search-shortcut" aria-hidden="true">Ctrl K</span>
                </label>
                <label className="sort-label">Sort by
                  <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                    <option value="name">Name A–Z</option>
                    <option value="size">Largest first</option>
                  </select>
                </label>
              </div>
              <div className="file-list">
                <div className="file-list-head"><span>NAME</span><span>CATEGORY</span><span>SIZE</span></div>
                {filtered.map((entry, index) => (
                  <div className="file-row" key={`${entry.path}:${index}`}>
                    <div className="filename-cell">
                      <div className="file-icon"><EntryIcon entry={entry} /></div>
                      <div>
                        <strong title={entry.path}>{fileName(entry.path)}</strong>
                        <span title={entry.path}>{entry.path}</span>
                      </div>
                    </div>
                    <span className="file-category">{SECTION_LABELS[entry.section]}</span>
                    <span className="file-size">{formatSize(entry.bytes)}</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="file-empty">
                    <Search size={26} aria-hidden="true" />
                    <strong>No matching files</strong>
                    <p>Try another filename or category.</p>
                    {search && <button type="button" className="text-link" onClick={() => setSearch("")}>Clear search</button>}
                  </div>
                )}
              </div>
              {report.displayedFiles < report.totalFiles && (
                <p className="inventory-disclaimer"><Info size={16} aria-hidden="true" /> Preview limited to the first {formatNumber(report.displayedFiles)} files. Category totals cover the full archive. Full indexing is coming in a later update.</p>
              )}
            </section>
          )}
        </main>
        <footer className="statusbar">
          <span><ShieldCheck size={13} aria-hidden="true" /> Your data stays on this device</span>
          <span><CalendarDays size={13} aria-hidden="true" /> Offline v0.1.0</span>
        </footer>
      </div>
    </div>
  );
}
