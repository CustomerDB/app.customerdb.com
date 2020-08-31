#!/bin/bash
export FIREBASE_CREDENTIALS_FILE="$HOME/.quantap/customerdb-local-secret.json"

FIXTURE=${FIXTURE:-00-base}

export EXPORT_ON_EXIT="" 
while getopts ":w" opt; do
  case $opt in
    w)
      EXPORT_ON_EXIT="--export-on-exit"
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done

firebase emulators:start --project=customerdb-local --import=./tests/fixtures/$FIXTURE $EXPORT_ON_EXIT

