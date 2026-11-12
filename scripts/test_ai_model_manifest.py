"""Only fictional models/metadata, never private user archive content."""
import json
import pathlib
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

    def test_not_misrepresenting_standalone_model_pack(self):
        readme = (ROOT / "docs/AI_MODEL_DISTRIBUTION.md").read_text(encoding="utf-8")
        self.assertIn("no Ollama", readme)  # The air-gapped future acceptance requirement.
        self.assertIn("not yet approved", readme)
        self.assertIn("not", (ROOT / "models/embeddinggemma-2.manifest.json").read_text())

if __name__ == "__main__":
    unittest.main()
