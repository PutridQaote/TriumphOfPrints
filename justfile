dev:
  uv run server.py 

env:
  ord env --proxy https://ordinals.com

wallet +args='':
  ord --datadir env wallet {{args}}

batch +args='':
  ord --datadir env wallet batch --no-backup --fee-rate 1 {{args}}

mine address:
  bitcoin-cli -datadir=env generatetoaddress 1 {{address}}
