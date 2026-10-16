from pathlib import Path
import re

VERSION = "20261016-shiny-metal1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old in text:
        return text.replace(old, new, 1)
    if new in text:
        return text
    raise SystemExit(f"{label} anchor not found")


# -----------------------------------------------------------------------------
# 1) Brighter palette values for gold and silver only.
# -----------------------------------------------------------------------------
entry_path = Path("garapon-three-v2.js")
entry = entry_path.read_text(encoding="utf-8")
entry = replace_once(
    entry,
    " {key:'gold',name:'골드',color:'#e1b43e',edge:'#a87913',metallic:true},\n {key:'silver',name:'실버',color:'#c8cdd5',edge:'#747b86',metallic:true},",
    " {key:'gold',name:'골드',color:'#ffd95a',edge:'#e6a900',metallic:true},\n {key:'silver',name:'실버',color:'#f2f5fa',edge:'#aeb8c8',metallic:true},",
    "gold/silver palette",
)
entry = re.sub(
    r"from './garapon-three-machine-v2\.js\?v=[^']+'",
    f"from './garapon-three-machine-v2.js?v={VERSION}'",
    entry,
    count=1,
)
entry_path.write_text(entry, encoding="utf-8")


# -----------------------------------------------------------------------------
# 2) Bright metallic 3D materials + small additive glints on metallic balls.
#    No machine geometry, camera, frame, tray or interaction values are changed.
# -----------------------------------------------------------------------------
machine_path = Path("garapon-three-machine-v2.js")
machine = machine_path.read_text(encoding="utf-8")

machine = replace_once(
    machine,
    "    this.sharedPileGeometry = new THREE.SphereGeometry(0.127, 18, 12);",
    """    this.sharedPileGeometry = new THREE.SphereGeometry(0.127, 18, 12);
    this.metallicGlintGeometry = new THREE.SphereGeometry(0.022, 10, 8);
    this.metallicGlintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });""",
    "metallic glint setup",
)

machine = replace_once(
    machine,
    """    this.resultBall.visible = false;
    this.root.add(this.resultBall);
    this.ballStart = new THREE.Vector3();""",
    """    this.resultBall.visible = false;
    this.root.add(this.resultBall);
    this.resultGlint = this.mesh(
      this.metallicGlintGeometry,
      this.metallicGlintMaterial,
      {
        position: [-0.046, 0.052, 0.108],
        scale: [1, 0.78, 0.5],
        cast: false,
        receive: false,
      },
    );
    this.resultGlint.visible = false;
    this.resultBall.add(this.resultGlint);
    this.ballStart = new THREE.Vector3();""",
    "result glint",
)

material_pattern = re.compile(
    r"\n  materialForBall\(color, edge\) \{[\s\S]*?\n  \}\n\n  pilePosition",
    re.M,
)
material_replacement = r'''
  isMetallicBall(color) {
    const normalized = String(color || '').toLowerCase();
    return normalized === '#ffd95a' || normalized === '#f2f5fa';
  }

  addMetallicGlint(ball, color, index = 0) {
    if (!this.isMetallicBall(color)) return;
    const glint = this.mesh(
      this.metallicGlintGeometry,
      this.metallicGlintMaterial,
      {
        position: [-0.043 + (index % 3) * 0.004, 0.049, 0.103],
        scale: [1, 0.76, 0.48],
        cast: false,
        receive: false,
      },
    );
    ball.add(glint);
  }

  materialForBall(color, edge) {
    const key = `${color}|${edge}`;
    if (!this.ballMaterials.has(key)) {
      const normalized = String(color || '').toLowerCase();
      const colorValue = new THREE.Color(color);
      const edgeValue = new THREE.Color(edge || color);
      const isGold = normalized === '#ffd95a';
      const isSilver = normalized === '#f2f5fa';
      const isMetallic = isGold || isSilver;
      const emissiveColor = isGold
        ? new THREE.Color(0xffc735)
        : isSilver
          ? new THREE.Color(0xe5edff)
          : edgeValue;
      this.ballMaterials.set(key, new THREE.MeshPhysicalMaterial({
        color: colorValue,
        emissive: emissiveColor,
        emissiveIntensity: isMetallic ? (isSilver ? 0.14 : 0.11) : 0.025,
        roughness: isMetallic ? (isSilver ? 0.05 : 0.07) : 0.31,
        metalness: isMetallic ? (isSilver ? 0.68 : 0.58) : 0.02,
        clearcoat: isMetallic ? 1 : 0.32,
        clearcoatRoughness: isMetallic ? 0.015 : 0.2,
        reflectivity: isMetallic ? 1 : 0.5,
        ior: isMetallic ? 1.75 : 1.5,
        specularIntensity: isMetallic ? 1 : 0.5,
        specularColor: new THREE.Color(0xffffff),
      }));
    }
    return this.ballMaterials.get(key);
  }

  pilePosition'''
machine, material_count = material_pattern.subn("\n" + material_replacement, machine, count=1)
if material_count != 1:
    raise SystemExit(f"metallic material replacement failed: {material_count}")

pile_pattern = re.compile(
    r"\n  addPileBall\(color, edge, index = this\.pileBalls\.length\) \{[\s\S]*?\n  \}\n\n  setPileBalls",
    re.M,
)
pile_replacement = r'''
  addPileBall(color, edge, index = this.pileBalls.length) {
    const ball = this.mesh(
      this.sharedPileGeometry,
      this.materialForBall(color, edge),
      { position: this.pilePosition(index).toArray() },
    );
    ball.rotation.set(index * 0.17, index * 0.29, index * 0.11);
    this.addMetallicGlint(ball, color, index);
    this.pileGroup.add(ball);
    this.pileBalls.push(ball);
    return ball;
  }

  setPileBalls'''
machine, pile_count = pile_pattern.subn("\n" + pile_replacement, machine, count=1)
if pile_count != 1:
    raise SystemExit(f"pile glint replacement failed: {pile_count}")

machine = replace_once(
    machine,
    """    this.resultBall.material = this.materialForBall(color, edge);
    this.resultBall.visible = true;""",
    """    this.resultBall.material = this.materialForBall(color, edge);
    this.resultGlint.visible = this.isMetallicBall(color);
    this.resultBall.visible = true;""",
    "result metallic glint visibility",
)

machine = replace_once(
    machine,
    """    this.resultBall.visible = false;
    this.resultBall.scale.setScalar(0.01);
    this.clearPile();""",
    """    this.resultBall.visible = false;
    this.resultBall.scale.setScalar(0.01);
    if (this.resultGlint) this.resultGlint.visible = false;
    this.clearPile();""",
    "reset result glint",
)

machine = replace_once(
    machine,
    """    this.renderer.render(this.scene, this.camera);""",
    """    if (this.metallicGlintMaterial) {
      this.metallicGlintMaterial.opacity = 0.78 + Math.sin(now * 0.0075) * 0.17;
    }
    this.renderer.render(this.scene, this.camera);""",
    "metallic glint animation",
)

machine_path.write_text(machine, encoding="utf-8")


# -----------------------------------------------------------------------------
# 3) Brighter, animated metallic UI surfaces for gold and silver only.
# -----------------------------------------------------------------------------
css_path = Path("garapon-three-v2.css")
css = css_path.read_text(encoding="utf-8")
metal_pattern = re.compile(r"\.color-dot\.metallic,[^\n]+\n", re.M)
metal_rule = """.color-dot.metallic,.remaining-ball.metallic,.history-ball.metallic,.drawn-ball.metallic{position:relative;background:radial-gradient(circle at 26% 20%,#fff 0 8%,rgba(255,255,255,.96) 9% 15%,transparent 29%),radial-gradient(circle at 72% 73%,rgba(255,255,255,.88) 0 5%,transparent 16%),linear-gradient(135deg,var(--edge) 0%,var(--c) 23%,#fff 43%,var(--c) 62%,#fff 78%,var(--edge) 100%);background-size:165% 165%;box-shadow:inset -2px -3px 4px rgba(0,0,0,.12),inset 3px 3px 6px rgba(255,255,255,.94),0 0 7px rgba(255,255,255,.76),0 2px 6px rgba(47,38,57,.14);filter:brightness(1.15) saturate(1.08);animation:metallicShimmer 2.1s linear infinite}@keyframes metallicShimmer{0%{background-position:0% 0%}50%{background-position:100% 100%}100%{background-position:0% 0%}}
"""
css, metal_count = metal_pattern.subn(metal_rule, css, count=1)
if metal_count != 1:
    raise SystemExit(f"metallic CSS replacement failed: {metal_count}")
css_path.write_text(css, encoding="utf-8")


# -----------------------------------------------------------------------------
# 4) Cache-bust only; no layout or machine design changes.
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
