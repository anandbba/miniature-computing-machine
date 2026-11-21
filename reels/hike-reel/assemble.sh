#!/bin/bash
# Join rendered segments, lay in the mix (loudness-normalised to -14 LUFS), final H.264/AAC encode.
set -e
cd "$(dirname "$0")"
S=out/seg
ffmpeg -v error -y \
  -i $S/a_hook_promise.mp4 -i $S/a2_promise.mp4 -i $S/b_melt.mp4 -i $S/c_turn.mp4 -i $S/d_move1.mp4 -i $S/e2_move2_3.mp4 -i $S/f_payoff_end.mp4 \
  -i audio/mix.wav \
  -filter_complex "[0:v]trim=start_frame=0:end_frame=84,setpts=PTS-STARTPTS[h];[h][1:v][2:v][3:v][4:v][5:v][6:v]concat=n=7:v=1:a=0,fps=30,format=yuv420p[v];[7:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 16 -profile:v high -level 4.2 -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart -shortest out/Your_9pct_Hike_Is_Really_5pct.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames -show_entries format=duration -of compact out/Your_9pct_Hike_Is_Really_5pct.mp4
