import { useState, type FormEvent } from "react";

export default function VaultForm({ locked, busy, credential, onSubmit, onCancel }: {
  credential: "pin" | "passphrase";
  locked: boolean; busy: boolean; onSubmit: (passphrase: string, credential: "pin" | "passphrase") => Promise<boolean>; onCancel?: () => void;
}) {
  const [mode, setMode] = useState(credential);
  const isPin = mode === "pin";
  const label = isPin ? "PIN" : "Passphrase";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!locked && isPin && !/^[0-9]{8,20}$/.test(password)) { setError("Use 8 to 20 digits for your PIN."); return; }
    if (!locked && password !== confirm) { setError("The two entries differ."); return; }
    setError("");
    await onSubmit(password, mode);
    setPassword("");
    setConfirm("");
  }
  return <form className="soc-vault-form" onSubmit={submit}>
    <h2>{locked ? "Unlock saved preview" : "Save an encrypted preview"}</h2>
    <p>{locked ? "Enter this workspace’s PIN or passphrase to read its saved archive." :
      "Your preview stays on this device. Switching profiles locks it. Keep your original ZIP and passphrase. Offline cannot reset it."}</p>
    {!locked && <label>Unlock with<select value={mode} disabled={busy} onChange={e => {
      setMode(e.target.value as "pin" | "passphrase"); setPassword(""); setConfirm(""); setError("");
    }}><option value="passphrase">Passphrase</option><option value="pin">PIN</option></select></label>}
    {!locked && isPin && <p>A numeric PIN is easier to guess. Use a long, unique PIN. It encrypts this saved workspace.</p>}
    <label>{label}<input type="password" autoComplete={locked ? "current-password" : "new-password"}
      value={password} required inputMode={isPin ? "numeric" : "text"} minLength={locked ? 1 : isPin ? 8 : 12} maxLength={isPin ? 20 : undefined} disabled={busy}
      onChange={e => setPassword(e.target.value)}/></label>
    {!locked && <label>Confirm {label}<input type="password" autoComplete="new-password"
      value={confirm} inputMode={isPin ? "numeric" : "text"} required disabled={busy} onChange={e => setConfirm(e.target.value)}/></label>}
    {error && <p role="alert">{error}</p>}
    <div><button className="soc-primary" disabled={busy}>{locked ? "Unlock" : "Encrypt and save"}</button>
    {onCancel && <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
  </form>;
}
