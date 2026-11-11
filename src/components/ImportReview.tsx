import { useState } from "react";
import { AlertTriangle, Archive, Check, FileArchive, LockKeyhole, ShieldAlert, X } from "lucide-react";
import { formatNumber } from "../archive";
import type { ImportHealth } from "../import-health";
import type { ImportedArchive } from "../social-model";

export default function ImportReview({ candidate, assessment, previous, hasSavedCopy, ownerName,
  busy, onKeep, onReplace }: {
  candidate: ImportedArchive;
  assessment: ImportHealth;
  previous: ImportedArchive;
  hasSavedCopy: boolean;
  ownerName: string;
  busy: boolean;
  onKeep: () => void;
  onReplace: () => Promise<void>;
}) {
  const [typed, setTyped] = useState("");
  const allowed = !hasSavedCopy || typed === "REPLACE";
  const previousMessages = previous.social.conversations.reduce((n, chat) => n + chat.messages.length, 0);

  return <div className="soc-content soc-import-review" aria-labelledby="soc-import-review-heading">
    <div className="soc-import-review-header">
      <div className="soc-import-review-symbol"><ShieldAlert size={27} aria-hidden="true"/></div>
      <span className="soc-import-review-eyebrow">REVIEW BEFORE IMPORTING</span>
      <h1 id="soc-import-review-heading">Keep these memories, or replace them<span>.</span></h1>
      <p>You already have a preview for <strong>{ownerName}</strong>.
        Offline has inspected the selected ZIP, but has not changed the current library.
        This operation will <strong>replace</strong> the preview, not combine two downloads.</p>
    </div>
    <div className="soc-import-review-comparison">
      <section className="soc-import-review-card" aria-label="Existing archive">
        <Archive size={21} aria-hidden="true"/>
        <strong>Current preview</strong>
        <span className="soc-import-review-filename" title={previous.report.archiveName}>
          {previous.report.archiveName}
        </span>
        <small>{formatNumber(previous.social.posts.length)} posts · {formatNumber(previousMessages)} messages</small>
        <small>{hasSavedCopy ? "Encrypted saved copy" : "Unsaved session preview"}</small>
      </section>
      <section className="soc-import-review-card soc-import-review-next" aria-label="New archive">
        <FileArchive size={21} aria-hidden="true"/>
        <strong>Selected ZIP</strong>
        <span className="soc-import-review-filename" title={candidate.report.archiveName}>
          {candidate.report.archiveName}
        </span>
        <small>{formatNumber(assessment.posts)} posts · {formatNumber(assessment.messages)} messages</small>
        <small>{formatNumber(assessment.dataRecords)} readable data records · {formatNumber(assessment.mediaFiles)} media files</small>
      </section>
    </div>
    <div className="soc-import-review-safety">
      <AlertTriangle size={20} aria-hidden="true"/>
      <div>
        <strong>{hasSavedCopy ? "This will overwrite the encrypted saved preview" :
          "This will replace the current session preview"}</strong>
        <p>Any content that only exists in the current preview will disappear from this library.
          The original ZIPs remain unchanged. {hasSavedCopy ?
            "Create an encrypted backup of the current preview before replacing it if you may need to recover these memories." :
            "You can cancel to keep browsing your current session."}</p>
        {assessment.status === "media-only" && <p>Only media/file inventory was recognized in the new ZIP;
          its post, message and account views will be empty.</p>}
        {assessment.skippedTextFiles > 0 && <p>{formatNumber(assessment.skippedTextFiles)}
          HTML/JSON files were skipped under the importer safety limits.</p>}
      </div>
    </div>
    {hasSavedCopy && <label className="soc-import-review-typed">
      Type <strong>REPLACE</strong> to confirm
      <input type="text" value={typed} onChange={event => setTyped(event.target.value)}
        autoComplete="off" spellCheck={false} placeholder="REPLACE"
        maxLength={7} disabled={busy}/>
    </label>}
    <div className="soc-import-review-actions">
      <button type="button" className="soc-primary" disabled={busy} onClick={onKeep}>
        <X size={17} aria-hidden="true"/> Keep current preview
      </button>
      <button type="button" className="soc-import-review-replace" disabled={busy || !allowed}
        onClick={() => { void onReplace(); }}>
        {hasSavedCopy ? <LockKeyhole size={17} aria-hidden="true"/> : <Check size={17} aria-hidden="true"/>}
        {busy ? "Replacing…" : hasSavedCopy ? "Replace encrypted preview" : "Replace session preview"}
      </button>
    </div>
    <p className="soc-soft-caption">Offline never merges different Facebook ZIPs automatically.
      Combining archives safely requires duplicate detection and source review, planned for a later phase.</p>
  </div>;
}
