"""
量化每一關「格子撞樣」的程度，用來預測哪幾關會讓玩家卡住。

做法：把每張主題相按該關實際格數切開，每格取「平均 RGB + 亮度標準差」
做描述子，再算每格與最相似的另一格之間的歐氏距離，取中位數。
數值越小 = 越多格長得像 = 越難分辨。

用法：
    python scripts/analyze_difficulty.py            # 全部 50 關，由難到易
    python scripts/analyze_difficulty.py 12         # 只列最難 12 關

需要 Pillow： pip install pillow
"""
import math
import os
import re
import sys

from PIL import Image

CHAPTERS = {
    1: '風景', 2: '熊貓', 3: '貓咪', 4: '花卉', 5: '甜品',
    6: '藝術', 7: '海洋', 8: '世界名勝', 9: '星空', 10: '城市夜景',
}

IMAGES = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'chapters')
SAMPLE = 16  # 每格取樣邊長


def load_curve():
    """由 src/game/levels.js 讀返難度曲線。

    以前呢度自己抄一份 grid_size()，每次調難度都要記住兩邊一齊改，
    唔記得就會拎住舊格數去算，出嚟嘅指數係錯㗎。而家直接讀返個表。
    """
    js = os.path.join(os.path.dirname(__file__), '..', 'src', 'game', 'levels.js')
    with open(js, encoding='utf-8') as f:
        src = f.read()
    m = re.search(r'const CURVE = \[(.*?)\n\];', src, re.S)
    if not m:
        raise SystemExit('喺 levels.js 搵唔到 CURVE —— 個表改咗格式？')
    pairs = re.findall(r'\[\s*(\d+)\s*,\s*(\d+)\s*\]', m.group(1))
    if len(pairs) != 50:
        raise SystemExit(f'CURVE 應該有 50 關，讀到 {len(pairs)} 關')
    return [(int(a), int(b)) for a, b in pairs]


CURVE = load_curve()


def grid_size(level):
    return CURVE[level - 1][0]


def cell_descriptors(path, n):
    im = Image.open(path).convert('RGB').resize((n * SAMPLE, n * SAMPLE))
    px = im.load()
    cells = []
    for row in range(n):
        for col in range(n):
            vals = [px[col * SAMPLE + x, row * SAMPLE + y]
                    for x in range(SAMPLE) for y in range(SAMPLE)]
            count = len(vals)
            mr = sum(v[0] for v in vals) / count
            mg = sum(v[1] for v in vals) / count
            mb = sum(v[2] for v in vals) / count
            lum = [sum(v) / 3 for v in vals]
            mu = sum(lum) / count
            sd = math.sqrt(sum((l - mu) ** 2 for l in lum) / count)
            cells.append((mr, mg, mb, sd))
    return cells


def confusability(cells):
    """每格到最相似另一格的距離，取中位數。"""
    mins = []
    for i, a in enumerate(cells):
        mins.append(min(math.dist(a, b) for j, b in enumerate(cells) if i != j))
    mins.sort()
    return mins[len(mins) // 2]


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    rows = []
    for chapter in range(1, 11):
        for slot in range(1, 6):
            level = (chapter - 1) * 5 + slot
            n = grid_size(level)
            path = os.path.join(IMAGES, f'ch{chapter:02d}-{slot}.webp')
            if not os.path.exists(path):
                print(f'⚠️  缺檔：{path}')
                continue
            rows.append((confusability(cell_descriptors(path, n)), level, chapter, n))

    rows.sort()
    shown = rows[:limit] if limit else rows
    print(f'{"關":>4}  {"章節":<10}{"格":>5}  {"撞樣指數":>9}   （越細＝越難分辨）')
    for score, level, chapter, n in shown:
        print(f'{level:>4}  {CHAPTERS[chapter]:<10}{n}×{n}  {score:9.1f}')


if __name__ == '__main__':
    main()
