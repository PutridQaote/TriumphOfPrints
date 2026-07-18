#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "json"
require "net/http"
require "optparse"
require "uri"
require "yaml"

EXPECTED_COUNT = 333
EXPECTED_PARENT = "23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0"
KNOWN_REGTEST_JS = "1f29e9a01324f90c5c05767f70827078099bea30ef59655e57701fd262f8b14fi0"
REQUIRED_METADATA = %w[cOffset inkStatus kOffset mOffset noiseAmp radius source title yOffset].freeze

options = {
  batch: nil,
  canonical: "batches/canonical-airdrop.yaml",
  mapping: nil,
  stage: "candidate",
  ord_base: nil,
  html: "inscribed.html"
}

OptionParser.new do |parser|
  parser.banner = "Usage: scripts/validate_airdrop_release.rb --batch PATH [options]"
  parser.on("--batch PATH", "Generated airdrop YAML") { |value| options[:batch] = value }
  parser.on("--canonical PATH", "Canonical airdrop YAML") { |value| options[:canonical] = value }
  parser.on("--mapping PATH", "Generated assignment mapping CSV") { |value| options[:mapping] = value }
  parser.on("--stage STAGE", %w[candidate release], "candidate or release") { |value| options[:stage] = value }
  parser.on("--ord-base URL", "Also verify destinations and dependencies live") { |value| options[:ord_base] = value }
  parser.on("--html PATH", "Recursive child HTML payload") { |value| options[:html] = value }
end.parse!

errors = []
warnings = []

def load_yaml(path)
  YAML.safe_load(File.read(path), permitted_classes: [], aliases: false)
end

def fetch_json(base, path)
  uri = URI.join(base.end_with?("/") ? base : "#{base}/", path.sub(%r{\A/}, ""))
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 10, read_timeout: 30) do |http|
    http.request(Net::HTTP::Get.new(uri))
  end
  raise "HTTP #{response.code} from #{uri}" unless response.is_a?(Net::HTTPSuccess)

  JSON.parse(response.body)
end

unless options[:batch]
  warn "error: --batch is required"
  exit 2
end

begin
  batch = load_yaml(options[:batch])
  canonical = load_yaml(options[:canonical])
rescue StandardError => error
  warn "error: #{error.message}"
  exit 1
end

items = batch["inscriptions"] || []
canonical_items = canonical["inscriptions"] || []
errors << "mode must be separate-outputs" unless batch["mode"] == "separate-outputs"
errors << "postage must be explicitly set to 1000 sats" unless batch["postage"] == 1000
errors << "expected #{EXPECTED_COUNT} inscriptions, found #{items.length}" unless items.length == EXPECTED_COUNT
errors << "canonical inscription count changed" unless canonical_items.length == EXPECTED_COUNT

parents = batch["parents"] || []
errors << "expected exactly one parent" unless parents.length == 1
errors << "parent must be the existing inscription #{EXPECTED_PARENT}" unless parents.first == EXPECTED_PARENT

if items.length == canonical_items.length
  items.zip(canonical_items).each_with_index do |(item, source), index|
    comparable = item.reject { |key, _value| key == "destination" }
    source_comparable = source.reject { |key, _value| key == "destination" }
    errors << "print definition #{index + 1} differs from canonical" unless comparable == source_comparable
  end
end

items.each_with_index do |item, index|
  destination = item["destination"]
  errors << "assignment #{index + 1} has no destination" unless destination.is_a?(String) && !destination.empty?
  if destination.is_a?(String) && !destination.match?(/\A(?:bc1[ac-hj-np-z02-9]{11,87}|[13][1-9A-HJ-NP-Za-km-z]{25,34})\z/i)
    errors << "assignment #{index + 1} has an invalid-looking mainnet address"
  end
  errors << "assignment #{index + 1} file must be ./inscribed.html" unless item["file"] == "./inscribed.html"
  metadata = item["metadata"] || {}
  missing = REQUIRED_METADATA - metadata.keys
  errors << "assignment #{index + 1} missing metadata: #{missing.join(', ')}" unless missing.empty?
  source = metadata["source"]
  errors << "assignment #{index + 1} has invalid source inscription ID" unless source.is_a?(String) && source.match?(/\A[0-9a-f]{64}i\d+\z/)
end

title_counts = items.group_by { |item| item.dig("metadata", "title") }.each_with_object({}) do |(title, values), result|
  result[title] = values.length
end
errors << "title counts must be 264 Bitcoin / 69 Science, found #{title_counts.inspect}" unless title_counts == { "Triumph of Bitcoin" => 264, "Triumph of Science" => 69 }
errors << "expected 14 unique source images" unless items.map { |item| item.dig("metadata", "source") }.uniq.length == 14

mapping_path = options[:mapping] || File.join(File.dirname(options[:batch]), "mapping.csv")
if File.file?(mapping_path)
  rows = CSV.parse(File.binread(mapping_path).gsub("\r\n", "\n"), headers: true)
  errors << "mapping must contain #{EXPECTED_COUNT} rows" unless rows.length == EXPECTED_COUNT
  if rows.length == items.length
    rows.each_with_index do |row, index|
      errors << "mapping destination mismatch at assignment #{index + 1}" unless row["destination_address"] == items[index]["destination"]
      errors << "mapping index mismatch at assignment #{index + 1}" unless row["assignment_index"] == (index + 1).to_s
    end
    ids = rows.map { |row| row["source_inscription_id"] }
    errors << "mapping must contain #{EXPECTED_COUNT} unique Ephemera IDs" unless ids.uniq.length == EXPECTED_COUNT
  end
else
  errors << "missing generated mapping: #{mapping_path}"
end

begin
  html = File.read(options[:html]).strip
  match = html.match(%r{\A<script type="module" src="/content/([0-9a-f]{64}i\d+)"></script>\z})
  errors << "#{options[:html]} must be exactly one recursive module script" unless match
  if match && match[1] == KNOWN_REGTEST_JS
    message = "#{options[:html]} still points to the known regtest JS inscription"
    options[:stage] == "release" ? errors << message : warnings << message
  end
rescue Errno::ENOENT
  errors << "missing recursive child payload: #{options[:html]}"
end

if options[:ord_base]
  begin
    parent_record = fetch_json(options[:ord_base], "/r/inscription/#{EXPECTED_PARENT}")
    errors << "parent did not resolve as image/jpeg" unless parent_record["content_type"] == "image/jpeg"

    if File.file?(mapping_path)
      rows = CSV.parse(File.binread(mapping_path).gsub("\r\n", "\n"), headers: true)
      rows.each_with_index do |row, index|
        live = fetch_json(options[:ord_base], "/r/inscription/#{row['source_inscription_id']}")["address"]
        errors << "assignment #{index + 1} destination is stale" unless live == items[index]["destination"]
      rescue StandardError => error
        errors << "assignment #{index + 1} live lookup failed: #{error.message}"
      end
    end

    source_ids = items.map { |item| item.dig("metadata", "source") }.uniq
    source_ids.each do |id|
      record = fetch_json(options[:ord_base], "/r/inscription/#{id}")
      errors << "source #{id} did not resolve as an image" unless record["content_type"].to_s.start_with?("image/")
    end
  rescue StandardError => error
    errors << "live validation failed: #{error.message}"
  end
end

warnings.each { |warning| warn "warning: #{warning}" }
if errors.empty?
  puts "VALID #{options[:stage]} airdrop: #{items.length} inscriptions, #{items.map { |item| item['destination'] }.uniq.length} destinations, 1000 sats each"
  exit 0
end

errors.each { |error| warn "error: #{error}" }
warn "INVALID #{options[:stage]} airdrop: #{errors.length} error(s)"
exit 1
