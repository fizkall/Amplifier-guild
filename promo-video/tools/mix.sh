#!/usr/bin/env bash
# Mix voiceover (ElevenLabs) + synthesized music (ducked under voice) + SFX, loudness-normalised for Reels.
set -euo pipefail
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error \
  -i assets/voiceover.mp3 -i assets/music.wav -i assets/sfx.wav \
  -filter_complex "\
[0:a]aresample=44100,aformat=channel_layouts=stereo,highpass=f=70,acompressor=threshold=-18dB:ratio=3:attack=5:release=120,volume=1.0,apad=whole_dur=180.6,asplit=2[v][vsc];\
[1:a]volume=0.27[m];\
[m][vsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=450:makeup=1[md];\
[2:a]volume=0.55[s];\
[v][md][s]amix=inputs=3:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]" \
  -map "[out]" -ar 48000 -c:a pcm_s16le output/mix.wav
ffmpeg -hide_banner -i output/mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|True peak|Peak:)" | head -3
