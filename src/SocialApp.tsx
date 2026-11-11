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
import { createProfile, profileOwnedValue, safeActiveId, safeLoadProfiles, saveProfiles, setProfileOwnedValue, type FamilyProfile } from "./profiles";
import ProfilePicker from "./components/ProfilePicker";
import ImportSummary from "./components/ImportSummary";
import QuickSearch from "./components/QuickSearch";
import VaultForm from "./components/VaultForm";
import { deriveKey, loadSnapshot, saveSnapshot, seal, unseal, type Snapshot } from "./vault";
import "./social.css";

type View = "feed" | "messages" | "data" | "files" | "search";
const navigation: { id: View; name: string; icon: LucideIcon }[] = [
  { id: "feed", name: "My timeline", icon: CalendarDays },
  { id: "messages", name: "Messages", icon: MessagesSquare },
  { id: "data", name: "Your data", icon: ShieldCheck },
  { id: "files", name: "Archive files", icon: FileArchive },
  { id: "search", name: "Search library", icon: Search },
];
const labels: Record<View, string> = {
  feed: "My timeline", messages: "Messages", data: "Your data", files: "Archive files", search: "Search library",
};
const placeholders: Record<View, string> = {
  feed: "Search posts", messages: "Search people or messages",
  data: "Search collected data", files: "Search filenames", search: "Search this profile",
};

export default function SocialApp() {
  const [profiles, setProfiles] = useState<FamilyProfile[]>(safeLoadProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string>(() => safeActiveId(safeLoadProfiles()));
  // Content is memory-only in the preview; cross-profile indexes are not shared.
  const [archivesByProfile, setArchivesByProfile] = useState<Record<string, ImportedArchive>>({});
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  useEffect(() => { saveProfiles(profiles, activeProfileId); }, [profiles, activeProfileId]);

  function addFamilyProfile(name: string) {
    const profile = createProfile(profiles, name, () => crypto.randomUUID(), Date.now());
    setProfiles(existing => [...existing, profile]);
    setActiveProfileId(profile.id);
  }

  return <Library key={activeProfileId} profiles={profiles} activeProfile={activeProfile}
    sessionArchive={profileOwnedValue(archivesByProfile, activeProfileId)}
    onSessionArchive={archive => setArchivesByProfile(existing => {
      if (archive) return setProfileOwnedValue(existing, activeProfileId, archive);
      const copy = { ...existing };
      delete copy[activeProfileId];
      return copy;
    })}
    onChoose={setActiveProfileId} onCreate={addFamilyProfile}/>;
}

// Switching owner unmounts decrypted content, search/filter state and the in-memory key together.
function Library({ profiles, activeProfile, sessionArchive, onSessionArchive, onChoose, onCreate }: {
  profiles: FamilyProfile[]; activeProfile?: FamilyProfile; sessionArchive: ImportedArchive | null;
  onSessionArchive: (value: ImportedArchive | null) => void;
  onChoose: (id: string) => void; onCreate: (name: string) => void;
}) {
  const activeProfileId = activeProfile?.id ?? "";
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState<{ key: CryptoKey; archive: ImportedArchive } | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const pending = useRef(false);
  const locked = !!snapshot && !unlocked;
  const archive = ready ? (snapshot ? unlocked?.archive ?? null : sessionArchive) : null;
  const [view, setView] = useState<View>("feed");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    let current = true;
    if (!activeProfileId) { setReady(true); return; }
    loadSnapshot(activeProfileId).then(saved => {
      if (current) { setSnapshot(saved); setReady(true); }
    }).catch(() => {
      if (current) setError("Saved previews could not be opened. Reopen this profile to retry.");
    });
    return () => { current = false; };
  }, [activeProfileId]);

  function begin() {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    return true;
  }
  function finish() { pending.current = false; setBusy(false); }
  function lock() {
    setUnlocked(null);
    setQuery("");
    setView("feed");
    setError("");
  }

  async function submitPassphrase(password: string, credential: "passphrase" | "pin") {
    if (!begin()) return false;
    try {
      if (snapshot && !enrolling) {
        const key = await deriveKey(password, snapshot.salt);
        const decoded = await unseal(activeProfileId, snapshot, key);
        setUnlocked({ key, archive: decoded });
      } else {
        if (!archive || !safeLoadProfiles().some(p => p.id === activeProfileId)) {
          throw new Error("Profile preferences must be available before saving a preview.");
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveKey(password, salt);
        const next = { ...await seal(activeProfileId, archive, key, salt), credential };
        await saveSnapshot(activeProfileId, next, snapshot?.revision ?? null);
        setSnapshot(next);
        onSessionArchive(null);
        setEnrolling(false);
        lock();
      }
      return true;
    } catch {
      setError(snapshot && !enrolling ? "Could not unlock this preview. Check the PIN or passphrase. A damaged copy also cannot be opened." :
        "The encrypted preview could not be saved. Your session preview is still open.");
      return false;
    } finally { finish(); }
  }

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
    if (!ready || locked || enrolling) return;
    if (!activeProfile) {
      setError("Create a family profile before importing an archive.");
      return;
    }
    // Capture owner before any asynchronous file reading; never assign a result to a switched user.
    const ownerId = activeProfile.id;
    if (!begin()) return;
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "ZIP archives", extensions: ["zip"] }],
      });
      if (!selected || typeof selected !== "string") return;
      const report = await invoke<ArchiveReport>("inspect_archive", { path: selected });
      const social = await invoke<SocialArchive>("read_social_archive", { path: selected });
      const imported = { report, social };
      if (snapshot && unlocked) {
        const next = { ...await seal(ownerId, imported, unlocked.key, snapshot.salt), credential: snapshot.credential };
        await saveSnapshot(ownerId, next, snapshot.revision);
        setSnapshot(next);
        setUnlocked({ key: unlocked.key, archive: imported });
      } else {
        onSessionArchive(imported);
      }
      setView("feed");
      setQuery("");
    } catch (cause) {
      setError(typeof cause === "string"
        ? cause : "Offline couldn't open this ZIP. Check the file and try again.");
    } finally {
      finish();
    }
  }

  const counts: Record<View, number> = {
    feed: archive?.social.posts.length ?? 0,
    messages: archive?.social.conversations.length ?? 0,
    data: archive?.social.dataCategories.length ?? 0,
    files: archive?.report.totalFiles ?? 0,
    search: archive ? meaningfulCount(archive.social) : 0,
  };

  return <div className="soc-shell">
    <aside className={"soc-sidebar " + (menuOpen ? "mobile-open" : "")}>
      <div className="soc-brand"><div className="soc-brand-logo"><Archive size={22} aria-hidden="true"/></div>
        <span><strong>offline<span>.</span></strong><small>YOUR DIGITAL HISTORY</small></span>
      </div>
      <ProfilePicker profiles={profiles} activeId={activeProfileId} disabled={busy}
        onChoose={id => { if (!pending.current) onChoose(id); }} onCreate={name => { if (!pending.current) onCreate(name); }}/>
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
          <span><strong>Local archive preview</strong><small>{snapshot ? "Saved preview is encrypted." : "Session preview · no passphrase."}</small></span>
        </div>
        <span className="soc-version">Offline v0.5.0 · Development preview</span>
      </div>
    </aside>
    <div className="soc-main">
      <header className="soc-topbar">
        <div className="soc-crumb">
          <button type="button" className="soc-mobile-trigger" aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}><Menu size={20}/></button>
          <span>My archive</span><ChevronRight size={15} aria-hidden="true"/>
          <strong>{activeProfile ? activeProfile.displayName + " · " + labels[view] : "Family library"}</strong>
        </div>
        <div className="soc-top-controls">
          {archive && <label className="soc-top-search">
            <Search size={17} aria-hidden="true"/><span className="sr-only">{placeholders[view]}</span>
            <input ref={searchRef} type="search" placeholder={placeholders[view]}
              value={query} onChange={(event) => setQuery(event.target.value)}/>
            <kbd>Ctrl K</kbd>
          </label>}
          {unlocked && <button type="button" className="soc-vault-action" disabled={busy || enrolling}
            onClick={() => setEnrolling(true)}>Change PIN or passphrase</button>}
          {archive && <button type="button" className="soc-vault-action" disabled={busy || enrolling}
            onClick={snapshot ? lock : () => setEnrolling(true)}>{snapshot ? "Lock preview" : "Save encrypted copy"}</button>}
          <button type="button" className="soc-import" onClick={importZip} disabled={busy || !activeProfile || !ready || locked || enrolling}>
            <ArrowDownToLine size={17} aria-hidden="true"/>
            <span>{busy ? "Reading…" : locked ? "Preview locked" : unlocked ? "Replace saved preview" : activeProfile ? "Import for " + activeProfile.displayName : "Create a profile first"}</span>
          </button>
        </div>
      </header>
      {error && <div className="soc-error" role="alert"><Info size={19} aria-hidden="true"/>
        <span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={18}/></button>
      </div>}
      <main className="soc-scroll">
        {!ready ? <p className="soc-soft-caption" role="status">{error ? "Preview unavailable" : "Opening profile…"}</p> :
          locked || enrolling ? <VaultForm key={locked ? "unlock" : "save"} locked={locked} busy={busy} credential={snapshot?.credential ?? "passphrase"}
            onSubmit={submitPassphrase} onCancel={enrolling ? () => setEnrolling(false) : undefined}/> :
          !archive ? <div className="soc-welcome"><div className="soc-welcome-inner">
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
            <span><Check size={15} aria-hidden="true"/> No Facebook login</span>
            <span><Check size={15} aria-hidden="true"/> No upload</span>
            <span><Check size={15} aria-hidden="true"/> Read-only source</span>
          </div>
          <div className="soc-welcome-tiles">
            <div><CalendarDays size={22} aria-hidden="true"/><strong>Your timeline</strong><span>Posts by date</span></div>
            <div><MessagesSquare size={22} aria-hidden="true"/><strong>Messages</strong><span>People & conversations</span></div>
            <div><ShieldCheck size={22} aria-hidden="true"/><strong>Your data</strong><span>See your export</span></div>
          </div>
          <p className="soc-preview-limit">Preview supports recognized Facebook HTML and JSON post, message and selected account-data layouts. Use Save encrypted copy after importing to keep a passphrase-protected preview. Actual media previews and more export variants are planned.</p>
        </div></div> : <>
          <ImportSummary archive={archive} ownerName={activeProfile?.displayName ?? "Family member"}/>
          {view === "feed" && <Feed archive={archive} query={query}/>}
          {view === "messages" && <Messages archive={archive} query={query}/>}
          {view === "data" && <Data archive={archive} query={query}/>}
          {view === "files" && <Files report={archive.report} query={query}/>}
          {view === "search" && <QuickSearch key={snapshot?.revision ?? archive.report.archiveName} archive={archive} query={query}/>}
          <footer className="soc-bottom-status"><span><LockKeyhole size={13} aria-hidden="true"/> Files stay on this device</span>
            <span>{formatNumber(archive.social.filesRead)} HTML/JSON files · {formatNumber(meaningfulCount(archive.social))} preview records</span>
          </footer>
        </>}
      </main>
    </div>
  </div>;
}
