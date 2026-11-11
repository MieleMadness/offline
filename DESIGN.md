# Offline desktop design system · v0.3.0

**Product promise:** Your memories, on your terms.

Offline is a social archive viewer, not an account-connected social network. Its familiar feed should feel warm, calm and organized. See [full brand guide](docs/BRAND_GUIDE.md) for palette, typography, spacing, voice and profile accents.

## Navigation hierarchy

A persistent **family profile selector** anchors the sidebar. All timeline, conversation, personal data and file views are scoped to the selected person. An import action clearly states its target person. A family group does **not** imply access to another member's private history.

1. **My Timeline:** post cards with dates, author when supplied, captions, attachment counts and source provenance.
2. **Messages:** people list by name, chronological bubbles grouped by date, sender names and timestamps.
3. **Your Data:** categorize recognized exported records and show details with source provenance, including missing/unsupported warnings.
4. **Archive Files:** original ZIP metadata for transparency; lower priority than the familiar browsing experience.

## Core tokens

| Token | Light | Dark |
| --- | --- | --- |
| Canvas | `#F6F8F6` | `#131E19` |
| Surface | `#FFFFFF` | `#1B2922` |
| Text | `#193129` | `#F1FAF3` |
| Secondary | `#53695E` | `#C6D7C9` |
| Borders | `#E0E8E1` | `#354B3D` |
| Pine accent | `#17634D` | `#A5E7BD` |
| Focus | `#329A78` | `#91E0B3` |

Windows-native **Segoe UI Variable / Segoe UI / system sans**, without remote fonts. Use a 4/8px spacing rhythm, 10–14px soft corners, clear focus states and Lucide vector icons. Family avatar accents: Harbor blue, Orchid purple, Terracotta coral, Golden amber, Evergreen green. These are decorative cues, never authentication.

## Responsive screens
- Desktop dark evergreen sidebar about 238px, flexible reading column, 76px top navigation.
- Feed max 730px reading width with optional 300px contextual rail.
- Messenger-style inbox with participant list and conversation reading pane.
- Account-data explorer with categories and details.
- Small-screen collapsed navigation and accessible focus/scroll states.
- Honor light/dark system preference and reduced motion.

## Quality standards
- Apply UI/UX Pro Max for information architecture, Impeccable Operate mode for quality and Emil Design Engineering for interaction polish.
- Every control must work. No simulated Like/Send actions.
- Clearly label approximate HTML dates, limited imports, missing exported categories and attachment placeholders.
- No synthetic memories presented as real history.
- Distinguish organizational profile switching from true encrypted access; don't imply secure private accounts.
