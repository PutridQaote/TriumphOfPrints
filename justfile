set shell := ["zsh", "-cu"]

datadir := "env"
proxy := "https://ordinals.com"

default:
  @just --list

dev:
  uv run server.py

env:
  ord env --proxy {{proxy}} {{datadir}}

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
