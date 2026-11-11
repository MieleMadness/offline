"""No-network regression tests for the synthetic Facebook ZIP fixture builder."""
import json
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from generate_facebook_fixtures import generate, png, safe_member, write_zip


class FixtureTests(unittest.TestCase):
    def test_generated_archives_are_safe_and_reproducible(self):
        with tempfile.TemporaryDirectory() as folder1, tempfile.TemporaryDirectory() as folder2:
            first = generate(Path(folder1))
            second = generate(Path(folder2))
            self.assertEqual(first, second)
            self.assertEqual(len(first["archives"]), 6)
            for name, info in first["archives"].items():
                self.assertEqual(info["sha256"], second["archives"][name]["sha256"])
                with ZipFile(Path(folder1) / name) as archive:
                    self.assertEqual(len(archive.namelist()), info["entries"])
                    self.assertTrue(all(safe_member(n) for n in archive.namelist()))
                    self.assertTrue(all(i.date_time == (2020, 1, 1, 0, 0, 0)
                                        for i in archive.infolist()))

    def test_supported_html_json_and_failure_fixtures_exist(self):
        with tempfile.TemporaryDirectory() as folder:
            generate(Path(folder))
            with ZipFile(Path(folder) / "family-json.zip") as archive:
                posts = json.loads(archive.read("your_facebook_activity/posts/your_posts_1.json"))
                self.assertEqual(len(posts["posts_v2"]), 3)
                self.assertIn("messages/inbox/fictional_friend_001/message_2.json",
                              archive.namelist())
                self.assertTrue(archive.read("photos/picnic.png").startswith(b"\x89PNG"))
            with ZipFile(Path(folder) / "family-html.zip") as archive:
                self.assertIn(b'class="_a6-g"',
                              archive.read("your_facebook_activity/posts/your_posts_1.html"))
            with ZipFile(Path(folder) / "invalid-json.zip") as archive:
                with self.assertRaises(json.JSONDecodeError):
                    json.loads(archive.read("your_facebook_activity/posts/your_posts_1.json"))
            with ZipFile(Path(folder) / "navigation-only.zip") as archive:
                self.assertEqual(archive.namelist(), ["index.html"])

    def test_optional_large_fixture_and_member_path_safety(self):
        with tempfile.TemporaryDirectory() as folder:
            manifest = generate(Path(folder), 125)
            self.assertEqual(manifest["archives"]["large-125-photos.zip"]["entries"], 126)
            with ZipFile(Path(folder) / "large-125-photos.zip") as archive:
                self.assertEqual(len(archive.namelist()), 126)
                self.assertIn("photos/synthetic_000124.png", archive.namelist())
        self.assertFalse(safe_member("../outside.json"))
        self.assertFalse(safe_member("C:/absolute.json"))
        self.assertFalse(safe_member("/outside.json"))
        self.assertTrue(safe_member("photos/example.png"))
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError):
                write_zip(Path(folder) / "unsafe.zip", [("../outside.json", b"no")])

    def test_png_has_correct_binary_signature(self):
        content = png((10, 20, 30))
        self.assertTrue(content.startswith(b"\x89PNG\r\n\x1a\n"))
        self.assertIn(b"IHDR", content)
        self.assertIn(b"IDAT", content)
        self.assertTrue(content.endswith(b"\x00\x00\x00\x00IEND\xaeB\x60\x82"))


if __name__ == "__main__":
    unittest.main()
