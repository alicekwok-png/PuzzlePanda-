"""
把設計交付嘅去底貼紙處理成 App 可以出街嘅資源。

    python scripts/prepare_stickers.py

輸入： design/stickers/<chapter-folder>/sticker-0N-cutout.png   （1024×1024 RGBA）
輸出： public/stickers/<chapterKey>/sticker-0N.webp             （512×512 RGBA）

做三件事：

1. 剷走白色 die-cut 外框以外嗰嚿深色光暈
   ------------------------------------------------------------------
   ⚠️ 交付嗰批「cutout」其實只去咗四隻角。白色外框之外仲有一大嚿唔透明
   嘅深啡／橙色光暈（原本深藍底嘅殘留）。貼紙簿係牛皮紙底色，嗰嚿嘢會
   變成一撻污糟嘅啡色 —— 正正就係 design/sticker-album-spec.md 想避開
   嘅「貼咗張深色方卡上去」。

   做法：白色外框係一個閉合輪廓，所以由四隻角向內 flood fill，行得過
   嘅就係框外面嘅嘢，一律抹走 alpha。

   外框有機會有斷口，fill 會漏入去連貼紙本身都食埋。所以每張都會驗一次
   「中心點有冇被填到」，有就當漏，加大 dilate 半徑封住斷口再試。dilate
   之後 fill 會早少少停，最多剩返幾 px 深色邊 —— 縮到 512 再顯示成 120px
   之後肉眼睇唔到。

2. 裁走透明邊再補成正方形
   ------------------------------------------------------------------
   剷走光暈之後四周會多咗好大片透明位，唔裁嘅話貼紙喺格入面會顯得好細。
   裁到 alpha bbox 再補成正方形 —— 全部輸出都係正方形，CSS 可以一個尺寸
   通用，唔使逐張讀 aspect ratio。

3. 縮到 512 存 WebP
   ------------------------------------------------------------------
   規格寫 PNG，但 50 張 1024 PNG = 56MB，上架包唔可以咁。512 WebP 全套
   得返約 1.5MB，而且保留完整 RGBA（PNG-8 量化會令白邊同絨毛出現色階）。
   WebP 喺 iOS 14+ WKWebView 同 Android WebView 都支援，Capacitor 8 嘅
   最低版本本身已經高過呢個。

   原圖 PNG 唔入 repo（見 .gitignore）—— 56MB 落 git 歷史係永久嘅，
   而且 Render 每次 build 都要 clone 一次。要重新產生就由設計攞返
   puzzlepanda-stickers-cutout-part1/2.zip 解壓喺專案根目錄再跑。

需要 Pillow + numpy： pip install pillow numpy
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Windows console 預設 cp950，中文輸出會炸。強制 UTF-8。
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'design', 'stickers')
DST = os.path.join(ROOT, 'public', 'stickers')

# design/ 嘅資料夾名 → 程式入面用嘅 chapterKey（src/game/levels.js 嘅 CHAPTERS）
FOLDERS = {
    'ch01-nature': 'ch01',
    'ch02-panda': 'ch02',
    'ch03-cats': 'ch03',
    'ch04-floral': 'ch04',
    'ch05-dessert': 'ch05',
    'ch06-art': 'ch06',
    'ch07-ocean': 'ch07',
    'ch08-landmarks': 'ch08',
    'ch09-starry': 'ch09',
    'ch10-citynight': 'ch10',
}

OUT_SIZE = 512
PAD = 12       # 裁完之後四周留返少少透明位，唔好貼死邊
QUALITY = 90


def white_ring_mask(rgba):
    """白色 die-cut 外框：夠光 + 夠低飽和 + 唔透明。"""
    r, g, b, a = (rgba[..., i].astype(int) for i in range(4))
    hi = np.maximum(np.maximum(r, g), b)
    lo = np.minimum(np.minimum(r, g), b)
    return (lo >= 185) & ((hi - lo) <= 45) & (a >= 200)


def fill_from_corners(blocker_arr):
    """由四隻角 flood fill，回傳「框外面」嘅遮罩。"""
    # Image.fromarray 出嚟嘅 buffer 係唯讀，ImageDraw.floodfill 會靜靜哋
    # 咩都唔做。一定要 .copy()。
    img = Image.fromarray(np.where(blocker_arr, 255, 0).astype(np.uint8), 'L').copy()
    w, h = img.size
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if img.getpixel(seed) == 0:
            ImageDraw.floodfill(img, seed, 128, thresh=0)
    return np.array(img) == 128


def strip_halo(im):
    """抹走白色外框以外嘅嘢。回傳 (新圖, 用咗嘅 dilate 半徑)。"""
    rgba = np.array(im)
    ring = white_ring_mask(rgba)
    alpha = rgba[..., 3]
    cy, cx = rgba.shape[0] // 2, rgba.shape[1] // 2

    for radius in (0, 1, 2, 3, 4, 6):
        if radius == 0:
            blocker = ring
        else:
            m = Image.fromarray(np.where(ring, 255, 0).astype(np.uint8), 'L')
            blocker = np.array(m.filter(ImageFilter.MaxFilter(radius * 2 + 1))) > 0
        outside = fill_from_corners(blocker)
        # 中心點被填到 = 由斷口漏咗入貼紙裏面，換大半徑再試
        if not outside[cy, cx]:
            out = rgba.copy()
            out[..., 3] = np.where(outside, 0, alpha)
            return Image.fromarray(out, 'RGBA'), radius

    # 全部半徑都漏 = 白框根本唔閉合（ch07 潑水嗰張根本冇白框，ch09 太空盔
    # 頂部同白框融埋一齊）。呢啲救唔到，退而求其次：由外向內軟化 alpha，
    # 令嗰嚿深色暈開變成暖光，唔會喺牛皮紙上變一撻硬邊深色卡。
    # 呢個係暫代方案，輸出時會列出嚟，要求設計重新去底。
    return feather_edge(im), None


def feather_edge(im, cut=170, feather=40):
    """由 alpha 邊界向內柔化，令外圈嘅深色暈淡走。"""
    a = np.array(im)
    mask = Image.fromarray(((a[..., 3] > 8) * 255).astype(np.uint8), 'L')
    # 高斯模糊後嘅值同「離邊界幾深入」單調相關，夠用嚟做柔化斜坡，
    # 唔使真係做距離變換（scipy 唔喺呢個專案嘅依賴入面）。
    blurred = np.array(mask.filter(ImageFilter.GaussianBlur(feather))).astype(float)
    ramp = np.clip((blurred - cut) / 70.0, 0, 1)
    out = a.copy()
    out[..., 3] = (a[..., 3] * ramp).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def square_trim(im):
    """裁到 alpha bbox，加邊，再補成正方形。"""
    box = im.getchannel('A').getbbox()
    if box is None:
        return im
    left, top, right, bottom = box
    left, top = max(0, left - PAD), max(0, top - PAD)
    right, bottom = min(im.width, right + PAD), min(im.height, bottom + PAD)
    cropped = im.crop((left, top, right, bottom))
    side = max(cropped.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cropped.width) // 2, (side - cropped.height) // 2))
    return canvas


def main():
    failures = []
    total = 0
    for folder, key in FOLDERS.items():
        out_dir = os.path.join(DST, key)
        os.makedirs(out_dir, exist_ok=True)
        for n in range(1, 6):
            src = os.path.join(SRC, folder, f'sticker-0{n}-cutout.png')
            if not os.path.exists(src):
                print(f'⚠️  缺檔：{src}')
                continue
            im = Image.open(src).convert('RGBA')
            cleaned, radius = strip_halo(im)
            if radius is None:
                failures.append(f'{folder}/sticker-0{n}')
            out = square_trim(cleaned).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
            dst = os.path.join(out_dir, f'sticker-0{n}.webp')
            out.save(dst, 'WEBP', quality=QUALITY, method=6)
            total += os.path.getsize(dst)
            note = '' if radius in (0, None) else f'  (封咗 {radius}px 斷口)'
            print(f'{key}/sticker-0{n}.webp  {os.path.getsize(dst)/1024:5.0f} KB{note}')

    print(f'\n合計 {total/1024/1024:.1f} MB')
    if failures:
        print('\n⚠️  以下幾張白框唔閉合，救唔到，已改用軟化邊緣頂住。')
        print('   要設計重新去底（要有閉合嘅白色 die-cut 外框）：')
        for f in failures:
            print('   ', f)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
