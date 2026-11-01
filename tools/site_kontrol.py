#!/usr/bin/env python3
"""Havacilik Mevzuati Hub v3.11.2 - deployment completeness check (stdlib)."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
ver = "3.11.2"
links = re.findall(r'<script\s+src=["\']([^"\']+)["\']', html, re.I)
links += re.findall(r'<link\s+rel=["\']stylesheet["\']\s+href=["\']([^"\']+)["\']', html, re.I)
paths = sorted(set(x.split("?", 1)[0].lstrip("./") for x in links))
paths += ["src/parser.worker.js", "src/vendor/JSZip-LICENSE.md", "src/tr-schema.js", "src/temporal.js", "src/temporal-ui.js", "TR_Mevzuat_Semasi_v2_0_YeniKayit.xsd", "TR_Mevzuat_Semasi_v2_0.xsd"]
paths = sorted(set(paths))
missing = [p for p in paths if not (root / p).is_file()]
print(f"Uygulama: {ver} | Denetlenen dosya sayisi: {len(paths)}")
for p in paths: print(("EKSİK" if p in missing else "OK"), p)
if f'v{ver}' not in html or f'v={ver}' not in html:
    print('HATA: Sürüm etiketi bulunamadı veya eşleşmiyor.')
    sys.exit(1)
if missing:
    print(f"HATA: {len(missing)} zorunlu dosya eksik.")
    sys.exit(1)
print('SONUÇ: Gerekli statik dosyaların tamamı mevcut. config.js kullanıcı hesabında korunmalıdır.')
