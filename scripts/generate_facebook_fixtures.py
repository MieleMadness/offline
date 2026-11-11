#!/usr/bin/env python3
"""Generate reproducible fictional Facebook archives for Offline acceptance tests.

No Meta account, network, personal information, external packages or original ZIPs.
Run: python scripts/generate_facebook_fixtures.py --output fixtures/generated
Optional: --large-count 10000 to add a large synthetic photo ZIP.
"""
from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import struct
import zlib
from pathlib import Path
from typing import Iterable
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

FIXED_DATE = (2020, 1, 1, 0, 0, 0)
JSON_OPTIONS = dict(ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def as_json(value: object) -> bytes:
    return json.dumps(value, **JSON_OPTIONS).encode("utf-8")


def png(rgb: tuple[int, int, int]) -> bytes:
    """Generate a valid 1x1 RGB PNG with an actual IDAT and CRC checks."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    header = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    scanline = b"\x00" + bytes(rgb)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) +
            chunk(b"IDAT", zlib.compress(scanline)) + chunk(b"IEND", b""))


def safe_member(name: str) -> bool:
    return (bool(name) and not name.startswith("/") and "\\" not in name
            and not any(segment in ("", ".", "..") or ":" in segment
                        for segment in name.split("/")))


def write_zip(destination: Path, members: Iterable[tuple[str, bytes]]) -> int:
    """Never write unsafe names, preserve input order and pin ZIP timestamps."""
    names: set[str] = set()
    count = 0
    with ZipFile(destination, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
        for name, content in members:
            if not safe_member(name):
                raise ValueError("Refusing unsafe synthetic ZIP member: " + name)
            if name in names:
                raise ValueError("Duplicate synthetic member: " + name)
            names.add(name)
            info = ZipInfo(name, date_time=FIXED_DATE)
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o644 << 16
            archive.writestr(info, content, compress_type=ZIP_DEFLATED,
                             compresslevel=6)
            count += 1
    return count


def json_members() -> Iterable[tuple[str, bytes]]:
    yield "index.html", b"<h1>Fictional Facebook export</h1>"
    yield "your_facebook_activity/posts/your_posts_1.json", as_json({
        "posts_v2": [
            {"timestamp": 1600000000,
             "data": [{"post": "Synthetic family picnic on a sunny day."}],
             "attachments": [{"data": [{"media": {"uri": "photos/picnic.png"}}]}]},
            {"timestamp_ms": 1700000000555,
             "data": [{"post": "Synthetic New Year memory (milliseconds)."}]},
            {"timestamp": "invalid",
             "data": [{"post": "Synthetic undated post; no date should be invented."}]},
        ]
    })
    yield "messages/inbox/fictional_friend_001/message_1.json", as_json({
        "title": "Fictional Friend",
        "participants": [{"name": "Fictional Friend"}, {"name": "Example User"}],
        "messages": [
            {"sender_name": "Fictional Friend", "timestamp_ms": 1700000000000,
             "content": "Synthetic message: coffee tomorrow?"},
            {"sender_name": "Example User", "timestamp_ms": 1699900000000,
             "content": "Synthetic message: absolutely!"},
        ],
    })
    yield "messages/inbox/fictional_friend_001/message_2.json", as_json({
        "title": "Fictional Friend",
        "messages": [
            {"sender_name": "Fictional Friend", "timestamp_ms": 1600000000000,
             "content": "Synthetic older message in a separate ZIP member."},
        ],
    })
    yield "your_facebook_activity/search_history/your_searches.json", as_json([
        {"query": "fictional library search", "timestamp": 1690000000,
         "description": "Synthetic search history record."}
    ])
    yield "your_facebook_activity/ads/your_interests.json", as_json([
        {"name": "Fictional gardening", "description": "Synthetic interest only."}
    ])
    yield "photos/picnic.png", png((30, 120, 77))
    yield "photos/coffee.png", png((195, 120, 65))


def html_members() -> Iterable[tuple[str, bytes]]:
    yield "index.html", b"<h1>Fictional Facebook HTML navigation only</h1>"
    yield "your_facebook_activity/posts/your_posts_1.html", (
        '<html><div class="_a6-g">'
        '<div class="_a6-h">Example User</div>'
        '<div class="_a6-p">Synthetic HTML post: a picnic at the park.</div>'
        '<div class="_a72d">Jun 1, 2020 at 10:30 AM</div>'
        '<img src="../photos/picnic.png" alt="Fictional picnic">'
        '</div></html>'
    ).encode("utf-8")
    for part, text in ((1, "Synthetic HTML message one."),
                       (2, "Synthetic HTML message two.")):
        path = "messages/inbox/fictional_friend_001/message_" + str(part) + ".html"
        content = ('<html><h1>Fictional Friend</h1><div class="_a6-g">'
                   '<div class="_a6-h">Fictional Friend</div>'
                   '<div class="_a6-p">' + text + '</div>'
                   '<time datetime="2020-06-01T10:30:00Z">June 1, 2020</time>'
                   '</div></html>')
        yield path, content.encode("utf-8")
    yield "your_facebook_activity/search_history/your_searches.html", (
        '<div class="_a6-g"><div class="_a6-h">Synthetic location search</div>'
        '<div class="_a6-p">Fictional account data record.</div>'
        '<time datetime="2021-02-15T11:30:00Z">February 15, 2021</time>'
        '</div>'
    ).encode("utf-8")
    yield "your_facebook_activity/photos/picnic.png", png((50, 90, 180))


def invalid_members() -> Iterable[tuple[str, bytes]]:
    yield "index.html", b"<h1>Navigation-only HTML, not a post</h1>"
    yield "your_facebook_activity/posts/your_posts_1.json", b'{"posts_v2": ['
    yield "notes.txt", b"Fictional invalid JSON. No private records."


def timestamp_members() -> Iterable[tuple[str, bytes]]:
    yield "posts/your_posts.json", as_json({
        "posts": [
            {"timestamp": 1700000000, "text": "Synthetic seconds."},
            {"timestamp_ms": "1700000000555", "text": "Synthetic numeric string milliseconds."},
            {"timestamp": "1700000000555", "text": "Synthetic inferred milliseconds."},
            {"timestamp": "yesterday", "text": "Synthetic invalid date."},
        ]
    })


def large_members(count: int) -> Iterable[tuple[str, bytes]]:
    yield "index.html", b"<h1>Fictional large photo library</h1>"
    image = png((90, 140, 120))
    for index in range(count):
        yield "photos/synthetic_%06d.png" % index, image


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def generate(output: Path, large_count: int = 0) -> dict[str, object]:
    if large_count < 0 or large_count > 100000:
        raise ValueError("--large-count must be between 0 and 100000.")
    output.mkdir(parents=True, exist_ok=True)
    archives: dict[str, dict[str, object]] = {}
    groups = [
        ("family-json.zip", json_members(), "Decodable posts, multipart Messenger, data and PNGs"),
        ("family-html.zip", html_members(), "HTML posts, multipart Messenger, data and PNGs"),
        ("media-only.zip", [("photos/picnic.png", png((40, 80, 120))),
                            ("videos/video.heic", b"synthetic unsupported image")],
         "Only media inventory; no decoded posts or messages"),
        ("navigation-only.zip", [("index.html", b"<html>Navigation only</html>")],
         "No decoded records/media; importer must refuse replacement"),
        ("invalid-json.zip", invalid_members(),
         "Malformed post JSON; importer must refuse replacement"),
        ("timestamp-variants.zip", timestamp_members(),
         "Numeric seconds, milliseconds and missing/invalid dates"),
    ]
    if large_count:
        groups.append(("large-%d-photos.zip" % large_count,
                       large_members(large_count),
                       "Optional large synthetic inventory for memory/ZIP stress tests"))
    for name, members, expectation in groups:
        target = output / name
        count = write_zip(target, members)
        archives[name] = {"entries": count, "sha256": sha256(target),
                          "expectation": expectation}
    manifest = {"notice": "ALL CONTENT IS FICTIONAL; NEVER REPLACE REAL EXPORTS",
                "format": "Synthetic Facebook-like HTML/JSON ZIP fixtures",
                "largeCount": large_count, "archives": archives}
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("fixtures/generated"),
                        help="Destination directory for synthetic ZIPs and manifest.")
    parser.add_argument("--large-count", type=int, default=0,
                        help="Also generate a large photo ZIP with N images (0-100000).")
    args = parser.parse_args()
    manifest = generate(args.output, args.large_count)
    print("Generated", len(manifest["archives"]), "fictional archives at", args.output)
    print("Read manifest.json and docs/ACCEPTANCE.md before manual testing.")


if __name__ == "__main__":
    main()
