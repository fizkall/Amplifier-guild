"""Phonetic ElevenLabs word timings -> original-text words, subtitle cues, SRT."""
import json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
words = json.load(open(f'{ROOT}/assets/words.json'))['words']
words = [w for w in words if w['type'] == 'word']

# phonetic token (exact, incl. punctuation) -> original spelling
MAP = {
    'Efarsi': 'FRC', 'Eftiysi': 'FTC', 'Süper': 'Super', 'Ep’ine,': 'App’ine,',
    'BumperMidiya’ya': 'BumperMedia’ya', 'BumperMidiya;': 'BumperMedia;',
    'BumperMidiya': 'BumperMedia', 'BumperMidiya’nın': 'BumperMedia’nın',
    'Tiybiye’in': 'The Blue Alliance’ın', 'Skouting': 'Scouting', 'İnterl': 'Intel',
    'Geym': 'Game', 'Menyual': 'Manual', 'sunuvar;': 'sunar;',
}
orig_text = open(f'{ROOT}/script/orijinal_metin.txt').read()
out = []
for w in words:
    out.append({'t': MAP.get(w['text'], w['text']), 's': round(w['start'], 3), 'e': round(w['end'], 3)})

# sanity: rebuilt text must equal original text (whitespace-normalised)
rebuilt = ' '.join(o['t'] for o in out)
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
if norm(rebuilt) != norm(orig_text):
    a, b = norm(rebuilt), norm(orig_text)
    i = next(i for i in range(min(len(a), len(b))) if a[i] != b[i])
    sys.exit(f'MISMATCH at {i}: ...{a[i-40:i+40]}...\n vs ...{b[i-40:i+40]}...')

# subtitle cues: break at sentence ends / long pauses / ~44 chars
cues, cur = [], []
def flush():
    if cur: cues.append({'s': cur[0]['s'], 'e': cur[-1]['e'], 'w': list(range(cur[0]['i'], cur[-1]['i'] + 1))})
    cur.clear()
for i, o in enumerate(out):
    o['i'] = i
    if cur:
        length = len(' '.join(x['t'] for x in cur + [o]))
        gap = o['s'] - cur[-1]['e']
        prev = cur[-1]['t']
        if gap > 0.45 or prev[-1] in '.?!;' or (prev[-1] == ',' and length > 18):
            flush()
        elif length > 30 and not (o['t'][-1] in '.?!;' and length <= 36 and len(o['t']) <= 10):
            k = max((j for j, x in enumerate(cur[:-1]) if x['t'][-1] == ','), default=None)
            if k is not None and k >= 1:
                rest = cur[k + 1:]; del cur[k + 1:]; flush(); cur.extend(rest)
            else:
                flush()
    cur.append(o)
flush()
for c in cues:  # hold each cue until the next starts (max +0.6s)
    pass
for a, b in zip(cues, cues[1:]):
    a['e'] = round(min(b['s'], a['e'] + 0.6), 3)
cues[-1]['e'] = round(cues[-1]['e'] + 1.5, 3)
for o in out: o.pop('i')
json.dump({'words': out, 'cues': cues}, open(f'{ROOT}/src/timeline.json', 'w'), ensure_ascii=False)
open(f'{ROOT}/src/timeline.js', 'w').write('window.TL=' + json.dumps({'words': out, 'cues': cues}, ensure_ascii=False) + ';')

def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02}:{m:02}:{s:02},{ms:03}'
with open(f'{ROOT}/output/bumpermedia_altyazi.srt', 'w') as f:
    for n, c in enumerate(cues, 1):
        f.write(f"{n}\n{ts(c['s'])} --> {ts(c['e'])}\n{' '.join(out[i]['t'] for i in c['w'])}\n\n")
print(len(out), 'words', len(cues), 'cues')
