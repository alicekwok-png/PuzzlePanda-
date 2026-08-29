"""
把設計交嘅透明底插畫處理成介面用嘅細圖示。

    # 進度條三個里程碑（起步 / 衝刺 / 歡呼）
    python scripts/prepare_icons.py milestone 25 "起步.png"
    python scripts/prepare_icons.py milestone 50 "衝刺.png"
    python scripts/prepare_icons.py milestone 75 "歡呼.png"

    # 首頁貼紙簿入口
    python scripts/prepare_icons.py album "sticker-album-icon.png"

── 點解要「淨主體」裁 ──────────────────────────────────────────────
交嚟嘅插畫四周通常有散開嘅裝飾（星星、速度線）。呢啲嘢喺 1254px 好睇，
但圖示最終得二十幾 px —— 裝飾唔單止睇唔到，仲會令主體被迫縮細一大截，
變成一嚿糊。

所以唔用整張圖嘅 alpha bbox，而係由重心 flood fill 揀出**最大嗰嚿連住
嘅圖形**（＝熊貓本體連佢個白色 die-cut 邊框），淨係用佢嘅範圍去裁。
散開嘅裝飾自然被剔走，主體就可以填滿成格。

需要 Pillow + numpy： pip install pillow numpy
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.join(os.path.dirname(__file__), '..')
DST = os.path.join(ROOT, 'public', 'icons')

# 里程碑喺畫面上得 28px，3 倍 DPR 即 84 —— 128 已經有餘裕。
SIZES = {'milestone': 128, 'album': 192}
QUALITY = 92
MILESTONES = (25, 50, 75)


def to_square(im):
    side = max(im.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return canvas


def crop_main_shape(im):
    """裁到「最大嗰嚿連住嘅圖形」，唔要四周散開嘅裝飾。"""
    arr = np.array(im)
    opaque = arr[..., 3] > 24
    if not opaque.any():
        raise SystemExit('成張圖都係透明嘅？')

    # Image.fromarray 出嚟嘅 buffer 係唯讀，floodfill 會靜靜哋咩都唔做
    mask = Image.fromarray(np.where(opaque, 0, 255).astype(np.uint8), 'L').copy()
    ys, xs = np.nonzero(opaque)
    cy, cx = int(ys.mean()), int(xs.mean())   # 重心一定落喺面積最大嗰嚿身上
    if mask.getpixel((cx, cy)) != 0:
        return to_square(im.crop(im.getchannel('A').getbbox()))

    ImageDraw.floodfill(mask, (cx, cy), 128, thresh=0)
    blob = np.array(mask) == 128
    ys, xs = np.nonzero(blob)
    return to_square(im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))


def build(src_path, out_name, size):
    im = Image.open(src_path).convert('RGBA')
    if im.getchannel('A').histogram()[0] == 0:
        raise SystemExit(f'{src_path} 冇透明底 —— 要設計交去咗底嘅 PNG')
    out = crop_main_shape(im).resize((size, size), Image.LANCZOS)
    os.makedirs(DST, exist_ok=True)
    dst = os.path.join(DST, out_name)
    out.save(dst, 'WEBP', quality=QUALITY, method=6)
    print(f'{out_name}  {im.size[0]}×{im.size[1]} → {size}×{size}  '
          f'{os.path.getsize(dst) / 1024:.0f} KB')


def main():
    args = sys.argv[1:]
    if len(args) == 3 and args[0] == 'milestone':
        pct = int(args[1])
        if pct not in MILESTONES:
            raise SystemExit(f'里程碑百分比要係 {MILESTONES} 其中一個'
                             f'（改咗就要一齊改 GameScreen 嘅 MILESTONES）')
        build(args[2], f'milestone-{pct}.webp', SIZES['milestone'])
    elif len(args) == 2 and args[0] == 'album':
        build(args[1], 'album.webp', SIZES['album'])
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
