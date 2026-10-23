#!/usr/bin/env python3
"""Ev ekranının müziğini sentezler → ev-muzik.js (mp3, base64; file:// ile de çalışır).

"Hazır mısın? Maceraya!" havası: neşeli ama yumuşak, sözsüz, akılda kalan bir ezgi.
Re majör, 104 vuruş/dk, 20 ölçü (~46 sn):  A (4) · A' (4) · B (4) · B' (4) · A'' (4)
  A   – flüt ezgisi soru ("hazır mısın?") + cevap; ukulele vuruşu, pizzicato bas, shaker
  A'  – marimba arpejleri, yumuşak yaylılar, tahta blok; ii–V–I ve I7 (IV'e geçiş)
  B   – yumuşak piyano ezgiyi alır, naylon gitar arpejleri, iv (minör dördüncü) rengi, V/ii
  B'  – flüt geri döner, piyano vuruşları, sonda V/V – V7 ve yükselen marimba geçişi
  A'' – her şey birlikte (çan ezgiyi oktav üstten süsler); son ölçü V7 ile döngünün başına bağlanır
Çalgılar (yalnız numpy): Karplus–Strong ukulele / naylon gitar / pizzicato bas (kesirli gecikme, çekme konumu
süzgeci, gövde rezonansı), kipli (modal) marimba ve çan (gerçek çubuk oranları, tokmak), nefesli flüt (legato,
portamento, gecikmeli vibrato, nefes ve dil vuruşu), PolyBLEP testere dalgalı sıcak yaylı katman, kipli yumuşak
piyano (inharmonisite, iki telli vuru, çekiç), yumuşak davul / shaker / tahta blok.
Karıştırma: her çalgı ayrı kanal (düzey hedefleri ölçülerek ayarlanır), stereo pan + Haas, sentetik konvolüsyon
yankısı (erken yansımalar + bant bant sönen dağınık kuyruk, iki kanal ayrık), EQ, RMS bus kompresörü, ileri bakışlı
gerçek tepe (4x) sınırlayıcı.
Döngü dikişsiz: kuyruklar başa katlanır, bütün süzgeç/kompresör/sınırlayıcı dairesel çalışır; dosyada döngünün
önünde/arkasında 1'er sn pay var, JS döngüyü [PAY, PAY+SURE] aralığında çalar (mp3 gecikmesi dikişi bozmaz).
Çalıştır: python3 tools/muzik_yap.py   (numpy + ffmpeg; ~1 dk)"""
import base64, json, os, re, subprocess, tempfile, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
BPM = 104
BEAT = 60 / BPM
BARS = 20
L = int(round(BARS * 4 * BEAT * SR))
TAIL = int(6 * SR)
N = L + TAIL
PAY = 1.0
TR = 2                      # Do'dan Re majöre aktarım (yarım ses)
HEDEF_LUFS = -27.0          # oyundaki düzey (KAZANC ile): konuşmanın (~-19 LUFS) ~8 dB altında
DOSYA_LUFS = -18.0          # mp3'ün kendi düzeyi (kodlama payı için)
TAVAN_DB = -1.5             # gerçek tepe tavanı (dBTP)
rng = np.random.default_rng(11)


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def db(x):
    return 20 * np.log10(np.maximum(x, 1e-12))


def suz(x, H):
    """FFT süzgeci: H(f) dizisi/işlevi (genlik). Son eksen boyunca."""
    n = x.shape[-1]
    f = np.fft.rfftfreq(n, 1 / SR)
    h = H(f) if callable(H) else H
    return np.fft.irfft(np.fft.rfft(x, axis=-1) * h, n=n, axis=-1)


def lp(fc, n=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * n))


def hp(fc, n=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * n))


def bell(fc, g_db, q):
    """Tepe/çukur EQ (log-frekansta Gauss)."""
    return lambda f: 10 ** (g_db / 20 * np.exp(-0.5 * (np.log2(np.maximum(f, 1) / fc) * q) ** 2))


def shelf_hi(fc, g_db):
    return lambda f: 10 ** (g_db / 20 / (1 + (fc / np.maximum(f, 1)) ** 2))


def evrisim(a, b):
    n = len(a) + len(b) - 1
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, m) * np.fft.rfft(b, m), m)[:n]


# ---------------- kanallar ----------------
KANAL = ["flut", "piyano", "uku", "gitar", "marimba", "can", "yayli", "bas", "davul", "shaker", "tahta"]
stem = {k: np.zeros((2, N), dtype=np.float32) for k in KANAL}


def ekle(kanal, sig, t0, pan=0.0, gain=1.0, haas=0.0):
    """Mono ya da stereo sesi kanala ekle. pan -1..1 (eşit güç), haas: sağ (+) / sol (-) kanal gecikmesi (sn)."""
    i = int(round(t0 * SR))
    if i < 0:
        i += L   # döngü dairesel: başlangıçtan hemen önceki nota döngünün sonuna
    if sig.ndim == 1:
        a = np.cos((pan + 1) * np.pi / 4) * 1.4142
        b = np.sin((pan + 1) * np.pi / 4) * 1.4142
        sig = np.stack([sig * a, sig * b])
    d = int(abs(haas) * SR)
    for c in range(2):
        j = i + (d if (haas > 0 and c == 1) or (haas < 0 and c == 0) else 0)
        n = min(sig.shape[1], N - j)
        if n > 0:
            stem[kanal][c, j:j + n] += (sig[c, :n] * gain).astype(np.float32)


def yumusak_kes(x, n_fade):
    n_fade = min(n_fade, len(x))
    x = x.copy()
    x[-n_fade:] *= np.cos(np.linspace(0, np.pi / 2, n_fade)) ** 2
    return x


# ---------------- Karplus–Strong telli ----------------
_ks = {}


def ks_tel(midi, dur, S=0.42, t60=1.6, pick=0.2, sert=0.5, govde=None, cent=0.0, tohum=0):
    """Kesirli gecikmeli (allpass) Karplus–Strong. S: kayıp süzgeci (büyük = yumuşak), pick: çekme konumu (oran),
    sert: tırnak/parmak sertliği (0 yumuşak … 1 parlak). Sonuç notaya göre önbelleklenir."""
    key = (midi, round(dur, 2), S, t60, pick, sert, govde, round(cent, 1), tohum)
    if key in _ks:
        return _ks[key]
    f = mf(midi) * 2 ** (cent / 1200)
    D = SR / f
    M = int(D - S - 0.1)
    d = D - S - M
    C = (1 - d) / (1 + d)
    g = 10 ** (-3 / (f * t60))
    n = int(dur * SR)
    r = np.random.default_rng(1000 + tohum * 97 + midi)
    exc = r.uniform(-1, 1, M)
    # parmak/tırnak: tek kutuplu alçak geçiren (yumuşaklık), çekme konumu tarağı
    a = 0.15 + 0.8 * (1 - sert)
    y0 = np.zeros(M)
    acc = 0.0
    for i in range(M):
        acc = (1 - a) * exc[i] + a * acc
        y0[i] = acc
    k = max(1, int(round(pick * M)))
    y0 = y0 - np.concatenate([np.zeros(k), y0[:-k]])
    y0 -= y0.mean()
    y0 /= np.max(np.abs(y0)) + 1e-9
    ex = list(y0) + [0.0] * (n - M)
    y = [0.0] * n
    v1 = w1 = 0.0
    s1 = 1 - S
    for i in range(n):
        j = i - M
        if j >= 0:
            v = s1 * y[j] + (S * y[j - 1] if j >= 1 else 0.0)
            w = C * v + v1 - C * w1
            v1 = v
            w1 = w
            y[i] = ex[i] + g * w
        else:
            y[i] = ex[i]
    y = np.array(y)
    if govde:
        y = suz(y, govde)
    y[:32] *= np.linspace(0, 1, 32)
    y /= np.max(np.abs(y)) + 1e-9
    _ks[key] = y
    return y


def govde_uku(f):   # küçük gövde: hava kipi ~260 Hz, tahta kipleri ~520 / 1100 / 2400 Hz; kalın tel ve tiz uç bastırılmış
    return (hp(150, 2)(f) * lp(6000, 2)(f) * bell(260, 5, 2.2)(f) * bell(520, 3, 2.5)(f) * bell(1100, 2.5, 2)(f) * bell(2400, 1.5, 1.5)(f))


def govde_gitar(f):
    return (hp(80, 2)(f) * lp(4500, 2)(f) * bell(110, 4, 2)(f) * bell(220, 3, 2.2)(f) * bell(420, 2, 2)(f) * bell(1800, -2, 1.2)(f))


def govde_bas(f):
    return hp(35, 2)(f) * lp(1400, 2)(f) * bell(90, 3, 1.5)(f) * bell(700, -3, 1.2)(f)


# ---------------- kipli (modal) vurmalılar ----------------
def kipler(f, oranlar, genlik, t60, dur, atak=0.0015):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for o, a, T in zip(oranlar, genlik, t60):
        if f * o < 18000:
            s += a * np.sin(2 * np.pi * f * o * t) * np.exp(-6.91 * t / T)
    na = int(atak * SR)
    s[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    return s


_mar = {}


def marimba(midi, vel=1.0):
    """Ayarlı marimba çubuğu: 1 : 3.98 : 9.9 kipleri, yumuşak iplik tokmak (üst kipler zayıf), tüp rezonatörü
    temel kipi uzatır ve hafif 'açılır'."""
    key = (midi, round(vel, 1))
    if key in _mar:
        return _mar[key]
    f = mf(midi)
    T1 = float(np.clip(2.4 - (midi - 55) * 0.06, 0.55, 2.4))
    h = 0.5 + 0.5 * vel
    s = kipler(f, [1, 3.98, 9.9], [1, 0.28 * h, 0.07 * h * h], [T1, T1 * 0.22, T1 * 0.08], T1 + 0.1, 0.0012)
    n = len(s)
    t = np.arange(n) / SR
    rez = np.sin(2 * np.pi * f * t + 0.3) * (1 - np.exp(-t / 0.012)) * np.exp(-6.91 * t / (T1 * 1.3)) * 0.35
    s += rez
    tik = rng.standard_normal(int(0.004 * SR))
    tik = suz(tik, lp(2500 + 2000 * vel, 1)) * np.exp(-np.arange(len(tik)) / (0.0008 * SR)) * 0.06
    s[:len(tik)] += tik
    s /= np.max(np.abs(s)) + 1e-9
    _mar[key] = s * vel
    return _mar[key]


def can(midi, vel=1.0):   # glockenspiel: 1 : 2.76 : 5.40 : 8.93
    f = mf(midi)
    s = kipler(f, [1, 2.76, 5.40, 8.93], [1, 0.22, 0.08, 0.03], [3.2, 1.1, 0.5, 0.25], 3.3, 0.0008)
    return s / (np.max(np.abs(s)) + 1e-9) * vel


def tahta(vel=1.0, f=1150):
    s = kipler(f, [1, 1.62, 2.71], [1, 0.45, 0.2], [0.09, 0.05, 0.03], 0.14, 0.0005)
    return s / (np.max(np.abs(s)) + 1e-9) * vel


# ---------------- piyano ----------------
_pi = {}


def piyano(midi, vel, dur):
    """Yumuşak piyano: inharmonik kısmi sesler f_n = n f √(1+Bn²), keçe çekiç (yumuşak tayf), iki tel (vuru),
    iki aşamalı sönüm (hızlı + uzun art ses), bırakınca sönümleyici."""
    key = (midi, round(vel, 2), round(dur, 2))
    if key in _pi:
        return _pi[key]
    f = mf(midi)
    B = 0.00035 * 2 ** ((midi - 60) / 24)
    kk = 2 ** (-(midi - 60) / 20)
    n_tot = int((dur + 0.35) * SR)
    t = np.arange(n_tot) / SR
    out = np.zeros((2, n_tot))
    for n in range(1, 16):
        fn = n * f * np.sqrt(1 + B * n * n)
        if fn > 9000:
            break
        a = np.sin(np.pi * n * 0.12) / n * np.exp(-(n - 1) * (0.42 - 0.22 * vel))
        tau1 = 0.5 * kk / (1 + 0.25 * n)
        tau2 = 3.2 * kk / (1 + 0.12 * n)
        env = 0.65 * np.exp(-t / tau1) + 0.35 * np.exp(-t / tau2)
        for c, det in ((0, -0.7), (1, 0.7)):
            out[c] += a * env * np.sin(2 * np.pi * fn * 2 ** (det / 1200) * t + 0.1 * n * c)
    rel = int(dur * SR)
    if rel < n_tot:
        out[:, rel:] *= np.exp(-np.arange(n_tot - rel) / (0.09 * SR))
    na = int(0.002 * SR)
    out[:, :na] *= np.linspace(0, 1, na)
    cek = suz(rng.standard_normal(int(0.012 * SR)), lp(900, 2)) * np.exp(-np.arange(int(0.012 * SR)) / (0.003 * SR))
    out[:, :len(cek)] += cek * 0.04
    out /= np.max(np.abs(out)) + 1e-9
    _pi[key] = out * vel
    return _pi[key]


# ---------------- flüt (cümle cümle, legato) ----------------
def flut_cumle(notalar, parlak=1.0):
    """notalar: [(başlangıç sn, süre sn, midi, vel, dil)] art arda. Tek bir nefeste çalınır: portamento, dil vuruşu,
    gecikmeli vibrato, nefes gürültüsü. Döner: (başlangıç sn, mono dizi)."""
    t0 = notalar[0][0] - 0.05
    t1 = notalar[-1][0] + notalar[-1][1] + 0.3
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    lf = np.zeros(n)
    amp = np.zeros(n)
    vib = np.zeros(n)
    dil = np.ones(n)
    chiff = np.zeros(n)
    for k, (s, d, m, v, tongue) in enumerate(notalar):
        i = int((s - t0) * SR)
        j = int((s + d - t0) * SR) if k == len(notalar) - 1 else int((notalar[k + 1][0] - t0) * SR)
        if k == 0:
            lf[:j] = np.log2(mf(m))
        lf[i:j] = np.log2(mf(m))
        amp[i:j] = v * (1 + 0.04 * np.minimum(1, (np.arange(j - i) / SR) / 0.4))   # uzun notada hafif şişme
        tt_ = np.arange(j - i) / SR
        vib[i:j] = np.clip((tt_ - 0.22) / 0.35, 0, 1)
        if tongue:
            dil[i:i + int(0.06 * SR)] -= 0.32 * np.exp(-((np.arange(int(0.06 * SR)) / SR) / 0.02) ** 2)[: len(dil[i:i + int(0.06 * SR)])]
            nc = min(int(0.035 * SR), n - i)
            chiff[i:i + nc] += v * np.exp(-np.arange(nc) / (0.009 * SR))
    son = int((notalar[-1][0] + notalar[-1][1] - t0) * SR)
    lf[son:] = lf[son - 1]
    # portamento (~35 ms), genlik yumuşatma (~20 ms)
    def kutu(x, w):
        w = max(1, int(w * SR))
        c = np.cumsum(np.concatenate([np.full(w, x[0]), x]))
        return (c[w:] - c[:-w]) / w
    lf = kutu(lf, 0.035)
    amp = kutu(amp * dil, 0.018)
    ia = int(0.05 * SR)
    amp[:ia] *= np.linspace(0, 1, ia) ** 1.5
    amp[son:] *= np.exp(-np.arange(n - son) / (0.07 * SR))
    hiz = 5.1 + 0.3 * np.sin(2 * np.pi * 0.23 * t)
    vb = np.sin(2 * np.pi * np.cumsum(hiz) / SR)
    fr = 2 ** lf * (1 + 0.0055 * vib * vb)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    a = amp * (1 + 0.05 * vib * vb)
    b = np.clip(a, 0, 1) * parlak
    ton = (np.sin(ph) + (0.07 + 0.22 * b) * np.sin(2 * ph + 0.4) + 0.10 * b * np.sin(3 * ph + 1.1)
           + 0.04 * b * np.sin(4 * ph + 0.5) + 0.018 * b * np.sin(5 * ph))
    gur = rng.standard_normal(n)
    nefes = suz(gur, lambda f: hp(1200, 1)(f) * lp(7000, 1)(f)) * 0.045
    perde = suz(rng.standard_normal(n), lp(250, 1)) * 0.5 * np.sin(ph)   # perdeye bağlı (dar bant) nefes
    ch = suz(rng.standard_normal(n), lambda f: bell(2600, 0, 1)(f) * hp(1500, 1)(f) * lp(5000, 1)(f)) * chiff * 0.12
    s = (ton + nefes + perde * 0.25) * a + ch
    return t0, suz(s, lp(9000, 2))


# ---------------- yaylı katman (PolyBLEP testere) ----------------
def testere(f, t, ph0):
    dt = f / SR
    p = (f * t + ph0) % 1.0
    s = 2 * p - 1
    m = p < dt
    x = p[m] / dt
    s[m] -= x + x - x * x - 1
    m = p > 1 - dt
    x = (p[m] - 1) / dt
    s[m] -= x * x + x + x + 1
    return s


def yaylilar(midis, dur, vel=1.0):
    n = int((dur + 0.9) * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for m in midis:
        f = mf(m)
        for det, pan in ((-9, -0.8), (-3, -0.3), (4, 0.3), (10, 0.8)):
            s = testere(f * 2 ** (det / 1200), t, rng.uniform())
            out[0] += s * np.cos((pan + 1) * np.pi / 4)
            out[1] += s * np.sin((pan + 1) * np.pi / 4)
    e = np.minimum(1, t / 0.55) ** 2
    e = np.where(t > dur, e * np.exp(-(t - dur) / 0.32), e)
    e *= 1 + 0.035 * np.sin(2 * np.pi * 0.7 * t)
    out = suz(out * e, lambda f: lp(1700, 2)(f) * hp(140, 1)(f) * bell(450, -2, 1.5)(f))
    return out * vel / (len(midis) * 4)


# ---------------- davul / shaker ----------------
def davul(vel=1.0):
    t = np.arange(int(0.4 * SR)) / SR
    f = 52 + 75 * np.exp(-t * 38)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8.5)
    s[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    tik = suz(rng.standard_normal(len(t)), lp(1800, 2)) * np.exp(-t / 0.003) * 0.12
    return (s + tik) * vel


def shaker(vel=1.0):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    s = suz(rng.standard_normal(n), lambda f: hp(5500, 2)(f) * lp(12000, 1)(f))
    e = np.minimum(1, t / 0.012) * np.exp(-t / 0.028)
    return s * e * vel * 0.5


# ---------------- müzik ----------------
QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10], "maj7": [0, 4, 7, 11],
        "m6": [0, 3, 7, 9], "sus4": [0, 5, 7]}
PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def akor(ad):
    kok = PC[ad[0]] + (1 if len(ad) > 1 and ad[1] == "#" else 0)
    q = ad[1:].lstrip("#")
    return (kok + TR) % 12, [(kok + TR + i) % 12 for i in QUAL[q]]


# ölçü başına: [(vuruş, akor)]
OLCU = [[(0, "C")], [(0, "Am7")], [(0, "Fmaj7")], [(0, "Gsus4"), (2, "G")],
        [(0, "C")], [(0, "Am7")], [(0, "Dm7"), (2, "G7")], [(0, "C"), (2, "C7")],
        [(0, "Fmaj7")], [(0, "Fm6")], [(0, "Em7"), (2, "A7")], [(0, "Dm7"), (2, "G7")],
        [(0, "F")], [(0, "G")], [(0, "Em7"), (2, "Am7")], [(0, "D7"), (2, "G7")],
        [(0, "C")], [(0, "Am7")], [(0, "Fmaj7"), (2, "G")], [(0, "C"), (2, "G7")]]
SEG = []   # (başlangıç vuruşu, süre vuruşu, kök pc, pc listesi)
for b, ol in enumerate(OLCU):
    for k, (v, a) in enumerate(ol):
        son = ol[k + 1][0] if k + 1 < len(ol) else 4
        r, pcs = akor(a)
        SEG.append((b * 4 + v, son - v, r, pcs))


def nota(ad):
    m = re.match(r"([A-G])(#|b)?(\d)", ad)
    return 12 * (int(m.group(3)) + 1) + PC[m.group(1)] + {"#": 1, "b": -1, None: 0}[m.group(2)] + TR


def ezgi(s):
    """'vuruş süre nota' üçlüleri (Do'da yazılır, Re'ye aktarılır)."""
    p = s.split()
    return [(float(p[i]), float(p[i + 1]), nota(p[i + 2])) for i in range(0, len(p), 3)]


SORU = "0 .5 G4  .5 .5 C5  1 .5 E5  1.5 1.5 G5  3 .5 E5  3.5 .5 G5 "              # "Ha-zır mı-sın?" (yükselen)
A1 = ezgi(SORU + "4 1.5 A5  5.5 .5 G5  6 2 E5 "
          "8 .5 F5  8.5 .5 E5  9 .5 D5  9.5 .5 C5  10 1 A4  11 1 C5  12 1.5 D5  13.5 .5 E5  14 2 D5")
A2 = ezgi(SORU.replace("0 .5 G4  .5 .5 C5  1 .5 E5  1.5 1.5 G5  3 .5 E5  3.5 .5 G5",
                       "16 .5 G4  16.5 .5 C5  17 .5 E5  17.5 1.5 G5  19 .5 E5  19.5 .5 G5")
          + "20 1 A5  21 .5 B5  21.5 1.5 C6  23 1 A5  24 1 F5  25 1 A5  26 1 G5  27 .5 F5  27.5 .5 D5 "
          "28 .5 E5  28.5 .5 D5  29 2 C5  31 1 Bb4")
B1 = ezgi("32 1.5 A5  33.5 .5 G5  34 1 F5  35 1 C5  36 1.5 Ab5  37.5 .5 G5  38 2 F5 "
          "40 1 G5  41 1 E5  42 1 C#5  43 1 E5  44 1.5 F5  45.5 .5 E5  46 1 D5  47 1 G4")
B2 = ezgi("48 .5 C5  48.5 .5 F5  49 1.5 A5  50.5 .5 C6  51 1 A5  52 .5 B5  52.5 .5 A5  53 1.5 G5  54.5 .5 D5  55 1 G5 "
          "56 1 E5  57 1 G5  58 1.5 C6  59.5 .5 B5  60 1 A5  61 1 F#5  62 1 G5  63 .5 F5  63.5 .5 D5")
A3 = ezgi("64 .5 G4  64.5 .5 C5  65 .5 E5  65.5 1.5 G5  67 .5 E5  67.5 .5 G5  68 1.5 A5  69.5 .5 G5  70 2 E5 "
          "72 .5 F5  72.5 .5 A5  73 1 G5  74 .5 D5  74.5 .5 B4  75 1 D5  76 2 C5")


def cumlelere_bol(notalar, bosluk=0.26):
    c, cur = [], []
    for k, (v, d, m) in enumerate(notalar):
        if cur and v - (cur[-1][0] + cur[-1][1]) > bosluk:
            c.append(cur)
            cur = []
        cur.append((v, d, m))
    if cur:
        c.append(cur)
    return c


def flut_cal(notalar, vel=0.8, parlak=1.0, pan=0.08):
    for cm in cumlelere_bol(notalar):
        tl = []
        for k, (v, d, m) in enumerate(cm):
            vv = vel * (1.06 if v % 2 == 0 else 0.96) * (1.05 if d >= 1.5 else 1.0)
            # dil vuruşu: cümle başı, aynı nota tekrarı ve sekizlik zincirinin vurgulu yerleri; diğerleri bağlı (legato)
            dil = k == 0 or cm[k - 1][2] == m or (d <= 0.5 and v % 1 == 0)
            tl.append((v * BEAT, d * BEAT * 0.97, m, vv, dil))
        t0, s = flut_cumle(tl, parlak)
        ekle("flut", s, t0, pan)


def yakin(pcs, lo, hi):
    return sorted(m for m in range(lo, hi + 1) if m % 12 in pcs)


def uku_ses(pcs):
    """Ukulele (gCEA, yeniden girişli): her tel için akordaki en yakın üst perde (0–7. perde)."""
    out = []
    for acik in (67, 60, 64, 69):
        for fr in range(0, 8):
            if (acik + fr) % 12 in pcs:
                out.append(acik + fr)
                break
    return out


def bolum(b):
    return "A" if b < 4 else "A2" if b < 8 else "B" if b < 12 else "B2" if b < 16 else "A3"


def main():
    J = lambda s: rng.normal(0, s)
    # ---- ukulele vuruşu (A, A', B', A'') ----
    DESEN = [(0, 1, 1.0), (1, 1, 0.7), (1.5, -1, 0.5), (2.5, -1, 0.55), (3, 1, 0.75), (3.5, -1, 0.5)]   # D . D U . U D U
    for (s0, du, r, pcs) in SEG:
        b = int(s0 // 4)
        bl = bolum(b)
        if bl == "B":
            continue
        ses = uku_ses(pcs)
        vs = {"A": 0.8, "A2": 0.9, "B2": 0.85, "A3": 1.0}[bl]
        vur = [x for x in DESEN if s0 % 4 <= x[0] < s0 % 4 + du]
        for k, (v, yon, hv) in enumerate(vur):
            ts = (b * 4 + v) * BEAT + J(0.004)
            sonraki = (b * 4 + vur[k + 1][0]) * BEAT if k + 1 < len(vur) else (s0 + du) * BEAT
            tel = ses if yon > 0 else ses[::-1][:3]
            hiz = 0.011 if yon > 0 else 0.008
            for i, m in enumerate(tel):
                d = sonraki - ts + 0.04 - i * hiz
                x = ks_tel(m, 2.2, S=0.38, t60=1.5, pick=0.22 if yon > 0 else 0.15, sert=0.35 if yon > 0 else 0.55,
                           govde=govde_uku, cent=[-2.5, 1.5, -1, 2.5][(m + i) % 4], tohum=i)
                x = yumusak_kes(x[:int(d * SR)], int(0.03 * SR))
                ekle("uku", x * hv * vs * (0.85 + 0.15 * (i == 0)), ts + i * hiz + abs(J(0.0015)), -0.5 + 0.12 * [0, 1, 2, 3][(ses.index(m))])
    # ---- naylon gitar arpejleri (B) ----
    for (s0, du, r, pcs) in SEG:
        b = int(s0 // 4)
        if bolum(b) != "B":
            continue
        kok = 40 + (r - 4) % 12
        ust = yakin(pcs, 55, 67)[:4]
        sira = [kok] + ust
        desen = [0, 2, 3, 4, 1, 3, 2, 4]
        for k in range(int(du * 2)):
            v = s0 + k * 0.5
            m = sira[desen[int(v * 2) % 8] % len(sira)]
            x = ks_tel(m, 2.6, S=0.47, t60=2.4, pick=0.13, sert=0.25, govde=govde_gitar, tohum=k % 3)
            ekle("gitar", x * (1.0 if k % 4 == 0 else 0.72), v * BEAT + J(0.005), 0.15 + 0.4 * (m - 40) / 30)
    # ---- pizzicato bas ----
    for idx, (s0, du, r, pcs) in enumerate(SEG):
        b = int(s0 // 4)
        bl = bolum(b)
        kok = 38 + (r - 2) % 12
        vs = 1.0 if bl != "A" else 0.9
        notalar = [(s0, kok, 1.0)]
        if du == 4:
            besli = kok + 7 if kok + 7 <= 50 else kok - 5
            notalar.append((s0 + 2, besli, 0.82))
        if bl in ("A2", "B2", "A3") and s0 % 4 + du == 4:
            nr = SEG[(idx + 1) % len(SEG)][2]
            hedef = 38 + (nr - 2) % 12
            notalar.append((s0 + du - 0.5, hedef - 1 if (b % 2) else hedef + 2, 0.6))
        for v, m, hv in notalar:
            x = ks_tel(m, 1.4, S=0.5, t60=0.9, pick=0.3, sert=0.15, govde=govde_bas)
            ekle("bas", x * hv * vs, v * BEAT + J(0.003), -0.05)
    # ---- marimba arpejleri (A', A'') + geçişler ----
    for (s0, du, r, pcs) in SEG:
        b = int(s0 // 4)
        if bolum(b) not in ("A2", "A3"):
            continue
        ses = yakin(pcs, 62, 76)[:4]
        desen = [0, 1, 2, 3, 2, 1, 2, 3]
        for k in range(int(du * 2)):
            v = s0 + k * 0.5
            if b in (15, 19) and v % 4 >= 2:
                continue
            m = ses[desen[int(v * 2) % 8] % len(ses)]
            ekle("marimba", marimba(m, 0.95 if k % 2 == 0 else 0.7), v * BEAT + J(0.003), 0.1 + 0.55 * (m - 62) / 14)
    for v0, notalar, adim in ((62, [59, 62, 65, 67, 71, 74, 77, 79], 0.25), (78, [67, 71, 74, 77], 0.5)):
        for k, m in enumerate(notalar):
            ekle("marimba", marimba(m + TR, 0.6 + 0.4 * k / len(notalar)), (v0 + k * adim) * BEAT, 0.2 - 0.05 * k)
    # ---- piyano: B'de ezgi, B''de hafif vuruşlar ----
    for v, d, m in B1:
        ekle("piyano", piyano(m, 0.85 if v % 1 == 0 else 0.72, d * BEAT * 0.98), v * BEAT + J(0.004), 0.05)
        if d >= 1.5:
            ekle("piyano", piyano(m - 12, 0.4, d * BEAT), v * BEAT + 0.012, -0.1)
    for (s0, du, r, pcs) in SEG:
        b = int(s0 // 4)
        if bolum(b) != "B2":
            continue
        ses = yakin(pcs, 57, 69)[:3]
        for v in (s0, s0 + 1.5) if du == 4 else (s0,):
            for i, m in enumerate(ses):
                ekle("piyano", piyano(m, 0.5, 0.45 * BEAT), v * BEAT + i * 0.006 + J(0.003), -0.15)
    # ---- flüt ----
    flut_cal(A1, 0.78)
    flut_cal(A2, 0.82)
    flut_cal(B2, 0.85, 1.05)
    flut_cal(A3, 0.88, 1.08)
    # B'de flüt: uzun, sessiz karşı ses (akorun üçlüsü/yedilisi)
    karsi = []
    onceki = nota("E5")
    for (s0, du, r, pcs) in SEG:
        b = int(s0 // 4)
        if bolum(b) != "B":
            continue
        ad = yakin(pcs, 64, 74)
        m = min(ad, key=lambda x: abs(x - onceki) + (0.5 if x % 12 == r else 0))
        onceki = m
        karsi.append((s0, du * 0.98, m))
    flut_cal(karsi, 0.42, 0.6, pan=-0.25)
    # ---- çan: A''de ezginin uzun notalarını oktav üstten süsler; bölüm başlarında parıltı ----
    for v, d, m in A3:
        if d >= 1.0:
            ekle("can", can(m + 12, 0.7), v * BEAT, 0.3)
    for v in (16, 48, 64):
        ekle("can", can(nota("D6"), 0.5), v * BEAT + 0.01, -0.4)
    # ---- yaylılar ----
    for (s0, du, r, pcs) in SEG:
        b = int(s0 // 4)
        bl = bolum(b)
        if bl == "A":
            continue
        ses = yakin(pcs, 52, 67)
        ses = ses[-4:] if len(ses) > 4 else ses
        ekle("yayli", yaylilar(ses, du * BEAT, {"A2": 0.7, "B": 1.0, "B2": 1.0, "A3": 0.85}[bl]), s0 * BEAT)
    # ---- ritim ----
    for b in range(BARS):
        bl = bolum(b)
        t0 = b * 4 * BEAT
        tam = bl in ("A2", "B2", "A3")
        ekle("davul", davul(1.0), t0, 0)
        if tam:
            ekle("davul", davul(0.8), t0 + 2 * BEAT, 0)
            if b % 2 == 1:
                ekle("davul", davul(0.5), t0 + 3.5 * BEAT, 0)
            ekle("tahta", tahta(0.9, 1150), t0 + BEAT + J(0.002), -0.45)
            ekle("tahta", tahta(0.8, 1060), t0 + 3 * BEAT + J(0.002), -0.45)
        sv = 1.0 if tam else 0.7
        for k in range(16):
            ekle("shaker", shaker([1, 0.35, 0.65, 0.4][k % 4] * sv * (1 + J(0.08))), t0 + k * BEAT / 4 + J(0.003), 0.5)
    # ---- düzey hedefleri (flüte göre dB, etkin bölgelerde ölçülen RMS) ve yankı gönderimleri ----
    HEDEF = {"flut": 0, "piyano": -1.5, "uku": -6.5, "gitar": -7.5, "marimba": -8.5, "can": -16, "yayli": -11.5,
             "bas": -3.5, "davul": -9, "shaker": -21, "tahta": -17}
    GONDER = {"flut": 0.30, "piyano": 0.30, "uku": 0.16, "gitar": 0.22, "marimba": 0.24, "can": 0.42, "yayli": 0.45,
              "bas": 0.04, "davul": 0.03, "shaker": 0.12, "tahta": 0.22}

    def etkin_rms(x):
        m = x.mean(axis=0).astype(np.float64)
        w = int(0.4 * SR)
        e = np.sqrt(np.convolve(m * m, np.ones(w) / w, mode="same")[::w // 4])
        e = e[e > e.max() * 10 ** (-30 / 20)]
        return float(np.sqrt(np.mean(e ** 2)))

    ref = etkin_rms(stem["flut"])
    dry = np.zeros((2, N))
    send = np.zeros((2, N))
    rapor = {}
    for k in KANAL:
        r_ = etkin_rms(stem[k])
        g = 10 ** (HEDEF[k] / 20) * ref / max(r_, 1e-9)
        x = stem[k].astype(np.float64) * g
        dry += x
        send += x * GONDER[k]
        rapor[k] = round(float(np.corrcoef(x[0, ::4], x[1, ::4])[0, 1]), 2)
        stem[k] = None
    print("kanal stereo korelasyonları:", rapor)
    # ---- konvolüsyon yankısı (sentetik oda: erken yansımalar + bant bant sönen kuyruk) ----
    nir = int(2.6 * SR)
    t = np.arange(nir) / SR
    ir = np.zeros((2, nir))
    for c in range(2):
        r2 = np.random.default_rng(300 + c)
        g = r2.standard_normal(nir)
        kuyruk = np.zeros(nir)
        for lo, hi, rt in ((0, 400, 1.9), (400, 1600, 1.7), (1600, 5000, 1.25), (5000, 22050, 0.7)):
            band = suz(g, lambda f, lo=lo, hi=hi: ((f >= lo) & (f < hi)).astype(float))
            kuyruk += band * np.exp(-6.91 * t / rt)
        kuyruk *= np.clip((t - 0.018) / 0.06, 0, 1) ** 1.5
        erken = np.zeros(nir)
        for _ in range(16):
            ti = r2.uniform(0.006, 0.075)
            erken[int(ti * SR)] += r2.uniform(0.3, 1.0) * (1 if r2.uniform() > 0.3 else -1) * np.exp(-ti / 0.05)
        erken = suz(erken, lp(5500, 1))
        kuyruk /= np.sqrt(np.sum(kuyruk ** 2))
        erken /= np.sqrt(np.sum(erken ** 2)) + 1e-9
        ir[c] = kuyruk + 0.55 * erken
    send = suz(send, lambda f: hp(220, 1)(f) * lp(9000, 1)(f))
    mono = send.mean(axis=0)
    wet = np.stack([evrisim(send[0] * 0.75 + mono * 0.25, ir[0])[:N], evrisim(send[1] * 0.75 + mono * 0.25, ir[1])[:N]])
    print(f"korelasyon: kuru {np.corrcoef(dry[0, ::4], dry[1, ::4])[0, 1]:.2f}, yankı {np.corrcoef(wet[0, ::4], wet[1, ::4])[0, 1]:.2f}")
    mix = dry + wet * 0.55
    # ---- dikişsiz döngü: kuyruğu başa katla; bundan sonra her şey dairesel ----
    loop = mix[:, :L].copy()
    loop[:, :TAIL] += mix[:, L:L + TAIL]
    loop -= loop.mean(axis=1, keepdims=True)
    # EQ: alt temizlik, sıcak alt (120 Hz), orta-alt yumuşatma, hafif varlık (3 kHz) ve hava
    loop = suz(loop, lambda f: hp(32, 2)(f) * bell(120, 2.0, 1.0)(f) * bell(700, -1.5, 1.2)(f) * bell(3000, 1.5, 1.0)(f)
               * shelf_hi(9500, 1.5)(f))
    # ---- bus kompresörü (RMS, yumuşak diz, 2:1; atak 15 ms / bırakma 220 ms; dairesel) ----
    hop = 64
    e = (loop ** 2).mean(axis=0)
    w = int(0.03 * SR)
    c = np.cumsum(np.concatenate([e[-w:], e]))
    rms = np.sqrt(np.maximum((c[w:] - c[:-w]) / w, 1e-12))
    lv = db(rms[::hop])
    thr = np.percentile(lv, 90) - 4
    knee, oran = 6.0, 2.0
    over = lv - thr
    gr = np.where(over <= -knee / 2, 0, np.where(over >= knee / 2, over * (1 - 1 / oran),
                                                 (1 - 1 / oran) * (over + knee / 2) ** 2 / (2 * knee)))
    hedefk = -gr
    aa = np.exp(-hop / (0.015 * SR))
    ar = np.exp(-hop / (0.22 * SR))
    g_ = 0.0
    sm = np.zeros(len(hedefk))
    for tur in range(2):   # iki tur: dairesel ısınma
        for i in range(len(hedefk)):
            x = hedefk[i]
            g_ = aa * g_ + (1 - aa) * x if x < g_ else ar * g_ + (1 - ar) * x
            sm[i] = g_
    kg = np.interp(np.arange(L), np.arange(len(sm)) * hop, sm, period=len(sm) * hop)
    loop *= 10 ** (kg / 20)
    print(f"kompresör: eşik {thr:.1f} dB, en çok {(-sm.min()):.1f} dB, ortalama {(-sm.mean()):.2f} dB kazanç azaltma")
    return loop


def ffmpeg_olc(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    s = r.stderr[r.stderr.rfind("Summary"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))
    LRA = float(re.search(r"LRA:\s+(-?[\d.]+) LU", s).group(1))
    tp = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS", s).group(1))
    return I, LRA, tp


def wav_yaz(path, x):
    pcm = (np.clip(x.T, -1, 1) * 32767).astype("<i2").tobytes()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm)


def sinirlayici(x, tavan_db):
    """İleri bakışlı gerçek tepe sınırlayıcı (4x aşırı örnekleme ile tepe; dairesel)."""
    n = x.shape[1]
    tavan = 10 ** (tavan_db / 20)
    X = np.fft.rfft(x, axis=1)
    X4 = np.zeros((2, 2 * n + 1), dtype=complex)
    X4[:, :X.shape[1]] = X
    x4 = np.fft.irfft(X4, n=4 * n, axis=1) * 4
    tepe = np.abs(x4).max(axis=0).reshape(n, 4).max(axis=1)
    gerek = np.minimum(1.0, tavan / np.maximum(tepe, 1e-9))
    m = gerek.copy()
    s = 1
    while s < 128:   # 128 örneklik (2.9 ms) kayan en küçük
        m = np.minimum(m, np.roll(m, s))
        s *= 2
    m = np.roll(m, -64)   # ortala (ileri bakış)
    hop = 16
    bm = m.reshape(-1, hop).min(axis=1) if n % hop == 0 else np.pad(m, (0, hop - n % hop), mode="wrap").reshape(-1, hop).min(axis=1)
    rel = np.exp(-hop / (0.08 * SR))
    g = np.ones(len(bm))
    gg = 1.0
    for tur in range(2):
        for i in range(len(bm)):
            gg = min(bm[i], rel * gg + (1 - rel) * 1.0)
            g[i] = gg
    gs = np.repeat(g, hop)[:n]
    w = 64
    c = np.cumsum(np.concatenate([gs[-w // 2:], gs, gs[:w // 2]]))
    gs = (c[w:] - c[:-w]) / w
    gs = gs[:n]
    return x * gs, float(db(gs.min()))


def olcumler(loop):
    """Dinlemeden sağduyu: bant dengesi, dikiş, DC, stereo uyum."""
    m = loop.mean(axis=0)
    X = np.abs(np.fft.rfft(m)) ** 2
    f = np.fft.rfftfreq(len(m), 1 / SR)
    bantlar = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    en = []
    for fc in bantlar:
        sel = (f >= fc / np.sqrt(2)) & (f < fc * np.sqrt(2))
        en.append(10 * np.log10(X[sel].sum() + 1e-20))
    en = np.array(en) - max(en)
    print("oktav bantları (dB, en güçlüye göre):", ", ".join(f"{b}:{e:.0f}" for b, e in zip(bantlar, en)))
    w = int(0.05 * SR)
    a, b = loop[:, -w:], loop[:, :w]
    adim = np.abs(np.diff(loop, axis=1))
    dikis = np.abs(loop[:, 0] - loop[:, -1]).max()
    print(f"dikiş: son→ilk örnek sıçraması {dikis:.4f} (tipik adım ort {adim.mean():.4f}, %99.9 {np.percentile(adim, 99.9):.4f}); "
          f"son/ilk 50 ms RMS {db(np.sqrt((a ** 2).mean())):.1f} / {db(np.sqrt((b ** 2).mean())):.1f} dBFS")
    sa = np.abs(np.fft.rfft(a.mean(axis=0) * np.hanning(w)))
    sb = np.abs(np.fft.rfft(b.mean(axis=0) * np.hanning(w)))
    fk = np.fft.rfftfreq(w, 1 / SR)
    yuk = fk > 6000
    print(f"dikiş tayfı: 6 kHz üstü enerji son {db(np.sqrt((sa[yuk] ** 2).sum())):.1f} dB / ilk {db(np.sqrt((sb[yuk] ** 2).sum())):.1f} dB "
          f"(tık olsaydı ilk yüksek çıkardı)")
    print(f"DC: L {loop[0].mean():.2e}, R {loop[1].mean():.2e}; stereo korelasyon {np.corrcoef(loop[0], loop[1])[0, 1]:.2f}; "
          f"yan/orta {db(np.std(loop[0] - loop[1]) / np.std(loop[0] + loop[1])):.1f} dB")


def tini_kontrol():
    """Birkaç notanın zarfı/harmonikleri (sayısal sağduyu)."""
    def zarf(x, ad, f0):
        x = x if x.ndim == 1 else x.mean(axis=0)
        e = np.abs(x)
        tp = int(np.argmax(e))
        w = int(0.01 * SR)
        r = [db(np.sqrt(np.mean(x[i:i + w] ** 2))) for i in (int(0.05 * SR), int(0.3 * SR), int(0.8 * SR))]
        seg = x[int(0.02 * SR):int(0.02 * SR) + 8192] * np.hanning(8192)
        S = np.abs(np.fft.rfft(seg))
        fk = np.fft.rfftfreq(8192, 1 / SR)
        h = [db(S[np.argmin(np.abs(fk - f0 * k))]) for k in (1, 2, 3, 4)]
        print(f"  {ad}: tepe {tp / SR * 1000:.1f} ms; 50/300/800 ms düzeyleri {r[0] - r[0]:.0f}/{r[1] - r[0]:.0f}/{r[2] - r[0]:.0f} dB; "
              f"H1..H4 {', '.join(f'{v - h[0]:.0f}' for v in h)} dB")
    m = nota("E5")
    zarf(ks_tel(nota("C5"), 2.2, S=0.38, t60=1.5, pick=0.22, sert=0.35, govde=govde_uku), "ukulele C5", mf(nota("C5")))
    zarf(marimba(nota("G4"), 0.95), "marimba G4", mf(nota("G4")))
    zarf(piyano(m, 0.85, 1.0), "piyano E5", mf(m))
    t0, fl = flut_cumle([(0.1, 1.2, m, 0.8, True)])
    zarf(fl, "flüt E5", mf(m))
    zarf(ks_tel(38, 1.4, S=0.5, t60=0.9, pick=0.3, sert=0.15, govde=govde_bas), "bas D2", mf(38))


def kaydet():
    loop = main()
    print("tını kontrolü:")
    tini_kontrol()
    pay = int(PAY * SR)
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "m.wav")
        mp3 = os.path.join(d, "m.mp3")
        loop /= np.max(np.abs(loop)) * 2
        wav_yaz(wav, loop)
        I0, _, _ = ffmpeg_olc(wav)
        loop *= 10 ** ((DOSYA_LUFS - I0) / 20)
        loop, gmin = sinirlayici(loop, TAVAN_DB)
        print(f"sınırlayıcı: en çok {-gmin:.2f} dB")
        olcumler(loop)
        dosya = np.concatenate([loop[:, -pay:], loop, loop[:, :pay]], axis=1)
        wav_yaz(wav, dosya)
        I, LRA, tp = ffmpeg_olc(wav)
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame",
                        "-b:a", "96k", mp3], check=True)
        I3, LRA3, tp3 = ffmpeg_olc(mp3)
        veri = base64.b64encode(open(mp3, "rb").read()).decode()
    kazanc = round(10 ** ((HEDEF_LUFS - I) / 20), 4)
    print(f"wav: {I:.1f} LUFS, LRA {LRA:.1f} LU, gerçek tepe {tp:.1f} dBTP | mp3: {I3:.1f} LUFS, gerçek tepe {tp3:.1f} dBTP; "
          f"oyunda (KAZANC {kazanc}) ≈ {I + 20 * np.log10(kazanc):.1f} LUFS")
    js = ("// Ev ekranı müziği (tools/muzik_yap.py sentezler; elle değiştirmeyin). Döngü: [PAY, PAY+SURE] sn; KAZANC: oyundaki ses düzeyi.\n"
          "window.EV_MUZIK = " + json.dumps({"PAY": PAY, "SURE": round(L / SR, 6), "KAZANC": kazanc}) + ";\n"
          "window.EV_MUZIK.mp3 = \"" + veri + "\";\n")
    open(os.path.join(ROOT, "ev-muzik.js"), "w").write(js)
    print(f"ev-muzik.js: {len(js) // 1024} KB, döngü {L / SR:.3f} sn")


if __name__ == "__main__":
    kaydet()
