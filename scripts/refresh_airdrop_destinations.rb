#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "fileutils"
require "json"
require "net/http"
require "optparse"
require "tmpdir"
require "uri"
require "yaml"

EXPECTED_COUNT = 333
DEFAULT_CANONICAL = "batches/canonical-airdrop.yaml"
DEFAULT_ASSIGNMENTS = "batches/archive/2026-02-18/mapping.csv"
DEFAULT_ORD_BASE = "http://127.0.0.1"

options = {
  canonical: DEFAULT_CANONICAL,
  assignments: DEFAULT_ASSIGNMENTS,
  ord_base: DEFAULT_ORD_BASE,
  output: nil
}

OptionParser.new do |parser|
  parser.banner = "Usage: scripts/refresh_airdrop_destinations.rb [options]"
  parser.on("--canonical PATH", "Canonical null-destination airdrop YAML") { |value| options[:canonical] = value }
  parser.on("--assignments PATH", "Fixed print-to-Ephemera assignment CSV") { |value| options[:assignments] = value }
  parser.on("--ord-base URL", "ord server base URL (default: #{DEFAULT_ORD_BASE})") { |value| options[:ord_base] = value }
  parser.on("--output DIR", "New bundle directory; must not already exist") { |value| options[:output] = value }
end.parse!

def fail_with(message)
  warn "error: #{message}"
  exit 1
end

def load_yaml(path)
  YAML.safe_load(File.read(path), permitted_classes: [], aliases: false)
rescue Errno::ENOENT
  fail_with("missing file: #{path}")
rescue Psych::SyntaxError => error
  fail_with("invalid YAML in #{path}: #{error.message}")
end

def fetch_json(base, path)
  uri = URI.join(base.end_with?("/") ? base : "#{base}/", path.sub(%r{\A/}, ""))
  request = Net::HTTP::Get.new(uri)
  response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 10, read_timeout: 30) do |http|
    http.request(request)
  end
  raise "HTTP #{response.code} from #{uri}" unless response.is_a?(Net::HTTPSuccess)

  JSON.parse(response.body)
end

def address_type(address)
  return "p2tr" if address.start_with?("bc1p")
  return "segwit_v0" if address.start_with?("bc1q")
  return "legacy" if address.start_with?("1")
  return "p2sh" if address.start_with?("3")

  "other"
end

canonical = load_yaml(options[:canonical])
inscriptions = canonical.fetch("inscriptions") { fail_with("canonical YAML has no inscriptions") }
fail_with("expected #{EXPECTED_COUNT} canonical inscriptions, found #{inscriptions.length}") unless inscriptions.length == EXPECTED_COUNT
fail_with("canonical mode must be separate-outputs") unless canonical["mode"] == "separate-outputs"
fail_with("canonical postage must be 1000") unless canonical["postage"] == 1000
fail_with("canonical destinations must all be null") unless inscriptions.all? { |item| item["destination"].nil? }

rows = CSV.parse(File.binread(options[:assignments]).gsub("\r\n", "\n"), headers: true)
fail_with("expected #{EXPECTED_COUNT} assignment rows, found #{rows.length}") unless rows.length == EXPECTED_COUNT

indices = rows.map { |row| Integer(row["assignment_index"], 10) }
fail_with("assignment indices must be exactly 1..#{EXPECTED_COUNT}") unless indices == (1..EXPECTED_COUNT).to_a

source_ids = rows.map { |row| row["source_inscription_id"] }
fail_with("every Ephemera assignment must be unique") unless source_ids.uniq.length == EXPECTED_COUNT
fail_with("invalid Ephemera inscription ID in assignments") unless source_ids.all? { |id| id.match?(/\A[0-9a-f]{64}i\d+\z/) }

puts "Resolving #{EXPECTED_COUNT} assigned Ephemera inscriptions from #{options[:ord_base]}"
addresses = []
source_ids.each_with_index do |id, index|
  record = fetch_json(options[:ord_base], "/r/inscription/#{id}")
  address = record["address"]
  fail_with("missing address for assignment #{index + 1} (#{id})") unless address.is_a?(String) && !address.empty?
  addresses << address
  puts "  #{index + 1}/#{EXPECTED_COUNT}" if ((index + 1) % 25).zero? || index + 1 == EXPECTED_COUNT
rescue StandardError => error
  fail_with("could not resolve assignment #{index + 1} (#{id}): #{error.message}")
end

height = fetch_json(options[:ord_base], "/r/blockheight")
generated_at = Time.now.utc.strftime("%Y-%m-%dT%H:%M:%SZ")
stamp = Time.now.utc.strftime("%Y%m%dT%H%M%SZ")
output_dir = options[:output] || File.join("batches", "generated", stamp)
fail_with("output already exists: #{output_dir}") if File.exist?(output_dir)

candidate = Marshal.load(Marshal.dump(canonical))
candidate.fetch("inscriptions").each_with_index do |item, index|
  item["destination"] = addresses[index]
end

old_addresses = rows.map { |row| row["destination_address"] }
changed = addresses.each_index.select { |index| old_addresses[index] != addresses[index] }
types = addresses.group_by { |address| address_type(address) }.each_with_object({}) do |(type, values), result|
  result[type] = values.length
end

summary = {
  "generated_at_utc" => generated_at,
  "ord_base" => options[:ord_base],
  "ord_blockheight" => height,
  "canonical" => options[:canonical],
  "assignments" => options[:assignments],
  "inscription_count" => EXPECTED_COUNT,
  "postage_sats_each" => candidate["postage"],
  "total_postage_sats" => candidate["postage"] * EXPECTED_COUNT,
  "unique_destination_count" => addresses.uniq.length,
  "changed_since_baseline_count" => changed.length,
  "changed_assignment_indices" => changed.map { |index| index + 1 },
  "address_type_counts" => types,
  "parent" => candidate.fetch("parents").first
}

parent_dir = File.dirname(output_dir)
FileUtils.mkdir_p(parent_dir)
temporary_dir = Dir.mktmpdir(".airdrop-refresh-", parent_dir)
begin
  File.write(File.join(temporary_dir, "airdrop.yaml"), YAML.dump(candidate))
  CSV.open(File.join(temporary_dir, "mapping.csv"), "w") do |csv|
    csv << rows.headers
    rows.each_with_index do |row, index|
      values = row.fields
      destination_column = rows.headers.index("destination_address")
      values[destination_column] = addresses[index]
      csv << values
    end
  end
  File.write(File.join(temporary_dir, "summary.json"), JSON.pretty_generate(summary) + "\n")
  FileUtils.mv(temporary_dir, output_dir)
rescue StandardError
  FileUtils.remove_entry(temporary_dir) if File.exist?(temporary_dir)
  raise
end

puts "Candidate bundle written atomically: #{output_dir}"
puts JSON.pretty_generate(summary)
