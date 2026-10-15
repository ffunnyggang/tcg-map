from pathlib import Path
import re

VERSION = "20261016-angle-sound-pile1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor not found")


# 1) 3D camera, product angle, and restrained wood texture.
machine_path = Path("garapon-three-machine-v2.js")
machine = machine_path.read_text(encoding="utf-8")

machine = replace_once(
    machine,
    "this.camera.position.set(7.8,5.6,10.3);this.camera.lookAt(.05,2.45,.05);",
    "this.camera.position.set(5.25,4.72,12.55);this.camera.lookAt(.02,2.34,.34);",
    "camera",
)

wood_pattern = re.compile(
    r"woodTexture\(base='#d8b47d',grain='#7d542e'\)\{.*?return t\}", re.S
)
new_wood = (
    "woodTexture(base='#e2c596',grain='#9a7248'){"
    "const c=document.createElement('canvas');c.width=c.height=512;"
    "const x=c.getContext('2d'),g=x.createLinearGradient(0,0,512,512);"
    "g.addColorStop(0,'#efd8ae');g.addColorStop(.52,base);g.addColorStop(1,'#cfaa78');"
    "x.fillStyle=g;x.fillRect(0,0,512,512);x.globalAlpha=.09;"
    "for(let i=0;i<34;i++){const y=Math.random()*512,amp=2+Math.random()*7;"
    "x.strokeStyle=i%6===0?'#7e5732':grain;x.lineWidth=.45+Math.random()*.75;"
    "x.beginPath();x.moveTo(0,y);for(let px=0;px<=512;px+=34)"
    "x.lineTo(px,y+Math.sin(px*.018+i)*amp+Math.sin(px*.005+i*.55)*2.5);x.stroke()}"
    "x.globalAlpha=.025;for(let i=0;i<180;i++){x.fillStyle=Math.random()>.5?'#fff':'#6a4729';"
    "x.fillRect(Math.random()*512,Math.random()*512,1,1)}"
    "const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;"
    "t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.92,.92);"
    "t.anisotropy=Math.min(6,this.renderer.capabilities.getMaxAnisotropy());return t}"
)
machine, wood_n = wood_pattern.subn(new_wood, machine, count=1)
if wood_n != 1 and new_wood not in machine:
    raise SystemExit("wood texture anchor not found")

material_replacements = {
    "color:0xf2d7a0,roughness:.56,metalness:0,clearcoat:.13,clearcoatRoughness:.68":
        "color:0xf3ddb5,roughness:.66,metalness:0,clearcoat:.055,clearcoatRoughness:.78",
    "color:0xa16f39,roughness:.7": "color:0xc69b68,roughness:.76",
    "color:0xd0a76d,roughness:.67": "color:0xd9b887,roughness:.72",
    "color:0x8a5b30,roughness:.75": "color:0xaa7b4c,roughness:.79",
}
for old, new in material_replacements.items():
    machine = replace_once(machine, old, new, f"material {old}")

machine = replace_once(
    machine,
    "this.root.position.set(.05,-.08,0);this.scene.add(this.root);",
    "this.root.position.set(.05,-.08,0);this.root.rotation.y=-.085;this.scene.add(this.root);",
    "root angle",
)
machine_path.write_text(machine, encoding="utf-8")


# 2) Dedicated pile area that keeps every drawn ball until reset.
html_path = Path("garapon.html")
html = html_path.read_text(encoding="utf-8")
pile_html = (
    '<section class="card drawn-card" aria-labelledby="drawnBallsTitle">'
    '<div class="card-head"><span class="card-title" id="drawnBallsTitle">뽑힌 구슬</span>'
    '<span class="card-sub" id="drawnBallCount">0개</span></div>'
    '<div class="drawn-balls" id="drawnBalls">'
    '<div class="drawn-empty">추첨한 구슬이 이곳에 쌓여요.</div></div></section>'
)
if 'id="drawnBalls"' not in html:
    stats_match = re.search(r'(<section class="stats">[\s\S]*?</section>)', html)
    if not stats_match:
        raise SystemExit("stats section anchor not found")
    html = html[: stats_match.end()] + "\n" + pile_html + html[stats_match.end() :]

html = re.sub(
    r'garapon-three-v2\.css\?v=[^"\']+',
    f"garapon-three-v2.css?v={VERSION}",
    html,
)
html = re.sub(
    r'garapon-three-v2\.js\?v=[^"\']+',
    f"garapon-three-v2.js?v={VERSION}",
    html,
)
html_path.write_text(html, encoding="utf-8")


# 3) Pile UI styling.
css_path = Path("garapon-three-v2.css")
css = css_path.read_text(encoding="utf-8")
pile_css = """
.drawn-card{overflow:hidden}.drawn-balls{position:relative;min-height:82px;max-height:166px;margin-top:10px;padding:14px 12px 12px;border:1px solid #eee8f1;border-radius:15px;background:linear-gradient(180deg,#fbf9fd 0%,#f2eef8 100%);box-shadow:inset 0 -10px 22px rgba(103,73,189,.055);display:flex;flex-wrap:wrap;align-content:flex-end;gap:3px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}.drawn-balls::-webkit-scrollbar{display:none}.drawn-empty{width:100%;align-self:center;text-align:center;color:#a198a5;font-size:9.5px}.drawn-ball{width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:radial-gradient(circle at 32% 27%,rgba(255,255,255,.95) 0 8%,var(--c) 31% 68%,var(--edge) 100%);border:1px solid var(--edge);box-shadow:inset -3px -4px 5px rgba(0,0,0,.16),0 2px 4px rgba(47,38,57,.12);transform:translateY(var(--lift,0)) rotate(var(--turn,0deg));animation:drawnBallIn .34s cubic-bezier(.2,.82,.25,1.22)}@keyframes drawnBallIn{from{opacity:0;transform:translateY(-13px) scale(.55)}to{opacity:1;transform:translateY(var(--lift,0)) rotate(var(--turn,0deg)) scale(1)}}
""".strip()
if ".drawn-balls{" not in css:
    media_at = css.find("@media(max-width:360px)")
    if media_at < 0:
        css += "\n" + pile_css + "\n"
    else:
        css = css[:media_at] + pile_css + "\n" + css[media_at:]
css_path.write_text(css, encoding="utf-8")


# 4) Procedural ball-rattle sound and pile rendering.
js_path = Path("garapon-three-v2.js")
js = js_path.read_text(encoding="utf-8")

js = replace_once(
    js,
    "history:$('historyList'),historyCount:$('historyCount'),toast:$('toast')",
    "history:$('historyList'),historyCount:$('historyCount'),drawn:$('drawnBalls'),drawnCount:$('drawnBallCount'),toast:$('toast')",
    "elements",
)

audio_code = (
    "let garaponAudioCtx=null,garaponNoiseBuffer=null,lastGaraponRattleAt=0;\n"
    "function ensureGaraponAudio(){try{const AC=window.AudioContext||window.webkitAudioContext;"
    "if(!AC)return null;if(!garaponAudioCtx)garaponAudioCtx=new AC();"
    "if(garaponAudioCtx.state==='suspended')garaponAudioCtx.resume?.();return garaponAudioCtx}catch(_){return null}}\n"
    "function getGaraponNoise(ctx){if(garaponNoiseBuffer&&garaponNoiseBuffer.sampleRate===ctx.sampleRate)return garaponNoiseBuffer;"
    "const length=Math.max(1,Math.floor(ctx.sampleRate*.12)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),"
    "data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){const white=Math.random()*2-1;"
    "last=last*.68+white*.32;data[i]=last}garaponNoiseBuffer=buffer;return buffer}\n"
    "function playGaraponRattle(remaining,motion=.12){const ctx=ensureGaraponAudio();"
    "if(!ctx||ctx.state!=='running')return;const nowMs=performance.now(),count=Math.max(1,Number(remaining)||1),"
    "density=Math.min(1,Math.log2(count+1)/7),interval=84-density*42;"
    "if(nowMs-lastGaraponRattleAt<interval)return;lastGaraponRattleAt=nowMs;"
    "const now=ctx.currentTime,strength=Math.min(1,Math.max(.12,Number(motion)||.12)*3.3),"
    "grains=Math.max(1,Math.min(5,Math.round(1+density*3.6)));"
    "for(let i=0;i<grains;i++){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),"
    "gain=ctx.createGain(),start=now+i*(.004+Math.random()*.006),duration=.022+density*.035+Math.random()*.018;"
    "source.buffer=getGaraponNoise(ctx);filter.type='bandpass';"
    "filter.frequency.setValueAtTime(980-density*360+Math.random()*420,start);filter.Q.setValueAtTime(2.2+Math.random()*2,start);"
    "const peak=(.009+density*.018)*strength/grains;gain.gain.setValueAtTime(.0001,start);"
    "gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+.004);"
    "gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter).connect(gain).connect(ctx.destination);"
    "source.start(start);source.stop(start+duration+.01)}"
    "const click=ctx.createOscillator(),clickGain=ctx.createGain(),clickStart=now+.006;click.type='triangle';"
    "click.frequency.setValueAtTime(360+(1-density)*420+Math.random()*180,clickStart);"
    "click.frequency.exponentialRampToValueAtTime(170+density*130,clickStart+.035);"
    "clickGain.gain.setValueAtTime(.0001,clickStart);"
    "clickGain.gain.exponentialRampToValueAtTime((.008+density*.012)*strength,clickStart+.003);"
    "clickGain.gain.exponentialRampToValueAtTime(.0001,clickStart+.045);"
    "click.connect(clickGain).connect(ctx.destination);click.start(clickStart);click.stop(clickStart+.055)}"
)
mix_anchor = "const MIX_REQUIRED=Math.PI*2*1.05,DRAW_REQUIRED=Math.PI*2*.72;"
if "function playGaraponRattle(" not in js:
    if mix_anchor not in js:
        raise SystemExit("audio insertion anchor not found")
    js = js.replace(mix_anchor, mix_anchor + "\n" + audio_code, 1)

render_drawn = (
    "function renderDrawnBalls(){if(!els.drawn||!els.drawnCount)return;"
    "els.drawnCount.textContent=state.history.length+'개';"
    "if(!state.history.length){els.drawn.innerHTML='<div class=\"drawn-empty\">추첨한 구슬이 이곳에 쌓여요.</div>';return}"
    "const pile=state.history.slice().reverse();"
    "els.drawn.innerHTML=pile.map((item,i)=>{const p=colorOf(item.colorKey),lift=((i*7)%3)-1,turn=((i*13)%17)-8;"
    "return '<span class=\"drawn-ball\" title=\"'+esc(item.prize)+' · '+p.name+'\" aria-label=\"'+esc(item.prize)+' '+p.name+' 구슬\" style=\"--c:'+p.color+';--edge:'+p.edge+';--lift:'+lift+'px;--turn:'+turn+'deg\"></span>'}).join('');"
    "els.drawn.scrollTop=els.drawn.scrollHeight}"
)
if "function renderDrawnBalls()" not in js:
    if "function renderResult(){" not in js:
        raise SystemExit("drawn balls insertion anchor not found")
    js = js.replace("function renderResult(){", render_drawn + "\nfunction renderResult(){", 1)

js = replace_once(
    js,
    "renderConfig();renderRemaining();renderHistory();renderResult();renderInteraction()",
    "renderConfig();renderRemaining();renderHistory();renderDrawnBalls();renderResult();renderInteraction()",
    "render pipeline",
)
js = replace_once(
    js,
    "function onManualDelta(delta){if(state.busy)return;",
    "function onManualDelta(delta){if(state.busy)return;playGaraponRattle(sumRemaining(),Math.abs(delta));",
    "manual sound",
)
js = replace_once(
    js,
    "function autoDraw(){if(state.busy||!validConfig())",
    "function autoDraw(){ensureGaraponAudio();if(state.busy||!validConfig())",
    "auto audio",
)
js = replace_once(
    js,
    "onMix:p=>{mixProgress=MIX_REQUIRED*p;if(p>=1)mixed=true;renderInteraction()},onForward:p=>{forwardProgress=DRAW_REQUIRED*p;renderInteraction()}",
    "onMix:p=>{mixProgress=MIX_REQUIRED*p;if(p>=1)mixed=true;playGaraponRattle(sumRemaining(),.18);renderInteraction()},onForward:p=>{forwardProgress=DRAW_REQUIRED*p;playGaraponRattle(sumRemaining(),.16);renderInteraction()}",
    "auto callbacks",
)

binding = "$('backButton').addEventListener('click',goBack);"
if "els.canvas.addEventListener('pointerdown',ensureGaraponAudio" not in js:
    if binding not in js:
        raise SystemExit("audio unlock binding anchor not found")
    js = js.replace(
        binding,
        "els.canvas.addEventListener('pointerdown',ensureGaraponAudio,{passive:true});" + binding,
        1,
    )

js = re.sub(
    r"from './garapon-three-machine-v2\.js(?:\?v=[^']*)?'",
    f"from './garapon-three-machine-v2.js?v={VERSION}'",
    js,
    count=1,
)
js_path.write_text(js, encoding="utf-8")


# 5) Update TCG TOOL entry cache URL.
tools_path = Path("tcg-tools.html")
tools = tools_path.read_text(encoding="utf-8")
tools = re.sub(
    r'garapon\.html\?v=[^"\']+', f"garapon.html?v={VERSION}", tools, count=1
)
tools_path.write_text(tools, encoding="utf-8")
