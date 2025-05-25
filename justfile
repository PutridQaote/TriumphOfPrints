set shell := ["powershell.exe", "-NoLogo", "-Command"]

dev:
  uv run server.py 

env:
  ord env --proxy https://ordinals.com

wallet +args='':
  ord --datadir env wallet {{args}}

batch +args='':
  ord --datadir env wallet batch --no-backup --fee-rate 1 --batch {{args}}

mine:
  B:\Bitcoin\daemon\bitcoin-cli.exe -datadir=env generatetoaddress 1 bcrt1pdwxjyh7wc8c8gxc7690yza7cq2aglumclk45c6j8xr8jsj7rkrwqf2rvj9