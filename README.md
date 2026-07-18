# Triumph Of Prints

A 333-piece recursive Ordinals collection rendered with a CMYK-halftone WebGL
shader. Each child has the same tiny HTML body; its unique artwork parameters
and source image are stored as on-chain CBOR metadata.

## Release model

- `main.js` is inscribed first and becomes the shared recursive renderer.
- `inscribed.html` points to that confirmed mainnet JavaScript inscription.
- The existing inscription
  `23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0`
  is the collection parent. It is not re-inscribed.
- The 333 children use `separate-outputs`, 1,000 sats postage each, and are sent
  one-to-one to the current holders of their assigned Ephemera inscriptions.
- The parent must be held by the ord wallet that creates the child batch.

See `batches/README.md` for the canonical/generated/archive/regtest layout.

## Prerequisites

- `ord`
- Bitcoin Core with `txindex=1`
- `bitcoin-cli`
- `just`
- `jq`
- Ruby (the release scripts use only its standard library)

## Safe commands

```sh
# Create a timestamped candidate from the live local mainnet ord server.
just refresh-airdrop

# Validate a candidate, including live holder and dependency checks.
just validate-airdrop batches/generated/<timestamp>/airdrop.yaml candidate http://127.0.0.1

# After the real mainnet JS ID has replaced the placeholder, run strict checks.
just validate-airdrop batches/generated/<timestamp>/airdrop.yaml release http://127.0.0.1
```

Refresh output is atomic and never overwrites an existing bundle. Each bundle
contains:

- `airdrop.yaml`: ord-ready candidate batch;
- `mapping.csv`: the fixed print/Ephemera pairing with refreshed addresses;
- `summary.json`: block height, timestamp, changed assignments, address types,
  parent, and postage totals.

`batches/generated/` is ignored so rehearsals and intermediate snapshots do not
pollute git. The final launch bundle should be copied to a deliberate release
location and committed after strict validation.

## Clean regtest rehearsal

The regtest rehearsal deliberately uses a newly inscribed copy of the parent
JPEG as a stand-in. Mainnet never runs that parent batch.

```sh
# Terminal 1: destructive only to ignored env/ regtest state.
just env-fresh

# Terminal 2: inscribe and confirm the renderer.
just batch batches/regtest/js.yaml
just mine

# Inscribe and confirm the synthetic regtest parent.
just batch batches/regtest/parent.yaml
just mine

# Substitute the two IDs printed above.
just prepare-regtest <JS_INSCRIPTION_ID> <PARENT_INSCRIPTION_ID>

# Inscribe and confirm all 333 children.
just batch env/rehearsal/airdrop.yaml
just mine
just mine

# Optional: annotate every regtest preview with its current mainnet recipient.
just rehearsal-gallery <CHILD_REVEAL_TXID> batches/generated/<timestamp>/mapping.csv
python3 -m http.server 5173 --bind 127.0.0.1
```

The same server can be started with `just gallery-server` and stopped with
`just gallery-stop`.

Browse:

- `http://127.0.0.1:9001/children/<PARENT_INSCRIPTION_ID>`
- `http://127.0.0.1:9001/preview/<CHILD_INSCRIPTION_ID>`
- `http://127.0.0.1:9001/content/<CHILD_INSCRIPTION_ID>`
- `http://127.0.0.1:5173/env/rehearsal/gallery.html` for the annotated
  art/recipient review gallery after starting the static server above.

## Mainnet launch order

1. Create a dedicated ord wallet and make a verified descriptor/mnemonic backup.
2. Fund it with postage, fees, and headroom.
3. Transfer the existing parent inscription into that wallet and verify it with
   `ord wallet inscriptions`.
4. Inscribe `main.js` using `batches/mainnet/js.yaml`.
5. After confirmation, update `inscribed.html` with the real JS inscription ID.
6. Optionally inscribe an unparented canary child and verify rendering.
7. Refresh holders close to launch and run strict release validation.
8. Dry-run the final batch at the chosen live fee rate.
9. Inscribe the 333 children while the parent remains in the ord wallet.
10. Confirm and verify the parent children page before moving the parent again.

Do not use `--no-backup` for mainnet. Do not run ordinary Bitcoin Core wallet
send operations against the ord wallet; use ord's wallet commands so inscription
sat control is preserved.

## Other commands

- `just dev`: local development server (requires `uv`).
- `just env`: start the existing regtest environment.
- `just env-stop`: stop this repository's regtest processes.
- `just wallet <args>`: regtest ord wallet passthrough.
- `just snapshot-ephemera`: create the older full snapshot artifact set.

`grid_stress.html` is an optional thumbnail/WebGL stress harness and is not part
of the inscription payload.
