#!/usr/bin/env python3
"""Records every narrator line (Aytuğ Hala's voice) with a natural Turkish female voice and writes sesler.js.

Needs:  python3 -m pip install edge-tts   (internet while recording)   and ffmpeg
Run:    python3 gen_voice.py            only new/changed lines are recorded; the rest come from .ses_onbellek/
        python3 gen_voice.py --liste    only list every line (NEW = not recorded yet); no network
        python3 gen_voice.py --hepsi    record everything again

Lines: the /*SESLER*/{...}/*SESLER-SON*/ JSON block (index.html if present, else src/02_audio.js) PLUS every
src/02l_*.js file's  Object.assign(AUD.LINES, { key: 'Türkçe cümle', ... })  (index.html load order; later files win).
Voice tr-TR-EmelNeural; silence at the start/end is trimmed with ffmpeg; recordings are cached by text in .ses_onbellek/.
Output: sesler.js  →  window.VOICE_MP3 = {key: base64 mp3}  and  window.VOICE_DUR = {key: seconds}  (keys in LINES order).
"""
import asyncio
import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")   # Turkish text on a Windows console
except Exception:
    pass

import edge_tts

VOICE = "tr-TR-EmelNeural"
RATE = "-5%"
PITCH = "+2Hz"

# How words should *sound* (subtitles keep the normal spelling). Regex → spoken form.
# English-ish words get a Turkish spelling of their pronunciation (e.g. unicorn → yunikorn).
# Avoid short capitalised words the engine may read as abbreviations ("Aa" was read as "Anadolu Ajansı").
PRONOUNCE = [
    (r"(?i)\bunicorn", "yunikorn"),
    (r"\bHu hu\b", "Huu huu"),
    (r"\bDevam Et\b", "Devam et"),   # the button's name; a lone capitalised "Et" must not sound like an abbreviation
    (r"\bKral Jöle", "Kral, Jöle"),            # without the pause the engine glued it to "Kraljöle"
    (r"\bVeba Rahibi", "Veba, Rahibi"),        # was heard as "Vebar ahibi"
    (r"\bayin", "ayiin"),                      # was heard as "a in"
    (r"\btellal", "tel lal"),
    (r"\bTellal", "Tel lal"),
]

ROOT = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(ROOT, ".ses_onbellek")
OUT = os.path.join(ROOT, "sesler.js")

def remove_temp(path):
    try:
        os.remove(path)
    except (FileNotFoundError, PermissionError):
        pass  # A synced Windows folder may briefly hold a finished temporary file.
FFMPEG = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else shutil.which("ffmpeg")
if not FFMPEG:
    try:
        import imageio_ffmpeg
        FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
FFPROBE = "/opt/homebrew/bin/ffprobe" if os.path.exists("/opt/homebrew/bin/ffprobe") else shutil.which("ffprobe")
# 1) shorten long pauses between sentences to ~0.48 s (edge-tts leaves ~1 s), 2) keep ~40 ms before the first sound
# and 3) ~120 ms after the last one (reverse trick trims the tail), 4) tiny fade-in against clicks.
TRIM = ("silenceremove=stop_periods=-1:stop_threshold=-40dB:stop_duration=0.1:stop_silence=0.38,"
        "silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04:detection=peak,"
        "areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.12:detection=peak,areverse,"
        "afade=t=in:d=0.006")


def spoken(text):
    for pat, rep in PRONOUNCE:
        text = re.sub(pat, rep, text)
    return text


def _js_object(src, start):
    """Parse a plain JS object literal of string values starting at src[start] == '{'.
    Keys: identifiers or quoted strings; values: '…' / "…" / `…` strings (no ${}), joined with + if needed.
    Comments (// and /* */) and a trailing comma are allowed. Returns (dict, end_index)."""
    i, n, out = start + 1, len(src), {}

    def skip(i):
        while i < n:
            if src[i].isspace():
                i += 1
            elif src.startswith("//", i):
                j = src.find("\n", i); i = n if j < 0 else j + 1
            elif src.startswith("/*", i):
                j = src.find("*/", i + 2); i = n if j < 0 else j + 2
            else:
                break
        return i

    def string(i):
        q = src[i]; j = i + 1; buf = []
        esc = {"n": "\n", "t": "\t", "'": "'", '"': '"', "`": "`", "\\": "\\"}
        while j < n and src[j] != q:
            if src[j] == "\\":
                c = src[j + 1]
                if c == "u":
                    buf.append(chr(int(src[j + 2:j + 6], 16))); j += 6; continue
                buf.append(esc.get(c, c)); j += 2; continue
            if q == "`" and src.startswith("${", j):
                raise ValueError("template ${} is not supported in a voice line")
            buf.append(src[j]); j += 1
        return "".join(buf), j + 1

    while True:
        i = skip(i)
        if i >= n:
            raise ValueError("unterminated object")
        if src[i] == "}":
            return out, i + 1
        if src[i] in "'\"`":
            key, i = string(i)
        else:
            m = re.compile(r"[A-Za-z_$][\w$]*").match(src, i)
            if not m:
                raise ValueError(f"unexpected {src[i:i + 20]!r}")
            key, i = m.group(0), m.end()
        i = skip(i)
        if src[i] != ":":
            raise ValueError(f"':' expected after {key}")
        i = skip(i + 1)
        parts = []
        while True:
            if src[i] not in "'\"`":
                raise ValueError(f"line {key}: only string values are allowed")
            s, i = string(i); parts.append(s)
            i = skip(i)
            if src[i] == "+":
                i = skip(i + 1); continue
            break
        out[key] = "".join(parts)
        if src[i] == ",":
            i += 1


def _extra_files():
    """src/02l_*.js in index.html load order (others after, alphabetical) – later files override earlier keys, like the game."""
    files = sorted(f for f in os.listdir(os.path.join(ROOT, "src")) if re.fullmatch(r"02l_.*\.js", f))
    try:
        html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
        order = [m.group(1) for m in re.finditer(r'src="src/(02l_[^"]+\.js)"', html)]
    except OSError:
        order = []
    return [f for f in order if f in files] + [f for f in files if f not in order]


def load_lines():
    lines = None
    for rel in ("index.html", os.path.join("src", "02_audio.js")):
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        m = re.search(r"/\*SESLER\*/(.*?)/\*SESLER-SON\*/", open(path, encoding="utf-8").read(), re.S)
        if m:
            print(f"lines from {rel}")
            lines = json.loads(m.group(1))
            break
    if lines is None:
        sys.exit("LINES block (/*SESLER*/ ... /*SESLER-SON*/) not found in index.html or src/02_audio.js")
    # Every agent's own file: Object.assign(AUD.LINES, { key: 'Türkçe cümle', ... })
    for f in _extra_files():
        src = open(os.path.join(ROOT, "src", f), encoding="utf-8").read()
        n = 0
        for m in re.finditer(r"Object\.assign\(\s*AUD\.LINES\s*,\s*\{", src):
            try:
                d, _ = _js_object(src, m.end() - 1)
            except (ValueError, IndexError) as e:
                sys.exit(f"src/{f}: cannot read the AUD.LINES object ({e})")
            for k, v in d.items():
                if k in lines and lines[k] != v:
                    print(f"  note: src/{f} overrides {k}")
                lines[k] = v
            n += len(d)
        print(f"lines from src/{f}: {n}")
    bad = [k for k, v in lines.items() if re.search(r"(^|[\s,.!?])(Aa+|Oo+)([\s,.!?]|$)", v)]
    if bad:
        print("WARNING: 'Aa'/'Oo' may be read as an abbreviation:", ", ".join(bad))
    return lines


def cache_path(text):
    h = hashlib.md5(f"{VOICE}|{RATE}|{PITCH}|{spoken(text)}".encode("utf-8")).hexdigest()
    return os.path.join(CACHE, h + ".mp3")


def duration(path):
    if not FFPROBE:
        try:
            from mutagen.mp3 import MP3
            return MP3(path).info.length
        except Exception:
            return 0.0
    try:
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                           capture_output=True, text=True, timeout=20)
        return float(r.stdout.strip())
    except Exception:
        return 0.0


def trim(raw, final):
    """Cut leading/trailing silence and re-encode as small mono mp3. Falls back to the raw file without ffmpeg."""
    if not FFMPEG:
        shutil.move(raw, final)
        return
    tmp = final + ".tmp.mp3"
    r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", raw, "-af", TRIM,
                        "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", tmp])
    if r.returncode == 0 and os.path.exists(tmp) and os.path.getsize(tmp) > 800:
        os.replace(tmp, final)
        remove_temp(raw)
    else:
        if os.path.exists(tmp):
            remove_temp(tmp)
        shutil.move(raw, final)


async def record(key, text, sem):
    final = cache_path(text)
    raw = final + ".raw.mp3"
    async with sem:
        for attempt in range(6):
            try:
                await edge_tts.Communicate(spoken(text), VOICE, rate=RATE, pitch=PITCH).save(raw)
                if os.path.getsize(raw) < 1000:
                    raise RuntimeError("empty audio")
                trim(raw, final)
                return True
            except Exception as e:  # network hiccup / rate limit: back off and retry
                if os.path.exists(raw):
                    remove_temp(raw)
                if attempt == 5:
                    print(f"  FAILED {key}: {e}")
                    return False
                await asyncio.sleep(1.5 * (attempt + 1))


async def main():
    os.makedirs(CACHE, exist_ok=True)
    lines = load_lines()
    if "--liste" in sys.argv:   # only list (no recording, no network): key, cached?, text
        for k, t in lines.items():
            print(f"  {'ok ' if os.path.exists(cache_path(t)) else 'NEW'} {k:22s} {t}")
        print(f"{len(lines)} lines, {sum(not os.path.exists(cache_path(t)) for t in lines.values())} not recorded yet")
        return
    if "--hepsi" in sys.argv:
        for t in lines.values():
            if os.path.exists(cache_path(t)):
                os.remove(cache_path(t))
    todo = [(k, t) for k, t in lines.items() if not os.path.exists(cache_path(t))]
    print(f"{len(lines)} lines, {len(todo)} to record ({VOICE}, rate {RATE}, pitch {PITCH})")
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(record(k, t, sem) for k, t in todo))

    mp3, dur, missing = {}, {}, []
    for k, t in lines.items():
        p = cache_path(t)
        d = duration(p) if os.path.exists(p) else 0.0
        if d < 0.25:
            missing.append(k)
            continue
        mp3[k] = base64.b64encode(open(p, "rb").read()).decode("ascii")
        dur[k] = round(d, 3)
        cps = len(t) / max(0.2, d - 0.2)   # minus the kept head/tail padding
        flag = "   <-- check (unusual speed: maybe read as an abbreviation?)" if cps < 9.5 or cps > 21 else ""
        print(f"  {k:16s} {d:5.2f} s  {cps:4.1f} chr/s{flag}")

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:   # LF also on Windows (the Mac commits it)
        f.write("// Aytuğ Hala'nın sesi (\"Feza, Bilbo ve Aytuğ Hala: Dev Ev Macerası\") – Emel (tr-TR-EmelNeural), trimmed mono mp3 as base64.\n"
                "// Bu dosya gen_voice.py ile üretildi; elle değiştirmeyin. Keys: AUD.LINES (02_audio.js) + src/02l_*.js.\n")
        f.write("window.VOICE_MP3 = {\n")
        f.write(",\n".join(f" {json.dumps(k)}: \"{v}\"" for k, v in mp3.items()))
        f.write("\n};\n")
        f.write("window.VOICE_DUR = " + json.dumps(dur, ensure_ascii=False) + ";\n")
    keep = {os.path.basename(cache_path(t)) for t in lines.values()}
    for f in os.listdir(CACHE):  # drop recordings of lines that no longer exist and temp leftovers
        if f.endswith(".mp3") and f not in keep:
            remove_temp(os.path.join(CACHE, f))

    size = os.path.getsize(OUT) / 1024
    print(f"wrote sesler.js: {len(mp3)} lines, {sum(dur.values()):.1f} s audio, {size:.0f} KB")
    if missing:
        print("MISSING (subtitle only in the game):", ", ".join(missing))
        sys.exit(1)


asyncio.run(main())
