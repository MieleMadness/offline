import { useState, type FormEvent } from "react";

export default function VaultForm({ locked, busy, onSubmit, onCancel }: {
  locked: boolean; busy: boolean; onSubmit: (passphrase: string) => Promise<boolean>; onCancel?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!locked && password !== confirm) { setError("The two passphrases differ."); return; }
    setError("");
    await onSubmit(password);
    setPassword("");
    setConfirm("");
  }
  return <form className="soc-vault-form" onSubmit={submit}>
    <h2>{locked ? "Unlock saved preview" : "Save an encrypted preview"}</h2>
    <p>{locked ? "Enter this profile’s passphrase to read its saved archive." :
      "Your preview stays on this device. Switching profiles locks it. Keep your original ZIP and passphrase. Offline cannot reset it."}</p>
    <label>Passphrase<input type="password" autoComplete={locked ? "current-password" : "new-password"}
      value={password} required minLength={locked ? 1 : 12} disabled={busy}
      onChange={e => setPassword(e.target.value)}/></label>
    {!locked && <label>Confirm passphrase (12 or more characters)<input type="password" autoComplete="new-password"
      value={confirm} required disabled={busy} onChange={e => setConfirm(e.target.value)}/></label>}
    {error && <p role="alert">{error}</p>}
    <div><button className="soc-primary" disabled={busy}>{locked ? "Unlock" : "Encrypt and save"}</button>
    {onCancel && <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
  </form>;
}
