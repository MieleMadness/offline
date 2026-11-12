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


## v0.15.0 reconcile of parallel text-index work

A fresh [v0.15.0 index integration branch](https://github.com/MieleMadness/offline/tree/feature/text-index-integration-0.15.0) starts from the **green v0.14.0** head and selectively carries PR #27's new text-index data pipeline, LocalSearch UI and native Ollama embedding commands, while preserving v0.14.0 profile management, encrypted backup/restore, ZIP photos, full Messenger filters and privacy masking. It adds backup-index validation and a source ZIP inventory check to optional image inference. Do not merge the earlier PR #27 wholesale; compare its tests and note it is superseded only once native and manual integration acceptance passes.


## v0.15.1 native test and model selection

v0.15.0 [targeted Windows Rust CI](https://github.com/MieleMadness/offline/actions/runs/43121426640) failed because tests referenced binary PNG fixtures missing from the branch. The v0.15.1 patch replaces them with deterministic source-embedded synthetic PNG bytes and moves the development embedding provider to Apache-licensed EmbeddingGemma 2:440m. Complete runtime/weight bundling remains future work and requires license/asset verification; see [AI model distribution](AI_MODEL_DISTRIBUTION.md).


## v0.16.0 — Read-only offline model-pack preflight

This milestone follows the green [v0.15.1 Windows desktop build](https://github.com/MieleMadness/offline/actions/runs/43126496840). It implements a strictly non-activating local .offlineai integrity preflight, with no extraction or execution. **Do not mistake ZIP self-declared hashes for publisher authentication.** Before any inference from these assets, the app must pin externally verified digests/signatures, package a compatible runtime and model weights, and pass air-gapped Windows tests. See [pack security specification](OFFLINE_AI_PACK.md).


## v0.17.0 — Embedded runtime candidate (next stacked draft)

The branch `feature/embedded-ai-runtime-stage-0.17.0` extends the green v0.16.0 model-pack preflight with a local MediaPipe Universal Embedder adapter, a release-only approved digest gate, and retention of local Ollama fallback when no model is packaged. This remains a code/integration milestone, not an offline model release. See [embedded AI stages](EMBEDDED_AI.md). After frontend/Rust/native gates pass, stage this draft after #30, not over the old main branch.


### v0.17.1 verification checkpoint

The first v0.17.0 TypeScript check failed because the pinned MediaPipe 1.2.2 API rejects the delegate option documented in some prose examples. v0.17.1 removed that unsupported option without an unsafe cast and explicitly **does not claim CPU fallback**. The subsequent [v0.17.1 frontend, ZIP, license and staged-model safety tests](https://github.com/MieleMadness/offline/actions/runs/43137946375) passed. One full Windows native/executable/unsigned-artifact build is requested for the completed batch. A pass verifies buildability, not actual bundled AI inference: `models/approved-embeddinggemma2.json` remains `pending-verification` and the normal build ships no model weights.


## v0.18.0 — Bounded packaged-model photo similarity

Built after the **green v0.17.1 full Windows artifact** at https://github.com/MieleMadness/offline/actions/runs/43138164732 . The new image path reuses the MediaPipe text/vision engine in a future approved Complete build and adds a Rust AI-specific JPEG/PNG/4MiB/25MP read gate. Search stays profile-scoped and compares at most 24 photos from 250 candidates, with progress/stop, while the older Ollama eight-photo path remains. Neither a model bundle nor full-photo indexing is supplied in the development artifact; real Windows inference and publisher trust are still release blockers.


### v0.18.1 verification checkpoint

The initial v0.18.0 frontend check reported a missing JSX closing brace in the photo comparison stop control. The v0.18.1 patch fixed this and synchronized npm/Cargo/Tauri/UI/workflow labels. The subsequent [v0.18.1 TypeScript, frontend tests, fictional Facebook ZIP checks, Apache model compliance and production bundle](https://github.com/MieleMadness/offline/actions/runs/43140996160) are all **green**. A single full Windows Rust/native executable milestone is requested on PR #32; until it completes, native photo validation cannot be marked green. Even a successful native build **does not establish real MediaPipe inference** without independently approved model assets and air-gapped Windows testing.
