#!/usr/bin/env python3
"""Ev ekranının seslendirmesini kaydeder: tools/ev_sesleri.json -> ev-sesler.js
Ses: tr-TR-EmelNeural (edge-tts). Başı/sonu ffmpeg ile kırpılır.
Çalıştır:  python3 tools/ses_kaydet.py      (internet + ffmpeg gerekir)
"""
import asyncio, base64, json, os, shutil, subprocess
import edge_tts

VOICE, RATE, PITCH = "tr-TR-EmelNeural", "-5%", "+2Hz"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINES = json.load(open(os.path.join(ROOT, "tools", "ev_sesleri.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "ev-sesler.js")
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
FFPROBE = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
TRIM = ("silenceremove=stop_periods=-1:stop_threshold=-40dB:stop_duration=0.1:stop_silence=0.38,"
        "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04:detection=peak,"
        "areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12:detection=peak,areverse,"
        "afade=t=in:d=0.006")
TMP = os.path.join(ROOT, ".ses_gecici")


async def record(key, text):
    raw, out = os.path.join(TMP, key + ".raw.mp3"), os.path.join(TMP, key + ".mp3")
    for attempt in range(5):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(raw)
            break
        except Exception as e:
            if attempt == 4:
                raise
            await asyncio.sleep(2 * (attempt + 1))
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", raw, "-af", TRIM, "-ac", "1", "-ar", "24000",
                    "-c:a", "libmp3lame", "-b:a", "48k", out], check=True)
    os.remove(raw)
    d = float(subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out],
                             capture_output=True, text=True).stdout.strip())
    return key, base64.b64encode(open(out, "rb").read()).decode("ascii"), round(d, 3)


async def main():
    os.makedirs(TMP, exist_ok=True)
    res = await asyncio.gather(*(record(k, t) for k, t in LINES.items()))
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("// Ev ekranı seslendirmesi – Emel (tr-TR-EmelNeural). tools/ses_kaydet.py üretir; elle değiştirmeyin.\n")
        f.write("window.EV_SES = {\n" + ",\n".join(f" {json.dumps(k)}: \"{b}\"" for k, b, d in res) + "\n};\n")
        f.write("window.EV_SURE = " + json.dumps({k: d for k, b, d in res}) + ";\n")
    shutil.rmtree(TMP, ignore_errors=True)
    for k, b, d in res:
        print(f"{k:8s} {d:5.2f} s  {LINES[k]}")
    print("ev-sesler.js", os.path.getsize(OUT) // 1024, "KB")


asyncio.run(main())
