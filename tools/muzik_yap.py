#!/usr/bin/env python3
"""Ev ekranının müziğini sentezler → ev-muzik.js (mp3, base64; file:// ile de çalışır).

Sıcak, neşeli, "maceraya hazırlanıyoruz" havası: ukulele vuruşları, marimba arpejleri, flüt ezgisi,
ksilofon/çan ile küçük kahramanca motif (B bölümü), yumuşak yaylılar, pizzicato bas, hafif ritim (davul, shaker, tahta blok).
Do majör, 112 vuruş/dk, 16 ölçü (~34 sn). Döngü dikişsiz: kuyruklar başa katlanır; dosyada döngünün önünde/arkasında
1'er sn pay var, JS döngüyü [PAY, PAY+SURE] aralığında çalar (mp3 kodlayıcı gecikmesi dikişi bozmaz).
Çalıştır: python3 tools/muzik_yap.py   (numpy + ffmpeg)"""
import base64, json, os, subprocess, tempfile, re
import numpy as np


def suz(x, alt=None, ust=None, n=2, axis=-1):
    """Sıfır fazlı Butterworth genlik yanıtıyla FFT süzgeci (alt: yüksek geçiren köşe, ust: alçak geçiren köşe; Hz)."""
    N = x.shape[axis]
    X = np.fft.rfft(x, axis=axis)
    f = np.fft.rfftfreq(N, 1 / SR)
    h = np.ones_like(f)
    if ust:
        h *= 1 / np.sqrt(1 + (f / ust) ** (2 * n))
    if alt:
        h *= 1 / np.sqrt(1 + (alt / np.maximum(f, 1e-6)) ** (2 * n))
    shape = [1] * x.ndim
    shape[axis] = -1
    return np.fft.irfft(X * h.reshape(shape), n=N, axis=axis)


def evrisim(a, b):
    n = len(a) + len(b) - 1
    m = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, m) * np.fft.rfft(b, m), m)[:n]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
BPM = 112
BEAT = 60 / BPM
BARS = 16
L = int(round(BARS * 4 * BEAT * SR))   # 1 512 000 örnek
TAIL = 4 * SR
PAY = 1.0                               # dosyada döngü öncesi/sonrası pay (sn)
HEDEF_LUFS = -28.0                      # oyunda kazanç 1'de: konuşmanın (~-19 LUFS) ~9 dB altında, maceraların müziğiyle uyumlu
rng = np.random.default_rng(7)

out = np.zeros((2, L + TAIL))
send = np.zeros((2, L + TAIL))          # yankı gönderimi


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ekle(sig, t0, pan=0.0, gain=1.0, verb=0.25):
    i = int(round(t0 * SR))
    n = min(len(sig), L + TAIL - i)
    if n <= 0:
        return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    s = sig[:n] * gain
    out[0, i:i + n] += s * l * 1.414
    out[1, i:i + n] += s * r * 1.414
    send[0, i:i + n] += s * l * verb
    send[1, i:i + n] += s * r * verb


def tt(d):
    return np.arange(int(d * SR)) / SR


def env_ar(n, a, r_start, r):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.5
    rs = int(r_start * SR)
    if rs < n:
        k = np.arange(n - rs) / SR
        e[rs:] *= np.exp(-k / max(1e-3, r / 4))
    return e


# ---------- çalgılar ----------
def marimba(f, vel=1.0, d=1.6):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.8)
         + 0.22 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 11)
         + 0.06 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 26))
    s[:int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    click = rng.standard_normal(int(0.006 * SR)) * np.exp(-np.arange(int(0.006 * SR)) / (0.001 * SR)) * 0.08
    s[:len(click)] += click
    return s * vel


def ksilofon(f, vel=1.0, d=1.2):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 5.5)
         + 0.35 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 14)
         + 0.12 * np.sin(2 * np.pi * f * 6.1 * t) * np.exp(-t * 30))
    s[:int(0.0015 * SR)] *= np.linspace(0, 1, int(0.0015 * SR))
    return s * vel


def can(f, vel=1.0, d=2.4):   # glockenspiel
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 1.8) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4)
         + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8))
    s[:int(0.001 * SR)] *= np.linspace(0, 1, int(0.001 * SR))
    return s * vel


_ks = {}


def ukulele_tel(f, d=1.4):
    """Karplus–Strong telli sesi (perde başına bir kez hesaplanır)."""
    key = round(f, 2)
    if key in _ks:
        return _ks[key]
    n = int(d * SR)
    p = int(round(SR / f))
    buf = rng.uniform(-1, 1, p)
    buf = np.convolve(buf, [0.5, 0.5], mode="same")   # yumuşak (naylon tel)
    y = np.zeros(n)
    y[:p] = buf
    for i in range(p, n):
        y[i] = 0.4985 * (y[i - p] + y[i - p + 1]) if i - p + 1 < i else y[i - p]
    y = suz(y, ust=min(5200, f * 9))
    y /= np.max(np.abs(y)) + 1e-9
    _ks[key] = y
    return y


def flut(f, d, vel=1.0):
    n = int((d + 0.12) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.18) / 0.25, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    s = np.sin(ph) + 0.13 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph) + 0.015 * np.sin(4 * ph)
    nefes = rng.standard_normal(n)
    nefes = suz(nefes, alt=min(f * 1.5, 9000), ust=min(f * 3.5, 15000)) * (0.05 + 0.25 * np.exp(-t / 0.05))
    e = env_ar(n, 0.045, d, 0.12)
    return (s + nefes) * e * vel


def yaylilar(fs, d, vel=1.0):
    n = int((d + 0.6) * SR)
    t = np.arange(n) / SR
    L_ = np.zeros(n)
    R_ = np.zeros(n)
    for f in fs:
        for det, ch in ((-6, 0), (5, 1), (0, 2)):
            ff = f * 2 ** (det / 1200)
            ph = 2 * np.pi * ff * t + rng.uniform(0, 6.28)
            s = np.zeros(n)
            for k in range(1, int(3500 / ff) + 1):
                s += np.sin(k * ph) / k * np.exp(-k / 5.0)
            if ch == 0:
                L_ += s
            elif ch == 1:
                R_ += s
            else:
                L_ += s * 0.5
                R_ += s * 0.5
    e = env_ar(n, 0.35, d, 0.55)
    trem = 1 + 0.04 * np.sin(2 * np.pi * 4.5 * t)
    return L_ * e * trem * vel, R_ * e * trem * vel


def bas(f, d=0.9, vel=1.0):
    t = tt(d)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)) * np.exp(-t * 3.2)
    s[:int(0.006 * SR)] *= np.linspace(0, 1, int(0.006 * SR))
    return s * vel


def davul(vel=1.0):
    t = tt(0.35)
    f = 48 + 70 * np.exp(-t * 30)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    return s * vel


def shaker(vel=1.0):
    n = int(0.07 * SR)
    s = np.diff(rng.standard_normal(n + 1))
    s = suz(s, alt=5000)
    e = np.exp(-np.arange(n) / (0.018 * SR)) * np.clip(np.arange(n) / (0.006 * SR), 0, 1)
    return s * e * vel * 0.3


def tahta(vel=1.0, f=880):
    t = tt(0.12)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 55) + 0.4 * np.sin(2 * np.pi * f * 2.6 * t) * np.exp(-t * 80)
    return s * vel


# ---------- müzik ----------
# akorlar (ölçü başına): kök, akor perdeleri (MIDI)
C, Am, F, G, Em, Dm, G7 = ([48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62],
                           [40, 55, 59, 64], [38, 57, 62, 65], [43, 55, 59, 65])
AKOR = [C, Am, F, G, C, Am, F, G, F, G, Em, Am, Dm, G, C, G7]
# ezgi: (vuruş, süre, MIDI)
N_ = {"G4": 67, "A4": 69, "B4": 71, "C5": 72, "D5": 74, "E5": 76, "F5": 77, "G5": 79, "A5": 81, "B5": 83, "C6": 84, "D6": 86}
EZGI_A = [(0, 1, "G4"), (1, 1, "C5"), (2, 1.5, "E5"), (3.5, .5, "D5"), (4, 1, "C5"), (5, 1, "A4"), (6, 2, "E5"),
          (8, 1, "F5"), (9, .5, "E5"), (9.5, .5, "D5"), (10, 1, "C5"), (11, 1, "A4"), (12, 1, "B4"), (13, .5, "C5"), (13.5, .5, "D5"), (14, 2, "G5"),
          (16, 1, "G4"), (17, 1, "C5"), (18, 1.5, "E5"), (19.5, .5, "G5"), (20, 1.5, "A5"), (21.5, .5, "G5"), (22, 2, "E5"),
          (24, 1, "F5"), (25, 1, "A5"), (26, .5, "G5"), (26.5, .5, "F5"), (27, 1, "E5"), (28, 1.5, "D5"), (29.5, .5, "E5"), (30, 2, "D5")]
# B: kahramanca motif (yükselen dörtlü + "ta-da-daa")
EZGI_B = [(32, .5, "C5"), (32.5, .5, "F5"), (33, 1.5, "A5"), (34.5, .5, "A5"), (35, 1, "G5"),
          (36, .5, "B4"), (36.5, .5, "D5"), (37, 1.5, "G5"), (38.5, .5, "F5"), (39, 1, "E5"),
          (40, .5, "E5"), (40.5, .5, "G5"), (41, 1, "B5"), (42, .5, "A5"), (42.5, .5, "G5"), (43, 1, "E5"),
          (44, 1, "C6"), (45, .5, "B5"), (45.5, .5, "A5"), (46, 2, "E5"),
          (48, .5, "D5"), (48.5, .5, "F5"), (49, 1, "A5"), (50, 1, "F5"), (51, 1, "A5"),
          (52, 1, "G5"), (53, 1, "B5"), (54, 2, "D6"),
          (56, 1.5, "C6"), (57.5, .5, "G5"), (58, 1, "E5"), (59, 1, "C5"),
          (60, 1, "D5"), (61, .5, "F5"), (61.5, .5, "E5"), (62, 1, "D5"), (63, 1, "G4")]


def main():
    for b, ak in enumerate(AKOR):
        t0 = b * 4 * BEAT
        B_ = b >= 8
        kok = ak[0]
        # bas: 1 ve 3. vuruş (kök, beşli), B'de araya geçiş notası
        ekle(bas(mf(kok), 0.9, 0.36), t0, -0.05, verb=0.08)
        ekle(bas(mf(kok + 7 if kok + 7 < 52 else kok - 5), 0.9, 0.3), t0 + 2 * BEAT, -0.05, verb=0.08)
        if B_:
            ekle(bas(mf(kok + 12), 0.4, 0.25), t0 + 3.5 * BEAT, -0.05, verb=0.08)
        # ukulele vuruşu: A: D . D U . U D U  (sekizlikler); tellerden hızlı süpürme
        desen = [(0, 1, 1.0), (2, 1, 0.75), (3, -1, 0.5), (5, -1, 0.55), (6, 1, 0.7), (7, -1, 0.5)]
        teller = [ak[1] + 12 if ak[1] < 60 else ak[1], ak[2] + 12 if ak[2] < 62 else ak[2], ak[3] if ak[3] >= 64 else ak[3] + 12, ak[1] + 12]
        teller = sorted(teller)
        for s8, yon, v in desen:
            ts = t0 + s8 * BEAT / 2
            sira = teller if yon > 0 else teller[::-1]
            for k, m in enumerate(sira):
                ekle(ukulele_tel(mf(m)) * env_ar(len(ukulele_tel(mf(m))), 0.002, BEAT * 0.9, 0.18), ts + k * 0.012 + rng.uniform(0, 0.004),
                     -0.35, gain=0.16 * v * (1.15 if B_ else 1.0), verb=0.18)
        # marimba arpeji (A bölümü belirgin, B'de hafif)
        arp = [ak[0] + 12, ak[1], ak[2], ak[3], ak[2], ak[1], ak[3], ak[2]]
        for k, m in enumerate(arp):
            ekle(marimba(mf(m + 12 if m < 55 else m)), t0 + k * BEAT / 2, 0.35, gain=(0.13 if not B_ else 0.08) * (1.15 if k % 2 == 0 else 0.85), verb=0.22)
        # yaylılar (B'de, A'nın ikinci yarısında hafif)
        if B_ or b >= 4:
            l_, r_ = yaylilar([mf(m) for m in ak[1:]], 4 * BEAT, 0.022 if B_ else 0.012)
            ekle(l_, t0, -0.6, verb=0.4)
            ekle(r_, t0, 0.6, verb=0.4)
        # ritim: davul 1 ve 3 (B'de 2.5'ta da), tahta blok 2 ve 4, shaker on altılıklar
        ekle(davul(0.26), t0, 0, verb=0.05)
        ekle(davul(0.2), t0 + 2 * BEAT, 0, verb=0.05)
        if B_:
            ekle(davul(0.14), t0 + 2.5 * BEAT, 0, verb=0.05)
        ekle(tahta(0.12, 820), t0 + BEAT, -0.25, verb=0.2)
        ekle(tahta(0.12, 760), t0 + 3 * BEAT, -0.25, verb=0.2)
        for k in range(16):
            ekle(shaker([0.5, 0.25, 0.35, 0.25][k % 4] * (1.0 if B_ else 0.75)), t0 + k * BEAT / 4 + rng.uniform(-0.004, 0.004), 0.45, verb=0.1)
    # ezgiler
    for v, d, n in EZGI_A:
        f = mf(N_[n])
        ekle(flut(f, d * BEAT * 0.95), v * BEAT, 0.05, gain=0.24, verb=0.35)
        if v % 4 == 0:
            ekle(can(f * 2, 0.5), v * BEAT, 0.2, gain=0.045, verb=0.4)
    for v, d, n in EZGI_B:
        f = mf(N_[n])
        ekle(ksilofon(f), v * BEAT, 0.15, gain=0.17, verb=0.3)
        ekle(flut(f / 2, d * BEAT * 0.95), v * BEAT, -0.1, gain=0.1, verb=0.35)
        ekle(can(f * 2, 0.35), v * BEAT, 0.3, gain=0.03, verb=0.4)
    # yankı (oda + hafif hol)
    n = int(1.9 * SR)
    k = np.arange(n) / n
    ir = np.stack([rng.standard_normal(n) * np.exp(-k * 7.5), rng.standard_normal(n) * np.exp(-k * 7.5)])
    ir = suz(ir, ust=5500, n=1, axis=1)
    ir[:, :int(0.015 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    wet = np.stack([evrisim(send[c], ir[c])[:L + TAIL] for c in range(2)]) * 0.5
    mix = out + wet
    # dikişsiz döngü: kuyruğu başa katla
    loop = mix[:, :L].copy()
    loop[:, :TAIL] += mix[:, L:L + TAIL]
    # alçak frekans temizliği + yumuşak tepe sınırlayıcı
    loop = suz(loop, alt=40, axis=1)   # döngü dairesel: FFT süzgeci dikişi bozmaz
    loop /= np.max(np.abs(loop)) + 1e-9
    loop = np.tanh(loop * 1.3) / np.tanh(1.3)
    pay = int(PAY * SR)
    dosya = np.concatenate([loop[:, -pay:], loop, loop[:, :pay]], axis=1)
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, "m.wav")
        mp3 = os.path.join(d, "m.mp3")
        import wave
        pcm = (np.clip(dosya.T, -1, 1) * 32000).astype("<i2").tobytes()
        with wave.open(wav, "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm)
        # ses düzeyini ölç ve hedefe getir
        r = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
        lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "96k", mp3], check=True)
        veri = base64.b64encode(open(mp3, "rb").read()).decode()
    kazanc = round(10 ** ((HEDEF_LUFS - lufs) / 20), 4)
    js = ("// Ev ekranı müziği (tools/muzik_yap.py sentezler; elle değiştirmeyin). Döngü: [PAY, PAY+SURE] sn; KAZANC: oyundaki ses düzeyi.\n"
          "window.EV_MUZIK = " + json.dumps({"PAY": PAY, "SURE": L / SR, "KAZANC": kazanc}) + ";\n"
          "window.EV_MUZIK.mp3 = \"" + veri + "\";\n")
    open(os.path.join(ROOT, "ev-muzik.js"), "w").write(js)
    print(f"ev-muzik.js: {len(js) // 1024} KB, döngü {L / SR:.3f} sn, dosya {lufs:.1f} LUFS → kazanç {kazanc}")


main()
