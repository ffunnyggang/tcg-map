from pathlib import Path
import re

VERSION = "20261016-hole-release1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor not found")


machine_path = Path("garapon-three-machine-v2.js")
machine = machine_path.read_text(encoding="utf-8")

machine = replace_once(
    machine,
    "    const outletGroup = new THREE.Group();\n",
    "    const outletGroup = new THREE.Group();\n    this.outletGroup = outletGroup;\n",
    "outlet group",
)
machine = replace_once(
    machine,
    "    this.outletAnchor.position.set(0, 0.31, 0);",
    "    this.outletAnchor.position.set(0, 0.15, 0);",
    "outlet mouth anchor",
)

old_outlet_position = """  outletPosition(target = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    this.outletAnchor.getWorldPosition(target);
    return this.root.worldToLocal(target);
  }
"""
new_outlet_position = """  outletPosition(target = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    this.outletAnchor.getWorldPosition(target);
    return this.root.worldToLocal(target);
  }

  outletPose(positionTarget = new THREE.Vector3(), directionTarget = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    const center = new THREE.Vector3();
    this.outletAnchor.getWorldPosition(positionTarget);
    this.outletGroup.getWorldPosition(center);
    this.root.worldToLocal(positionTarget);
    this.root.worldToLocal(center);
    directionTarget.copy(positionTarget).sub(center).normalize();
    return { position: positionTarget, direction: directionTarget };
  }
"""
machine = replace_once(machine, old_outlet_position, new_outlet_position, "outlet pose")

release_pattern = re.compile(
    r"  releaseBall\(color, edge, done\) \{[\s\S]*?\n  \}\n\n  // Automatic draw",
    re.M,
)
release_replacement = """  releaseBall(color, edge, done) {
    const targetIndex = this.pileBalls.length;
    this.resultBall.material = this.materialForBall(color, edge);
    this.resultGlint.visible = this.isMetallicBall(color);
    this.resultBall.visible = true;
    this.resultBall.scale.setScalar(0.18);

    const direction = new THREE.Vector3();
    this.outletPose(this.ballStart, direction);
    this.resultBall.position.copy(this.ballStart).addScaledVector(direction, -0.065);
    this.ballEnd.copy(this.pilePosition(targetIndex));

    this.ballAnim = {
      phase: 'mouth',
      phaseStart: performance.now(),
      gateDuration: this.dragging ? 72 : 105,
      flightDuration: 780,
      direction,
      color,
      edge,
      targetIndex,
      done,
    };
    try { navigator.vibrate?.(15); } catch (_) {}
  }

  // Automatic draw"""
machine, release_count = release_pattern.subn(release_replacement, machine, count=1)
if release_count != 1 and "phase: 'mouth'" not in machine:
    raise SystemExit("releaseBall block not found")

animation_pattern = re.compile(
    r"    if \(this\.ballAnim\) \{[\s\S]*?\n    \}\n\n    if \(this\.metallicGlintMaterial\)",
    re.M,
)
animation_replacement = """    if (this.ballAnim) {
      const animation = this.ballAnim;

      if (animation.phase === 'mouth') {
        const mouthT = Math.min(1, (now - animation.phaseStart) / animation.gateDuration);
        const emerge = mouthT * mouthT * (3 - 2 * mouthT);

        // Keep the ball physically attached to the real rotating outlet for the
        // first few frames. Even during a very fast manual turn, the ball can no
        // longer appear from the previous outlet position.
        this.outletPose(this.ballStart, animation.direction);
        this.resultBall.position
          .copy(this.ballStart)
          .addScaledVector(animation.direction, -0.065 + emerge * 0.16);
        this.resultBall.scale.setScalar(0.18 + emerge * 0.82);
        this.resultBall.rotation.x += deltaTime * 3.2;
        this.resultBall.rotation.z += deltaTime * 2.1;

        if (mouthT >= 1) {
          // Detach only after the sphere has visibly crossed the hole mouth,
          // then preserve the outlet's current direction as the first section
          // of the flight path toward the brass tray.
          this.outletPose(this.ballStart, animation.direction);
          this.ballStart.addScaledVector(animation.direction, 0.095);
          this.resultBall.position.copy(this.ballStart);
          this.ballEnd.copy(this.pilePosition(animation.targetIndex));
          this.ballControl1.copy(this.ballStart).addScaledVector(animation.direction, 0.4);
          this.ballControl1.y += 0.025;
          this.ballControl2.copy(this.ballStart).lerp(this.ballEnd, 0.58);
          this.ballControl2.y += 0.28;
          this.ballControl2.z += 0.08;
          animation.phase = 'flight';
          animation.phaseStart = now;
        }
      } else {
        const t = Math.min(1, (now - animation.phaseStart) / animation.flightDuration);
        const eased = t < 0.72 ? 1 - Math.pow(1 - t / 0.72, 3) : 1;
        this.cubicBezier(
          this.ballStart,
          this.ballControl1,
          this.ballControl2,
          this.ballEnd,
          eased,
          this.resultBall.position,
        );
        const bounce = t > 0.72
          ? Math.abs(Math.sin((t - 0.72) * Math.PI * 3.2)) * (1 - t) * 0.22
          : 0;
        this.resultBall.position.y += bounce;
        this.resultBall.scale.setScalar(1);
        this.resultBall.rotation.x += deltaTime * 7;
        this.resultBall.rotation.z += deltaTime * 4;

        if (t >= 1) {
          const { color, edge, targetIndex, done } = animation;
          this.ballAnim = null;
          this.addPileBall(color, edge, targetIndex);
          this.resultBall.visible = false;
          this.resultBall.scale.setScalar(0.01);
          done?.();
        }
      }
    }

    if (this.metallicGlintMaterial)"""
machine, animation_count = animation_pattern.subn(animation_replacement, machine, count=1)
if animation_count != 1 and "Keep the ball physically attached" not in machine:
    raise SystemExit("ball animation block not found")

machine_path.write_text(machine, encoding="utf-8")

entry_path = Path("garapon-three-v2.js")
entry = entry_path.read_text(encoding="utf-8")
entry = re.sub(
    r"from './garapon-three-machine-v2\.js(?:\?v=[^']*)?'",
    f"from './garapon-three-machine-v2.js?v={VERSION}'",
    entry,
    count=1,
)
entry_path.write_text(entry, encoding="utf-8")

html_path = Path("garapon.html")
html = html_path.read_text(encoding="utf-8")
html = re.sub(
    r"garapon-three-v2\.js\?v=[^\"']+",
    f"garapon-three-v2.js?v={VERSION}",
    html,
    count=1,
)
html_path.write_text(html, encoding="utf-8")

tools_path = Path("tcg-tools.html")
tools = tools_path.read_text(encoding="utf-8")
tools = re.sub(
    r"garapon\.html\?v=[^\"']+",
    f"garapon.html?v={VERSION}",
    tools,
    count=1,
)
tools_path.write_text(tools, encoding="utf-8")
