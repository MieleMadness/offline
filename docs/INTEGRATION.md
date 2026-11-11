# Offline — Integration and release readiness

**Status:** Active development, Windows test executables only. Passing CI does not replace interactive Windows acceptance or independent security review.

## The primary development chain

These are draft PRs stacked on each other. Merge/review in dependency order; do not directly merge a later PR into `main` as an isolated change:

1. [#12](https://github.com/MieleMadness/offline/pull/12) — encrypted saved previews.
2. [#13](https://github.com/MieleMadness/offline/pull/13) — workspace PIN and initial opt-in local AI.
3. [#14](https://github.com/MieleMadness/offline/pull/14) — profile-scoped plain keyword search.
4. [#15](https://github.com/MieleMadness/offline/pull/15) — encrypted backup and recovery.
5. [#16](https://github.com/MieleMadness/offline/pull/16) — family profile management.
6. [#17](https://github.com/MieleMadness/offline/pull/17) — bounded ZIP image previews.
7. [#18](https://github.com/MieleMadness/offline/pull/18) — Messenger filters and history browsing.
8. [#19](https://github.com/MieleMadness/offline/pull/19) — sensitive account data masking/provenance.
9. [#20](https://github.com/MieleMadness/offline/pull/20) — safe archive replacement.
10. [#21](https://github.com/MieleMadness/offline/pull/21) — photo viewer and bounded pages.
11. [#22](https://github.com/MieleMadness/offline/pull/22) — fictional Facebook ZIP fixtures.
12. [#23](https://github.com/MieleMadness/offline/pull/23) — native complete-ZIP photo listing.
13. [#24](https://github.com/MieleMadness/offline/pull/24) — native fictional HTML/JSON importer acceptance.
14. [#26](https://github.com/MieleMadness/offline/pull/26) — v0.13.0 unsigned, checksum-verified Windows test executable.
15. [#28](https://github.com/MieleMadness/offline/pull/28) — v0.14.0 family owner-catalog persistence and encrypted recovery hardening.

**Parallel work to reconcile:**

- [#25](https://github.com/MieleMadness/offline/pull/25) is based on #24. Its targeted, generated 5,125-photo ZIP regression was manually carried into #28, preserving the v0.14.0 feature/version lineage. Verify commit ancestry and identical test semantics before marking #25 superseded or closing it.
- [#27](https://github.com/MieleMadness/offline/pull/27) is based on the older #13 (v0.5.x). It implements local embeddings and an encrypted text index, but is **not part of the newer primary chain**. Port it only after reviewing changes to the current `SocialApp`, `LocalSearch`, Rust search commands, vault storage limits, backup metadata and tests. Do not overwrite v0.8–0.14 Messenger, photo, import or privacy changes with older files. Keep version labels consistent with the target branch, not the older PR number.

## Current automated baselines

- [v0.13.0 Windows full build, SHA-256 and unsigned preview artifact](https://github.com/MieleMadness/offline/actions/runs/43088969267): green. Artifact retention is seven days, not an evergreen installer.
- [v0.12.0 Windows full build](https://github.com/MieleMadness/offline/actions/runs/43086713466): green.
- [#24 targeted fictional importer tests](https://github.com/MieleMadness/offline/actions/runs/43088188723): green.
- [#25 targeted native 5,125-photo test](https://github.com/MieleMadness/offline/actions/runs/43088806392): green.
- v0.14.0 family catalog checks: [first fast result](https://github.com/MieleMadness/offline/actions/runs/43111573841), then use the PR's latest checks for the integrated milestone.

## Before moving into `main` or distributing a test build broadly

1. **Integrate oldest first.** Keep a reproducible lineage; avoid renaming a stale version as if it contained later features.
2. **Automated checks.** TypeScript, frontend unit tests/bundle, synthetic Python ZIP fixtures, Rust native importer/photo tests and Windows executable compilation must be green on the integrated head.
3. **Manual Windows pass.** Follow [ACCEPTANCE.md](ACCEPTANCE.md) with fictional ZIPs: HTML and JSON, 5k+ photographs, Messenger date bounds, family isolation, blocked storage, encrypted backup recovery and complete keyboard navigation. Do not upload family ZIPs or screenshots containing real conversations.
4. **Security and performance gate.** Review WebView image decoder limits, filesystem and memory usage, private search/index isolation and recovery when localStorage and IndexedDB commits are interrupted. Tests of synthetic 1×1 PNGs are not real-photo benchmarks.
5. **Publish only with accurate language.** Unsigned CI executables are disposable test builds; code signing, public installer, independent review and actual export-format compatibility remain outstanding. A successful compile is not proof that an installer is production-safe.
