"""
主題相嘅統一處理：裁成 5:8、縮到標準尺寸、存成 WebP。

    # 換某一關嘅相（會自動置中裁成 5:8）
    python scripts/prepare_photos.py "C:/path/to/new.jpg" 4

    # 把 public/images/chapters/ 入面剩低嘅 .jpg 全部轉成 WebP
    python scripts/prepare_photos.py --convert-all

輸出： public/images/chapters/<chapterKey>-<levelInChapter>.webp

── 點解 992×1586 ──────────────────────────────────────────────────
5:8（同 src/index.css 嘅 --board-ratio 一致）。棋盤喺手機上最闊約
385 CSS px，3 倍 DPR 即 1155 裝置像素，所以 992 已經夠用；再大只會
拖慢載入，喺畫面上完全睇唔出分別。長按睇原圖嗰個 overlay 都係差唔多
呢個尺寸。

── 點解 WebP q80 ──────────────────────────────────────────────────
全套 50 張由 24.3MB 減到 13.7MB（慳 44%）。q80 同原 JPEG 喺 1:1
對比之下肉眼分唔出（試過用花卉嗰張細節最密嘅做對照）。玩緊嗰陣每塊
拼圖先至得 77px 闊，就更加冇分別。
WebP 喺 iOS 14+ WKWebView 同 Android WebView 都支援，Capacitor 8
嘅最低版本本身已經高過呢個。

需要 Pillow： pip install pillow
"""
import os
import sys

from PIL import Image

# Windows console 預設 cp950，中文輸出會炸。強制 UTF-8。
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.join(os.path.dirname(__file__), '..')
DST = os.path.join(ROOT, 'public', 'images', 'chapters')

SIZE = (992, 1586)   # 5:8
QUALITY = 80


def slot_for(level_number):
    """第 N 關 → (chapterKey, levelInChapter)，同 src/game/levels.js 一致。"""
    if not 1 <= level_number <= 50:
        raise SystemExit(f'關卡編號要喺 1–50 之間，收到 {level_number}')
    chapter = (level_number - 1) // 5 + 1
    return f'ch{chapter:02d}', (level_number - 1) % 5 + 1


def to_five_by_eight(im):
    """置中裁成 5:8，再縮到標準尺寸。原圖已經係 5:8 就淨係縮。"""
    target = SIZE[0] / SIZE[1]
    w, h = im.size
    if w / h > target:      # 太闊 → 裁左右
        new_w = round(h * target)
        left = (w - new_w) // 2
        im = im.crop((left, 0, left + new_w, h))
    elif w / h < target:    # 太高 → 裁上下
        new_h = round(w / target)
        top = (h - new_h) // 2
        im = im.crop((0, top, w, top + new_h))
    return im.resize(SIZE, Image.LANCZOS)


def save(im, path):
    im.save(path, 'WEBP', quality=QUALITY, method=6)
    return os.path.getsize(path)


def install(src_path, level_number):
    key, slot = slot_for(level_number)
    dst = os.path.join(DST, f'{key}-{slot}.webp')
    im = Image.open(src_path).convert('RGB')
    before = im.size
    kb = save(to_five_by_eight(im), dst) // 1024
    print(f'第 {level_number} 關 → {key}-{slot}.webp   {before[0]}×{before[1]} → '
          f'{SIZE[0]}×{SIZE[1]}   {kb} KB')
    # 舊嗰張 .jpg 唔清走就會兩張並存，白白多咗一份喺 App 包入面
    old = os.path.join(DST, f'{key}-{slot}.jpg')
    if os.path.exists(old):
        os.remove(old)
        print(f'   已刪走舊檔 {key}-{slot}.jpg')


def convert_all():
    total_before = total_after = 0
    count = 0
    for chapter in range(1, 11):
        for slot in range(1, 6):
            key = f'ch{chapter:02d}'
            src = os.path.join(DST, f'{key}-{slot}.jpg')
            if not os.path.exists(src):
                continue
            im = Image.open(src).convert('RGB')
            if im.size != SIZE:
                im = to_five_by_eight(im)
            total_before += os.path.getsize(src)
            total_after += save(im, os.path.join(DST, f'{key}-{slot}.webp'))
            os.remove(src)
            count += 1
    if count == 0:
        print('冇 .jpg 要轉，全部已經係 WebP。')
        return
    print(f'轉咗 {count} 張： {total_before/1024/1024:.1f} MB → '
          f'{total_after/1024/1024:.1f} MB（慳 {100 - total_after/total_before*100:.0f}%）')


def main():
    args = sys.argv[1:]
    if args == ['--convert-all']:
        convert_all()
    elif len(args) == 2:
        install(args[0], int(args[1]))
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
