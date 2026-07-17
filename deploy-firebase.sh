#!/bin/bash
# Membina dan mendeploy Finance Pulse ke Firebase Hosting
echo "--------------------------------------------------------"
echo "  Deploying Finance Pulse ke Firebase Hosting"
echo "--------------------------------------------------------"
cd "$(dirname "$0")"

# 1. Log masuk ke Firebase (jika belum)
echo "🔑 Menyemak kelayakan log masuk Firebase..."
npx firebase-tools login

# 2. Deploy ke Firebase Hosting
echo "🚀 Memulakan pendeployan..."
npx firebase-tools deploy --only hosting --project finance-pulse
