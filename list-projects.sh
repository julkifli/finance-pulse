#!/bin/bash
# Senaraikan projek Firebase dan simpan output ke projects_list.txt
echo "Mendapatkan senarai projek Firebase..."
npx firebase-tools projects:list > projects_list.txt
echo "Senarai disimpan ke projects_list.txt"
