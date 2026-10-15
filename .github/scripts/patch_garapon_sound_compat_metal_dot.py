from pathlib import Path
import re

VERSION = '20261016-sound-silver-size2'

js_path = Path('garapon-three-v2.js')
js = js_path.read_text(encoding='utf-8')

old = "function ensureGaraponAudio(){if(!soundEnabled)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!garaponAudioCtx)garaponAudioCtx=new AC({latencyHint:'interactive'});return garaponAudioCtx}catch(_){return null}}"
new = "function ensureGaraponAudio(){if(!soundEnabled)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!garaponAudioCtx){try{garaponAudioCtx=new AC({latencyHint:'interactive'})}catch(_){garaponAudioCtx=new AC()}}return garaponAudioCtx}catch(_){return null}}"
if old in js:
    js = js.replace(old, new, 1)
elif new not in js:
    raise SystemExit('audio context anchor not found')

old_dot = '<span class="color-dot" style="--c:'+"'"+'+p.color+'+"'"+';--edge:'+"'"+'+p.edge+'+"'"+'"></span>'
new_dot = '<span class="color-dot'+"'"+'+(p.metallic?'+"' metallic'"+':'+"''"+')+'+"'"+'" style="--c:'+"'"+'+p.color+'+"'"+';--edge:'+"'"+'+p.edge+'+"'"+'"></span>'
if old_dot in js:
    js = js.replace(old_dot, new_dot, 1)
elif 'color-dot'+"'"+'+(p.metallic?' not in js:
    raise SystemExit('color dot anchor not found')

js = re.sub(r"from './garapon-three-machine-v2\.js\?v=[^']+'", "from './garapon-three-machine-v2.js?v=20261016-sound-silver-size1'", js, count=1)
js_path.write_text(js, encoding='utf-8')

html_path = Path('garapon.html')
html = html_path.read_text(encoding='utf-8')
html = re.sub(r"garapon-three-v2\.js\?v=[^\"']+", f"garapon-three-v2.js?v={VERSION}", html)
html_path.write_text(html, encoding='utf-8')

tools_path = Path('tcg-tools.html')
tools = tools_path.read_text(encoding='utf-8')
tools = re.sub(r"garapon\.html\?v=[^\"']+", f"garapon.html?v={VERSION}", tools, count=1)
tools_path.write_text(tools, encoding='utf-8')
