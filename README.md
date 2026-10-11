# AmartyaOS GNOME Extensions

A backup and restoration project for the GNOME Shell extensions and selected
desktop assets used on Amartya OS.

## Goals

- Preserve the enabled GNOME extension UUIDs.
- Back up available extension source directories.
- Record system, schema, and dependency information.
- Preserve selected Amartya OS branding and SDDM theme assets.
- Provide validation and cautious restoration scripts.
- Keep private settings exports and noisy machine-specific reports out of Git.

## Repository map

| Path | Purpose |
|---|---|
| `backup/extensions/` | Copies of extension source directories collected during backup |
| `config/enabled-extensions.txt` | Python-literal snapshot of enabled extension UUIDs |
| `assets/system/` | Selected system branding and SDDM theme files |
| `assets/home/` | Selected user-owned assets included in the backup |
| `manifests/enabled-extensions.txt` | Enabled extension UUID inventory |
| `manifests/system-info.txt` | Source operating system and GNOME environment information |
| `manifests/asset-manifest.txt` | Asset inventory |
| `manifests/schema-files.txt` | Collected schema-file inventory |
| `manifests/schema-inventory.txt` | Schema and key inventory |
| `manifests/dependency-audit.txt` | Dependency-audit output |
| `manifests/custom-assets.tsv` | Selected asset paths and checksums |
| `manifests/sddm-theme-dependencies.txt` | SDDM theme dependency notes |
| `scripts/` | Audit, validation, and restoration scripts |
| `.gitignore` | Excludes private settings and selected noisy reports |

Large or machine-specific audit reports may be intentionally excluded from Git.
Check `.gitignore` before adding generated reports.

## Important distinctions

- An enabled-extension UUID list is not a copy of the extension code.
- A source-code backup does not guarantee that an extension works on a
  different GNOME Shell version.
- Extension preferences, external programs, system packages, and other
  desktop settings may need separate migration steps.
- Selected system assets do not constitute a complete operating-system backup.
- User-specific paths and settings may need to be adapted on another machine.

## Compatibility

Before restoring extensions, check:

1. The target GNOME Shell version.
2. Each extension's supported Shell versions and dependencies.
3. Required system packages and external commands.
4. Whether the original extension source is still maintained.
5. Whether enabling an extension could disrupt the current desktop session.

Do not assume that copying an extension directory alone restores its settings
or dependencies.

## Auditing

Review the scripts before running them. Scripts that modify system files may
require elevated privileges.

The SDDM theme restoration script supports a dry-run mode by default. Review
its proposed actions before explicitly requesting changes.

## Privacy and Git hygiene

Private settings exports and machine-specific audit reports are excluded by
`.gitignore`. Review every file before committing, especially configuration
exports, logs, paths, and extension data.

Do not commit passwords, private keys, tokens, personal account data, or raw
desktop settings dumps.

## Backup and restoration status

This repository records selected files from a particular source installation.
It is not yet a promise of fully automated, one-command desktop restoration.
Use the available validation scripts and inspect their output before applying
changes.

## Third-party licenses

This repository contains backups of third-party GNOME extensions. Their
source files, assets, and other bundled materials remain subject to the
applicable upstream license terms and any other relevant rights.

A preliminary filename-based audit found separate license or notice files
for 16 of the 52 bundled extensions. Some other extensions may declare
license information in metadata, source headers, or upstream repositories;
the absence of a separate license file does not establish their licensing
status.

Before redistributing this repository publicly, verify the applicable
license terms for each bundled extension and preserve its license and
copyright notices. Do not assume that every bundled extension has the same
license or redistribution permissions.
