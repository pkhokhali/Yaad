from PIL import Image
import os

src_base = r'C:\Users\User\.cursor\projects\d-Projects-Yaad\assets'
dst_base = os.path.join(os.path.dirname(__file__), '..', 'assets')
dst_base = os.path.abspath(dst_base)
os.makedirs(os.path.join(dst_base, 'images'), exist_ok=True)
os.makedirs(os.path.join(dst_base, 'store'), exist_ok=True)

files = sorted([f for f in os.listdir(src_base) if f.endswith('.png')])
icon_src = os.path.join(src_base, files[0])
feature_src = os.path.join(src_base, files[1])
shot_src = os.path.join(src_base, files[2])

im = Image.open(icon_src).convert('RGBA')
w, h = im.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
icon_sq = im.crop((left, top, left + side, top + side))
icon512 = icon_sq.resize((512, 512), Image.LANCZOS)
icon512.save(os.path.join(dst_base, 'images', 'icon.png'))
icon512.save(os.path.join(dst_base, 'images', 'memory-node.png'))

fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
icon768 = icon_sq.resize((768, 768), Image.LANCZOS)
fg.paste(icon768, (128, 128), icon768)
fg.save(os.path.join(dst_base, 'images', 'android-icon-foreground.png'))

bg = Image.new('RGB', (1024, 1024), (18, 20, 26))
bg.save(os.path.join(dst_base, 'images', 'android-icon-background.png'))

mono = icon_sq.convert('L').convert('RGBA').resize((512, 512), Image.LANCZOS)
mono.save(os.path.join(dst_base, 'images', 'android-icon-monochrome.png'))

icon512.save(os.path.join(dst_base, 'images', 'splash-icon.png'))
icon512.resize((48, 48), Image.LANCZOS).save(os.path.join(dst_base, 'images', 'favicon.png'))

feat = Image.open(feature_src).convert('RGB').resize((1024, 500), Image.LANCZOS)
feat.save(os.path.join(dst_base, 'store', 'feature-graphic.png'))

shot = Image.open(shot_src).convert('RGB').resize((1080, 1920), Image.LANCZOS)
shot.save(os.path.join(dst_base, 'store', 'screenshot-04-inbox.png'))

print('Assets written to', dst_base)
for root, _, names in os.walk(dst_base):
    for n in sorted(names):
        if n.endswith('.png'):
            p = os.path.join(root, n)
            print(' ', os.path.relpath(p, dst_base), Image.open(p).size)
