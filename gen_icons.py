# 生成 PWA 图标：沿用工作台 logo（深色底 + 电青色对勾）
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
os.makedirs(OUT, exist_ok=True)

BG = (11, 15, 23)       # #0B0F17
PANEL = (16, 24, 39)    # #101827
ACCENT = (34, 211, 238) # #22D3EE

# logo 对勾路径（32x32 viewBox）：M9 17 l5 5 l9 -11
POINTS = [(9, 17), (14, 22), (23, 11)]

def draw_check(draw, box, width_scale=1.0):
    """box = (x0, y0, size) 在画布上绘制 32x32 坐标系里的对勾"""
    x0, y0, size = box
    s = size / 32.0
    pts = [(x0 + px * s, y0 + py * s) for px, py in POINTS]
    w = max(2, int(3 * s * width_scale))
    draw.line(pts, fill=ACCENT, width=w, joint='curve')
    # 圆头
    r = w / 2
    for p in (pts[0], pts[-1]):
        draw.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=ACCENT)

def rounded_mask(size, radius):
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill=255)
    return m

SUPER = 4  # 4x 超采样

def make_regular(size):
    S = size * SUPER
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = int(S * 0.22)
    d.rounded_rectangle([0, 0, S-1, S-1], radius=rad, fill=BG + (255,))
    # 内层面板微光
    pad = int(S * 0.10)
    d.rounded_rectangle([pad, pad, S-1-pad, S-1-pad], radius=int(rad*0.8), fill=PANEL + (255,))
    glyph = int(S * 0.56)
    draw_check(d, ((S-glyph)//2, (S-glyph)//2, glyph))
    return img.resize((size, size), Image.LANCZOS)

def make_maskable(size):
    S = size * SUPER
    img = Image.new('RGBA', (S, S), BG + (255,))
    d = ImageDraw.Draw(img)
    # 安全区 80%，对勾放在中心 44% 区域
    glyph = int(S * 0.44)
    draw_check(d, ((S-glyph)//2, (S-glyph)//2, glyph))
    return img.resize((size, size), Image.LANCZOS)

jobs = [
    ('icon-192.png', 192, make_regular),
    ('icon-512.png', 512, make_regular),
    ('icon-maskable-192.png', 192, make_maskable),
    ('icon-maskable-512.png', 512, make_maskable),
    ('apple-touch-icon.png', 180, make_maskable),  # iOS 全底不透明
]
for name, size, fn in jobs:
    fn(size).save(os.path.join(OUT, name))
    print('ok', name, size)
print('done ->', OUT)
