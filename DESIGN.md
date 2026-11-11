# Offline desktop design system · v0.1.0

## Product experience
An offline-first, calm, reliable local archive inspector. **Operate** mode (Impeccable). The primary goal is to help people locate and understand their data without fearing an upload or accidental modification. Prioritize trustworthy labels, keyboard access and comprehensible feedback over decoration.

## Core layout
- Fixed left navigation (253 px at desktop width) and a flexible, scrollable content area.
- Main toolbar: breadcrumb, persistent local-only status and import action.
- Empty state: one primary import action and a readable overview of expected future content areas.
- Loaded state: archive filename, confirmed totals and a category list.
- File inventory: searchable, sortable rows. Display nested paths without breaking layout.
- Status footer: privacy promise and version, no fictitious job progress.

## Palette
| Role | Light | Dark |
| --- | --- | --- |
| Canvas | #f6f8f7 | #121b18 |
| Main surface | #ffffff | #1a2722 |
| Primary text | #18261f | #f1f8f3 |
| Secondary text | #50645d | #c5d6ca |
| Accent | #226451 | #9de2b8 |
| Sidebar | #17231f | #101713 |
| Border | #e0e8e3 | #35483e |
| Focus | #42a585 | #8eddae |

## Typography and spacing
- Prefer native Windows Segoe UI Variable / Segoe UI to avoid external font loading.
- H1 desktop 30–43 px, empty state 45–78 px. Body default 13–16 px depending on density. Labels and file paths 10–12 px.
- Use a 4/8 px rhythm and restrained 9–14 px corner radii on controls and file containers.
- Keep filenames and export paths truncatable, with full paths as tooltips.
- Numerical counts right align and use tabular numbers.

## Interaction rules
- Use vector Lucide icons, not emoji.
- Every primary action must work; never render a fake action. Inactive future features appear only as descriptive text.
- Apply hover, focus-visible, disabled, loading, error, and empty states.
- Ctrl/Cmd+K focuses file search when an archive is loaded; Escape clears it.
- Avoid animations on frequent keyboard actions; UI hover transitions 120–150 ms.
- Honor system reduced-motion and system light/dark preference.
- File rows are informational in v0.1.0, not clickable/openable yet.

## Trust/consent
- First import shows exactly what is supported: ZIP metadata and filename grouping.
- Never expose real user data in logging, screenshots, samples, GitHub or CI.
- Do not render archive HTML in a WebView, evaluate imported scripts, extract source data automatically, or auto-connect to an account.
- Import is read-only; no archive contents are uploaded, extracted or persisted in v0.1.0.

## Skills
Apply `.agents/skills/ui-ux-pro-max/SKILL.md`, `.agents/skills/impeccable/SKILL.md` (Operate mode), and `.agents/skills/emil-design-eng/SKILL.md` before modifying UI. See `docs/DESIGN_SKILLS.md` for their pinned full installers and licenses.
