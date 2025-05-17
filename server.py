# /// script
# dependencies = [
#   "livereload",
# ]
# ///

from livereload import Server, shell

server = Server()
server.watch('main.js')
server.serve(root='.', port=5173, open_url_delay=0)
