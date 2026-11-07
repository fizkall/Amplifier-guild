"""One-off: remove the top light bars / light cones from scene 1."""
import os, re
src = os.path.join(os.path.dirname(__file__), '..', 'src')
p = os.path.join(src, 'scenes.js'); s = open(p).read()
i = s.index('  <div class="lights">'); j = s.index('\n', i) + 1
s = s[:i] + s[j:]
i = s.index('    this.lights.forEach((l, i) => {'); j = s.index('    const tp = pe(t, .05, 1.1, E.out5)')
s = s[:i] + s[j:]
s = s.replace("this.lights = $$('.lights i', el); ", '')
assert 'lights' not in s, 'lights still referenced'
open(p, 'w').write(s)
p = os.path.join(src, 'style.css'); s = open(p).read()
s = re.sub(r"\.lights i\{[^}]*\}\n\.lights i::after\{[^}]*\}\n", '', s)
assert '.lights' not in s
open(p, 'w').write(s)
print('lights removed')
