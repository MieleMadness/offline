import { useEffect, useRef } from "react";
import { ScrollText, X } from "lucide-react";
import apacheLicense from "../../third_party/licenses/Apache-2.0.txt?raw";
import thirdPartyNotices from "../../THIRD_PARTY_NOTICES.md?raw";

/** Accessible, bundled copy of model-license documents: works without Internet. */
export default function ThirdPartyLicenses({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return <dialog ref={ref} className="soc-licenses-dialog"
    onClose={onClose} aria-labelledby="offline-license-title">
    <header>
      <div>
        <span className="soc-license-kicker"><ScrollText size={16} aria-hidden="true"/> THIRD-PARTY NOTICES</span>
        <h2 id="offline-license-title">Open-source model licenses<span>.</span></h2>
      </div>
      <button type="button" onClick={() => ref.current?.close()}
        aria-label="Close license details"><X size={20} aria-hidden="true"/></button>
    </header>
    <div className="soc-license-body">
      <p>Offline's selected EmbeddingGemma 2 model is licensed under Apache 2.0.
        The full license and attribution are available here without an Internet connection.</p>
      <p>Development versions do not yet bundle model weights or an inference runtime.
        Offline's application source licensing is a separate decision.</p>
      <details>
        <summary>Google DeepMind — model attribution and notices</summary>
        <pre>{thirdPartyNotices}</pre>
      </details>
      <details>
        <summary>Apache License, Version 2.0 — complete text</summary>
        <pre>{apacheLicense}</pre>
      </details>
    </div>
    <footer><button type="button" className="soc-license-done"
      onClick={() => ref.current?.close()}>Close</button></footer>
  </dialog>;
}
