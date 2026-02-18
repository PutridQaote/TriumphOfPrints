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
