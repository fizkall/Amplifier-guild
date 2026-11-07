"""Swap the cyan/purple cyber palette for the Threads-style neutral black theme."""
import os, re
root=os.path.join(os.path.dirname(__file__),'..','src')
MAP=[  # order matters
 ('#7befff','#ffffff'),('#5ce6ff','#f3f5f7'),('#00D4FF','#f3f5f7'),('#00d4ff','#f3f5f7'),
 ('#A855F7','#9a9a9a'),('#a855f7','#9a9a9a'),('#8B5CF6','#8a8a8a'),('#c084fc','#cfcfcf'),('#d8b4fe','#d6d6d6'),
 ('#7c3aed','#3a3a3a'),('#2e1065','#141414'),('#9fd8ff','#e6e6e6'),('#c4b5fd','#cfcfcf'),
 ('0,212,255','243,245,247'),('139,92,246','150,150,150'),('168,85,247','170,170,170'),
 ('120,230,255','255,255,255'),('140,240,255','255,255,255'),('120,235,255','255,255,255'),('200,230,255','255,255,255'),
 ('rgba(${lerp(139, 0, a) | 0},${lerp(92, 212, a) | 0},255,','rgba(${lerp(120, 245, a) | 0},${lerp(120, 245, a) | 0},${lerp(120, 245, a) | 0},'),
]
for fn in ['style.css','scenes.js']:
    p=os.path.join(root,fn); s=open(p).read()
    s=s.replace('color:#5ce6ff">0','color:#6aa8ff">0')  # keep blue-alliance score readable as "blue"
    for a,b in MAP: s=s.replace(a,b)
    if fn=='style.css':
        rep=[
         ('--bg0:#030308; --bg1:#07070d;','--bg0:#101010; --bg1:#181818;'),
         ('--tx:#f2f3f7; --tx2:#9d9daa; --tx3:#5b5b68;','--tx:#f3f5f7; --tx2:#a8a8a8; --tx3:#6b6b6b;'),
         ('--br:rgba(255,255,255,.09); --br2:rgba(255,255,255,.16);','--br:rgba(243,245,247,.12); --br2:rgba(243,245,247,.2);'),
         ('.blob{position:absolute;','.blob{display:none;position:absolute;'),
         ("""  background:linear-gradient(140deg,rgba(255,255,255,.085),rgba(255,255,255,.02) 55%,rgba(150,150,150,.05));
  border:1px solid rgba(255,255,255,.13); border-radius:22px;""","""  background:linear-gradient(160deg,rgba(30,30,30,.92),rgba(24,24,24,.9));
  border:1px solid rgba(243,245,247,.15); border-radius:22px;"""),
         ("box-shadow:0 30px 80px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 40px rgba(243,245,247,.04);","box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);"),
         ("box-shadow:0 0 28px rgba(243,245,247,.35),0 0 70px rgba(150,150,150,.22)}","box-shadow:0 0 22px rgba(255,255,255,.12),0 0 60px rgba(255,255,255,.05)}"),
         ("text-shadow:0 0 24px rgba(243,245,247,.55),0 0 60px rgba(150,150,150,.35)}","text-shadow:0 0 22px rgba(255,255,255,.28),0 0 60px rgba(255,255,255,.1)}"),
         ("background:linear-gradient(92deg,#f3f5f7 0%,#f3f5f7 30%,#9a9a9a 75%,#cfcfcf);","background:linear-gradient(92deg,#ffffff 0%,#f3f5f7 40%,#b8b8b8 80%,#d9d9d9);"),
         ("""  background:linear-gradient(140deg,rgba(10,12,22,.72),rgba(14,10,28,.62));border:1px solid rgba(255,255,255,.12);
  box-shadow:0 20px 50px rgba(0,0,0,.5),0 0 0 1px rgba(243,245,247,.06);backdrop-filter:blur(10px)}""","""  background:rgba(24,24,24,.92);border:1px solid rgba(243,245,247,.15);
  box-shadow:0 20px 50px rgba(0,0,0,.55)}"""),
         ("#subsIn span{transition:none;color:rgba(242,243,247,.42)}","#subsIn span{transition:none;color:#777777}"),
         ("#subsIn span.cur{color:#ffffff;text-shadow:0 0 18px rgba(243,245,247,.8)}","#subsIn span.cur{color:#ffffff;text-shadow:0 0 16px rgba(255,255,255,.45)}"),
         ("#vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.75) 100%)}","#vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,.5) 100%)}"),
         ("#scan{position:absolute;inset:0;pointer-events:none;opacity:.22;","#scan{position:absolute;inset:0;pointer-events:none;opacity:.08;"),
         ("background-image:linear-gradient(rgba(243,245,247,.28) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(150,150,150,.25) 1.5px,transparent 1.5px);","background-image:linear-gradient(rgba(243,245,247,.07) 1.5px,transparent 1.5px),linear-gradient(90deg,rgba(243,245,247,.06) 1.5px,transparent 1.5px);"),
         ("#flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.9),rgba(150,150,150,.4) 40%,transparent 75%);","#flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.35),rgba(255,255,255,.08) 40%,transparent 75%);"),
         (".corner{position:absolute;width:56px;height:56px;border:2.5px solid var(--cyan);filter:drop-shadow(0 0 8px var(--cyan))}",".corner{position:absolute;width:56px;height:56px;border:2px solid rgba(243,245,247,.55)}"),
         (".logo-mark{display:block;background:linear-gradient(135deg,#ffffff,#f3f5f7 40%,#9a9a9a);",".logo-mark{display:block;background:#f3f5f7;"),
        ]
        for a,b in rep:
            assert a in s, a[:80]; s=s.replace(a,b)
    else:
        rep=[("BG.fillStyle = i % 3 ? `rgba(243,245,247,${a})` : `rgba(170,170,170,${a})`;","BG.fillStyle = `rgba(243,245,247,${a * .35})`;"),
             ('filter:drop-shadow(0 0 30px rgba(243,245,247,.7)) drop-shadow(0 0 80px rgba(150,150,150,.5))','filter:drop-shadow(0 0 30px rgba(255,255,255,.25))'),
             ('filter:drop-shadow(0 0 30px rgba(243,245,247,.7)) drop-shadow(0 0 90px rgba(150,150,150,.5))','filter:drop-shadow(0 0 30px rgba(255,255,255,.25))')]
        for a,b in rep:
            assert a in s, a[:80]; s=s.replace(a,b)
    open(p,'w').write(s)
# orb: neutral silver sphere
p=os.path.join(root,'style.css'); s=open(p).read()
s=re.sub(r"\.orb\{[^}]*\}", ".orb{border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#e9e9e9 18%,#a8a8a8 45%,#3a3a3a 78%,#151515);box-shadow:0 0 40px rgba(255,255,255,.25),0 0 120px rgba(255,255,255,.08)}", s)
open(p,'w').write(s)
print('palette ok')
