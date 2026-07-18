#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "json"
require "optparse"

options = {
  reveal_id: nil,
  mapping: nil,
  output: "env/rehearsal/gallery.html",
  ord_base: "http://127.0.0.1:9001"
}

OptionParser.new do |parser|
  parser.banner = "Usage: scripts/build_rehearsal_gallery.rb --reveal-id TXID --mapping PATH [options]"
  parser.on("--reveal-id TXID", "Regtest child reveal transaction ID") { |value| options[:reveal_id] = value }
  parser.on("--mapping PATH", "Refreshed mapping.csv") { |value| options[:mapping] = value }
  parser.on("--output PATH", "Generated HTML path") { |value| options[:output] = value }
  parser.on("--ord-base URL", "Regtest ord server URL") { |value| options[:ord_base] = value }
end.parse!

abort "error: --reveal-id must be a 64-character transaction ID" unless options[:reveal_id]&.match?(/\A[0-9a-f]{64}\z/)
abort "error: --mapping is required" unless options[:mapping]

rows = CSV.parse(File.binread(options[:mapping]).gsub("\r\n", "\n"), headers: true)
abort "error: mapping must contain 333 assignments" unless rows.length == 333

items = rows.each_with_index.map do |row, index|
  {
    index: index + 1,
    child_id: "#{options[:reveal_id]}i#{index}",
    ephemera_id: row["source_inscription_id"],
    destination: row["destination_address"],
    title: row["drop_title"],
    ink_status: row["drop_ink_status"]
  }
end

data = JSON.generate(items).gsub("</", "<\\/")
ord_base = options[:ord_base].sub(%r{/\z}, "")

html = <<~HTML
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Triumph of Prints — Regtest Recipient Review</title>
    <style>
      :root { color-scheme: dark; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #111; color: #eee; }
      header { position: sticky; top: 0; z-index: 2; padding: 14px 18px; background: #111e; border-bottom: 1px solid #333; backdrop-filter: blur(10px); }
      h1 { font: 600 18px/1.2 system-ui, sans-serif; margin: 0 0 10px; }
      .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      button, input { font: inherit; color: inherit; background: #222; border: 1px solid #555; border-radius: 5px; padding: 7px 10px; }
      button { cursor: pointer; }
      button:disabled { opacity: .35; cursor: default; }
      input { width: 160px; }
      #status { color: #aaa; margin-left: auto; }
      main { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; padding: 16px; }
      article { overflow: hidden; background: #191919; border: 1px solid #333; border-radius: 8px; }
      iframe { display: block; width: 100%; aspect-ratio: 1; border: 0; background: #000; }
      .info { padding: 10px; font-size: 12px; line-height: 1.5; }
      .title { display: flex; justify-content: space-between; gap: 8px; font-weight: 700; margin-bottom: 7px; }
      .muted { color: #999; }
      .address { overflow-wrap: anywhere; color: #d7b6ff; }
      a { color: #7dcfff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      @media (max-width: 600px) { #status { width: 100%; margin-left: 0; } }
    </style>
  </head>
  <body>
    <header>
      <h1>Triumph of Prints — regtest art + current recipient review</h1>
      <div class="controls">
        <button id="prev">Previous 48</button>
        <button id="next">Next 48</button>
        <input id="jump" type="number" min="1" max="333" placeholder="Jump to #1–333">
        <button id="go">Go</button>
        <span id="status"></span>
      </div>
    </header>
    <main id="grid"></main>
    <script>
      const items = #{data};
      const pageSize = 48;
      let page = 0;
      const grid = document.querySelector('#grid');
      const status = document.querySelector('#status');
      const previous = document.querySelector('#prev');
      const next = document.querySelector('#next');

      function render() {
        const start = page * pageSize;
        const visible = items.slice(start, start + pageSize);
        grid.replaceChildren(...visible.map(item => {
          const card = document.createElement('article');
          card.innerHTML = `
            <a href="#{ord_base}/inscription/${item.child_id}" target="_blank" rel="noreferrer">
              <iframe loading="lazy" sandbox="allow-scripts" src="#{ord_base}/preview/${item.child_id}" title="Print ${item.index}"></iframe>
            </a>
            <div class="info">
              <div class="title"><span>#${item.index} · ${item.title}</span><span class="muted">ink ${item.ink_status}</span></div>
              <div class="muted">Current recipient</div>
              <div class="address">${item.destination}</div>
              <div><a href="https://ordinals.com/inscription/${item.ephemera_id}" target="_blank" rel="noreferrer">Assigned Ephemera ↗</a></div>
            </div>`;
          return card;
        }));
        const end = Math.min(start + visible.length, items.length);
        status.textContent = `Showing ${start + 1}–${end} of ${items.length}`;
        previous.disabled = page === 0;
        next.disabled = end === items.length;
        window.scrollTo({ top: 0, behavior: 'instant' });
      }

      previous.addEventListener('click', () => { if (page > 0) { page -= 1; render(); } });
      next.addEventListener('click', () => { if ((page + 1) * pageSize < items.length) { page += 1; render(); } });
      function jump(value) {
        const index = Math.max(1, Math.min(items.length, Number(value) || 1));
        page = Math.floor((index - 1) / pageSize);
        render();
        document.querySelectorAll('article')[index - page * pageSize - 1]?.scrollIntoView({ block: 'center' });
      }
      document.querySelector('#go').addEventListener('click', () => jump(document.querySelector('#jump').value));
      document.querySelector('#jump').addEventListener('keydown', event => { if (event.key === 'Enter') jump(event.target.value); });
      render();
    </script>
  </body>
  </html>
HTML

File.write(options[:output], html)
puts "gallery=#{options[:output]}"
puts "assignments=#{items.length}"
