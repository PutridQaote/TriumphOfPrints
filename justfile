set shell := ["zsh", "-cu"]

datadir := "env"
proxy := "https://ordinals.com"

default:
  @just --list

dev:
  uv run server.py

env:
  ord env --proxy {{proxy}} {{datadir}}

env-stop:
  pkill -f "ord env --proxy {{proxy}} {{datadir}}" || true
  pkill -f "bitcoind -conf=$PWD/{{datadir}}/bitcoin.conf" || true
  pkill -f "ord --datadir $PWD/{{datadir}} server" || true

env-restart:
  just env-stop
  just env

env-reset:
  rm -rf {{datadir}}

env-fresh:
  rm -rf {{datadir}}
  ord env --proxy {{proxy}} {{datadir}}

wallet +args='':
  ord --datadir {{datadir}} wallet {{args}}

batch +args='':
  ord --datadir {{datadir}} wallet batch --no-backup --fee-rate 1 --batch {{args}}

mine address='':
  if [ -n "{{address}}" ]; then \
    bitcoin-cli -datadir={{datadir}} generatetoaddress 1 {{address}}; \
  else \
    addr=$(ord -f json --datadir {{datadir}} wallet receive | jq -r '.addresses[0]'); \
    echo "Mining 1 block to $addr"; \
    bitcoin-cli -datadir={{datadir}} generatetoaddress 1 $addr; \
  fi

mine6 address='':
  if [ -n "{{address}}" ]; then \
    bitcoin-cli -datadir={{datadir}} generatetoaddress 6 {{address}}; \
  else \
    addr=$(ord -f json --datadir {{datadir}} wallet receive | jq -r '.addresses[0]'); \
    echo "Mining 6 blocks to $addr"; \
    bitcoin-cli -datadir={{datadir}} generatetoaddress 6 $addr; \
  fi

snapshot-ephemera ord_base='http://127.0.0.1:9001' out_dir='':
  if [ -n "{{out_dir}}" ]; then \
    ./scripts/snapshot_ephemera_holders.sh --ord-base "{{ord_base}}" --out-dir "{{out_dir}}"; \
  else \
    ./scripts/snapshot_ephemera_holders.sh --ord-base "{{ord_base}}"; \
  fi

# Build a new timestamped mainnet candidate without overwriting prior output.
refresh-airdrop ord_base='http://127.0.0.1' out_dir='':
  if [ -n "{{out_dir}}" ]; then \
    ruby scripts/refresh_airdrop_destinations.rb --ord-base "{{ord_base}}" --output "{{out_dir}}"; \
  else \
    ruby scripts/refresh_airdrop_destinations.rb --ord-base "{{ord_base}}"; \
  fi

# Candidate stage permits the known regtest JS pointer; release stage does not.
validate-airdrop batch stage='candidate' ord_base='':
  if [ -n "{{ord_base}}" ]; then \
    ruby scripts/validate_airdrop_release.rb --batch "{{batch}}" --stage "{{stage}}" --ord-base "{{ord_base}}"; \
  else \
    ruby scripts/validate_airdrop_release.rb --batch "{{batch}}" --stage "{{stage}}"; \
  fi

# Generate the regtest-only recursive HTML and 333-child batch after the JS and
# stand-in parent have been inscribed.
prepare-regtest js_id parent_id:
  ruby scripts/prepare_regtest_airdrop.rb --js-id "{{js_id}}" --parent-id "{{parent_id}}"

# Join the regtest art with a refreshed mainnet recipient mapping for review.
rehearsal-gallery reveal_id mapping:
  ruby scripts/build_rehearsal_gallery.rb --reveal-id "{{reveal_id}}" --mapping "{{mapping}}"

# Serve the generated rehearsal gallery locally for review.
gallery-server:
  python3 -m http.server 5173 --bind 127.0.0.1

# Stop only the local rehearsal gallery server.
gallery-stop:
  pkill -f "python3 -m http.server 5173 --bind 127.0.0.1" || true
