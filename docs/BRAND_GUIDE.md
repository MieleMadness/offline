# Offline — Brand & Interface Guide
Version: 1.0 | Product: **Offline** | Public-facing wordmark: **offline.**

## Positioning
**Tagline:** Your memories, on your terms.
**One sentence:** A private, beautiful home for the social history you choose to keep.
**Promise:** Understand, revisit and organize your downloaded digital history locally, without a social-media login or cloud dependency.
**Audience:** Individuals and families who want to preserve posts, photographs, messages and personal data from their own social-media exports.
**Voice:** Warm, calm, human and precise. No tech jargon unless explaining provenance/security. Friendly but not childish. No manufactured nostalgia or alarmism about the data. Use literal button labels and honest status messages.

## Brand identity
- Product name in prose: **Offline**. Wordmark and app name treatment: **offline.** (lowercase with period).
- Visual concept: an organized archive that feels like a familiar social feed rather than raw files. The product is a viewer/keeper, not another social network.
- Logo concept: simple stacked rounded pages that imply an "o" or preserved moment; one clear vector mark, no stock illustration, padlock cliché or emoji.
- Brand shape language: soft corners (10–14 px), understated depth, warm-white paper, generous whitespace; social content is the hero.
- Iconography: Lucide vector icons, mostly 18/20 px, one consistent stroke weight. Avoid emoji as navigation icons.
- No externally loaded assets/fonts. Keep the desktop fully functional with the network disconnected.

## Color tokens
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--canvas` | `#F6F8F6` | `#131E19` | Main reading background |
| `--surface` | `#FFFFFF` | `#1B2922` | Post cards, panels |
| `--ink` | `#193129` | `#F1FAF3` | Primary text |
| `--text-secondary` | `#53695E` | `#C6D7C9` | Descriptions |
| `--border` | `#E0E8E1` | `#354B3D` | Dividers |
| `--pine` | `#17634D` | `#A5E7BD` | Brand, focus, link emphasis |
| `--pine-pressed` | `#104B39` | `#75C99C` | Interaction |
| `--mint` | `#EDF6F0` | `#2A4131` | Soft surfaces |
| `--warning` | `#9A6125` | `#F3CA84` | Import problems |
| `--danger` | `#9E3A3A` | `#F0AAAA` | Errors/destructive actions |

Preserve the evergreen identity already established in v0.2.0 rather than randomly redesigning each phase. Brand colors must pass an explicit light/dark WCAG contrast audit before public release.

### Family profile accents
Give each *profile* an optional consistent visual accent for its initials avatar, timeline indicator and family switcher. Accents are not gender-coded:
- Harbor `#3B748B` (blue)
- Orchid `#856AA7` (purple)
- Terracotta `#B66755` (coral)
- Golden `#96712D` (amber)
- Evergreen `#31735A` (green)

Accent color is supplementary: never the sole signal of profile ownership, sharing or permissions. Always show name + owner/status.

## Type hierarchy
**Local Windows-first fonts:** "Segoe UI Variable" / "Segoe UI" / system sans. No CDN. The serif/editorial experiments belong in marketing material only unless they improve legibility. Optional future bundled OFL font: Manrope (headlines), to be evaluated before inclusion.
- Page titles: 34–42 px; 700–780; line-height 1.1–1.18.
- Feed captions: 15 px; 1.65 line-height, never artificially truncate original posts without an explicit expand control.
- Author names/thread names: 13–15 px; semibold/bold.
- Date and metadata: 12–13 px, high contrast; do not reduce below 11 px.
- Navigation: 13–14 px; labels and shortcuts visible.
- Numeric counts use tabular figures.

## Main experience
Desktop: 238–252 px left sidebar with profile switcher and four destinations, flexible reading area, at most 300 px contextual rail. Feed content max 730 px for readable posts; responsive conversation list and reading pane. Avoid tiled dashboard metrics dominating memories.
- **Timeline:** familiar post cards grouped by month/year with optional media; filter/search by date/type/person/source; read-only.
- **Messages:** people/thread list with date+preview, sender name, grouped messages, original attachments.
- **Your Data:** categories of what was actually found with readable records, timestamps, source provenance and incomplete-data warnings.
- **Media:** native photo/video grid and album/group view (later milestone).
- **Family:** profile chooser; any shared view clearly labeled and opt-in.

## Interaction rules
- Strong keyboard focus, Ctrl/Cmd+K search, Esc clear, consistent sorting/filters, empty/error/loading states.
- Small transitions only when purposeful (120–200 ms), no mandatory wait/animation for search or keyboard actions. Honor reduced motion.
- No fake Like/Reply/Send buttons. Offline is not a social-network client.
- Content is attributed to actual export. "Missing from export" is not "deleted from Facebook."
- No cross-profile data leak in UI, logs or cached indexes; sharing requires explicit owner approval.

## Skill checklist before UI work
Read `.agents/skills/ui-ux-pro-max/SKILL.md`, `.agents/skills/impeccable/SKILL.md`, and `.agents/skills/emil-design-eng/SKILL.md`. Apply UI/UX Pro Max first for structure, Impeccable Operate mode for craftsmanship and completeness, and Emil for restraint, focus, animation and interaction quality.
