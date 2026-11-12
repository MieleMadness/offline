import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FileCheck2, ShieldAlert } from "lucide-react";

interface PackInspection {
  modelId: string;
  variant: string;
  assetCount: number;
  verifiedBytes: number;
  checksumsMatch: boolean;
  publisherAuthenticated: boolean;
  readyToActivate: boolean;
  message: string;
}

/**
 * Preflight only. The app does not unpack, install, execute, or trust model packs.
 * A self-declared SHA-256 manifest is NOT publisher authentication.
 */
export default function OfflineModelPack() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<PackInspection | null>(null);
  const pending = useRef(false);

  async function inspect() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setReport(null);
    setError("");
    try {
      const path = await open({ multiple: false, filters: [{
        name: "Offline AI model pack (preflight only)", extensions: ["offlineai"],
      }] });
      if (typeof path !== "string") return;
      const result = await invoke<PackInspection>("inspect_offline_ai_pack", { path });
      setReport(result);
    } catch (cause) {
      setError(typeof cause === "string" ? cause :
        "Could not inspect this local AI pack. Verify the manifest and checksums.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <section className="soc-model-pack" aria-label="Offline AI model pack inspection">
    <div className="soc-model-pack-heading">
      <FileCheck2 size={18} aria-hidden="true"/>
      <strong>Offline AI model pack — early preview</strong>
    </div>
    <p>Check a prospective EmbeddingGemma 2 model pack stored on your computer or a USB drive.
      The app reads the pack without extracting or running its files. This is a packaging
      preflight tool, <strong>not</strong> a working replacement for Ollama yet.</p>
    <button type="button" disabled={busy} onClick={inspect}>
      {busy ? "Checking ZIP files and SHA-256…" : "Inspect local .offlineai pack"}
    </button>
    {error && <p role="alert" className="soc-model-pack-error">{error}</p>}
    {report && <div role="status" className="soc-model-pack-result">
      <FileCheck2 size={18} aria-hidden="true"/>
      <div>
        <strong>{report.modelId} · {report.variant}</strong>
        <p>Verified {report.assetCount} files · {Math.round(report.verifiedBytes / 1048576)} MiB
          checked against the supplied manifest.</p>
        <p>{report.message}</p>
      </div>
    </div>}
    <p className="soc-model-pack-warning"><ShieldAlert size={15} aria-hidden="true"/>
      A pack can pass its own checksums and still be malicious. Until Offline pins
      publisher-verified model/runtime files, <strong>packs cannot be activated</strong>.</p>
  </section>;
}
