#!/bin/bash
export FIREBASE_CREDENTIALS_FILE="$HOME/.quantap/customerdb-staging-secret.json"
export GOOGLE_APPLICATION_CREDENTIALS=$FIREBASE_CREDENTIALS_FILE
firebase emulators:start --project=customerdb-staging --import=./tests/emulator-fixtures/  --export-on-exit

