import { useState, type FormEvent } from "react";
import { Plus, Users, X } from "lucide-react";
import type { FamilyProfile } from "../profiles";

export default function ProfilePicker({
  profiles, activeId, disabled, onChoose, onCreate,
}: {
  profiles: readonly FamilyProfile[];
  activeId: string;
  disabled: boolean;
  onChoose: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      onCreate(name);
      setName("");
      setError("");
      setAdding(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add this profile.");
    }
  }

  const active = profiles.find((profile) => profile.id === activeId);
  const canAdd = profiles.length < 20;

  return <div className="soc-profile-picker" aria-label="Family members">
    <div className="soc-profile-heading"><Users size={15} aria-hidden="true"/> FAMILY LIBRARY</div>
    {active && <label className="soc-profile-select">
      <span className="sr-only">Choose family profile</span>
      <span className="soc-profile-avatar" aria-hidden="true" style={{ background: active.accent }}>
        {active.displayName.trim().slice(0, 1).toUpperCase()}
      </span>
      <select value={activeId} onChange={(event) => onChoose(event.target.value)} disabled={disabled}
        aria-label="Current family profile">
        {profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.displayName}</option>)}
      </select>
    </label>}
    {adding || !active ? <form className="soc-profile-create" onSubmit={submit}>
      <label htmlFor="new-profile-name">Profile name</label>
      <input id="new-profile-name" value={name} maxLength={50} disabled={disabled}
        placeholder="e.g. Alex" onChange={(event) => setName(event.target.value)} autoComplete="off" required/>
      {error && <p className="soc-profile-error" role="alert">{error}</p>}
      <div className="soc-profile-create-actions">
        <button type="submit" disabled={disabled || !name.trim()}>Create profile</button>
        {active && <button type="button" aria-label="Cancel creating profile" disabled={disabled}
          onClick={() => { setAdding(false); setError(""); }}><X size={16} aria-hidden="true"/></button>}
      </div>
    </form> : canAdd && <button type="button" className="soc-add-profile" disabled={disabled}
      onClick={() => setAdding(true)}><Plus size={15} aria-hidden="true"/> Add family member</button>}
    <p className="soc-profile-caution">Session previews are visible to anyone using this library. Saved encrypted previews require their own PIN or passphrase.</p>
  </div>;
}
