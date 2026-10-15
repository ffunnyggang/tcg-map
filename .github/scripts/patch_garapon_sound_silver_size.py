from pathlib import Path
import re

VERSION = "20261016-sound-silver-size1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor not found")


# -----------------------------------------------------------------------------
# 1) Main garapon behavior: reliable Web Audio unlock, silver palette, metallic UI.
# -----------------------------------------------------------------------------
js_path = Path("garapon-three-v2.js")
js = js_path.read_text(encoding="utf-8")

js = re.sub(
    r"from './garapon-three-machine-v2\.js(?:\?v=[^']*)?'",
    f"from './garapon-three-machine-v2.js?v={VERSION}'",
    js,
    count=1,
)

js = replace_once(
    js,
    " {key:'gold',name:'골드',color:'#e1b43e',edge:'#a87913'},\n {key:'red',name:'레드',color:'#ef5c68',edge:'#b92e3b'},",
    " {key:'gold',name:'골드',color:'#e1b43e',edge:'#a87913',metallic:true},\n {key:'silver',name:'실버',color:'#c8cdd5',edge:'#747b86',metallic:true},\n {key:'red',name:'레드',color:'#ef5c68',edge:'#b92e3b'},",
    "silver palette",
)

js = js.replace("entries.slice(0,9)", "entries.slice(0,10)")
js = replace_once(
    js,
    "function colorOf(key){return PALETTE.find(x=>x.key===key)||PALETTE[7]}",
    "function colorOf(key){return PALETTE.find(x=>x.key===key)||PALETTE.find(x=>x.key==='white')}",
    "palette fallback",
)

sound_start = js.index("let garaponAudioCtx=null,garaponNoiseBuffer=null,lastGaraponRattleAt=0;")
sound_end_marker = "function toggleSound(){soundEnabled=!soundEnabled;try{localStorage.setItem(SOUND_KEY,soundEnabled?'1':'0')}catch(_){}if(soundEnabled)ensureGaraponAudio();renderSoundToggle();showToast(soundEnabled?'사운드를 켰어요.':'사운드를 껐어요.')}"
sound_end = js.index(sound_end_marker, sound_start) + len(sound_end_marker)
new_sound = r'''let garaponAudioCtx=null,garaponNoiseBuffer=null,lastGaraponRattleAt=0,audioUnlockPromise=null;
function ensureGaraponAudio(){if(!soundEnabled)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!garaponAudioCtx)garaponAudioCtx=new AC({latencyHint:'interactive'});return garaponAudioCtx}catch(_){return null}}
function unlockGaraponAudio(){const ctx=ensureGaraponAudio();if(!ctx)return Promise.resolve(null);if(ctx.state==='running')return Promise.resolve(ctx);if(audioUnlockPromise)return audioUnlockPromise;try{audioUnlockPromise=Promise.resolve(ctx.resume?.()).then(()=>{try{const buffer=ctx.createBuffer(1,1,ctx.sampleRate),source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.00001;source.connect(gain).connect(ctx.destination);source.start(0)}catch(_){}return ctx}).catch(()=>ctx).finally(()=>{audioUnlockPromise=null});return audioUnlockPromise}catch(_){audioUnlockPromise=null;return Promise.resolve(ctx)}}
function getGaraponNoise(ctx){if(garaponNoiseBuffer&&garaponNoiseBuffer.sampleRate===ctx.sampleRate)return garaponNoiseBuffer;const length=Math.max(1,Math.floor(ctx.sampleRate*.16)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){const white=Math.random()*2-1;last=last*.66+white*.34;data[i]=last}garaponNoiseBuffer=buffer;return buffer}
function playGaraponRattle(remaining,motion=.12,mode='draw'){const ctx=ensureGaraponAudio();if(!ctx)return;if(ctx.state==='suspended')unlockGaraponAudio();const nowMs=performance.now(),count=Math.max(1,Number(remaining)||1),density=Math.min(1,Math.log2(count+1)/7),interval=78-density*35;if(nowMs-lastGaraponRattleAt<interval)return;lastGaraponRattleAt=nowMs;const now=ctx.currentTime,strength=Math.min(1,Math.max(.18,(Number(motion)||.12)*4.5)),grains=Math.max(1,Math.min(6,Math.round(1+density*4.4))),base=mode==='mix'?650:840;for(let i=0;i<grains;i++){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),start=now+i*(.004+Math.random()*.006),duration=.03+density*.045+Math.random()*.022;source.buffer=getGaraponNoise(ctx);filter.type='bandpass';filter.frequency.setValueAtTime(base-density*220+Math.random()*420,start);filter.Q.setValueAtTime(1.7+Math.random()*1.8,start);const peak=(.018+density*.034)*strength/Math.sqrt(grains);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0003,peak),start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter).connect(gain).connect(ctx.destination);source.start(start);source.stop(start+duration+.014)}}
function playBallReleaseSound(remaining){const ctx=ensureGaraponAudio();if(!ctx)return;if(ctx.state==='suspended')unlockGaraponAudio();const now=ctx.currentTime,count=Math.max(1,Number(remaining)||1),density=Math.min(1,Math.log2(count+1)/7);const latch=ctx.createOscillator(),latchGain=ctx.createGain();latch.type='triangle';latch.frequency.setValueAtTime(430+density*90,now);latch.frequency.exponentialRampToValueAtTime(145,now+.075);latchGain.gain.setValueAtTime(.0001,now);latchGain.gain.exponentialRampToValueAtTime(.065,now+.004);latchGain.gain.exponentialRampToValueAtTime(.0001,now+.095);latch.connect(latchGain).connect(ctx.destination);latch.start(now);latch.stop(now+.1);const roll=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();roll.buffer=getGaraponNoise(ctx);filter.type='bandpass';filter.frequency.setValueAtTime(720+density*140,now+.035);filter.Q.setValueAtTime(2.1,now+.035);gain.gain.setValueAtTime(.0001,now+.03);gain.gain.exponentialRampToValueAtTime(.052,now+.06);gain.gain.exponentialRampToValueAtTime(.0001,now+.28);roll.connect(filter).connect(gain).connect(ctx.destination);roll.start(now+.03);roll.stop(now+.3)}
function playBallLandSound(){const ctx=ensureGaraponAudio();if(!ctx)return;if(ctx.state==='suspended')unlockGaraponAudio();const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(560,now);osc.frequency.exponentialRampToValueAtTime(235,now+.12);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.052,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.16);osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+.17)}
function renderSoundToggle(){if(!els.sound)return;els.sound.classList.toggle('off',!soundEnabled);els.sound.setAttribute('aria-pressed',String(soundEnabled));els.sound.textContent=soundEnabled?'🔊 사운드 ON':'🔇 사운드 OFF'}
function toggleSound(){soundEnabled=!soundEnabled;try{localStorage.setItem(SOUND_KEY,soundEnabled?'1':'0')}catch(_){}if(soundEnabled)unlockGaraponAudio().then(()=>playBallLandSound());renderSoundToggle();showToast(soundEnabled?'사운드를 켰어요.':'사운드를 껐어요.')}'''
js = js[:sound_start] + new_sound + js[sound_end:]

# Add metallic visual classes without changing non-metal colors.
js = js.replace(
    "'<span class=\"color-dot\" style=\"--c:'+p.color+';--edge:'+p.edge+'\"></span>",
    "'<span class=\"color-dot'+(p.metallic?' metallic':'')+'\" style=\"--c:'+p.color+';--edge:'+p.edge+'\"></span>",
)
js = js.replace(
    "'<div class=\"remaining-row\"><span class=\"remaining-ball\" style=\"--c:'+p.color+';--edge:'+p.edge+'\"></span>",
    "'<div class=\"remaining-row\"><span class=\"remaining-ball'+(p.metallic?' metallic':'')+'\" style=\"--c:'+p.color+';--edge:'+p.edge+'\"></span>",
)
js = js.replace(
    "'<div class=\"history-chip\"><span class=\"history-ball\" style=\"--c:'+p.color+';--edge:'+p.edge+'\"></span>",
    "'<div class=\"history-chip\"><span class=\"history-ball'+(p.metallic?' metallic':'')+'\" style=\"--c:'+p.color+';--edge:'+p.edge+'\"></span>",
)
js = js.replace(
    "'<span class=\"drawn-ball\" title=\"'+esc(item.prize)+' · '+p.name+'\"",
    "'<span class=\"drawn-ball'+(p.metallic?' metallic':'')+'\" title=\"'+esc(item.prize)+' · '+p.name+'\"",
)

js = replace_once(
    js,
    "function addRow(){if(state.entries.length>=9){showToast('컬러는 최대 9개까지 설정할 수 있어요.');return}",
    "function addRow(){if(state.entries.length>=10){showToast('컬러는 최대 10개까지 설정할 수 있어요.');return}",
    "maximum palette rows",
)
js = js.replace("ensureGaraponAudio();if(state.busy", "unlockGaraponAudio();if(state.busy")
js = js.replace("els.canvas.addEventListener('pointerdown',ensureGaraponAudio,{passive:true});", "els.canvas.addEventListener('pointerdown',unlockGaraponAudio,{passive:true});")

js_path.write_text(js, encoding="utf-8")


# -----------------------------------------------------------------------------
# 2) 3D ball size and material. The machine shape/camera/wood are untouched.
# -----------------------------------------------------------------------------
machine_path = Path("garapon-three-machine-v2.js")
machine = machine_path.read_text(encoding="utf-8")

machine = replace_once(
    machine,
    "this.sharedPileGeometry = new THREE.SphereGeometry(0.19, 18, 12);",
    "this.sharedPileGeometry = new THREE.SphereGeometry(0.127, 18, 12);",
    "pile ball size",
)
machine = replace_once(
    machine,
    "new THREE.SphereGeometry(0.2, 22, 14),",
    "new THREE.SphereGeometry(0.133, 22, 14),",
    "released ball size",
)

material_pattern = re.compile(r"  materialForBall\(color, edge\) \{[\s\S]*?\n  \}\n\n  pilePosition\(index\) \{", re.M)
material_replacement = r'''  materialForBall(color, edge) {
    const key = `${color}|${edge}`;
    if (!this.ballMaterials.has(key)) {
      const normalized = String(color || '').toLowerCase();
      const colorValue = new THREE.Color(color);
      const edgeValue = new THREE.Color(edge || color);
      const isGold = normalized === '#e1b43e';
      const isSilver = normalized === '#c8cdd5';
      const isMetallic = isGold || isSilver;
      this.ballMaterials.set(key, new THREE.MeshPhysicalMaterial({
        color: colorValue,
        emissive: edgeValue,
        emissiveIntensity: isMetallic ? 0.012 : 0.025,
        roughness: isMetallic ? (isSilver ? 0.11 : 0.15) : 0.31,
        metalness: isMetallic ? (isSilver ? 0.94 : 0.86) : 0.02,
        clearcoat: isMetallic ? 0.82 : 0.32,
        clearcoatRoughness: isMetallic ? 0.08 : 0.2,
        reflectivity: isMetallic ? 1 : 0.5,
      }));
    }
    return this.ballMaterials.get(key);
  }

  pilePosition(index) {'''
machine, material_count = material_pattern.subn(material_replacement, machine, count=1)
if material_count != 1:
    raise SystemExit(f"material block replacement failed: {material_count}")

pile_pattern = re.compile(r"  pilePosition\(index\) \{[\s\S]*?\n  \}\n\n  clearPile\(\) \{", re.M)
pile_replacement = r'''  pilePosition(index) {
    const columns = 11;
    const rows = 4;
    const layerSize = columns * rows;
    const layer = Math.floor(index / layerSize);
    const local = index % layerSize;
    const col = local % columns;
    const row = Math.floor(local / columns);
    const jitterX = (((index * 37) % 11) - 5) * 0.004;
    const jitterZ = (((index * 19) % 9) - 4) * 0.0045;
    return new THREE.Vector3(
      -3.31 + col * 0.29 + jitterX,
      0.845 + layer * 0.205 + ((col + row) % 2) * 0.015,
      0.83 + row * 0.285 + jitterZ,
    );
  }

  clearPile() {'''
machine, pile_count = pile_pattern.subn(pile_replacement, machine, count=1)
if pile_count != 1:
    raise SystemExit(f"pile position replacement failed: {pile_count}")

machine_path.write_text(machine, encoding="utf-8")


# -----------------------------------------------------------------------------
# 3) CSS: only physical drawn-ball size and metallic finish are changed.
# -----------------------------------------------------------------------------
css_path = Path("garapon-three-v2.css")
css = css_path.read_text(encoding="utf-8")
css = replace_once(css, ".drawn-balls{position:relative;min-height:82px;max-height:166px;margin-top:10px;padding:14px 12px 12px;border:1px solid #eee8f1;border-radius:15px;background:linear-gradient(180deg,#fbf9fd 0%,#f2eef8 100%);box-shadow:inset 0 -10px 22px rgba(103,73,189,.055);display:flex;flex-wrap:wrap;align-content:flex-end;gap:3px;", ".drawn-balls{position:relative;min-height:82px;max-height:166px;margin-top:10px;padding:14px 12px 12px;border:1px solid #eee8f1;border-radius:15px;background:linear-gradient(180deg,#fbf9fd 0%,#f2eef8 100%);box-shadow:inset 0 -10px 22px rgba(103,73,189,.055);display:flex;flex-wrap:wrap;align-content:flex-end;gap:2px;", "drawn ball gap")
css = css.replace(".drawn-ball{width:22px;height:22px;flex:0 0 22px;", ".drawn-ball{width:15px;height:15px;flex:0 0 15px;")
metal_css = ".color-dot.metallic,.remaining-ball.metallic,.history-ball.metallic,.drawn-ball.metallic{background:radial-gradient(circle at 27% 22%,#fff 0 7%,rgba(255,255,255,.78) 8%,transparent 27%),linear-gradient(135deg,var(--edge) 0%,var(--c) 30%,#fff 49%,var(--c) 67%,var(--edge) 100%);box-shadow:inset -3px -4px 5px rgba(0,0,0,.24),inset 3px 3px 5px rgba(255,255,255,.78),0 2px 5px rgba(47,38,57,.18)}"
if metal_css not in css:
    insert_at = css.find("@media(max-width:360px)")
    if insert_at < 0:
        css += "\n" + metal_css + "\n"
    else:
        css = css[:insert_at] + metal_css + "\n" + css[insert_at:]
css_path.write_text(css, encoding="utf-8")


# -----------------------------------------------------------------------------
# 4) Cache versions and entry link.
# -----------------------------------------------------------------------------
html_path = Path("garapon.html")
html = html_path.read_text(encoding="utf-8")
html = re.sub(r"garapon-three-v2\.css\?v=[^\"']+", f"garapon-three-v2.css?v={VERSION}", html)
html = re.sub(r"garapon-three-v2\.js\?v=[^\"']+", f"garapon-three-v2.js?v={VERSION}", html)
html_path.write_text(html, encoding="utf-8")

tools_path = Path("tcg-tools.html")
tools = tools_path.read_text(encoding="utf-8")
tools = re.sub(r"garapon\.html\?v=[^\"']+", f"garapon.html?v={VERSION}", tools, count=1)
tools_path.write_text(tools, encoding="utf-8")
