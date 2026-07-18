#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "optparse"
require "yaml"

options = {
  canonical: "batches/canonical-airdrop.yaml",
  output: "env/rehearsal",
  js_id: nil,
  parent_id: nil
}

OptionParser.new do |parser|
  parser.banner = "Usage: scripts/prepare_regtest_airdrop.rb --js-id ID --parent-id ID [options]"
  parser.on("--js-id ID", "Regtest main.js inscription ID") { |value| options[:js_id] = value }
  parser.on("--parent-id ID", "Regtest stand-in parent inscription ID") { |value| options[:parent_id] = value }
  parser.on("--canonical PATH", "Canonical airdrop YAML") { |value| options[:canonical] = value }
  parser.on("--output DIR", "Generated rehearsal directory") { |value| options[:output] = value }
end.parse!

id_pattern = /\A[0-9a-f]{64}i\d+\z/
abort "error: valid --js-id is required" unless options[:js_id]&.match?(id_pattern)
abort "error: valid --parent-id is required" unless options[:parent_id]&.match?(id_pattern)

batch = YAML.safe_load(File.read(options[:canonical]), permitted_classes: [], aliases: false)
abort "error: canonical batch must contain 333 inscriptions" unless batch.fetch("inscriptions").length == 333

FileUtils.mkdir_p(options[:output])
html_path = File.join(options[:output], "inscribed.html")
batch_path = File.join(options[:output], "airdrop.yaml")

File.write(html_path, %(<script type="module" src="/content/#{options[:js_id]}"></script>\n))
batch["parents"] = [options[:parent_id]]
batch["postage"] = 1000
batch.fetch("inscriptions").each do |item|
  item["file"] = "./#{html_path}"
  item["destination"] = nil
end
File.write(batch_path, YAML.dump(batch))

puts "regtest_html=#{html_path}"
puts "regtest_batch=#{batch_path}"
puts "js_id=#{options[:js_id]}"
puts "parent_id=#{options[:parent_id]}"
