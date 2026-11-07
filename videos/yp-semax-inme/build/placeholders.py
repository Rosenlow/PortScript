"""Stand-in stills (1152x2048) for the four representative photos, used until the real photos exist.
Same geometry as the photo brief (build/photo-prompts.md): subject centered, window light from the left.
Real photos simply replace scenes/main/assets/photos/p1..p4.jpg (any 9:16 size)."""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont
ONLY_MISSING = "--missing-only" in sys.argv
W, H = 1152, 2048
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def bg(c0, c1):
    im = Image.new("RGB", (W, H)); d = ImageDraw.Draw(im)
    for x in range(W):
        k = x / W; d.line([(x, 0), (x, H)], fill=tuple(int(a + (b - a) * k ** 1.3) for a, b in zip(c0, c1)))
    glow = Image.new("L", (W, H), 0); ImageDraw.Draw(glow).ellipse([-500, 200, 500, 1500], fill=110)
    return Image.composite(Image.new("RGB", (W, H), (250, 252, 255)), im, glow.filter(ImageFilter.GaussianBlur(200)))
def tube(d, cx, top, h, w=150):
    d.rounded_rectangle([cx - w // 2, top, cx + w // 2, top + h], radius=w // 2, fill=(222, 228, 232), outline=(250, 250, 250), width=6)
    d.rounded_rectangle([cx - w // 2 + 10, top + h * 0.28, cx + w // 2 - 10, top + h - 10], radius=w // 2 - 10, fill=(118, 14, 28))
    d.rectangle([cx - w // 2 - 4, top - 70, cx + w // 2 + 4, top + 10], fill=(150, 120, 190))           # cap
    d.rectangle([cx - w // 2 + 4, top + h * 0.38, cx + w // 2 - 4, top + h * 0.78], fill=(246, 246, 244))  # white label
def label(im, tag, text):
    d = ImageDraw.Draw(im); f1 = ImageFont.truetype(F, 46); f2 = ImageFont.truetype(F, 34)
    d.rounded_rectangle([90, 470, W - 90, 700], radius=24, fill=(20, 22, 26))
    d.text((W // 2, 535), f"YER TUTUCU · {tag}", font=f1, fill=(255, 210, 90), anchor="mm")
    d.text((W // 2, 625), text, font=f2, fill=(240, 240, 240), anchor="mm")
def save(im, n):
    if ONLY_MISSING and os.path.exists(f"assets/photos/{n}.jpg"): return
    im.save(f"scenes/main/assets/photos/{n}.jpg", quality=90)

im = bg((236, 240, 244), (120, 128, 136)); d = ImageDraw.Draw(im)
d.rectangle([0, 1820, W, H], fill=(235, 236, 238))
tube(d, W // 2, 760, 820)
d.rounded_rectangle([W // 2 + 60, 1050, W // 2 + 330, 1240], radius=90, fill=(232, 234, 238))  # gloved fingers
d.rounded_rectangle([W // 2 - 300, 1080, W // 2 - 60, 1200], radius=60, fill=(226, 229, 233))
im = im.filter(ImageFilter.GaussianBlur(3)); label(im, "P1", "Eldivenli el kan tüpünü ışığa kaldırıyor"); save(im, "p1")

im = bg((234, 236, 232), (140, 136, 128)); d = ImageDraw.Draw(im)
d.rectangle([0, 1000, W, 1080], fill=(196, 202, 208)); d.rectangle([0, 1010, W, 1024], fill=(245, 246, 248))
d.rounded_rectangle([W // 2 - 190, 900, W // 2 + 190, 1180], radius=110, fill=(214, 172, 150))   # hand around bar
d.rounded_rectangle([W // 2 - 120, 1150, W // 2 + 120, 1500], radius=60, fill=(170, 172, 176))   # sleeve
im = im.filter(ImageFilter.GaussianBlur(3)); label(im, "P2", "Hastanın eli paralel barı kavrıyor"); save(im, "p2")

im = bg((236, 240, 244), (118, 126, 134)); d = ImageDraw.Draw(im)
d.rounded_rectangle([W // 2 - 50, 560, W // 2 + 50, 1500], radius=40, fill=(245, 245, 245))     # pipette body
d.polygon([(W // 2 - 20, 1500), (W // 2 + 20, 1500), (W // 2, 1760)], fill=(236, 238, 240))
d.rounded_rectangle([W // 2 - 190, 900, W // 2 + 190, 1180], radius=110, fill=(230, 233, 237))   # gloved fist
d.rounded_rectangle([W // 2 - 120, 1150, W // 2 + 120, 1500], radius=60, fill=(232, 236, 240))
im = im.filter(ImageFilter.GaussianBlur(3)); label(im, "P3", "Eldivenli el pipeti kavrıyor"); save(im, "p3")

im = bg((238, 240, 242), (150, 156, 162)); d = ImageDraw.Draw(im)
d.rectangle([0, 1500, W, H], fill=(226, 228, 230)); d.rectangle([180, 1380, W - 180, 1520], fill=(248, 248, 248))
tube(d, W // 2, 640, 900, 170)
im = im.filter(ImageFilter.GaussianBlur(2.5)); label(im, "P4", "Kan tüpü yakın plan · etiket önde"); save(im, "p4")
print("placeholders written")
