#!/bin/bash
# Memulakan pelayan localhost Finance Pulse di port 3000
echo "--------------------------------------------------------"
echo "  Memulakan pelayan localhost Finance Pulse di Port 3000"
echo "--------------------------------------------------------"
cd "$(dirname "$0")"

# Bunuh proses lama yang menggunakan port 3000 (jika ada)
OLD_PID=$(lsof -ti tcp:3000)
if [ -n "$OLD_PID" ]; then
  echo "  Membunuh proses lama pada port 3000 (PID: $OLD_PID)..."
  kill -9 $OLD_PID 2>/dev/null
  sleep 1
fi

python3 -m http.server 3000
