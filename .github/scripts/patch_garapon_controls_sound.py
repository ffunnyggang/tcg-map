from pathlib import Path
import re

VERSION = "20261016-controls-sound1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor not found")


# -----------------------------------------------------------------------------
# 1) Keep the approved 3D model untouched; only align rotation behavior and add
#    automatic clockwise mixing.
# -----------------------------------------------------------------------------
machine_path = Path("garapon-three-machine-v2.js")
machine = machine_path.read_text(encoding="utf-8")

machine = replace_once(
    machine,
    """      this.drumAngle += delta;
      this.targetDrumAngle = this.drumAngle;
      this.drumPivot.rotation.z = this.drumAngle;
      this.callbacks.delta(delta);""",
    """      // Pointer angles use screen coordinates: clockwise gestures are positive.
      // Three.js positive Z rotation appears counter-clockwise from this camera,
      // so invert only the rendered angle while preserving the gesture delta.
      this.drumAngle -= delta;
      this.targetDrumAngle = this.drumAngle;
      this.drumPivot.rotation.z = this.drumAngle;
      this.callbacks.delta(delta);""",
    "manual rotation direction",
)

machine = replace_once(
    machine,
    "this.drumAngle = from - fullTurn * eased;",
    "this.drumAngle = from + fullTurn * eased;",
    "automatic draw direction",
)

if "  autoMixSequence({ onMix, onReady }) {" not in machine:
    resize_anchor = "\n  resize() {"
    if resize_anchor not in machine:
        raise SystemExit("machine resize anchor not found")
    auto_mix = r'''
  // Clockwise automatic rotation only mixes the balls and never consumes one.
  autoMixSequence({ onMix, onReady }) {
    const start = performance.now();
    const from = this.drumAngle;
    const fullTurn = Math.PI * 2 * 1.25;
    const total = 1350;
    this.autoAnim = {
      tick: (now) => {
        const t = Math.min(1, (now - start) / total);
        const eased = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.drumAngle = from - fullTurn * eased;
        this.targetDrumAngle = this.drumAngle;
        this.drumPivot.rotation.z = this.drumAngle;
        onMix?.(eased);
        if (t >= 1) {
          this.autoAnim = null;
          onReady?.();
        }
      },
    };
  }
'''
    machine = machine.replace(resize_anchor, "\n" + auto_mix + resize_anchor, 1)

machine_path.write_text(machine, encoding="utf-8")


# -----------------------------------------------------------------------------
# 2) Sound toggle, distinct mixing / release / landing sounds, split buttons,
#    and guide removal. Draw remains counter-clockwise; clockwise is mix only.
# -----------------------------------------------------------------------------
entry_path = Path("garapon-three-v2.js")
entry = entry_path.read_text(encoding="utf-8")
entry = re.sub(
    r"from './garapon-three-machine-v2\.js(?:\?v=[^']*)?'",
    f"from './garapon-three-machine-v2.js?v={VERSION}'",
    entry,
    count=1,
)

entry = replace_once(
    entry,
    "draw:$('drawButton')",
    "mix:$('mixButton'),draw:$('drawButton'),sound:$('soundToggle')",
    "action elements",
)
entry = entry.replace(
    ",mixGuide:$('mixGuide'),drawGuide:$('drawGuide'),mixGuideText:$('mixGuideText'),drawGuideText:$('drawGuideText')",
    "",
    1,
)

# Replace the complete procedural sound block so the on/off state is enforced
# consistently and release/landing sounds are distinct from the rattle.
audio_start = entry.index("let garaponAudioCtx=")
audio_end = entry.index("\n\nfunction uid", audio_start)
new_audio = r'''const SOUND_KEY='funypin-garapon-sound-v1';
let soundEnabled=true;
try{soundEnabled=localStorage.getItem(SOUND_KEY)!=='0'}catch(_){}
let garaponAudioCtx=null,garaponNoiseBuffer=null,lastGaraponRattleAt=0;
function ensureGaraponAudio(){if(!soundEnabled)return null;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!garaponAudioCtx)garaponAudioCtx=new AC();if(garaponAudioCtx.state==='suspended')garaponAudioCtx.resume?.();return garaponAudioCtx}catch(_){return null}}
function getGaraponNoise(ctx){if(garaponNoiseBuffer&&garaponNoiseBuffer.sampleRate===ctx.sampleRate)return garaponNoiseBuffer;const length=Math.max(1,Math.floor(ctx.sampleRate*.14)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<length;i++){const white=Math.random()*2-1;last=last*.7+white*.3;data[i]=last}garaponNoiseBuffer=buffer;return buffer}
function playGaraponRattle(remaining,motion=.12,mode='draw'){const ctx=ensureGaraponAudio();if(!ctx||ctx.state!=='running')return;const nowMs=performance.now(),count=Math.max(1,Number(remaining)||1),density=Math.min(1,Math.log2(count+1)/7),interval=86-density*43;if(nowMs-lastGaraponRattleAt<interval)return;lastGaraponRattleAt=nowMs;const now=ctx.currentTime,strength=Math.min(1,Math.max(.1,Number(motion)||.1)*3.25),grains=Math.max(1,Math.min(5,Math.round(1+density*3.6))),base=mode==='mix'?720:930;for(let i=0;i<grains;i++){const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),start=now+i*(.004+Math.random()*.006),duration=.025+density*.04+Math.random()*.018;source.buffer=getGaraponNoise(ctx);filter.type='bandpass';filter.frequency.setValueAtTime(base-density*250+Math.random()*360,start);filter.Q.setValueAtTime(2+Math.random()*2,start);const peak=(.008+density*.018)*strength/grains;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter).connect(gain).connect(ctx.destination);source.start(start);source.stop(start+duration+.012)}}
function playBallReleaseSound(remaining){const ctx=ensureGaraponAudio();if(!ctx||ctx.state!=='running')return;const now=ctx.currentTime,count=Math.max(1,Number(remaining)||1),density=Math.min(1,Math.log2(count+1)/7);const latch=ctx.createOscillator(),latchGain=ctx.createGain();latch.type='triangle';latch.frequency.setValueAtTime(410+density*80,now);latch.frequency.exponentialRampToValueAtTime(155,now+.07);latchGain.gain.setValueAtTime(.0001,now);latchGain.gain.exponentialRampToValueAtTime(.038,now+.004);latchGain.gain.exponentialRampToValueAtTime(.0001,now+.085);latch.connect(latchGain).connect(ctx.destination);latch.start(now);latch.stop(now+.09);const roll=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();roll.buffer=getGaraponNoise(ctx);filter.type='bandpass';filter.frequency.setValueAtTime(680+density*130,now+.035);filter.Q.setValueAtTime(2.4,now+.035);gain.gain.setValueAtTime(.0001,now+.03);gain.gain.exponentialRampToValueAtTime(.027,now+.055);gain.gain.exponentialRampToValueAtTime(.0001,now+.24);roll.connect(filter).connect(gain).connect(ctx.destination);roll.start(now+.03);roll.stop(now+.26)}
function playBallLandSound(){const ctx=ensureGaraponAudio();if(!ctx||ctx.state!=='running')return;const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(520,now);osc.frequency.exponentialRampToValueAtTime(245,now+.11);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.025,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+.14);osc.connect(gain).connect(ctx.destination);osc.start(now);osc.stop(now+.15)}
function renderSoundToggle(){if(!els.sound)return;els.sound.classList.toggle('off',!soundEnabled);els.sound.setAttribute('aria-pressed',String(soundEnabled));els.sound.textContent=soundEnabled?'🔊 사운드 ON':'🔇 사운드 OFF'}
function toggleSound(){soundEnabled=!soundEnabled;try{localStorage.setItem(SOUND_KEY,soundEnabled?'1':'0')}catch(_){}if(soundEnabled)ensureGaraponAudio();renderSoundToggle();showToast(soundEnabled?'사운드를 켰어요.':'사운드를 껐어요.')}
'''
entry = entry[:audio_start] + new_audio + entry[audio_end:]

# Remove references to the deleted top guide and keep only the contextual tip.
result_start = entry.index("function renderResult(){")
render_start = entry.index("function render(){", result_start)
new_result_interaction = r'''function renderResult(){if(autoRunning==='mix'){els.title.textContent='구슬을 섞고 있어요';els.title.classList.remove('emphasis');els.sub.textContent='시계 방향으로 가라폰을 돌리고 있어요';return}if(state.busy){els.title.textContent='가라폰이 추첨 중...';els.title.classList.remove('emphasis');els.sub.textContent='구슬이 배출구에서 트레이로 이동하고 있어요';return}if(state.last){const p=colorOf(state.last.colorKey);els.title.textContent=state.last.prize;els.title.classList.add('emphasis');els.sub.textContent=p.name+' 구슬이 나왔어요';return}els.title.textContent=sumRemaining()?'손잡이를 반시계 방향으로 돌려보세요':'모든 구슬을 뽑았어요';els.title.classList.remove('emphasis');els.sub.textContent=sumRemaining()?'한 바퀴 돌릴 때마다 구슬이 하나씩 나와요':'추첨 초기화 후 다시 시작할 수 있어요'}
function renderInteraction(){const drawPct=Math.min(100,Math.round(forwardProgress/TURN_REQUIRED*100));if(autoRunning==='mix')els.dragTip.innerHTML='<b>시계 방향</b>으로 구슬을 섞고 있어요';else if(autoRunning==='draw')els.dragTip.innerHTML='<b>반시계 방향</b>으로 자동 추첨 중이에요';else if(pendingDraws)els.dragTip.innerHTML='<b>구슬 '+pendingDraws+'개</b>가 순서대로 나올 예정이에요';else if(drawPct)els.dragTip.innerHTML='<b>반시계 방향</b> 회전 '+drawPct+'%';else els.dragTip.innerHTML='<b>시계 방향</b>은 섞기 · <b>반시계 방향</b>은 한 바퀴마다 뽑기';machine?.setInteractionState?.({forward:drawPct/100})}
'''
entry = entry[:result_start] + new_result_interaction + entry[render_start:]

entry = replace_once(
    entry,
    "els.draw.disabled=state.busy||pendingDraws>0||autoRunning||!validConfig();els.reset.disabled=state.busy||pendingDraws>0||autoRunning||(!state.history.length&&remaining===configured);",
    "els.mix.disabled=state.busy||pendingDraws>0||autoRunning||!validConfig();els.draw.disabled=state.busy||pendingDraws>0||autoRunning||!validConfig();els.reset.disabled=state.busy||pendingDraws>0||autoRunning||(!state.history.length&&remaining===configured);renderSoundToggle();",
    "button states",
)

# Add release and landing effects without changing draw probability or storage.
entry = replace_once(
    entry,
    "function commitResult(index,result,source){state.remaining[index]=Math.max(0,state.remaining[index]-1);state.history.unshift(result);state.last=result;state.busy=false;save();render();",
    "function commitResult(index,result,source){state.remaining[index]=Math.max(0,state.remaining[index]-1);state.history.unshift(result);state.last=result;state.busy=false;playBallLandSound();save();render();",
    "landing sound",
)
entry = replace_once(
    entry,
    "const {index,result}=chooseResult(),p=colorOf(result.colorKey);state.busy=true;state.last=null;renderResult();els.draw.disabled=true;if(machine&&typeof machine.releaseBall==='function')",
    "const {index,result}=chooseResult(),p=colorOf(result.colorKey);state.busy=true;state.last=null;renderResult();els.draw.disabled=true;playBallReleaseSound(sumRemaining());if(machine&&typeof machine.releaseBall==='function')",
    "release sound",
)

manual_start = entry.index("function onManualDelta(")
auto_start = entry.index("function autoDraw()", manual_start)
new_manual = r'''function onManualDelta(delta){const mode=delta>0?'mix':'draw';playGaraponRattle(Math.max(1,sumRemaining()-reservedDraws()),Math.abs(delta),mode);if(delta<0){forwardProgress+=-delta;while(forwardProgress>=TURN_REQUIRED){forwardProgress-=TURN_REQUIRED;if(!enqueueManualDraw())break}}renderInteraction()}
'''
entry = entry[:manual_start] + new_manual + entry[auto_start:]

# Replace automatic controls with separate 50:50 mix and draw actions.
auto_start = entry.index("function autoDraw()")
auto_end = entry.index("function addRow()", auto_start)
new_auto = r'''function autoMix(){ensureGaraponAudio();if(state.busy||pendingDraws>0||autoRunning||!validConfig()){if(!validConfig())showToast(sumConfigured()!==state.total?'컬러별 수량 합계를 총 구슬 수와 맞춰주세요.':'남은 구슬이 없어요.');return}autoRunning='mix';state.last=null;forwardProgress=0;render();if(machine&&typeof machine.autoMixSequence==='function')machine.autoMixSequence({onMix:()=>{playGaraponRattle(sumRemaining(),.18,'mix')},onReady:()=>{autoRunning=false;render();showToast('구슬을 섞었어요.')}});else setTimeout(()=>{autoRunning=false;render();showToast('구슬을 섞었어요.')},900)}
function autoDraw(){ensureGaraponAudio();if(state.busy||pendingDraws>0||autoRunning||!validConfig()){if(!validConfig())showToast(sumConfigured()!==state.total?'컬러별 수량 합계를 총 구슬 수와 맞춰주세요.':'남은 구슬이 없어요.');return}autoRunning='draw';state.busy=true;state.last=null;forwardProgress=0;renderResult();renderInteraction();els.draw.disabled=true;if(machine&&typeof machine.autoSequence==='function')machine.autoSequence({onForward:p=>{forwardProgress=TURN_REQUIRED*p;playGaraponRattle(sumRemaining(),.17,'draw');renderInteraction()},onReady:()=>{autoRunning=false;state.busy=false;forwardProgress=0;performDraw('auto')}});else setTimeout(()=>{autoRunning=false;state.busy=false;performDraw('auto')},900)}
'''
entry = entry[:auto_start] + new_auto + entry[auto_end:]

# WebGL fallback gets the same split behavior.
old_fallback = "autoSequence({onForward,onReady}){let p=0;const id=setInterval(()=>{p=Math.min(1,p+.075);onForward?.(p);if(p>=1){clearInterval(id);onReady?.()}},60)},setInteractionState(){},setPileBalls(){}"
new_fallback = "autoSequence({onForward,onReady}){let p=0;const id=setInterval(()=>{p=Math.min(1,p+.075);onForward?.(p);if(p>=1){clearInterval(id);onReady?.()}},60)},autoMixSequence({onMix,onReady}){let p=0;const id=setInterval(()=>{p=Math.min(1,p+.075);onMix?.(p);if(p>=1){clearInterval(id);onReady?.()}},60)},setInteractionState(){},setPileBalls(){}"
entry = replace_once(entry, old_fallback, new_fallback, "fallback auto mix")

binding_old = "els.canvas.addEventListener('pointerdown',ensureGaraponAudio,{passive:true});$('backButton').addEventListener('click',goBack);els.draw.addEventListener('click',autoDraw);"
binding_new = "els.canvas.addEventListener('pointerdown',ensureGaraponAudio,{passive:true});$('backButton').addEventListener('click',goBack);els.mix.addEventListener('click',autoMix);els.draw.addEventListener('click',autoDraw);els.sound.addEventListener('click',toggleSound);"
entry = replace_once(entry, binding_old, binding_new, "control bindings")

entry_path.write_text(entry, encoding="utf-8")


# -----------------------------------------------------------------------------
# 3) Remove the top gesture chips, add 50:50 controls and the sound toggle.
# -----------------------------------------------------------------------------
html_path = Path("garapon.html")
html = html_path.read_text(encoding="utf-8")
html = re.sub(r'\n  <div class="gesture-guide"[\s\S]*?</div>', '', html, count=1)
html = replace_once(
    html,
    '  <button class="draw-button" id="drawButton" type="button">자동으로 뽑기</button>',
    '''  <div class="auto-actions" aria-label="자동 가라폰 조작"><button class="auto-button mix-auto-button" id="mixButton" type="button">구슬 섞기</button><button class="auto-button draw-auto-button" id="drawButton" type="button">구슬 뽑기</button></div>\n  <div class="sound-row"><button class="sound-toggle" id="soundToggle" type="button" aria-pressed="true">🔊 사운드 ON</button></div>''',
    "split controls",
)
html = html.replace(
    '<strong class="result-title" id="resultTitle">손잡이를 앞으로 돌려보세요</strong>',
    '<strong class="result-title" id="resultTitle">손잡이를 반시계 방향으로 돌려보세요</strong>',
    1,
)
html = re.sub(
    r'<div class="drag-tip" id="dragTip">[\s\S]*?</div>',
    '<div class="drag-tip" id="dragTip"><b>시계 방향</b>은 섞기 · <b>반시계 방향</b>은 한 바퀴마다 뽑기</div>',
    html,
    count=1,
)
html = html.replace(
    '<p class="tip"><b>TIP ·</b> 시계 방향으로 섞는 동작은 선택이에요. 손잡이를 반시계 방향으로 한 바퀴 돌릴 때마다 구슬이 연속 추첨됩니다.</p>',
    '<p class="tip"><b>TIP ·</b> 시계 방향은 구슬 섞기, 반시계 방향은 추첨이에요. 반시계 방향으로 한 바퀴 돌릴 때마다 구슬이 연속으로 나옵니다.</p>',
    1,
)
html = re.sub(r'garapon-three-v2\.css\?v=[^"\']+', f'garapon-three-v2.css?v={VERSION}', html, count=1)
html = re.sub(r'garapon-three-v2\.js\?v=[^"\']+', f'garapon-three-v2.js?v={VERSION}', html, count=1)
html_path.write_text(html, encoding="utf-8")


# -----------------------------------------------------------------------------
# 4) UI additions only; the approved 3D machine styles and geometry are untouched.
# -----------------------------------------------------------------------------
css_path = Path("garapon-three-v2.css")
css = css_path.read_text(encoding="utf-8")
if ".auto-actions{" not in css:
    insert_at = css.index(".fair-note{")
    controls_css = r'''.auto-actions{position:relative;z-index:6;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}.auto-button{height:52px;border-radius:15px;font-size:14px;font-weight:900;letter-spacing:-.01em;cursor:pointer;transition:transform .12s ease,opacity .18s ease}.auto-button:active:not(:disabled){transform:scale(.988)}.auto-button:disabled{opacity:.46;cursor:default}.mix-auto-button{border:1px solid #d9cfee;background:#fff;color:#6749bd;box-shadow:0 6px 16px rgba(103,73,189,.08)}.draw-auto-button{border:0;background:linear-gradient(135deg,#8062d8,#6f51c8);color:#fff;box-shadow:0 8px 20px rgba(112,79,197,.24)}.sound-row{position:relative;z-index:6;display:flex;justify-content:flex-end;margin-top:8px}.sound-toggle{height:30px;padding:0 10px;border:1px solid #e2dce8;border-radius:999px;background:rgba(255,255,255,.9);color:#6d6572;font-size:9.5px;font-weight:850;cursor:pointer}.sound-toggle.off{background:#f4f1f5;color:#9b939e}
'''
    css = css[:insert_at] + controls_css + css[insert_at:]
css_path.write_text(css, encoding="utf-8")


# -----------------------------------------------------------------------------
# 5) Entry URL cache bump.
# -----------------------------------------------------------------------------
tools_path = Path("tcg-tools.html")
tools = tools_path.read_text(encoding="utf-8")
tools = re.sub(r'garapon\.html\?v=[^"\']+', f'garapon.html?v={VERSION}', tools, count=1)
tools_path.write_text(tools, encoding="utf-8")
