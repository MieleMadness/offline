import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Archive, ArrowDownToLine, ArrowRight, CalendarDays, Check,
  ChevronRight, FileArchive, FolderOpen, Info, LockKeyhole, Menu,
  MessagesSquare, Search, ShieldCheck, X, type LucideIcon,
} from "lucide-react";
import { formatNumber, formatSize, type ArchiveReport } from "./archive";
import { meaningfulCount, type ImportedArchive, type SocialArchive } from "./social-model";
import Feed from "./components/Feed";
import Messages from "./components/Messages";
import Data from "./components/Data";
import Files from "./components/Files";
import { createProfile, safeActiveId, safeLoadProfiles, saveProfiles, type FamilyProfile } from "./profiles";
import ProfilePicker from "./components/ProfilePicker";
import "./social.css";

type View = "feed" | "messages" | "data" | "files";
const navigation: { id: View; name: string; icon: LucideIcon }[] = [
  { id: "feed", name: "My timeline", icon: CalendarDays },
  { id: "messages", name: "Messages", icon: MessagesSquare },
  { id: "data", name: "Your data", icon: ShieldCheck },
  { id: "files", name: "Archive files", icon: FileArchive },
];
const labels: Record<View, string> = {
  feed: "My timeline", messages: "Messages", data: "Your data", files: "Archive files",
};
const placeholders: Record<View, string> = {
  feed: "Search posts", messages: "Search people or messages",
  data: "Search collected data", files: "Search filenames",
};

export default function SocialApp() {
  const [profiles, setProfiles] = useState<FamilyProfile[]>(safeLoadProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(() => safeActiveId(safeLoadProfiles()));
  // Content is memory-only in the preview; cross-profile indexes are not shared.
  const [archivesByProfile, setArchivesByProfile] = useState<Record<string, ImportedArchive>>({});
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const archive = activeProfile ? (archivesByProfile[activeProfileId] ?? null) : null;
  const [view, setView] = useState<View>("feed");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveProfiles(profiles, activeProfileId);
  }, [profiles, activeProfileId]);

  const addFamilyProfile = (name: string) => {
    const profile = createProfile(profiles, name, () => crypto.randomUUID(), Date.now());
    setProfiles((existing) => [...existing, profile]);
    setActiveProfileId(profile.id);
    setView("feed");
    setQuery("");
    setError("");
    setMenuOpen(false);
  };

  const chooseFamilyProfile = (id: string) => {
    if (busy || !profiles.some((profile) => profile.id === id)) return;
    setActiveProfileId(id);
    setView("feed");
    setQuery("");
    setError("");
    setMenuOpen(false);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (archive && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [archive]);

  function navigate(destination: View) {
    setView(destination);
    setQuery("");
    setMenuOpen(false);
  }

  async function importZip() {
    if (busy) return;
    if (!activeProfile) {
      setError("Create a family profile before importing an archive.");
      return;
    }
    // Capture owner before any asynchronous file reading; never assign a result to a switched user.
    const ownerId = activeProfile.id;
    setError("");
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "ZIP archives", extensions: ["zip"] }],
      });
      if (!selected || typeof selected !== "string") return;
      setBusy(true);
      const report = await invoke<ArchiveReport>("inspect_archive", { path: selected });
      const social = await invoke<SocialArchive>("read_social_archive", { path: selected });
      setArchivesByProfile((existing) => ({ ...existing, [ownerId]: { report, social } }));
      setView("feed");
      setQuery("");
    } catch (cause) {
      setError(typeof cause === "string"
        ? cause : "Offline couldn't open this ZIP. Check the file and try again.");
    } finally {
      setBusy(false);
    }
  }

  const counts: Record<View, number> = {
    feed: archive?.social.posts.length ?? 0,
    messages: archive?.social.conversations.length ?? 0,
    data: archive?.social.dataCategories.length ?? 0,
    files: archive?.report.totalFiles ?? 0,
  };

  return <div className="soc-shell">
    <aside className={"soc-sidebar " + (menuOpen ? "mobile-open" : "")}>
      <div className="soc-brand"><div className="soc-brand-logo"><Archive size={22} aria-hidden="true"/></div>
        <span><strong>offline<span>.</span></strong><small>YOUR DIGITAL HISTORY</small></span>
      </div>
      <ProfilePicker profiles={profiles} activeId={activeProfileId} disabled={busy}
        onChoose={chooseFamilyProfile} onCreate={addFamilyProfile}/>
      <div className="soc-side-label">YOUR LIBRARY</div>
      <nav className="soc-nav" aria-label="Archive sections">
        {navigation.map(({ id, name, icon: Icon }) => <button key={id}
          type="button" className={"soc-nav-item " + (view === id ? "active" : "")}
          disabled={!archive} onClick={() => navigate(id)}
          aria-current={archive && view === id ? "page" : undefined}>
          <Icon size={19} aria-hidden="true"/><span>{name}</span>
          {archive && <small>{formatNumber(counts[id])}</small>}
        </button>)}
      </nav>
      <div className="soc-sidebar-bottom">
        {archive && <div className="soc-archive-identity"><FileArchive size={18} aria-hidden="true"/>
          <span><strong title={archive.report.archiveName}>{archive.report.archiveName}</strong>
            <small>{formatNumber(archive.report.totalFiles)} files · {formatSize(archive.report.totalUncompressedBytes)}</small></span>
        </div>}
        <div className="soc-private"><LockKeyhole size={17} aria-hidden="true"/>
          <span><strong>Local archive preview</strong><small>Profile switch is not a security lock.</small></span>
        </div>
        <span className="soc-version">Offline v0.3.0 · Development preview</span>
      </div>
    </aside>
    <div className="soc-main">
      <header className="soc-topbar">
        <div className="soc-crumb">
          <button type="button" className="soc-mobile-trigger" aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}><Menu size={20}/></button>
          <span>My archive</span><ChevronRight size={15} aria-hidden="true"/>
          <strong>{labels[view]}</strong>
        </div>
        <div className="soc-top-controls">
          {archive && <label className="soc-top-search">
            <Search size={17} aria-hidden="true"/><span className="sr-only">{placeholders[view]}</span>
            <input ref={searchRef} type="search" placeholder={placeholders[view]}
              value={query} onChange={(event) => setQuery(event.target.value)}/>
            <kbd>Ctrl K</kbd>
          </label>}
          <button type="button" className="soc-import" onClick={importZip} disabled={busy || !activeProfile}>
            <ArrowDownToLine size={17} aria-hidden="true"/>
            <span>{busy ? "Reading…" : archive ? "Change archive" : "Import ZIP"}</span>
          </button>
        </div>
      </header>
      {error && <div className="soc-error" role="alert"><Info size={19} aria-hidden="true"/>
        <span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={18}/></button>
      </div>}
      <main className="soc-scroll">
        {!archive ? <div className="soc-welcome"><div className="soc-welcome-inner">
          <div className="soc-welcome-symbol"><Archive size={27} aria-hidden="true"/></div>
          <h1>{activeProfile ? "Every memory has a place" : "Every story starts somewhere"}<span>.</span></h1>
          <p>{activeProfile
            ? "Welcome to " + activeProfile.displayName + "'s library. Bring a Facebook download to life with a familiar timeline, conversations and account activity."
            : "Create the first family profile using the sidebar. Each person will have their own archive view—no accounts or cloud upload required."}</p>
          <button type="button" className="soc-primary" onClick={importZip} disabled={busy || !activeProfile}>
            <FolderOpen size={19} aria-hidden="true"/>{busy ? "Reading archive…" : "Choose your Facebook ZIP"}
            <ArrowRight size={17} aria-hidden="true"/>
          </button>
          <div className="soc-welcome-facts">
            <span><Check size={15} aria-hidden="true"/> No password</span>
            <span><Check size={15} aria-hidden="true"/> No upload</span>
            <span><Check size={15} aria-hidden="true"/> Read-only source</span>
          </div>
          <div className="soc-welcome-tiles">
            <div><CalendarDays size={22} aria-hidden="true"/><strong>Your timeline</strong><span>Posts by date</span></div>
            <div><MessagesSquare size={22} aria-hidden="true"/><strong>Messages</strong><span>People & conversations</span></div>
            <div><ShieldCheck size={22} aria-hidden="true"/><strong>Your data</strong><span>See your export</span></div>
          </div>
          <p className="soc-preview-limit">Early preview: Facebook JSON posts, Messenger threads and selected data records. Actual media previews and more export formats are planned for later updates.</p>
        </div></div> : <>
          {view === "feed" && <Feed archive={archive} query={query}/>}
          {view === "messages" && <Messages archive={archive} query={query}/>}
          {view === "data" && <Data archive={archive} query={query}/>}
          {view === "files" && <Files report={archive.report} query={query}/>}
          <footer className="soc-bottom-status"><span><LockKeyhole size={13} aria-hidden="true"/> Files stay on this device</span>
            <span>{formatNumber(archive.social.filesRead)} JSON files · {formatNumber(meaningfulCount(archive.social))} preview records</span>
          </footer>
        </>}
      </main>
    </div>
  </div>;
}
