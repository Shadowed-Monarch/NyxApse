#!/usr/bin/env python3
"""Set the NyxApse version everywhere in one go.

Usage (from the project folder):   python3 tools/set_version.py 1.0.0 1
                                   python3 tools/set_version.py <versionName> <versionCode>

versionName = what people see (1.0.0, 1.1.0 ...).  versionCode = a whole number that must go UP on every release.
"""
import glob, os, re, sys

if len(sys.argv) != 3 or not re.fullmatch(r"\d+(\.\d+){1,2}", sys.argv[1]) or not sys.argv[2].isdigit():
    sys.exit(__doc__)
name, code = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
changed = []

def edit(path, pairs):
    s = open(path, encoding="utf-8").read(); o = s
    for pat, new in pairs:
        s, n = re.subn(pat, new, s)
        if n == 0: sys.exit("Could not find the version in " + path + " (pattern: " + pat + ")")
    if s != o:
        open(path, "w", encoding="utf-8").write(s); changed.append(path)

edit("android/app/build.gradle", [(r"versionCode \d+", "versionCode " + code), (r"versionName '[^']*'", "versionName '" + name + "'")])
edit("js/theme.js", [(r"BT_BUILD = '[^']*'", "BT_BUILD = '" + name + "'")])
edit("js/game.js", [(r"BT\.build = '[^']*'", "BT.build = '" + name + "'")])
edit("js/shell.js", [(r"shell: '[^']*'", "shell: '" + name + "'"), (r"!== '[^']*'\)\) \{ const d", "!== '" + name + "')) { const d")])
edit("js/leaderboard.js", [(r"build: '[^']*'", "build: '" + name + "'")])
edit("about.html", [(r"NyxApse v[0-9.]+", "NyxApse v" + name)])
for f in glob.glob("*.html"):                                    # new file addresses so browsers fetch the new files
    edit(f, [(r"\?v=[0-9A-Za-z.]+", "?v=" + name)])
edit("sw.js", [(r"\?v=[0-9A-Za-z.]+", "?v=" + name), (r"bt-v[0-9A-Za-z.]+", "bt-v" + name)])
log = "fastlane/metadata/android/en-US/changelogs/" + code + ".txt"
if not os.path.exists(log):
    open(log, "w", encoding="utf-8").write("Version " + name + ".\n"); changed.append(log + " (new: edit it to list what changed)")
print("Version set to", name, "(versionCode " + code + "). Files changed:")
for c in sorted(set(changed)): print("  -", c)
print("\nStill to do by hand: README.md if it mentions a version, and fdroid/*.yml (versionName, versionCode, commit) when you submit.")
