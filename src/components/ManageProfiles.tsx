import { useState, type FormEvent } from "react";
import { ArrowLeft, Check, Info, LockKeyhole, Pencil, ShieldAlert, Trash2, Users } from "lucide-react";
import type { FamilyProfile } from "../profiles";

export default function ManageProfiles({ profiles, activeId, onDone, onRename, onDelete }: {
  profiles: readonly FamilyProfile[];
  activeId: string;
  onDone: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(activeId || profiles[0]?.id || "");
  const [name, setName] = useState(() => profiles.find(p => p.id === activeId)?.displayName ?? profiles[0]?.displayName ?? "");
  const [confirm, setConfirm] = useState("");
  const [understands, setUnderstands] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = profiles.find(p => p.id === selectedId);

  function choose(id: string) {
    const next = profiles.find(p => p.id === id);
    setSelectedId(id);
    setName(next?.displayName ?? "");
    setConfirm(""); setUnderstands(false); setShowDelete(false);
    setError(""); setNotice("");
  }

  function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    setError(""); setNotice("");
    try {
      onRename(selected.id, name);
      setName(name.trim().replace(/\s+/g, " ").slice(0, 50));
      setNotice("Profile renamed. Its saved archive and encryption identity are unchanged.");
      setConfirm(""); setShowDelete(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not rename this profile.");
    }
  }

  async function remove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || confirm !== selected.displayName || !understands || busy) return;
    setBusy(true); setError("");
    try {
      await onDelete(selected.id);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this profile. Nothing else was deleted.");
    } finally { setBusy(false); }
  }

  return <main className="soc-restore-page">
    <div className="soc-restore-wrap soc-manage-wrap">
      <div className="soc-restore-top">
        <div className="soc-brand-logo"><Users size={24} aria-hidden="true"/></div>
        <button className="soc-restore-back" type="button" onClick={onDone} disabled={busy}>
          <ArrowLeft size={17} aria-hidden="true"/> Return to library
        </button>
      </div>
      <h1>Family profiles<span>.</span></h1>
      <p className="soc-restore-lead">Choose a family member to update their display name or remove their local profile. Saved previews are encrypted independently by profile ID.</p>
      <section className="soc-restore-surface soc-manage-surface" aria-label="Manage family profiles">
        <label className="soc-manage-label" htmlFor="soc-manage-select">Family member</label>
        <select id="soc-manage-select" className="soc-manage-select" value={selectedId}
          onChange={event => choose(event.target.value)} disabled={busy}>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
        {selected && <>
          <div className="soc-manage-identity">
            <span className="soc-profile-avatar" style={{background:selected.accent}} aria-hidden="true">
              {selected.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div><strong>{selected.displayName}</strong><span>Local family profile · Archive owner ID stays the same when renamed</span></div>
          </div>
          <form className="soc-manage-rename" onSubmit={rename}>
            <div className="soc-manage-section-head"><Pencil size={18} aria-hidden="true"/><h2>Rename this profile</h2></div>
            <label className="soc-manage-label" htmlFor="soc-profile-rename">Display name</label>
            <input id="soc-profile-rename" value={name} maxLength={50} autoComplete="off"
              onChange={event => setName(event.target.value)} disabled={busy} required/>
            <button type="submit" className="soc-primary" disabled={!name.trim() || busy}>
              <Check size={16} aria-hidden="true"/> Save name
            </button>
          </form>
          <div className="soc-manage-delete">
            <div className="soc-manage-section-head"><ShieldAlert size={18} aria-hidden="true"/><h2>Remove this profile</h2></div>
            <p>Deleting removes this profile's local preview, encrypted saved copy and profile settings from this Offline installation. It does not delete the original Facebook ZIP or any exported .offlinevault backups.</p>
            {!showDelete ? <button type="button" className="soc-manage-danger-outline"
              onClick={() => { setShowDelete(true); setError(""); setNotice(""); }}>
              <Trash2 size={16} aria-hidden="true"/> Review deletion
            </button> : <form className="soc-manage-confirm" onSubmit={remove}>
              <p>Before deleting, export an encrypted backup if you want to recover these memories later. This action cannot be undone inside Offline.</p>
              <label className="soc-manage-label" htmlFor="soc-delete-confirm">
                Type <strong>{selected.displayName}</strong> to confirm
              </label>
              <input id="soc-delete-confirm" autoComplete="off" value={confirm}
                onChange={event => setConfirm(event.target.value)} disabled={busy}/>
              <label className="soc-manage-confirm-check">
                <input type="checkbox" checked={understands} onChange={event => setUnderstands(event.target.checked)} disabled={busy}/>
                <span>I understand the saved preview will be deleted from this installation.</span>
              </label>
              <div className="soc-manage-actions">
                <button type="submit" className="soc-manage-danger" disabled={busy || !understands || confirm !== selected.displayName}>
                  <Trash2 size={16} aria-hidden="true"/>{busy ? "Removing…" : "Permanently remove profile"}
                </button>
                <button type="button" className="soc-restore-back" disabled={busy}
                  onClick={() => { setShowDelete(false); setConfirm(""); setUnderstands(false); }}>
                  Cancel
                </button>
              </div>
            </form>}
          </div>
        </>}
        {error && <div className="soc-restore-error" role="alert"><Info size={17}/>{error}</div>}
        {notice && <div className="soc-success" role="status"><Check size={17}/>{notice}</div>}
      </section>
      <p className="soc-soft-caption"><LockKeyhole size={15} aria-hidden="true"/>
        Family profiles are not Windows accounts. Anyone using the same Windows account may be able to delete local app data; keep independent encrypted backups for recovery.</p>
    </div>
  </main>;
}
