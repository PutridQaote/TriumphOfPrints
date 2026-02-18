#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/snapshot_ephemera_holders.sh [options]

Options:
  --ord-base URL         Local ord base URL (default: http://127.0.0.1:9001)
  --metadata-url URL     Collection metadata URL
                         (default: https://ephemera.gallery/magic-eden-metadata.json)
  --out-dir DIR          Output directory
                         (default: snapshots/ephemera/<UTC timestamp>)
  --expected-count N     Expected inscription count (default: 333)
  -h, --help             Show this help

Outputs in out-dir:
  ephemera_metadata.json
  ord_locations.jsonl
  recipient_snapshot.json
  recipient_snapshot.csv
  recipient_assignment_template.csv
  holders_by_address.csv
  summary.json
EOF
}

ORD_BASE="http://127.0.0.1:9001"
METADATA_URL="https://ephemera.gallery/magic-eden-metadata.json"
EXPECTED_COUNT=333
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="snapshots/ephemera/${STAMP}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ord-base)
      ORD_BASE="${2:-}"
      shift 2
      ;;
    --metadata-url)
      METADATA_URL="${2:-}"
      shift 2
      ;;
    --out-dir)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --expected-count)
      EXPECTED_COUNT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "Missing required command: curl" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "Missing required command: jq" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

METADATA_JSON="${OUT_DIR}/ephemera_metadata.json"
IDS_TXT="${TMP_DIR}/ids.txt"
LOCATIONS_JSONL="${OUT_DIR}/ord_locations.jsonl"
SNAPSHOT_JSON="${OUT_DIR}/recipient_snapshot.json"
SNAPSHOT_CSV="${OUT_DIR}/recipient_snapshot.csv"
ASSIGNMENT_CSV="${OUT_DIR}/recipient_assignment_template.csv"
HOLDERS_CSV="${OUT_DIR}/holders_by_address.csv"
SUMMARY_JSON="${OUT_DIR}/summary.json"

echo "Fetching metadata: ${METADATA_URL}"
curl -fsSL "${METADATA_URL}" -o "${METADATA_JSON}"

COUNT="$(jq 'length' "${METADATA_JSON}")"
if [[ "${COUNT}" != "${EXPECTED_COUNT}" ]]; then
  echo "Warning: expected ${EXPECTED_COUNT} inscriptions but found ${COUNT}." >&2
fi

jq -r '.[].id' "${METADATA_JSON}" > "${IDS_TXT}"

echo "Querying local ord server: ${ORD_BASE}"
: > "${LOCATIONS_JSONL}"
CURRENT=0
TOTAL="$(wc -l < "${IDS_TXT}" | tr -d ' ')"

while IFS= read -r ID; do
  CURRENT=$((CURRENT + 1))
  if (( CURRENT % 25 == 0 )) || (( CURRENT == TOTAL )); then
    echo "  ${CURRENT}/${TOTAL}"
  fi

  RESPONSE="$(curl -sS -w $'\n%{http_code}' "${ORD_BASE}/r/inscription/${ID}" || true)"
  BODY="${RESPONSE%$'\n'*}"
  HTTP_CODE="${RESPONSE##*$'\n'}"

  if [[ "${HTTP_CODE}" != "200" ]]; then
    jq -nc \
      --arg id "${ID}" \
      --arg http_code "${HTTP_CODE}" \
      '{"id":$id,"fetch_error":"http_error","http_code":$http_code}' \
      >> "${LOCATIONS_JSONL}"
    continue
  fi

  if ! jq -e . >/dev/null 2>&1 <<<"${BODY}"; then
    jq -nc \
      --arg id "${ID}" \
      '{"id":$id,"fetch_error":"invalid_json"}' \
      >> "${LOCATIONS_JSONL}"
    continue
  fi

  jq -c \
    '{id, number, address, output, satpoint, height, timestamp, value}' \
    <<<"${BODY}" >> "${LOCATIONS_JSONL}"
done < "${IDS_TXT}"

jq -s \
  --arg snapshot_at "${STAMP}" \
  --arg ord_base "${ORD_BASE}" \
  --slurpfile meta "${METADATA_JSON}" \
  '
  ($meta[0] | map({ key: .id, value: . }) | from_entries) as $metaById
  |
  to_entries
  | map(
      . as $row
      | ($metaById[$row.value.id]) as $m
      | {
          source_index: ($row.key + 1),
          source_inscription_id: $row.value.id,
          source_name: ($m.meta.name // null),
          source_number: ($row.value.number // null),
          source_collection_size: ($meta[0] | length),
          snapshot_at_utc: $snapshot_at,
          current_address: ($row.value.address // null),
          current_output: ($row.value.output // null),
          current_satpoint: ($row.value.satpoint // null),
          source_height: ($row.value.height // null),
          source_timestamp: ($row.value.timestamp // null),
          source_value: ($row.value.value // null),
          fetch_error: ($row.value.fetch_error // null),
          http_code: ($row.value.http_code // null),
          source_ord_url: ("https://ordinals.com/inscription/" + $row.value.id),
          local_ord_url: ($ord_base + "/inscription/" + $row.value.id)
        }
    )
  ' "${LOCATIONS_JSONL}" > "${SNAPSHOT_JSON}"

jq -r '
  ([
    "source_index",
    "source_inscription_id",
    "source_name",
    "current_address",
    "current_output",
    "current_satpoint",
    "source_number",
    "source_height",
    "source_timestamp",
    "fetch_error",
    "http_code"
  ]),
  (.[] | [
    .source_index,
    .source_inscription_id,
    .source_name,
    .current_address,
    .current_output,
    .current_satpoint,
    .source_number,
    .source_height,
    .source_timestamp,
    .fetch_error,
    .http_code
  ])
  | @csv
' "${SNAPSHOT_JSON}" > "${SNAPSHOT_CSV}"

jq -r '
  ([
    "source_index",
    "source_inscription_id",
    "source_name",
    "current_address",
    "assigned_drop_inscription_id",
    "assigned_drop_label",
    "manual_note"
  ]),
  (.[] | [
    .source_index,
    .source_inscription_id,
    .source_name,
    .current_address,
    "",
    "",
    ""
  ])
  | @csv
' "${SNAPSHOT_JSON}" > "${ASSIGNMENT_CSV}"

jq -r '
  (["current_address","count"]),
  (
    map(select(.current_address != null and .current_address != ""))
    | group_by(.current_address)
    | map({current_address: .[0].current_address, count: length})
    | sort_by(-.count, .current_address)
    | .[]
    | [.current_address, .count]
  )
  | @csv
' "${SNAPSHOT_JSON}" > "${HOLDERS_CSV}"

jq -n \
  --arg ord_base "${ORD_BASE}" \
  --arg metadata_url "${METADATA_URL}" \
  --arg snapshot_at_utc "${STAMP}" \
  --arg out_dir "${OUT_DIR}" \
  --argjson expected_count "${EXPECTED_COUNT}" \
  --argjson collection_count "${COUNT}" \
  --slurpfile snapshot "${SNAPSHOT_JSON}" \
  '
  ($snapshot[0]) as $items
  | {
      ord_base: $ord_base,
      metadata_url: $metadata_url,
      snapshot_at_utc: $snapshot_at_utc,
      out_dir: $out_dir,
      expected_count: $expected_count,
      collection_count: $collection_count,
      resolved_count: ($items | map(select(.fetch_error == null)) | length),
      error_count: ($items | map(select(.fetch_error != null)) | length),
      missing_address_count: ($items | map(select(.fetch_error == null and (.current_address == null or .current_address == ""))) | length),
      unique_address_count: ($items | map(select(.current_address != null and .current_address != "") | .current_address) | unique | length)
    }
  ' > "${SUMMARY_JSON}"

echo "Done. Snapshot files written to: ${OUT_DIR}"
cat "${SUMMARY_JSON}"
