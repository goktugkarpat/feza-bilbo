#!/usr/bin/env python3
"""Ev ekranının oyun logosunu çizer → logo.png (yüksek çözünürlük, saydam).
"Feza ve Bilbo'nun" üstte küçük, "MACERALARI" altta büyük ve kavisli; altın-turuncu-kırmızı dolgu,
beyaz + koyu kahve dış kontur, üstte parlama şeridi, alt kenarda hafif bevel, yumuşak gölge; pati izi ve yıldız süsleri.
Çalıştır: python3 tools/logo_ciz.py   (Pillow + macOS SF Rounded yazı tipi)"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1900, 790
FONT = "/System/Library/Fonts/SFNSRounded.ttf"


def font(px, weight=b"Black"):
    f = ImageFont.truetype(FONT, px)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def harf_maskesi(metin, f, kavis=0.0, iz=0.0):
    """Metnin maskesi; kavis > 0 → harfler yay üzerinde (ortası yukarıda)."""
    m = Image.new("L", (W, H), 0)
    widths = [f.getlength(c) + iz for c in metin]
    total = sum(widths) - iz
    asc, desc = f.getmetrics()
    return m, widths, total, asc, desc


def yazi(metin, f, cy, kavis, iz=0.0):
    m, widths, total, asc, desc = harf_maskesi(metin, f, kavis, iz)
    x = W / 2 - total / 2
    R = (total / 2) / math.sin(kavis) if kavis > 1e-4 else None
    for c, w in zip(metin, widths):
        cxl = x + (w - iz) / 2
        u = cxl - W / 2
        tile = Image.new("L", (int(w + asc * 1.2), int((asc + desc) * 1.6)), 0)
        ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), c, font=f, fill=255, anchor="mm")
        if R:
            a = u / R
            px, py = W / 2 + R * math.sin(a), cy + R - R * math.cos(a)
            tile = tile.rotate(-math.degrees(a), resample=Image.BICUBIC, expand=True)
        else:
            px, py = W / 2 + u, cy
        m.paste(255, (int(px - tile.width / 2), int(py - tile.height / 2)), tile)
        x += w
    return m


def genislet(m, r):
    """Yuvarlak kenarlı genişletme (kontur için)."""
    b = m.filter(ImageFilter.GaussianBlur(r * 0.55))
    return b.point(lambda v: 255 if v > 18 else int(v * 255 / 18))


def egim(maske, renkler, y0, y1):
    g = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(g)
    for y in range(H):
        t = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        for i in range(len(renkler) - 1):
            a, b = renkler[i], renkler[i + 1]
            if a[0] <= t <= b[0]:
                k = (t - a[0]) / max(1e-6, b[0] - a[0])
                c = tuple(int(a[1][j] + (b[1][j] - a[1][j]) * k) for j in range(3))
                break
        d.line([(0, y), (W, y)], fill=c + (255,))
    g.putalpha(maske)
    return g


def katman(maske, renk):
    out = Image.new("RGBA", (W, H), renk)
    out.putalpha(maske)
    return out


def logo_parca(m, y0, y1, dolgu):
    """Bir yazı satırını oyun logosu gibi boyar."""
    beyaz = genislet(m, 22)
    kahve = genislet(beyaz, 16)
    golge = kahve.filter(ImageFilter.GaussianBlur(14))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    img = Image.alpha_composite(img, katman(ImageChops.offset(golge, 0, 18).point(lambda v: int(v * 0.55)), (60, 20, 5, 255)))
    img = Image.alpha_composite(img, egim(kahve, [(0, (122, 52, 22)), (1, (74, 28, 12))], y0, y1))
    img = Image.alpha_composite(img, egim(beyaz, [(0, (255, 255, 255)), (1, (255, 236, 208))], y0, y1))
    img = Image.alpha_composite(img, egim(m, dolgu, y0, y1))
    # bevel: alt iç kenar koyu, üst iç kenar açık
    alt = ImageChops.subtract(m, ImageChops.offset(m, 0, -7)).filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img, katman(alt.point(lambda v: int(v * 0.5)), (150, 30, 10, 255)))
    ust = ImageChops.subtract(m, ImageChops.offset(m, 0, 6)).filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, katman(ust.point(lambda v: int(v * 0.8)), (255, 250, 220, 255)))
    # parlama şeridi (harflerin üst yarısında)
    serit = Image.new("L", (W, H), 0)
    ImageDraw.Draw(serit).rectangle([0, y0 + (y1 - y0) * 0.06, W, y0 + (y1 - y0) * 0.36], fill=95)
    serit = ImageChops.multiply(serit.filter(ImageFilter.GaussianBlur(6)), genislet(m, 1).filter(ImageFilter.MinFilter(9)))
    img = Image.alpha_composite(img, katman(serit, (255, 255, 240, 255)))
    return img


def pati(d, x, y, r, renk):
    d.ellipse([x - r * 0.62, y - r * 0.05, x + r * 0.62, y + r * 0.85], fill=renk)
    for dx, dy, s in ((-0.62, -0.25, 0.25), (0.62, -0.25, 0.25), (-0.24, -0.62, 0.25), (0.24, -0.62, 0.25)):
        d.ellipse([x + (dx - s) * r, y + (dy - s * 1.2) * r, x + (dx + s) * r, y + (dy + s * 1.2) * r], fill=renk)


def yildiz(d, x, y, r, renk, oran=0.46):
    pts = [(x + math.cos(-math.pi / 2 + i * math.pi / 5) * (r if i % 2 == 0 else r * oran),
            y + math.sin(-math.pi / 2 + i * math.pi / 5) * (r if i % 2 == 0 else r * oran)) for i in range(10)]
    d.polygon(pts, fill=renk)


def susler():
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    pati(d, 300, 150, 62, 255)
    yildiz(d, 1505, 140, 78, 255)
    return m


def parilti(img, x, y, r):
    s = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(s)
    d.polygon([(x, y - r), (x + r * 0.16, y - r * 0.16), (x + r, y), (x + r * 0.16, y + r * 0.16), (x, y + r), (x - r * 0.16, y + r * 0.16), (x - r, y), (x - r * 0.16, y - r * 0.16)], fill=255)
    hale = s.filter(ImageFilter.GaussianBlur(r * 0.35))
    img = Image.alpha_composite(img, katman(hale, (255, 236, 160, 255)))
    return Image.alpha_composite(img, katman(s, (255, 255, 245, 255)))


def main():
    ust = yazi("Feza ve Bilbo'nun", font(150), 165, 0.13, iz=3)
    alt = yazi("MACERALARI", font(255), 465, 0.30, iz=6)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # süsler (pati: Bilbo'nun; yıldız)
    img = Image.alpha_composite(img, logo_parca(ust, 95, 240, [(0, (255, 250, 214)), (0.5, (255, 214, 92)), (1, (246, 150, 38))]))
    img = Image.alpha_composite(img, logo_parca(alt, 325, 625, [(0, (255, 236, 120)), (0.38, (255, 170, 40)), (0.72, (244, 96, 40)), (1, (210, 40, 50))]))
    for x, y, r in ((1700, 120, 34), (1745, 260, 20), (175, 230, 26), (1500, 620, 26), (380, 620, 22)):
        img = parilti(img, x, y, r)
    bb = img.getbbox()
    img = img.crop((max(0, bb[0] - 10), max(0, bb[1] - 10), min(W, bb[2] + 10), min(H, bb[3] + 10)))
    out = os.path.join(ROOT, "logo.png")
    img.save(out, optimize=True)
    print("logo.png", img.size, os.path.getsize(out) // 1024, "KB")


main()
