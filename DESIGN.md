# Offline desktop experience · v0.2.0

## Intent

**Personal archive, not a database viewer.** Give users a recognizable social-media experience built from their actual export, while preserving provenance and avoiding simulated interactions. Source files are always read only. The interface communicates what was and was not included.

Design references: [UI/UX Pro Max](.agents/skills/ui-ux-pro-max/SKILL.md), [Impeccable](.agents/skills/impeccable/SKILL.md) in **Operate** mode, and [Emil Design Engineering](.agents/skills/emil-design-eng/SKILL.md).

## Information architecture

1. **My timeline:** the default view after import. Chronological feed cards, original timestamps, post author when supplied, per-month dividers, year/media filters, filename provenance and search.
2. **Messages:** conversation list by names/participants, newest thread first; within a thread messages are chronological and grouped by calendar date with sender/time visible. No reply box or simulated sent status.
3. **Your data:** actual detected export categories on the left, readable records on the right, backed by source file names and cautious coverage language.
4. **Archive files:** lower-priority raw inventory for troubleshooting and transparency.

A single persistent local ZIP import action is placed in the top toolbar; no account connection UI. When no archive is loaded, the welcoming empty state explains exactly what the app can read.

## Layout

- Dark evergreen sidebar 238px, main content flex and scroll, 76px top toolbar.
- Feed has a 730px reading column and optional 300px context rail. At smaller widths, prioritize the feed over the rail.
- Messages two-column inbox with nested scrolling and a read-only footer.
- Data explorer with category list and records panel.
- Dense file paths truncate visibly but expose the full path as a title.

## Theme tokens

| Token | Light | Dark |
| --- | --- | --- |
| Canvas | #f6f8f6 | #131e19 |
| Surface | #ffffff | #1b2922 |
| Ink | #193129 | #f1faf3 |
| Secondary | #53695e | #c6d7c9 |
| Border | #e0e8e1 | #354b3d |
| Accent | #17634d | #a5e7bd |
| Focus | #329a78 | #91e0b3 |

Windows native Segoe UI Variable/Segoe UI, no remotely loaded fonts. Icons from one consistent vector family. No fabricated avatars/photos: initials are generated from source names.

## Interactions and integrity

- Search is scoped to the current view; Ctrl/Cmd+K focuses search; Escape clears and blurs.
- All interactive elements have hover/focus/disabled states. Keyboard actions are instantaneous; no gratuitous motion. Respect Windows reduced-motion.
- Never present source archives as editable; no fake Like, Comment, Share, Send or Export buttons.
- Post images are not yet decoded: show a truthful attachment placeholder.
- If data is missing or unsupported, show a helpful empty state rather than synthetic records.
- Display imported strings as text; never render untrusted HTML. Show the original file provenance for posts and records.
- Treat actual Windows visual acceptance and accessibility checks as separate from TypeScript lint/build success.

## QA

Verify 900px wide main app, 1280/1440 desktop, reduced motion, light/dark contrast, long names and paths, absent timestamp, mixed export versions, blank archive, corrupted ZIP, truncated JSON, and dense conversation threads before publishing a public installer.
