"""Only fictional models/metadata, never private user archive content."""
import json
import pathlib
import os
import subprocess
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class EmbeddingGemmaLicenseTest(unittest.TestCase):
    def test_model_manifest_and_license_are_consistent(self):
        manifest = json.loads((ROOT / "models/embeddinggemma-2.manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["component"], "EmbeddingGemma 2")
        self.assertEqual(manifest["license"], "Apache-2.0")
        self.assertEqual(manifest["development"]["model"], "embeddinggemma-2:440m")
        self.assertEqual(manifest["completeInstaller"]["status"], "not-built")
        self.assertFalse(manifest["completeInstaller"]["includesModelWeights"])
        self.assertFalse(manifest["completeInstaller"]["verifiedAirGapped"])
        self.assertEqual(manifest["offlineModelPackPreflight"]["status"], "inspection-only")
        self.assertFalse(manifest["offlineModelPackPreflight"]["trustAnchorConfigured"])
        self.assertFalse(manifest["offlineModelPackPreflight"]["canActivate"])
        self.assertIsNone(manifest["completeInstaller"]["modelSha256"])
        license_text = (ROOT / manifest["licenseFile"]).read_text(encoding="utf-8")
        self.assertIn("Apache License", license_text)
        self.assertIn("Version 2.0, January 2004", license_text)
        self.assertIn("TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION", license_text)
        self.assertTrue((ROOT / manifest["noticeFile"]).is_file())
        rust = (ROOT / "src-tauri/src/search.rs").read_text(encoding="utf-8")
        self.assertIn('const TEXT_MODEL: &str = "embeddinggemma-2:440m"', rust)
        self.assertNotIn('const IMAGE_MODEL: &str = "moondream:latest"', rust)
        self.assertIn('http://127.0.0.1:11434/api/embed', rust)

    def test_staging_never_packages_an_unreviewed_model(self):
        # Do not provide real model weights; reject at the independent source-pin gate.
        environment = dict(os.environ, OFFLINE_COMPLETE_AI="1", OFFLINE_MODEL_FILE="fictional.litertlm")
        run = subprocess.run(
            ["node", "scripts/stage-embedded-ai.mjs"], cwd=ROOT,
            env=environment, capture_output=True, text=True, timeout=30)
        self.assertNotEqual(run.returncode, 0)
        self.assertIn("reviewed upstream model revision", run.stderr)
        self.assertFalse((ROOT / "public/ai/embedded-bundle.json").exists())

    def test_default_staging_clears_leftover_model_files(self):
        target = ROOT / "public/ai/model/fictional-sentinel.litertlm"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b"FICTIONAL WEIGHTS, NOT A MODEL")
        self.assertTrue(target.exists())
        environment = dict(os.environ)
        environment.pop("OFFLINE_COMPLETE_AI", None)
        run = subprocess.run(
            ["node", "scripts/stage-embedded-ai.mjs"], cwd=ROOT,
            env=environment, capture_output=True, text=True, timeout=30)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertFalse(target.exists())
        self.assertFalse((ROOT / "public/ai/embedded-bundle.json").exists())

    def test_not_misrepresenting_standalone_model_pack(self):
        readme = (ROOT / "docs/AI_MODEL_DISTRIBUTION.md").read_text(encoding="utf-8")
        self.assertIn("no Ollama", readme)  # The air-gapped future acceptance requirement.
        self.assertIn("not yet approved", readme)
        self.assertIn("not", (ROOT / "models/embeddinggemma-2.manifest.json").read_text())

if __name__ == "__main__":
    unittest.main()
