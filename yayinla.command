#!/bin/bash
# Çift tıkla: Feza ve Bilbo'nun Maceraları'ndaki tüm değişiklikleri GitHub'a gönderir
# (ilk seferde depoyu oluşturur ve GitHub Pages'ı açar).
cd "$(dirname "$0")" || exit 1
DEPO='goktugkarpat/feza-bilbo'
if [ ! -d .git ]; then
  git init -q -b main
fi
git config user.name "goktugkarpat"
git config user.email "goktugkarpat@users.noreply.github.com"
if git remote get-url origin >/dev/null 2>&1 && [ "$(git remote get-url origin)" != "https://github.com/$DEPO.git" ]; then
  echo "Gönderim durduruldu: bu oyun yalnızca kendi deposuna (github.com/$DEPO) gönderilebilir."
  sleep 6; exit 1
fi
# İnternetsiz çalışma listesini (sw.js) yenile: yeni/değişen dosyalar iPad'e de insin.
python3 tools/liste.py || echo "Uyarı: dosya listesi yenilenemedi (python3 yok mu?)."
git add -A
if git diff --cached --quiet; then
  echo "Yeni değişiklik yok."
else
  git commit -q -m "Güncelleme: $(date '+%Y-%m-%d %H:%M')" && echo "Değişiklikler kaydedildi."
fi
if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo create "$DEPO" --public --source . --remote origin --push; then
    gh api -X POST "repos/$DEPO/pages" -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1
    echo "Tamam! Oyun GitHub'a yüklendi: https://goktugkarpat.github.io/feza-bilbo/"
    echo "(İlk yayın birkaç dakika sürebilir.)"
  else
    echo "Gönderilemedi. İnternet bağlantısını ve 'gh auth login' girişini kontrol edin."
  fi
elif git push -q -u origin main; then
  echo "Tamam! GitHub güncellendi: https://goktugkarpat.github.io/feza-bilbo/"
else
  echo "Gönderilemedi. İnternet bağlantısını ve 'gh auth login' girişini kontrol edin."
fi
sleep 4
