#!/usr/bin/env bash
set -euo pipefail
gate="$(dirname "$0")/quality-gate.sh"
bash "$gate" success success
for result in failure cancelled skipped pending ''; do
  if bash "$gate" success "$result"; then
    printf 'Gate incorrectly accepted %s\n' "$result" >&2
    exit 1
  fi
done
if bash "$gate"; then
  echo 'Gate incorrectly accepted absent results' >&2
  exit 1
fi
echo 'Quality gate fixtures passed (including failed required validation)'
