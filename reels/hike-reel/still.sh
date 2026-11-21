#!/bin/bash
# usage: ./still.sh frame out.png
npx remotion still src/index.ts Reel "$2" --frame=$1 --browser-executable=/opt/pw-browsers/chromium --gl=swangle --log=error --timeout=120000
