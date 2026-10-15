from pathlib import Path
import re

VERSION = "20261016-continuous-forward1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor not found")


# -----------------------------------------------------------------------------
# 1) Rebuild the outlet on one of the octagonal side faces and simplify auto turn.
# -----------------------------------------------------------------------------
machine_path = Path("garapon-three-machine-v2.js")
machine = machine_path.read_text(encoding="utf-8")

outlet_pattern = re.compile(
    r"\n    const outlet = this\.mesh\([\s\S]*?\n    this\.ballEnd = this\.pilePosition\(0\);\n",
    re.M,
)
outlet_replacement = r'''
    // The outlet is mounted directly on the lower-left face of the rotating
    // octagonal drum. It therefore travels with the drum instead of floating
    // independently beneath it.
    const outletFaceAngle = -Math.PI * 3 / 4;
    const outletApothem = radius * Math.cos(Math.PI / 8);
    const outletGroup = new THREE.Group();
    outletGroup.position.set(
      Math.cos(outletFaceAngle) * (outletApothem + 0.015),
      Math.sin(outletFaceAngle) * (outletApothem + 0.015),
      0.42,
    );
    outletGroup.rotation.z = outletFaceAngle - Math.PI / 2;
    this.drumPivot.add(outletGroup);

    const outletCollar = this.mesh(
      new THREE.CylinderGeometry(0.31, 0.31, 0.13, 32),
      woodSide,
      { position: [0, 0.035, 0] },
    );
    const outletHole = this.mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.075, 32),
      dark,
      { position: [0, 0.115, 0] },
    );
    outletGroup.add(outletCollar, outletHole);

    this.outletAnchor = new THREE.Object3D();
    this.outletAnchor.position.set(0, 0.31, 0);
    outletGroup.add(this.outletAnchor);

    this.resultBall = this.mesh(
      new THREE.SphereGeometry(0.2, 22, 14),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.02,
        clearcoat: 0.34,
        clearcoatRoughness: 0.24,
      }),
      { position: [0, 0, 0], scale: [0.01, 0.01, 0.01] },
    );
    this.resultBall.visible = false;
    this.root.add(this.resultBall);
    this.ballStart = new THREE.Vector3();
    this.ballControl1 = new THREE.Vector3();
    this.ballControl2 = new THREE.Vector3();
    this.ballEnd = this.pilePosition(0);
'''
machine, outlet_count = outlet_pattern.subn("\n" + outlet_replacement, machine, count=1)
if outlet_count != 1:
    raise SystemExit(f"outlet block replacement failed: {outlet_count}")

release_pattern = re.compile(
    r"\n  releaseBall\(color, edge, done\) \{[\s\S]*?\n  \}\n\n  autoSequence\(\{ onMix, onForward, onReady \}\) \{[\s\S]*?\n  \}\n\n  resize\(\) \{",
    re.M,
)
release_replacement = r'''
  outletPosition(target = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    this.outletAnchor.getWorldPosition(target);
    return this.root.worldToLocal(target);
  }

  releaseBall(color, edge, done) {
    const targetIndex = this.pileBalls.length;
    this.resultBall.material = this.materialForBall(color, edge);
    this.resultBall.visible = true;

    this.outletPosition(this.ballStart);
    this.resultBall.position.copy(this.ballStart);
    this.resultBall.scale.setScalar(0.05);
    this.ballEnd.copy(this.pilePosition(targetIndex));
    this.ballControl1.copy(this.ballStart).add(new THREE.Vector3(-0.12, 0.18, 0.16));
    this.ballControl2.copy(this.ballStart).lerp(this.ballEnd, 0.58);
    this.ballControl2.y += 0.28;
    this.ballControl2.z += 0.08;

    this.ballAnim = {
      start: performance.now(),
      duration: 820,
      color,
      edge,
      targetIndex,
      done,
    };
    try { navigator.vibrate?.(15); } catch (_) {}
  }

  // Automatic draw now mirrors the new forward gesture: one counter-clockwise
  // revolution produces one ball, with no mandatory reverse-mixing phase.
  autoSequence({ onForward, onReady }) {
    const start = performance.now();
    const from = this.drumAngle;
    const fullTurn = Math.PI * 2;
    const total = 1180;
    this.autoAnim = {
      tick: (now) => {
        const t = Math.min(1, (now - start) / total);
        const eased = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.drumAngle = from - fullTurn * eased;
        this.targetDrumAngle = this.drumAngle;
        this.drumPivot.rotation.z = this.drumAngle;
        onForward?.(eased);
        if (t >= 1) {
          this.autoAnim = null;
          onReady?.();
        }
      },
    };
  }

  resize() {'''
machine, release_count = release_pattern.subn("\n" + release_replacement, machine, count=1)
if release_count != 1:
    raise SystemExit(f"release/auto replacement failed: {release_count}")

machine_path.write_text(machine, encoding="utf-8")


# -----------------------------------------------------------------------------
# 2) Make reverse mixing optional and draw once per full forward revolution.
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
    "let toastTimer=0,state=load(),mixProgress=0,forwardProgress=0,mixed=false,lastForwardWarning=0,machine=null;\nconst MIX_REQUIRED=Math.PI*2*1.05,DRAW_REQUIRED=Math.PI*2*.72;",
    "let toastTimer=0,state=load(),forwardProgress=0,pendingDraws=0,autoRunning=false,machine=null;\nconst TURN_REQUIRED=Math.PI*2;",
    "interaction state",
)

entry = replace_once(
    entry,
    "function interactionReady(){return !state.busy&&validConfig()}\nfunction resetInteraction(){mixProgress=0;forwardProgress=0;mixed=false;machine?.setInteractionState?.({mix:0,forward:0,mixed:false});renderInteraction()}",
    "function interactionReady(){return !autoRunning&&validConfig()}\nfunction resetInteraction(){forwardProgress=0;pendingDraws=0;autoRunning=false;machine?.setInteractionState?.({forward:0});renderInteraction()}",
    "interaction helpers",
)

result_pattern = re.compile(r"function renderResult\(\)\{[\s\S]*?\}\nfunction renderInteraction\(\)\{[\s\S]*?\}\nfunction render\(\)\{", re.M)
result_replacement = r'''function renderResult(){if(state.busy){els.title.textContent='가라폰이 추첨 중...';els.title.classList.remove('emphasis');els.sub.textContent='구슬이 배출구에서 트레이로 이동하고 있어요';return}if(state.last){const p=colorOf(state.last.colorKey);els.title.textContent=state.last.prize;els.title.classList.add('emphasis');els.sub.textContent=p.name+' 구슬이 나왔어요';return}els.title.textContent=sumRemaining()?'손잡이를 앞으로 돌려보세요':'모든 구슬을 뽑았어요';els.title.classList.remove('emphasis');els.sub.textContent=sumRemaining()?'한 바퀴 돌릴 때마다 구슬이 하나씩 나와요':'추첨 초기화 후 다시 시작할 수 있어요'}
function renderInteraction(){const drawPct=Math.min(100,Math.round(forwardProgress/TURN_REQUIRED*100));els.mixGuide.classList.remove('active','done');els.drawGuide.classList.add('active');els.drawGuide.classList.remove('done');els.mixGuideText.textContent='시계 방향으로 섞기 · 선택';els.drawGuideText.textContent=pendingDraws?('구슬 '+pendingDraws+'개 배출 대기'):drawPct?('앞으로 돌리는 중 '+drawPct+'%'):'반시계 방향 1바퀴마다 뽑기';els.dragTip.innerHTML='<b>손잡이</b>를 반시계 방향으로 한 바퀴 돌릴 때마다 구슬이 나와요';machine?.setInteractionState?.({forward:drawPct/100})}
function render(){'''
entry, result_count = result_pattern.subn(result_replacement, entry, count=1)
if result_count != 1:
    raise SystemExit(f"result/interaction replacement failed: {result_count}")

entry = replace_once(
    entry,
    "els.draw.disabled=state.busy||!validConfig();els.reset.disabled=state.busy||(!state.history.length&&remaining===configured);",
    "els.draw.disabled=state.busy||pendingDraws>0||autoRunning||!validConfig();els.reset.disabled=state.busy||pendingDraws>0||autoRunning||(!state.history.length&&remaining===configured);",
    "button disabled state",
)

queue_pattern = re.compile(
    r"function commitResult\(index,result,source\)\{[\s\S]*?\}\nfunction addRow\(\)\{",
    re.M,
)
queue_replacement = r'''function reservedDraws(){return pendingDraws+(state.busy?1:0)}
function canQueueDraw(){return validConfig()&&sumRemaining()>reservedDraws()}
function processDrawQueue(){if(state.busy||pendingDraws<=0)return;if(!validConfig()){pendingDraws=0;renderInteraction();return}pendingDraws--;performDraw('manual')}
function commitResult(index,result,source){state.remaining[index]=Math.max(0,state.remaining[index]-1);state.history.unshift(result);state.last=result;state.busy=false;save();render();try{navigator.vibrate?.([12,38,20])}catch(_){}try{window.FUNY_TRACK?.('garapon_draw',{source,color:result.colorKey,prize:result.prize,remaining_count:sumRemaining(),total_count:state.total})}catch(_){}if(pendingDraws>0&&sumRemaining()>0)setTimeout(processDrawQueue,70)}
function performDraw(source='manual'){if(state.busy)return false;if(!validConfig()){showToast(sumConfigured()!==state.total?'컬러별 수량 합계를 총 구슬 수와 맞춰주세요.':'남은 구슬이 없어요.');return false}const {index,result}=chooseResult(),p=colorOf(result.colorKey);state.busy=true;state.last=null;renderResult();els.draw.disabled=true;if(machine&&typeof machine.releaseBall==='function')machine.releaseBall(p.color,p.edge,()=>commitResult(index,result,source));else setTimeout(()=>commitResult(index,result,source),700);return true}
function enqueueManualDraw(){if(!canQueueDraw())return false;pendingDraws++;processDrawQueue();return true}
function onManualDelta(delta){playGaraponRattle(Math.max(1,sumRemaining()-reservedDraws()),Math.abs(delta));if(delta<0){forwardProgress+=-delta;while(forwardProgress>=TURN_REQUIRED){forwardProgress-=TURN_REQUIRED;if(!enqueueManualDraw())break}}renderInteraction()}
function autoDraw(){ensureGaraponAudio();if(state.busy||pendingDraws>0||autoRunning||!validConfig()){if(!validConfig())showToast(sumConfigured()!==state.total?'컬러별 수량 합계를 총 구슬 수와 맞춰주세요.':'남은 구슬이 없어요.');return}autoRunning=true;state.busy=true;state.last=null;forwardProgress=0;renderResult();renderInteraction();els.draw.disabled=true;if(machine&&typeof machine.autoSequence==='function')machine.autoSequence({onForward:p=>{forwardProgress=TURN_REQUIRED*p;playGaraponRattle(sumRemaining(),.17);renderInteraction()},onReady:()=>{autoRunning=false;state.busy=false;forwardProgress=0;performDraw('auto')}});else setTimeout(()=>{autoRunning=false;state.busy=false;performDraw('auto')},900)}
function addRow(){'''
entry, queue_count = queue_pattern.subn(queue_replacement, entry, count=1)
if queue_count != 1:
    raise SystemExit(f"draw queue replacement failed: {queue_count}")

entry = replace_once(
    entry,
    "invalid:()=>showToast(sumConfigured()!==state.total?'컬러별 수량 합계를 총 구슬 수와 맞춰주세요.':sumRemaining()<=0?'남은 구슬이 없어요.':'추첨 중에는 조작할 수 없어요.'),delta:onManualDelta",
    "invalid:()=>showToast(sumConfigured()!==state.total?'컬러별 수량 합계를 총 구슬 수와 맞춰주세요.':sumRemaining()<=0?'남은 구슬이 없어요.':'자동 추첨이 끝난 뒤 조작해주세요.'),delta:onManualDelta",
    "invalid message",
)

fallback_pattern = re.compile(r"autoSequence\(\{onMix,onForward,onReady\}\)\{[\s\S]*?\},setInteractionState\(\)\{\},setPileBalls\(\)\{\}", re.M)
fallback_replacement = "autoSequence({onForward,onReady}){let p=0;const id=setInterval(()=>{p=Math.min(1,p+.075);onForward?.(p);if(p>=1){clearInterval(id);onReady?.()}},60)},setInteractionState(){},setPileBalls(){}"
entry, fallback_count = fallback_pattern.subn(fallback_replacement, entry, count=1)
if fallback_count != 1:
    raise SystemExit(f"fallback auto sequence replacement failed: {fallback_count}")

entry_path.write_text(entry, encoding="utf-8")


# -----------------------------------------------------------------------------
# 3) Update guide copy and cache versions.
# -----------------------------------------------------------------------------
html_path = Path("garapon.html")
html = html_path.read_text(encoding="utf-8")
html = html.replace(
    '<strong class="result-title" id="resultTitle">손잡이를 뒤로 돌려 섞어보세요</strong><span class="result-sub" id="resultSub">실제 손잡이를 잡듯 원을 그리며 돌려주세요</span>',
    '<strong class="result-title" id="resultTitle">손잡이를 앞으로 돌려보세요</strong><span class="result-sub" id="resultSub">한 바퀴 돌릴 때마다 구슬이 하나씩 나와요</span>',
)
html = html.replace(
    '<span class="gesture-step active" id="mixGuide"><i>1</i><span id="mixGuideText">뒤로 돌려 섞기</span></span><span class="guide-arrow">→</span><span class="gesture-step" id="drawGuide"><i>2</i><span id="drawGuideText">앞으로 돌려 뽑기</span></span>',
    '<span class="gesture-step" id="mixGuide"><i>↷</i><span id="mixGuideText">시계 방향으로 섞기 · 선택</span></span><span class="guide-arrow">→</span><span class="gesture-step active" id="drawGuide"><i>↶</i><span id="drawGuideText">반시계 방향 1바퀴마다 뽑기</span></span>',
)
html = html.replace(
    '<div class="drag-tip" id="dragTip"><b>손잡이</b>를 잡고 반시계 방향으로 돌려주세요</div>',
    '<div class="drag-tip" id="dragTip"><b>손잡이</b>를 반시계 방향으로 한 바퀴 돌릴 때마다 구슬이 나와요</div>',
)
html = html.replace(
    '<p class="tip"><b>TIP ·</b> 손잡이를 반시계 방향으로 충분히 섞은 뒤 시계 방향으로 돌리면 구슬이 배출됩니다. 자동 추첨도 동일한 비복원 확률을 사용합니다.</p>',
    '<p class="tip"><b>TIP ·</b> 시계 방향으로 섞는 동작은 선택이에요. 손잡이를 반시계 방향으로 한 바퀴 돌릴 때마다 구슬이 연속 추첨됩니다.</p>',
)
html = re.sub(r'garapon-three-v2\.js\?v=[^"\']+', f'garapon-three-v2.js?v={VERSION}', html)
html_path.write_text(html, encoding="utf-8")

tools_path = Path("tcg-tools.html")
tools = tools_path.read_text(encoding="utf-8")
tools = re.sub(r'garapon\.html\?v=[^"\']+', f'garapon.html?v={VERSION}', tools, count=1)
tools_path.write_text(tools, encoding="utf-8")
