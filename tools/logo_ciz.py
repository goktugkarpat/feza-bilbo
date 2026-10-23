#!/usr/bin/env python3
"""Ev ekranının oyun logosunu çizer → logo.png (yüksek çözünürlük, saydam).

Tek, kompakt bir kompozisyon (animasyon filmi / çocuk oyunu logosu gibi):
- "Feza ve Bilbo'nun" gökyüzü mavisi, katlanmış uçlu bir kurdelenin üstünde; kalın krem harfler, çikolata kontur.
- "MACERALARI" altta büyük ve kavisli: altın → macera turuncusu dolgu, beyaz iç kontur, çikolata dış kontur,
  aşağı doğru 3D derinlik (extrude), kenar parlaması (bevel) ve üstte parlak cam vurgusu.
- Kurdele ile büyük yazı ortak bir çikolata zemin silüetinde birleşir (ikisi tek parça).
- Amblem: kurdelenin solunda altın yıldız rozet içinde Bilbo'nun pati izi; sağ uçta küçük mavi ışın kılıcı.
Çalıştır: python3 tools/logo_ciz.py   (Pillow + numpy + macOS SF Rounded yazı tipi)"""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 2900, 1300
FONT = "/System/Library/Fonts/SFNSRounded.ttf"
CIKOLATA = (78, 38, 18)
CIKOLATA_KOYU = (48, 22, 10)


def font(px, weight=b"Black"):
    f = ImageFont.truetype(FONT, px)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


# ---------- maske yardımcıları (0..1 float dizileri) ----------
def A(img):
    return np.asarray(img, dtype=np.float32) / 255.0


def I(a):
    return Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8), "L")


def blur(a, r):
    return A(I(a).filter(ImageFilter.GaussianBlur(r))) if r > 0 else a


def genislet(a, r):
    """Yuvarlak kenarlı genişletme (kontur için)."""
    b = blur(a, r * 0.5)
    return np.clip(b / 0.08, 0, 1)


def kaydir(a, dx, dy):
    out = np.zeros_like(a)
    h, w = a.shape
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    out[yd, xd] = a[ys, xs]
    return out


# ---------- tuval (premultiplied RGBA float) ----------
class Tuval:
    def __init__(s):
        s.rgb = np.zeros((H, W, 3), np.float32)
        s.a = np.zeros((H, W), np.float32)

    def boya(s, maske, renk, opak=1.0):
        """renk: (r,g,b) ya da (H,W,3) dizi; maske 0..1."""
        m = np.clip(maske, 0, 1) * opak
        c = np.asarray(renk, np.float32) / 255.0
        s.rgb = s.rgb * (1 - m[..., None]) + c * m[..., None]
        s.a = s.a * (1 - m) + m

    def ekle(s, maske, renk, k=1.0):   # parlama (toplamalı)
        c = np.asarray(renk, np.float32) / 255.0
        s.rgb = np.clip(s.rgb + c * (maske * k)[..., None] * s.a[..., None], 0, 1)

    def resim(s):
        a = np.clip(s.a, 0, 1)
        rgb = np.where(a[..., None] > 1e-4, s.rgb / np.maximum(a[..., None], 1e-4), 0) * 1.0
        rgb = np.clip(rgb * a[..., None] / np.maximum(a[..., None], 1e-4), 0, 1)
        out = np.dstack([rgb, a])
        return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


YY = np.arange(H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
XX = np.ones((H, 1), np.float32) * np.arange(W, dtype=np.float32)[None, :]


def egim(duraklar, y0, y1):
    """Dikey renk geçişi → (H,W,3)."""
    t = np.clip((YY - y0) / max(1, y1 - y0), 0, 1)
    out = np.zeros((H, W, 3), np.float32)
    for i in range(len(duraklar) - 1):
        (a, ca), (b, cb) = duraklar[i], duraklar[i + 1]
        k = np.clip((t - a) / max(1e-6, b - a), 0, 1)
        sec = (t >= a) & (t <= b) if i else (t <= b)
        for j in range(3):
            out[..., j] = np.where(sec, ca[j] + (cb[j] - ca[j]) * k, out[..., j])
    last = duraklar[-1][1]
    for j in range(3):
        out[..., j] = np.where(t > duraklar[-1][0], last[j], out[..., j])
    return out


# ---------- kavisli yazı ----------
def yazi(metin, f, cx, cy, kavis, iz=0.0):
    """Metnin maskesi; kavis > 0 → harfler yay üzerinde (ortası yukarıda). cy: yayın tepesindeki satır ortası."""
    m = Image.new("L", (W, H), 0)
    widths = [f.getlength(c) + iz for c in metin]
    total = sum(widths) - iz
    asc, desc = f.getmetrics()
    R = (total / 2) / math.sin(kavis) if kavis > 1e-4 else None
    x = cx - total / 2
    for c, w in zip(metin, widths):
        u = x + (w - iz) / 2 - cx
        tile = Image.new("L", (int(w + asc * 1.4), int((asc + desc) * 1.7)), 0)
        ImageDraw.Draw(tile).text((tile.width / 2, tile.height / 2), c, font=f, fill=255, anchor="mm")
        if R:
            a = u / R
            px, py = cx + R * math.sin(a), cy + R - R * math.cos(a)
            tile = tile.rotate(-math.degrees(a), resample=Image.BICUBIC, expand=True)
        else:
            px, py = cx + u, cy
        m.paste(255, (int(round(px - tile.width / 2)), int(round(py - tile.height / 2))), tile)
        x += w
    return A(m), R


def yay_y(cx, cy, R, x):
    """Yay üzerindeki y (x'e göre)."""
    if not R:
        return np.full_like(x, cy)
    u = np.clip((x - cx) / R, -0.99, 0.99)
    return cy + R - R * np.cos(np.arcsin(u))


# ---------- kurdele ----------
def kurdele(cx, cy, gen, yuk, R):
    """Yay boyunca kavisli şerit + katlanmış V uçlar. Dönüş: (ön yüz, katlar, uç kuyruklar) maskeleri."""
    ust = yay_y(cx, cy, R, XX) - yuk / 2
    on = ((YY >= ust) & (YY <= ust + yuk) & (np.abs(XX - cx) <= gen / 2)).astype(np.float32)
    kuyruk = np.zeros((H, W), np.float32)
    kat = np.zeros((H, W), np.float32)
    for sd in (-1, 1):
        x0 = cx + sd * gen / 2
        ky = float(yay_y(cx, cy, R, np.array([x0]))[0])
        img = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(img)
        kl = yuk * 1.05   # kuyruk uzunluğu
        dy = yuk * 0.32    # kuyruk biraz aşağıda (arkada)
        ic = x0 - sd * yuk * 0.55
        dis = x0 + sd * kl
        pts = [(ic, ky - yuk / 2 + dy), (dis, ky - yuk / 2 + dy - sd * 0 - yuk * 0.05), (dis - sd * yuk * 0.38, ky + dy),
               (dis, ky + yuk / 2 + dy + yuk * 0.05), (ic, ky + yuk / 2 + dy)]
        d.polygon(pts, fill=255)
        kuyruk = np.maximum(kuyruk, A(img))
        # kat üçgeni: ön yüzün ucundan kuyruğa inen gölgeli parça
        img = Image.new("L", (W, H), 0)
        ImageDraw.Draw(img).polygon([(x0, ky + yuk / 2 - 2), (x0 - sd * yuk * 0.55, ky + yuk / 2 + dy), (x0, ky + yuk / 2 + dy)], fill=255)
        kat = np.maximum(kat, A(img))
    return blur(on, 1.2), blur(kat, 1.2), blur(kuyruk, 1.2)


# ---------- amblemler ----------
def yildiz_maske(x, y, r, oran=0.5, don=0.0, yuvarla=0.0):
    img = Image.new("L", (W, H), 0)
    pts = [(x + math.cos(-math.pi / 2 + don + i * math.pi / 5) * (r if i % 2 == 0 else r * oran),
            y + math.sin(-math.pi / 2 + don + i * math.pi / 5) * (r if i % 2 == 0 else r * oran)) for i in range(10)]
    ImageDraw.Draw(img).polygon(pts, fill=255)
    a = A(img)
    if yuvarla:   # köşeleri yuvarla: bulanıklaştır + eşik
        a = np.clip((blur(a, yuvarla) - 0.5) * 6 + 0.5, 0, 1)
    return a


def pati_maske(x, y, r, don=0.0):
    img = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(img)
    c, s = math.cos(don), math.sin(don)

    def p(dx, dy):
        return x + (dx * c - dy * s) * r, y + (dx * s + dy * c) * r
    # taban yastığı (üç loblu yuvarlak üçgen)
    for dx, dy, rr in ((0, 0.28, 0.42), (-0.26, 0.38, 0.27), (0.26, 0.38, 0.27), (0, 0.5, 0.3)):
        px, py = p(dx, dy)
        d.ellipse([px - rr * r, py - rr * r * 0.9, px + rr * r, py + rr * r * 0.9], fill=255)
    for dx, dy in ((-0.6, -0.12), (-0.22, -0.48), (0.22, -0.48), (0.6, -0.12)):
        px, py = p(dx, dy)
        d.ellipse([px - 0.2 * r, py - 0.26 * r, px + 0.2 * r, py + 0.26 * r], fill=255)
    return blur(A(img), 1.0)


def parilti_maske(x, y, r):
    img = Image.new("L", (W, H), 0)
    ImageDraw.Draw(img).polygon([(x, y - r), (x + r * 0.17, y - r * 0.17), (x + r, y), (x + r * 0.17, y + r * 0.17), (x, y + r),
                                 (x - r * 0.17, y + r * 0.17), (x - r, y), (x - r * 0.17, y - r * 0.17)], fill=255)
    return blur(A(img), 0.8)


def kilic_maske(x0, y0, x1, y1, kal):
    img = Image.new("L", (W, H), 0)
    ImageDraw.Draw(img).line([(x0, y0), (x1, y1)], fill=255, width=int(kal))
    for (x, y) in ((x0, y0), (x1, y1)):
        ImageDraw.Draw(img).ellipse([x - kal / 2, y - kal / 2, x + kal / 2, y + kal / 2], fill=255)
    return A(img)


# ---------- harf boyama (3D) ----------
def harf_boya(T, m, y0, y1, dolgu, derin, beyaz_r, kahve_r, parlak_alt, yuz_kenar=(150, 60, 10)):
    beyaz = genislet(m, beyaz_r)
    kahve = genislet(beyaz, kahve_r)
    # derinlik (extrude): kontur silüetini aşağı doğru üst üste kaydır
    ext = np.zeros_like(m)
    for k in range(1, derin + 1, 2):
        ext = np.maximum(ext, kaydir(kahve, 0, k))
    T.boya(blur(kaydir(ext, 0, 10), 16) * 0.5, (40, 14, 4))           # yumuşak gölge
    T.boya(ext, egim([(0, CIKOLATA), (1, CIKOLATA_KOYU)], y0, y1 + derin))
    T.boya(kahve, egim([(0, (112, 58, 28)), (1, CIKOLATA)], y0, y1))
    T.boya(beyaz, egim([(0, (255, 255, 250)), (1, (255, 234, 200))], y0, y1))
    # harf yüzünün kendi derinliği: beyaz konturun altına ince turuncu-kahve kenar
    yuz_ext = np.zeros_like(m)
    for k in range(1, max(3, derin // 3)):
        yuz_ext = np.maximum(yuz_ext, kaydir(m, 0, k))
    T.boya(yuz_ext * (1 - m), yuz_kenar)
    T.boya(m, egim(dolgu, y0, y1))
    # bevel: alt iç kenar koyu, üst iç kenar açık
    alt = np.clip(m - kaydir(m, 0, -max(4, derin // 4)), 0, 1)
    T.boya(blur(alt, 3) * m, (190, 70, 20), 0.55)
    ust = np.clip(m - kaydir(m, 0, max(4, derin // 4)), 0, 1)
    T.boya(blur(ust, 2.5) * m, (255, 252, 230), 0.85)
    # cam vurgusu: harflerin üst kısmında, yay boyunca uzanan parlak şerit (yumuşak alt kenar)
    ic = blur(np.clip((m - 0.5) * 2, 0, 1), 1)
    ic = np.clip(1 - genislet(1 - ic, max(5, derin // 4)), 0, 1)
    T.boya(ic * parlak_alt, (255, 255, 255), 0.55)


def main():
    T = Tuval()
    cx = W / 2
    # ---- alt satır: MACERALARI ----
    fa = font(330)
    alt_cy = 790
    alt, RA = yazi("MACERALARI", fa, cx, alt_cy, 0.27, iz=4)
    # ---- üst satır: "Feza ve Bilbo'nun" kurdelede ----
    fu = font(214)   # MACERALARI harf boyunun ~%65'i (küçük harf gövdesi kalın ve okunur)
    ust_cy = 490
    ust, RU = yazi("Feza ve Bilbo'nun", fu, cx, ust_cy, 0.2, iz=2)
    ys, xs = np.nonzero(ust > 0.5)
    ugen = xs.max() - xs.min()
    k_on, k_kat, k_kuyruk = kurdele(cx, ust_cy + 8, ugen + 150, 250, RU * 1.0)
    # ---- ortak zemin silüeti: kurdele + büyük yazı tek parça ----
    alt_kontur = genislet(genislet(alt, 22), 20)
    birlesik = np.maximum.reduce([k_on, k_kuyruk, alt_kontur])
    kapali = genislet(birlesik, 70)   # kapama: aradaki boşlukları doldur, sonra geri küçült
    kapali = np.clip(1 - genislet(1 - kapali, 52), 0, 1)
    zemin = np.maximum(genislet(birlesik, 18), kapali)
    # içteki küçük delikleri doldur (dışarıdan taşma doldurma)
    dolu = I((zemin > 0.5).astype(np.float32)).convert("L")
    ImageDraw.floodfill(dolu, (0, 0), 128)
    zemin = np.maximum(zemin, (np.asarray(dolu) != 128).astype(np.float32))
    zderin = 34
    zext = np.zeros_like(zemin)
    for k in range(1, zderin + 1, 2):
        zext = np.maximum(zext, kaydir(zemin, 0, k))
    T.boya(blur(kaydir(zext, 0, 16), 22) * 0.45, (40, 14, 4))
    T.boya(zext, egim([(0, CIKOLATA), (1, CIKOLATA_KOYU)], 300, 1150))
    T.boya(zemin, egim([(0, (126, 66, 32)), (1, (86, 42, 20))], 300, 1150))
    # ince altın kenar (zeminin içinde)
    kenar = np.clip(zemin - np.clip(1 - genislet(1 - zemin, 9), 0, 1), 0, 1)
    T.boya(kenar * 0.9, (255, 196, 90))

    # ---- kurdele ----
    T.boya(k_kuyruk, egim([(0, (64, 150, 222)), (1, (30, 96, 178))], 300, 640))
    # kuyruk ortasında hafif çizgi (kumaş kıvrımı)
    T.boya(k_kat, (22, 70, 140))
    T.boya(k_on, egim([(0, (130, 212, 255)), (0.5, (72, 170, 240)), (1, (40, 120, 210))], ust_cy - 120, ust_cy + 130))
    # dikiş çizgileri
    for off in (-98, 98):
        dik = np.zeros((H, W), np.float32)
        yy = yay_y(cx, ust_cy + 8, RU, XX) + off
        dik = ((np.abs(YY - yy) < 3.2) & (np.abs(XX - cx) < (ugen + 150) / 2 - 22) & (((XX // 26) % 2) == 0)).astype(np.float32)
        T.boya(blur(dik, 0.8) * k_on, (210, 240, 255), 0.85)
    # kurdele parlaması (üst yarı)
    ust_band = (YY < yay_y(cx, ust_cy + 8, RU, XX) - 30).astype(np.float32)
    T.boya(blur(ust_band, 18) * k_on, (255, 255, 255), 0.18)

    # ---- yazılar ----
    harf_boya(T, ust, ust_cy - 110, ust_cy + 90,
              [(0, (255, 255, 244)), (0.55, (255, 240, 200)), (1, (255, 206, 120))],
              derin=16, beyaz_r=0, kahve_r=14,
              parlak_alt=(YY < yay_y(cx, ust_cy - 22, RU, XX)).astype(np.float32), yuz_kenar=(200, 120, 50))
    harf_boya(T, alt, alt_cy - 140, alt_cy + 160,
              [(0, (255, 240, 130)), (0.35, (255, 186, 46)), (0.7, (250, 120, 30)), (1, (222, 70, 30))],
              derin=34, beyaz_r=14, kahve_r=16,
              parlak_alt=(YY < yay_y(cx, alt_cy - 12, RA, XX)).astype(np.float32))

    # ---- amblem: altın yıldız rozet + Bilbo'nun pati izi (solda) ----
    sx0, sy0 = cx - (ugen + 150) / 2 - 70, ust_cy - 40
    yz = yildiz_maske(sx0, sy0, 175, 0.56, don=-0.18, yuvarla=9)
    yz_k = genislet(yz, 16)
    yext = np.zeros_like(yz)
    for k in range(1, 22, 2):
        yext = np.maximum(yext, kaydir(yz_k, 0, k))
    T.boya(blur(kaydir(yext, 0, 10), 14) * 0.45, (40, 14, 4))
    T.boya(yext, CIKOLATA_KOYU)
    T.boya(yz_k, CIKOLATA)
    T.boya(genislet(yz, 7), (255, 250, 230))
    T.boya(yz, egim([(0, (255, 244, 150)), (0.5, (255, 196, 40)), (1, (236, 128, 20))], sy0 - 175, sy0 + 140))
    T.boya(blur(np.clip(yz - kaydir(yz, 0, 7), 0, 1), 2.5) * yz, (255, 255, 240), 0.8)
    T.boya(blur(np.clip(yz - kaydir(yz, 0, -7), 0, 1), 3) * yz, (180, 70, 10), 0.5)
    pt = pati_maske(sx0 + 2, sy0 + 12, 78, don=-0.18)
    T.boya(kaydir(pt, 0, 5) * yz, (170, 80, 10), 0.6)
    T.boya(pt, egim([(0, (120, 64, 34)), (1, (70, 34, 16))], sy0 - 80, sy0 + 80))
    T.boya(blur(np.clip(pt - kaydir(pt, 0, 5), 0, 1), 1.5) * pt, (200, 140, 100), 0.7)

    # ---- amblem: küçük mavi ışın kılıcı (sağ uçta, kurdelenin arkasından çıkar) ----
    kx0, ky0 = cx + (ugen + 150) / 2 + 40, ust_cy + 150
    kx1, ky1 = kx0 + 150, ky0 - 330
    hale = kilic_maske(kx0 + 38 * 0.42, ky0 - 38, kx1, ky1, 70)
    T.boya(blur(hale, 22) * 0.7, (120, 210, 255))
    T.boya(genislet(kilic_maske(kx0 + 38 * 0.42, ky0 - 38, kx1, ky1, 40), 10), CIKOLATA)
    T.boya(kilic_maske(kx0 + 38 * 0.42, ky0 - 38, kx1, ky1, 40), (90, 190, 255))
    T.boya(kilic_maske(kx0 + 38 * 0.42, ky0 - 38, kx1, ky1, 16), (235, 250, 255))
    sap = kilic_maske(kx0 - 30 * 0.42, ky0 + 30, kx0 + 40 * 0.42, ky0 - 40, 54)
    T.boya(genislet(sap, 10), CIKOLATA)
    T.boya(sap, egim([(0, (230, 236, 244)), (1, (140, 150, 168))], ky0 - 40, ky0 + 30))
    T.boya(kilic_maske(kx0 + 26 * 0.42, ky0 - 26, kx0 + 34 * 0.42, ky0 - 34, 62), (60, 70, 90))

    # ---- parıltılar ----
    for x, y, r in ((cx + 760, 225, 42), (cx - 1010, 760, 34), (cx + 1030, 760, 30), (cx - 300, 205, 26), (cx + 300, 210, 22)):
        p = parilti_maske(x, y, r)
        T.boya(blur(p, r * 0.35) * 0.9, (255, 236, 160))
        T.boya(p, (255, 255, 246))

    img = T.resim()
    bb = img.getbbox()
    img = img.crop((max(0, bb[0] - 12), max(0, bb[1] - 12), min(W, bb[2] + 12), min(H, bb[3] + 12)))
    hedef = 1600   # iPad Retina'da keskin (ekranda en çok ~900 px görünür), dosya boyu makul
    if img.width > hedef:
        img = img.resize((hedef, round(img.height * hedef / img.width)), Image.LANCZOS)
    out = os.path.join(ROOT, "logo.png")
    img.save(out, optimize=True)
    print("logo.png", img.size, os.path.getsize(out) // 1024, "KB")


main()
