"""Turn the Blender renders into the cell-frame assets.

- everything outside the hexagon is made fully transparent (the denoiser
  leaves a few stray alpha values in the corners)
- flat-top, 548x468: the same size as cell-gold.png, for the archive comb
- pointy-top (the flat-top turned 90 degrees), 468x548, for the About page,
  whose comb is laid out with its points up
"""
import math, sys, os
from PIL import Image, ImageDraw

src_dir, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)
for v in ('team', 'story', 'rice'):
    im = Image.open(os.path.join(src_dir, f'raw-{v}.png')).convert('RGBA')
    w, h = im.size
    R = w / 2
    pts = [(w / 2 + R * math.cos(math.radians(60 * i)), h / 2 - R * math.sin(math.radians(60 * i))) for i in range(6)]
    mask = Image.new('L', (w * 4, h * 4), 0)
    ImageDraw.Draw(mask).polygon([(x * 4, y * 4) for x, y in pts], fill=255)
    mask = mask.resize((w, h), Image.LANCZOS)
    a = Image.composite(im.split()[3], Image.new('L', (w, h), 0), mask)
    im.putalpha(a)
    flat = im.resize((548, 468), Image.LANCZOS)
    flat.save(os.path.join(out_dir, f'frame-{v}.png'), optimize=True)
    pointy = im.rotate(90, expand=True).resize((468, 548), Image.LANCZOS)
    pointy.save(os.path.join(out_dir, f'frame-{v}-pointy.png'), optimize=True)
    print(v, os.path.getsize(os.path.join(out_dir, f'frame-{v}.png')), os.path.getsize(os.path.join(out_dir, f'frame-{v}-pointy.png')))
