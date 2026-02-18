# Triumph Of Prints

WebGL-based inscription renderer for the Triumph collection.

## Prereqs

- macOS / Linux shell
- `ord`
- `bitcoin-cli`
- `just`
- `jq`
- `uv` (for local dev server)

## Commands

From `/Users/mty/src/TriumphOfPrints`:

- `just dev`: local hot-reload server (`http://localhost:5173`)
- `just env`: start local regtest `ord env` at `http://localhost:9001`
- `just env-stop`: stop local regtest `ord env` + `bitcoind` processes for this repo
- `just env-restart`: stop then start local regtest env
- `just env-reset`: remove local `env/`
- `just env-fresh`: reset + start fresh regtest env
- `just batch <yaml>`: run wallet batch inscription in local regtest env
- `just wallet <args>`: pass-through wallet commands
- `just mine`: mine 1 block to a fresh wallet address
- `just mine6`: mine 6 blocks to a fresh wallet address
- `just snapshot-ephemera`: build a 333-recipient holder snapshot from local `ord` API

## Local Dev Loop

1. Run `just dev`.
2. Edit `/Users/mty/src/TriumphOfPrints/main.js`.
3. Refresh browser if hot reload misses a change.

## Regtest Test-Inscribe Flow

This is the safe testing flow (no mainnet inscription).

1. Start clean env:
   - `just env-fresh`
2. Inscribe JS:
   - `just batch js.yaml`
   - Copy new JS inscription ID from output.
3. Point HTML at that JS:
   - Update `/Users/mty/src/TriumphOfPrints/inscribed.html`:
     - `<script type="module" src="/content/<JS_INSCRIPTION_ID>"></script>`
4. Inscribe parent:
   - `just batch parent.yaml`
   - `just mine`
   - Copy parent inscription ID from output.
5. Point airdrop children to parent:
   - Update `parents:` in `/Users/mty/src/TriumphOfPrints/airdrop.yaml` with that parent ID.
6. Inscribe full child batch:
   - `just batch airdrop.yaml`
   - `just mine`
   - `just mine`
7. Verify:
   - Parent children page:
     - `http://localhost:9001/children/<PARENT_INSCRIPTION_ID>`
   - Individual child:
     - `http://localhost:9001/content/<CHILD_INSCRIPTION_ID>`

## Notes On Grid Reliability

- Thumbnail previews are intentionally throttled and bounded in render size for stability.
- If a tile fails under context pressure, it does one delayed self-retry (`glretry=1`) before final fallback.
- Final fallback is always source image (never blank tile).

## Files You’ll Usually Touch

- `/Users/mty/src/TriumphOfPrints/main.js`: renderer + thumbnail hardening
- `/Users/mty/src/TriumphOfPrints/inscribed.html`: script inscription pointer
- `/Users/mty/src/TriumphOfPrints/airdrop.yaml`: child inscriptions + parent linkage
- `/Users/mty/src/TriumphOfPrints/justfile`: local command wrappers

## Optional Debug Tool

- `/Users/mty/src/TriumphOfPrints/grid_stress.html` is a local stress harness for iframe/grid behavior.
- It is not required for final inscription/publish.

## Ephemera Holder Snapshot

Use this when your local `ord server` is running against mainnet and reachable (for example `http://127.0.0.1:9001`).

Run:

- `just snapshot-ephemera`
- Or with explicit output directory:
  - `just snapshot-ephemera http://127.0.0.1:9001 snapshots/ephemera/manual_run_01`

Generated files:

- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/ephemera_metadata.json`: canonical source list from Ephemera.
- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/ord_locations.jsonl`: raw per-inscription lookup results from your local `ord`.
- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/recipient_snapshot.json`: joined, machine-friendly snapshot.
- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/recipient_snapshot.csv`: spreadsheet view of source inscription + current address.
- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/recipient_assignment_template.csv`: manual assignment sheet for mapping your drop inscription IDs to specific Ephemera inscriptions.
- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/holders_by_address.csv`: grouped addresses and counts.
- `/Users/mty/src/TriumphOfPrints/snapshots/ephemera/<timestamp>/summary.json`: quick counts and sanity checks.

Snapshot outputs are local artifacts and ignored by git.
