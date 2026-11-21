#!/bin/bash
# usage: ./render.sh start end out.mp4 [concurrency]
npx remotion render src/index.ts Reel "$3" --frames=$1-$2 --codec=h264 --crf=12 --pixel-format=yuv420p --muted \
  --browser-executable=/opt/pw-browsers/chromium --gl=swangle --concurrency=${4:-2} --timeout=240000 --log=error
