# Offline design skill setup

The repository tracks the actual upstream `SKILL.md` for the three design skills we used on Open-Photo.

| Skill | Purpose | Source |
| --- | --- | --- |
| UI/UX Pro Max | UX, layout, navigation, accessibility and design systems | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| Impeccable | UI critique, consistent craft, audits and finishing | https://github.com/pbakaus/impeccable |
| Emil Design Engineering | Interaction, animation, motion and polished details | https://github.com/emilkowalski/skills |

## What's imported
- The upstream `SKILL.md` for each skill.
- Full upstream license/notice text alongside the skill.
- The main referenced design guidance for Impeccable and UI/UX Pro Max.
- A reproducible PowerShell installer for the **complete pinned** upstream skill directories, including scripts, datasets, agents and additional references.

## Complete installation on Windows
From the repository root, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-design-skills.ps1
```

The install script downloads source ZIPs for pinned revisions, extracts only the appropriate skill folders to `.agents/skills/` and retains the upstream licenses/notice files. Inspect third-party source before running its scripts. Installed files can be reviewed and committed if the team wants fully vendored skills in Git.

**Until the installer is run, only the tracked skill instructions and core references are present.** Don't call missing helpers. The UI/UX Pro Max data and search scripts, and Impeccable's launcher and supporting reference set, require the full setup.

## Skill use during development
1. **UI/UX Pro Max:** define design system, high-density browser layout, search/filter interactions, keyboard navigation, accessibility, empty/error states.
2. **Impeccable:** critique the assembled screens; refine hierarchy, content clarity, and quality across states. For archive browsing and search, prefer Operate mode.
3. **Emil:** polish interactive feel, focus states and transitions while respecting reduced motion and not animating frequently used controls.

## Reproducible upstream revisions
- Emil Design Engineering: `715c1807e08c497cfd1dc4feb450a2a3300ef2a9`
- UI/UX Pro Max: `6ae86f61f520d6ca229d2f40e070410638c908c5`
- Impeccable: `fead7938331bb92129e3c5ce14f600611067bd06`

Upstream skills have their own MIT or Apache-2.0 license terms. Their inclusion does **not** decide the license for Offline itself.
