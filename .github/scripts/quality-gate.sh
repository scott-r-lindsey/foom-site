#!/usr/bin/env bash
set -euo pipefail
# Accept only explicit success, including the aggregate result of a matrix job.
if [[ "$#" -eq 0 ]]; then
  echo 'No required validation results supplied' >&2
  exit 1
fi
for result in "$@"; do
  if [[ "$result" != success ]]; then
    printf 'Required validation did not succeed: %s\n' "$result" >&2
    exit 1
  fi
done
