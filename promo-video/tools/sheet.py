import sys
from PIL import Image
ts=sys.argv[2:]; out=sys.argv[1]
W,H=432,768; cols=4; rows=(len(ts)+3)//4
im=Image.new('RGB',(W*cols,H*rows))
for i,t in enumerate(ts): im.paste(Image.open(f'output/frames/shot_{float(t):.1f}.jpg').resize((W,H)),((i%cols)*W,(i//cols)*H))
im.save(out,quality=82)
