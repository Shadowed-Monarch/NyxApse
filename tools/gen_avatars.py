#!/usr/bin/env python3
"""Draws the 30 profile icons (original, flat style) and writes js/avatars.js.  Run: python3 tools/gen_avatars.py"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SK = ['#f3d2b3', '#e0ac7e', '#b9794f', '#8a5636']
def face(skin, hair_back='', hair_front='', extra='', shirt='#4a6fa5', mouth='#7a3b2e'):
    return (hair_back + '<path d="M10 64 Q32 42 54 64Z" fill="%s"/>' % shirt + '<rect x="27" y="44" width="10" height="8" fill="%s"/>' % skin +
            '<circle cx="32" cy="33" r="15" fill="%s"/>' % skin + hair_front +
            '<circle cx="26.5" cy="34" r="1.9" fill="#222"/><circle cx="37.5" cy="34" r="1.9" fill="#222"/>' +
            '<path d="M27 41 Q32 45.5 37 41" fill="none" stroke="%s" stroke-width="1.8" stroke-linecap="round"/>' % mouth + extra)
ICONS = []
def add(name, bg, body): ICONS.append((name, '<defs><clipPath id="avc"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#avc)"><circle cx="32" cy="32" r="32" fill="%s"/>' % bg + body + '</g>'))
# ---- people ----
add('Boy', '#bfe3ff', face(SK[0], '', '<path d="M17 32 Q15 13 32 13 Q49 13 47 32 Q43 22 32 21 Q21 22 17 32Z" fill="#5b3a1e"/>', shirt='#ff7043'))
add('Boy with cap', '#d7f5d0', face(SK[1], '', '<path d="M16 29 Q32 6 48 29Z" fill="#d32f2f"/><path d="M42 27 L58 31 L42 33Z" fill="#b71c1c"/>', shirt='#3f51b5'))
add('Girl with pigtails', '#ffd9ec', face(SK[0], '<circle cx="14" cy="40" r="6" fill="#8b4513"/><circle cx="50" cy="40" r="6" fill="#8b4513"/>', '<path d="M17 32 Q15 12 32 12 Q49 12 47 32 Q42 20 32 20 Q22 20 17 32Z" fill="#8b4513"/><circle cx="16" cy="33" r="2.6" fill="#ff4081"/><circle cx="48" cy="33" r="2.6" fill="#ff4081"/>', shirt='#ab47bc', mouth='#c2185b'))
add('Girl with bob', '#fff0b8', face(SK[2], '', '<path d="M15 42 Q11 11 32 11 Q53 11 49 42 L44 42 Q45 23 32 22 Q19 23 20 42Z" fill="#1c1c1c"/>', shirt='#26a69a'))
add('Man with beard', '#e1d5ff', face(SK[1], '', '<path d="M17 31 Q16 14 32 14 Q48 14 47 31 Q42 23 32 22 Q22 23 17 31Z" fill="#2b1b10"/><path d="M18 36 Q32 62 46 36 Q46 47 32 53 Q18 47 18 36Z" fill="#2b1b10"/>', shirt='#37474f'))
add('Man with glasses', '#ffe0b2', face(SK[3], '', '<path d="M17 30 Q17 14 32 14 Q47 14 47 30 Q42 22 32 22 Q22 22 17 30Z" fill="#111"/>', '<circle cx="26.5" cy="34" r="5" fill="none" stroke="#222" stroke-width="1.6"/><circle cx="37.5" cy="34" r="5" fill="none" stroke="#222" stroke-width="1.6"/><path d="M31.5 34 H32.5" stroke="#222" stroke-width="1.6"/>', shirt='#c62828'))
add('Woman with long hair', '#c8f0f0', face(SK[2], '<path d="M13 62 Q6 14 32 11 Q58 14 51 62Z" fill="#4e2a14"/>', '<path d="M17 31 Q18 16 32 15 Q46 16 47 31 Q40 22 32 22 Q24 22 17 31Z" fill="#4e2a14"/>', shirt='#ec407a', mouth='#c2185b'))
add('Woman with headscarf', '#ffe4d6', '<path d="M12 46 Q8 8 32 8 Q56 8 52 46 Q52 62 32 63 Q12 62 12 46Z" fill="#7e57c2"/><path d="M8 64 Q32 40 56 64Z" fill="#7e57c2"/><ellipse cx="32" cy="34" rx="13" ry="15" fill="%s"/><circle cx="26.5" cy="34" r="1.9" fill="#222"/><circle cx="37.5" cy="34" r="1.9" fill="#222"/><path d="M27 41 Q32 45.5 37 41" fill="none" stroke="#a23b3b" stroke-width="1.8" stroke-linecap="round"/>' % SK[1])
# ---- shadow ----
add('Ninja', '#2b2f3a', '<circle cx="32" cy="34" r="20" fill="#0d0d12"/><rect x="14" y="29" width="36" height="12" rx="6" fill="#e8cfa8"/><circle cx="25" cy="35" r="2.2" fill="#111"/><circle cx="39" cy="35" r="2.2" fill="#111"/><path d="M13 27 H51 V32 H13Z" fill="#d32f2f"/><path d="M51 28 L60 24 L58 33Z" fill="#d32f2f"/>')
add('Ghost', '#37396b', '<path d="M17 52 V30 Q17 12 32 12 Q47 12 47 30 V52 L41 47 L36 52 L30 47 L25 52 L21 47Z" fill="#eef0ff"/><ellipse cx="26" cy="31" rx="3" ry="4" fill="#222"/><ellipse cx="38" cy="31" rx="3" ry="4" fill="#222"/><ellipse cx="32" cy="41" rx="3.5" ry="4.5" fill="#222"/>')
add('Reaper', '#241b2e', '<path d="M10 62 Q8 8 32 8 Q56 8 54 62Z" fill="#111"/><circle cx="32" cy="32" r="13" fill="#ececec"/><ellipse cx="27" cy="31" rx="3.4" ry="4.4" fill="#111"/><ellipse cx="37" cy="31" rx="3.4" ry="4.4" fill="#111"/><path d="M30.5 37 L32 34.5 L33.5 37Z" fill="#111"/><path d="M26 42 H38 M29 40 V44 M32 40 V44 M35 40 V44" stroke="#111" stroke-width="1.4"/>')
add('Raven', '#4a5a7a', '<ellipse cx="30" cy="38" rx="17" ry="12" fill="#14141c"/><circle cx="42" cy="26" r="9" fill="#14141c"/><path d="M49 25 L60 28 L49 30Z" fill="#e0a82e"/><circle cx="44" cy="24.5" r="1.8" fill="#fff"/><path d="M14 38 Q4 46 6 54 Q16 50 22 44Z" fill="#0b0b11"/><path d="M26 48 V56 M34 48 V56" stroke="#e0a82e" stroke-width="2"/>')
add('Bat', '#2e1f3f', '<path d="M32 26 L8 16 Q12 28 18 32 Q22 28 26 36 Q29 31 32 38 Q35 31 38 36 Q42 28 46 32 Q52 28 56 16Z" fill="#0f0f14"/><path d="M26 22 L28 14 L31 22Z M33 22 L36 14 L38 22Z" fill="#0f0f14"/><circle cx="29" cy="27" r="1.8" fill="#ff3d3d"/><circle cx="35" cy="27" r="1.8" fill="#ff3d3d"/>')
add('Shadow hood', '#171b26', '<path d="M10 64 Q8 8 32 8 Q56 8 54 64Z" fill="#05060a"/><ellipse cx="32" cy="32" rx="14" ry="16" fill="#0b0d14"/><ellipse cx="26" cy="32" rx="3.6" ry="2" fill="#4dd9ff"/><ellipse cx="38" cy="32" rx="3.6" ry="2" fill="#4dd9ff"/>')
# ---- fire ----
add('Flame', '#3b1d14', '<path d="M32 6 Q46 22 46 38 Q46 56 32 58 Q18 56 18 38 Q18 28 26 18 Q26 30 34 31 Q28 18 32 6Z" fill="#ff5a1f"/><path d="M32 28 Q40 38 40 45 Q40 54 32 54 Q24 54 24 45 Q24 38 32 28Z" fill="#ffc107"/>')
add('Fire orb', '#2a1a2e', '<circle cx="32" cy="36" r="19" fill="#ff3d00"/><circle cx="32" cy="36" r="13" fill="#ff9800"/><circle cx="32" cy="36" r="7" fill="#ffeb3b"/><path d="M20 22 Q22 12 28 8 Q28 16 32 18 Q36 12 36 6 Q46 14 44 24Z" fill="#ff5a1f"/>')
add('Phoenix', '#4a1f1f', '<path d="M32 22 Q10 18 6 40 Q18 34 28 40Z" fill="#ff7a18"/><path d="M32 22 Q54 18 58 40 Q46 34 36 40Z" fill="#ff7a18"/><ellipse cx="32" cy="38" rx="8" ry="13" fill="#e53935"/><circle cx="32" cy="22" r="7" fill="#e53935"/><path d="M32 26 L36 31 L28 31Z" fill="#ffd54f"/><circle cx="30" cy="21" r="1.4" fill="#fff"/><circle cx="34" cy="21" r="1.4" fill="#fff"/><path d="M26 50 Q32 62 38 50Q32 54 26 50Z" fill="#ffc107"/><path d="M28 14 Q32 6 36 14Z" fill="#ffc107"/>')
add('Volcano', '#3a2a2a', '<path d="M6 56 L24 24 H40 L58 56Z" fill="#5d4037"/><path d="M24 24 H40 L37 30 L32 26 L27 30Z" fill="#ff5722"/><path d="M30 30 L28 42 M34 30 L37 46" stroke="#ff7043" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="14" r="5" fill="#9e9e9e" opacity=".8"/><circle cx="36" cy="9" r="4" fill="#bdbdbd" opacity=".7"/><circle cx="46" cy="16" r="2" fill="#ffab40"/>')
add('Fire skull', '#241524', '<path d="M32 4 Q42 14 40 22 Q38 16 34 17 Q36 10 32 4Z" fill="#ff5a1f"/><path d="M22 14 Q20 8 24 4 Q24 12 28 14Z" fill="#ffc107"/><path d="M16 36 Q16 18 32 18 Q48 18 48 36 Q48 42 44 44 V52 H20 V44 Q16 42 16 36Z" fill="#efe6d8"/><ellipse cx="25" cy="35" rx="4" ry="5" fill="#222"/><ellipse cx="39" cy="35" rx="4" ry="5" fill="#222"/><path d="M30 43 L32 40 L34 43Z" fill="#222"/><path d="M24 52 V46 M28 52 V46 M32 52 V46 M36 52 V46 M40 52 V46" stroke="#222" stroke-width="1.4"/>')
add('Lava drop', '#2b1b1b', '<path d="M32 6 Q50 28 50 40 Q50 58 32 58 Q14 58 14 40 Q14 28 32 6Z" fill="#e53935"/><path d="M32 18 Q42 32 42 40 Q42 50 32 50 Q22 50 22 40 Q22 32 32 18Z" fill="#ff7043"/><ellipse cx="25" cy="36" rx="3" ry="6" fill="#ffd180" opacity=".8"/>')
# ---- matching the games ----
add('Brain', '#ffd6e8', '<circle cx="24" cy="30" r="12" fill="#ff8fb1"/><circle cx="40" cy="30" r="12" fill="#ff8fb1"/><circle cx="28" cy="42" r="10" fill="#ff8fb1"/><circle cx="38" cy="42" r="10" fill="#ff8fb1"/><path d="M32 20 V50 M20 28 Q26 32 22 38 M44 28 Q38 32 42 38" fill="none" stroke="#c2185b" stroke-width="2" stroke-linecap="round"/>')
add('Dots', '#1c2a44', ''.join('<circle cx="%d" cy="%d" r="%s" fill="%s"/>' % (x, y, 6 if (x, y) == (32, 32) else 3.6, '#ff77ff' if (x, y) == (32, 32) else '#8da2c8') for x in (18, 32, 46) for y in (18, 32, 46)))
add('Bubbles', '#133a4d', '<circle cx="24" cy="38" r="13" fill="#4dd0e1" opacity=".85"/><circle cx="42" cy="26" r="9" fill="#80deea" opacity=".85"/><circle cx="44" cy="46" r="6" fill="#b2ebf2" opacity=".9"/><circle cx="20" cy="33" r="3.5" fill="#fff" opacity=".7"/><circle cx="40" cy="23" r="2.5" fill="#fff" opacity=".7"/>')
add('Target', '#3a1a1a', '<circle cx="32" cy="32" r="22" fill="#f5f5f5"/><circle cx="32" cy="32" r="16" fill="#e53935"/><circle cx="32" cy="32" r="10" fill="#f5f5f5"/><circle cx="32" cy="32" r="4.5" fill="#e53935"/>')
add('Bolt', '#26204a', '<path d="M36 6 L16 36 H29 L25 58 L48 26 H34Z" fill="#ffd600"/>')
add('Stopwatch', '#14363a', '<circle cx="32" cy="36" r="20" fill="#eceff1"/><circle cx="32" cy="36" r="16" fill="#fff"/><path d="M32 36 L32 24 M32 36 L40 40" stroke="#26a69a" stroke-width="3" stroke-linecap="round"/><rect x="28" y="8" width="8" height="6" rx="2" fill="#eceff1"/><path d="M47 18 L52 13" stroke="#eceff1" stroke-width="4" stroke-linecap="round"/>')
add('Sequence', '#2c1f45', '<path d="M16 46 L32 32 L48 18" fill="none" stroke="#2ec4b6" stroke-width="4" stroke-linecap="round"/><circle cx="16" cy="46" r="8" fill="#2ec4b6"/><circle cx="32" cy="32" r="9" fill="#2ec4b6"/><circle cx="48" cy="18" r="10" fill="#2ec4b6"/><path d="M16 46 m-2 0 h4" stroke="#14323a" stroke-width="2"/><path d="M31 32 h2 M29 32 h6" stroke="#14323a" stroke-width="2"/>')
add('N-Back', '#1d2330', ''.join('<rect x="%d" y="%d" width="14" height="14" rx="4" fill="%s"/>' % (11 + c * 17, 11 + r * 17, '#ff77ff' if (r, c) == (1, 1) else '#4b5568') for r in range(3) for c in range(3)))
add('Rocket', '#16213a', '<path d="M32 6 Q46 18 44 40 L32 48 L20 40 Q18 18 32 6Z" fill="#eceff1"/><circle cx="32" cy="26" r="6" fill="#4fc3f7"/><path d="M20 38 L10 50 L22 46Z M44 38 L54 50 L42 46Z" fill="#e53935"/><path d="M26 50 Q32 62 38 50Z" fill="#ff9800"/>')
add('Crown', '#34264f', '<path d="M8 48 L12 20 L24 32 L32 14 L40 32 L52 20 L56 48Z" fill="#ffc107"/><rect x="8" y="48" width="48" height="7" rx="2" fill="#ff9800"/><circle cx="12" cy="20" r="3.4" fill="#ffecb3"/><circle cx="32" cy="14" r="3.4" fill="#ffecb3"/><circle cx="52" cy="20" r="3.4" fill="#ffecb3"/><circle cx="32" cy="40" r="3.4" fill="#e53935"/>')
assert len(ICONS) == 30, len(ICONS)
ids = ['i%02d' % (n + 1) for n in range(30)]
body = ',\n  '.join("%s: '%s'" % (i, svg) for i, (n, svg) in zip(ids, ICONS))
names = ','.join("%s:'%s'" % (i, n) for i, (n, s) in zip(ids, ICONS))
open(os.path.join(ROOT, 'js/avatars.js'), 'w', encoding='utf-8').write("""/* avatars.js - GENERATED by tools/gen_avatars.py. 30 original profile icons, drawn as SVG (no images to load).
   A profile avatar is either an emoji or one of these ids (i01..i30). */
const NXAv = (() => {
 const ICONS = {
  %s
 };
 const NAMES = {%s};
 const ids = Object.keys(ICONS);
 const isIcon = a => Object.prototype.hasOwnProperty.call(ICONS, a);
 const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
 // markup for an avatar: an inline icon, or the emoji as text
 const html = (a, size) => isIcon(a) ? '<svg class="avs" viewBox="0 0 64 64" width="' + (size || 24) + '" height="' + (size || 24) + '" role="img" aria-label="' + NAMES[a] + '">' + ICONS[a] + '</svg>' : esc(a);
 return {ids, isIcon, html, NAMES};
})();
window.NXAv = NXAv;
""" % (body, names))
print('wrote', len(ICONS), 'icons')
