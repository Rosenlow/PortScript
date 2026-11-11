# python3 build/crop.py out.jpg x0,y0,x1,y1(fractions) scale img...
import sys
from PIL import Image
out, box, sc, files = sys.argv[1], [float(v) for v in sys.argv[2].split(',')], float(sys.argv[3]), sys.argv[4:]
ims = []
for f in files:
    im = Image.open(f); w, h = im.size; im = im.crop((int(box[0]*w), int(box[1]*h), int(box[2]*w), int(box[3]*h))); ims.append(im.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS))
s = Image.new('RGB', (sum(i.width for i in ims), ims[0].height)); x = 0
for i in ims: s.paste(i, (x, 0)); x += i.width
s.save(out, quality=90)
