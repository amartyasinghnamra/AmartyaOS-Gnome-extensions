# Amartya OS — GNOME Desktop Component

A public desktop-integration component for **Amartya OS**, an Ubuntu-based Linux
setup. This repository brings together GNOME Shell extension sources, desktop
configuration inventories, selected Amartya OS branding, and tools for
validating and restoring the custom SDDM login theme.

The aim is to make the Amartya OS GNOME experience understandable, maintainable,
and reproducible—not just to store a snapshot of one machine.

## What this component contains

| Path | Purpose |
|---|---|
| `backup/extensions/` | Source copies of 52 GNOME extensions collected for this desktop setup |
| `config/enabled-extensions.txt` | Snapshot of the enabled GNOME extension UUID list from the source system |
| `manifests/enabled-extensions.txt` | Inventory of the extension source copies included here |
| `assets/system/usr/share/amartya-os/` | Selected Amartya OS branding and wallpaper assets |
| `assets/system/usr/share/sddm/themes/amartya-os/` | Custom SDDM theme files and artwork |
| `assets/home/` | Selected user-owned wallpaper asset |
| `manifests/` | System, asset, schema, and SDDM dependency inventories |
| `scripts/check-sddm-theme.sh` | Checks declared packages and required theme files |
| `scripts/restore-sddm-theme.sh` | Safely previews or restores the custom SDDM theme |
| `scripts/audit-*.sh` | Supporting asset and dependency audits |

## Current capabilities

- Publishes the collected GNOME extension source copies and selected desktop assets.
- Records the source system's extension UUIDs and environment information.
- Includes checks for the SDDM theme's declared package dependencies and files.
- Provides an SDDM theme restore helper that defaults to **dry-run** and refuses
  to overwrite differing files unless explicitly told to do so.

## Quick start

Clone the component:

```bash
git clone https://github.com/amartyasinghnamra/AmartyaOS-Gnome-extensions.git
cd AmartyaOS-Gnome-extensions
```

Check the SDDM theme prerequisites and run the restore script in preview mode:

```bash
bash scripts/check-sddm-theme.sh
bash scripts/restore-sddm-theme.sh
```

The restore command above is a dry-run: it does not change system files.

To apply the SDDM theme after reviewing the preview, run:

```bash
sudo bash scripts/restore-sddm-theme.sh --apply
```

If the live theme differs from the repository version, the script stops rather
than overwriting those differences by default. Review conflicts deliberately;
only use `--force` when you have decided that replacing the live files is
appropriate. The script does not restart SDDM or the display manager.

## Compatibility and limitations

- The source environment is Ubuntu-based Amartya OS with GNOME Shell. The
  exact supported distribution and GNOME Shell version matrix is not yet
  defined.
- The extension directories are source copies, not a guarantee that every
  extension works with every GNOME Shell version.
- The enabled UUID snapshot and the set of 52 bundled source copies are
  different inventories; they should not be treated as interchangeable.
- This repository does not yet provide a universal one-command installation
  of all extensions, their preferences, packages, and desktop settings.
- SDDM is a separate display manager; restoring its theme does not configure
  GNOME Shell or replace the system's login-manager setup.
- Review scripts before running them, especially any command requiring
  administrator privileges.

## Contributing and maintenance

When improving this component:

1. Keep installation and restoration steps explicit and safe by default.
2. Check extension compatibility with the target GNOME Shell version.
3. Preserve upstream extension attribution, license files, and notices.
4. Avoid machine-specific paths and private settings in committed files.
5. Test changes on a non-critical setup before recommending them for general use.

Issues and pull requests for compatibility fixes, documentation, and safer
installation workflows are welcome.

## Third-party licensing

This repository includes third-party GNOME extension source copies. Each
extension's source, assets, and bundled materials remain subject to its
applicable upstream license and copyright notices. Do not assume that every
extension has the same license or that the entire collection can be relicensed
as one work. Preserve existing notices and verify the relevant upstream terms
before redistributing or modifying individual extensions.

## Project status

**Public development component — early stage.** The repository currently
provides collected source, inventories, selected Amartya OS assets, and a
cautious SDDM theme restoration helper. A complete, tested desktop-component
installer and a declared compatibility matrix remain future work.
