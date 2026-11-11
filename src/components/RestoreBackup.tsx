import { useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ArchiveRestore, ArrowLeft, FileLock2, FolderOpen, Info, LockKeyhole } from "lucide-react";
import { parseBackup, type PortableBackup } from "../backup";

export default function RestoreBackup({ onCancel, onRestore }: {
  onCancel: () => void;
  onRestore: (backup: PortableBackup, secret: string) => Promise<void>;
}) {
  const [backup, setBackup] = useState<PortableBackup | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function chooseFile() {
    if (busy) return;
    setBusy(true); setError(""); setBackup(null); setSecret("");
    try {
      const path = await open({
        multiple: false, directory: false,
        filters: [{ name: "Offline encrypted backups", extensions: ["offlinevault"] }],
      });
      if (typeof path !== "string") return;
      const contents = await invoke<string>("read_encrypted_backup_file", { path });
      setBackup(parseBackup(contents));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message :
        typeof cause === "string" ? cause : "Could not read the encrypted backup.");
    } finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!backup || !secret || busy) return;
    setBusy(true); setError("");
    try {
      await onRestore(backup, secret);
      setSecret("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The backup could not be restored.");
      setSecret("");
    } finally { setBusy(false); }
  }

  return <main className="soc-restore-page">
    <div className="soc-restore-wrap">
      <div className="soc-restore-top">
        <div className="soc-brand-logo"><ArchiveRestore size={25} aria-hidden="true"/></div>
        <button type="button" className="soc-restore-back" onClick={onCancel} disabled={busy}>
          <ArrowLeft size={17} aria-hidden="true"/> Return to library
        </button>
      </div>
      <h1>Restore a saved memory<span>.</span></h1>
      <p className="soc-restore-lead">Bring an encrypted Offline preview back to this computer. The original Facebook ZIP is not part of the backup.</p>
      <section className="soc-restore-surface" aria-label="Encrypted backup recovery">
        <div className="soc-restore-step">
          <FileLock2 size={25} aria-hidden="true"/>
          <div><h2>Choose an encrypted backup</h2><p>Open a previously exported .offlinevault file. Nothing is uploaded.</p></div>
        </div>
        <button type="button" className="soc-primary" onClick={chooseFile} disabled={busy}>
          <FolderOpen size={17} aria-hidden="true"/>{busy && !backup ? "Reading backup…" : backup ? "Choose another backup" : "Choose backup file"}
        </button>
        {backup && <form className="soc-restore-form" onSubmit={submit}>
          <div className="soc-restore-owner"><strong>{backup.profile.displayName}</strong>
            <span>Encrypted preview · {backup.snapshot.credential === "pin" ? "PIN" : "passphrase"} required</span></div>
          <label htmlFor="soc-recovery-secret">{backup.snapshot.credential === "pin" ? "Original PIN" : "Original passphrase"}</label>
          <input id="soc-recovery-secret" autoFocus type="password" required autoComplete="off"
            inputMode={backup.snapshot.credential === "pin" ? "numeric" : "text"}
            value={secret} disabled={busy} onChange={event => setSecret(event.target.value)}/>
          <button type="submit" className="soc-primary" disabled={busy || !secret}>
            <LockKeyhole size={17} aria-hidden="true"/>{busy ? "Verifying…" : "Verify and restore profile"}
          </button>
          <p>Existing saved copies are never replaced. If this profile already exists without a saved copy, Offline can recover its preview.</p>
        </form>}
        {error && <div className="soc-restore-error" role="alert"><Info size={17} aria-hidden="true"/>{error}</div>}
      </section>
      <p className="soc-soft-caption"><LockKeyhole size={15} aria-hidden="true"/> Your PIN or passphrase is needed to decrypt the backup. Offline cannot reset it. Profile names remain visible inside backup files.</p>
    </div>
  </main>;
}
