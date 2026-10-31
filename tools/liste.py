#!/usr/bin/env python3
"""sw.js içindeki internetsiz dosya listesini yeniler (kök + orman/ + hala/ + huysuz/ + piril/ — kökün altındaki her klasör).

Çalıştır:  python3 tools/liste.py
Yeni dosya eklenince / bir dosya değişince çalıştırın: liste güncellenir ve bir şey değiştiyse
CACHE sürümü (feza-bilbo-vN) bir artar, böylece iPad'deki kopya da yenilenir.
yayinla.command bunu göndermeden önce kendiliğinden çalıştırır.
"""
import hashlib, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SW = os.path.join(ROOT, "sw.js")
UZANTI = {".html", ".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".mp3", ".ogg", ".wav", ".m4a",
          ".glb", ".gltf", ".bin", ".ktx2", ".hdr", ".woff", ".woff2", ".ttf", ".webmanifest"}
ATLA_KLASOR = {".git", "tools", ".claude", "__pycache__", "node_modules", "test", "tests", "test-results"}
ATLA_DOSYA = {"sw.js"}


def dosyalar():
    out = []
    for kok, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in ATLA_KLASOR and not d.startswith("."))
        for f in sorted(files):
            if f.startswith(".") or f in ATLA_DOSYA or os.path.splitext(f)[1].lower() not in UZANTI:
                continue
            out.append(os.path.relpath(os.path.join(kok, f), ROOT).replace(os.sep, "/"))
    return out


def main():
    liste = dosyalar()
    h = hashlib.sha1()
    for rel in liste:
        h.update(rel.encode())
        h.update(open(os.path.join(ROOT, rel), "rb").read())
    imza = h.hexdigest()[:12]
    s = open(SW, encoding="utf-8").read()
    eski = re.search(r"// imza: (\S+)", s).group(1)
    surum = int(re.search(r"const CACHE = 'feza-bilbo-v(\d+)';", s).group(1))
    if eski not in ("-", imza):
        surum += 1
    adresler = ["./"] + ["./" + r for r in liste]
    yeni = re.sub(r"/\*DOSYALAR\*/.*?/\*DOSYALAR-SON\*/",
                  lambda m: "/*DOSYALAR*/" + json.dumps(adresler, indent=1, ensure_ascii=False) + "/*DOSYALAR-SON*/", s, flags=re.S)
    yeni = re.sub(r"const CACHE = 'feza-bilbo-v\d+';", f"const CACHE = 'feza-bilbo-v{surum}';", yeni)
    yeni = re.sub(r"// imza: \S+", f"// imza: {imza}", yeni)
    if yeni != s:
        with open(SW, "w", encoding="utf-8", newline="\n") as f:
            f.write(yeni)
    boy = sum(os.path.getsize(os.path.join(ROOT, r)) for r in liste) / 1e6
    print(f"sw.js: {len(adresler)} dosya, {boy:.1f} MB, önbellek feza-bilbo-v{surum}")


main()
