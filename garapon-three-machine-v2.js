import * as THREE from './vendor/three-r162.module.min.js?v=20261015-local1';

function RoundedBoxGeometry(width = 1, height = 1, depth = 1, segments = 4, radius = 0.1) {
  const hw = Math.max(0.001, width / 2);
  const hh = Math.max(0.001, height / 2);
  const r = Math.max(0, Math.min(radius, hw, hh));
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  const bevel = Math.min(r * 0.42, Math.max(0.001, depth * 0.14));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelSegments: Math.max(1, segments),
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: Math.max(2, segments),
  });
  geometry.translate(0, 0, -depth / 2 + bevel);
  geometry.computeVertexNormals();
  return geometry;
}

export class GaraponMachine {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.stage = options.stage;
    this.dragTip = options.dragTip;
    this.callbacks = options;
    this.dragging = false;
    this.prevPointerAngle = 0;
    this.drumAngle = 0;
    this.targetDrumAngle = 0;
    this.ballAnim = null;
    this.autoAnim = null;
    this.clock = new THREE.Clock();
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.dragTargets = [];
    this.pileBalls = [];
    this.ballMaterials = new Map();
    this.init();
  }

  init() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (primaryError) {
      console.warn('[GARAPON 3D] high-performance context failed; retrying compatibility mode', primaryError);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        alpha: true,
        powerPreference: 'default',
      });
    }

    this.rendererMode = this.renderer.capabilities.isWebGL2 ? 'webgl2' : 'webgl1';
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.renderer.capabilities.isWebGL2 ? 1.7 : 1.15),
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28.5, 1, 0.1, 100);
    this.camera.position.set(-5.9, 4.85, 12.65);
    this.camera.lookAt(-0.12, 2.35, 0.42);

    this.addLights();
    this.buildMachine();
    this.bind();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.canvas.parentElement);
    this.renderer.setAnimationLoop(() => this.renderFrame());
    window.__GARAPON_3D_READY = true;
    this.callbacks.onReady?.();
  }

  addLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xc7bbcc, 1.9);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff6e7, 3.15);
    key.position.set(-4.5, 10.5, 8.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.00022;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xe5ddff, 1.05);
    fill.position.set(6, 5, 4);
    this.scene.add(fill);

    const rim = new THREE.PointLight(0xffddb0, 1.05, 18);
    rim.position.set(2.5, 5.5, -5.5);
    this.scene.add(rim);
  }

  woodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const base = ctx.createLinearGradient(0, 0, 0, canvas.height);
    base.addColorStop(0, '#f5dfb8');
    base.addColorStop(0.48, '#e8c99a');
    base.addColorStop(1, '#dcb783');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineCap = 'round';
    for (let i = 0; i < 48; i += 1) {
      const y = 8 + (i * 10.7) + Math.sin(i * 1.31) * 2.4;
      const amplitude = 1.2 + (i % 5) * 0.36;
      ctx.strokeStyle = i % 7 === 0 ? 'rgba(120,78,39,.080)' : 'rgba(137,91,47,.045)';
      ctx.lineWidth = i % 7 === 0 ? 1.15 : 0.72;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 42) {
        const wave = Math.sin(x * 0.013 + i * 0.71) * amplitude
          + Math.sin(x * 0.0038 + i * 0.22) * 1.25;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 0.75;
    for (let i = 0; i < 12; i += 1) {
      const y = 18 + i * 41.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(280, y - 3, 710, y + 4, 1024, y - 1);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(6, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  mesh(geometry, material, {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1],
    cast = true,
    receive = true,
  } = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    return mesh;
  }

  beamBetween(start, end, depth, material, z) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    return this.mesh(
      new RoundedBoxGeometry(depth, length, depth * 0.92, 4, depth * 0.22),
      material,
      {
        position: [(start.x + end.x) / 2, (start.y + end.y) / 2, z],
        rotation: [0, 0, angle],
      },
    );
  }

  buildMachine() {
    const grain = this.woodTexture();
    const woodFace = new THREE.MeshPhysicalMaterial({
      map: grain,
      color: 0xfff7e9,
      roughness: 0.72,
      metalness: 0,
      clearcoat: 0.035,
      clearcoatRoughness: 0.82,
    });
    const woodSide = new THREE.MeshStandardMaterial({
      color: 0xd6aa72,
      roughness: 0.8,
      metalness: 0,
    });
    const woodFrame = new THREE.MeshStandardMaterial({
      map: grain,
      color: 0xf5deb7,
      roughness: 0.76,
      metalness: 0,
    });
    const woodHandle = new THREE.MeshStandardMaterial({
      color: 0xb87b42,
      roughness: 0.72,
      metalness: 0,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xd4a23c,
      metalness: 0.72,
      roughness: 0.26,
    });
    const brassDark = new THREE.MeshStandardMaterial({
      color: 0x8f641e,
      metalness: 0.45,
      roughness: 0.42,
    });
    const steel = new THREE.MeshStandardMaterial({
      color: 0x8e8b91,
      metalness: 0.82,
      roughness: 0.24,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x342f34,
      metalness: 0.68,
      roughness: 0.28,
    });

    this.root = new THREE.Group();
    this.root.position.set(0.08, -0.12, 0.02);
    this.root.rotation.y = 0.015;
    this.scene.add(this.root);

    const ground = this.mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.ShadowMaterial({ color: 0x2f2736, opacity: 0.14 }),
      { position: [0, 0.01, 0], rotation: [-Math.PI / 2, 0, 0], cast: false },
    );
    this.scene.add(ground);

    const base = this.mesh(
      new RoundedBoxGeometry(7.35, 0.46, 3.72, 6, 0.14),
      woodFrame,
      { position: [0, 0.29, 0.12] },
    );
    this.root.add(base);
    const baseInset = this.mesh(
      new RoundedBoxGeometry(7.08, 0.12, 3.48, 4, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xc39460, roughness: 0.82 }),
      { position: [0, 0.08, 0.12] },
    );
    this.root.add(baseInset);

    const footMaterial = new THREE.MeshStandardMaterial({ color: 0x343238, roughness: 0.72 });
    [[-3.25, 1.45], [3.25, 1.45], [-3.25, -1.2], [3.25, -1.2]].forEach(([x, z]) => {
      this.root.add(this.mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.08, 18),
        footMaterial,
        { position: [x, 0.035, z] },
      ));
    });

    const trayCenter = new THREE.Vector3(-1.84, 0.62, 1.28);
    const trayRotationY = 0.015;
    const trayBottom = this.mesh(
      new RoundedBoxGeometry(3.72, 0.14, 1.58, 6, 0.2),
      brass,
      { position: trayCenter.toArray(), rotation: [0, trayRotationY, -0.018] },
    );
    this.root.add(trayBottom);
    const trayFloor = this.mesh(
      new RoundedBoxGeometry(3.35, 0.055, 1.22, 5, 0.16),
      brassDark,
      { position: [trayCenter.x, 0.72, trayCenter.z], rotation: [0, trayRotationY, -0.018] },
    );
    this.root.add(trayFloor);
    const trayWallLong = new RoundedBoxGeometry(3.68, 0.34, 0.12, 4, 0.055);
    const trayWallShort = new RoundedBoxGeometry(0.12, 0.34, 1.45, 4, 0.055);
    this.root.add(
      this.mesh(trayWallLong, brass, { position: [trayCenter.x, 0.82, trayCenter.z + 0.72], rotation: [0, trayRotationY, -0.018] }),
      this.mesh(trayWallLong, brass, { position: [trayCenter.x, 0.82, trayCenter.z - 0.72], rotation: [0, trayRotationY, -0.018] }),
      this.mesh(trayWallShort, brass, { position: [trayCenter.x - 1.79, 0.82, trayCenter.z], rotation: [0, trayRotationY, -0.018] }),
      this.mesh(trayWallShort, brass, { position: [trayCenter.x + 1.79, 0.82, trayCenter.z], rotation: [0, trayRotationY, -0.018] }),
    );

    this.pileGroup = new THREE.Group();
    this.root.add(this.pileGroup);
    this.sharedPileGeometry = new THREE.SphereGeometry(0.127, 18, 12);
    this.metallicGlintGeometry = new THREE.SphereGeometry(0.022, 10, 8);
    this.metallicGlintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const axisY = 3.22;
    const frontZ = 1.17;
    const backZ = -1.03;
    const apex = { x: 0.06, y: axisY };
    const leftFoot = { x: -1.02, y: 0.56 };
    const rightFoot = { x: 1.12, y: 0.56 };
    [backZ, frontZ].forEach((z, index) => {
      const frameDepth = index === 1 ? 0.34 : 0.31;
      const frameMaterial = index === 1 ? woodFrame : woodFrame.clone();
      if (index === 0) frameMaterial.color.set(0xe4c392);
      this.root.add(
        this.beamBetween(leftFoot, apex, frameDepth, frameMaterial, z),
        this.beamBetween(rightFoot, apex, frameDepth, frameMaterial, z),
        this.mesh(
          new RoundedBoxGeometry(2.42, 0.28, frameDepth * 0.98, 4, 0.07),
          frameMaterial,
          { position: [0.05, 0.55, z] },
        ),
      );
    });

    const axle = this.mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 2.78, 30),
      steel,
      { position: [0.06, axisY, 0.07], rotation: [Math.PI / 2, 0, 0] },
    );
    this.root.add(axle);
    this.root.add(
      this.mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.14, 32), brass, {
        position: [0.06, axisY, frontZ + 0.19],
        rotation: [Math.PI / 2, 0, 0],
      }),
      this.mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.13, 32), brass, {
        position: [0.06, axisY, backZ - 0.17],
        rotation: [Math.PI / 2, 0, 0],
      }),
    );

    this.drumPivot = new THREE.Group();
    this.drumPivot.position.set(0.06, axisY, 0.02);
    this.root.add(this.drumPivot);

    const octagon = new THREE.Shape();
    const radius = 2.06;
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.PI / 8 + i * Math.PI / 4;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) octagon.moveTo(x, y);
      else octagon.lineTo(x, y);
    }
    octagon.closePath();
    const drumDepth = 1.58;
    const drumGeometry = new THREE.ExtrudeGeometry(octagon, {
      depth: drumDepth,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.075,
      bevelThickness: 0.055,
      curveSegments: 2,
    });
    drumGeometry.translate(0, 0, -drumDepth / 2);
    drumGeometry.computeVertexNormals();
    const drum = this.mesh(drumGeometry, [woodFace, woodSide]);
    this.drumPivot.add(drum);

    const edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(drumGeometry, 35),
      new THREE.LineBasicMaterial({ color: 0xa97d4b, transparent: true, opacity: 0.16 }),
    );
    this.drumPivot.add(edgeLines);

    const hatchMaterial = new THREE.MeshStandardMaterial({ color: 0x4c474a, metalness: 0.48, roughness: 0.34 });
    this.drumPivot.add(
      this.mesh(new RoundedBoxGeometry(0.54, 0.09, 0.055, 3, 0.03), hatchMaterial, {
        position: [-0.34, 1.57, 0.84], rotation: [0, 0, -0.02],
      }),
      this.mesh(new RoundedBoxGeometry(0.54, 0.09, 0.055, 3, 0.03), hatchMaterial, {
        position: [0.34, 1.57, 0.84], rotation: [0, 0, 0.02],
      }),
    );

    this.drumPivot.add(this.mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.26, 30),
      brass,
      { position: [0, 0, 0.93], rotation: [Math.PI / 2, 0, 0] },
    ));

    this.handleGroup = new THREE.Group();
    this.handleGroup.position.set(0, 0, 0);
    this.drumPivot.add(this.handleGroup);

    const crankArm = this.mesh(
      new RoundedBoxGeometry(1.52, 0.2, 0.22, 4, 0.07),
      woodFrame,
      { position: [0.76, 0, 1.36] },
    );
    this.handleGroup.add(crankArm);
    this.handleGroup.add(this.mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.44, 24),
      brass,
      { position: [1.51, 0, 1.52], rotation: [Math.PI / 2, 0, 0] },
    ));
    const knob = this.mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.68, 28),
      woodHandle,
      { position: [1.51, 0, 1.86], rotation: [Math.PI / 2, 0, 0] },
    );
    this.handleGroup.add(knob);
    const knobEnd = this.mesh(
      new THREE.CylinderGeometry(0.255, 0.255, 0.055, 28),
      new THREE.MeshStandardMaterial({ color: 0x9a6234, roughness: 0.66 }),
      { position: [1.51, 0, 2.215], rotation: [Math.PI / 2, 0, 0] },
    );
    this.handleGroup.add(knobEnd);
    this.knobHit = this.mesh(
      new THREE.SphereGeometry(0.44, 16, 12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001, depthWrite: false }),
      { position: [1.51, 0, 1.88], cast: false, receive: false },
    );
    this.handleGroup.add(this.knobHit);
    this.dragTargets = [this.knobHit, knob, knobEnd];


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
      new THREE.SphereGeometry(0.133, 22, 14),
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
    this.ballStart = new THREE.Vector3();
    this.ballControl1 = new THREE.Vector3();
    this.ballControl2 = new THREE.Vector3();
    this.ballEnd = this.pilePosition(0);
  }

  bind() {
    const down = (event) => {
      if (!this.callbacks.canInteract()) {
        this.callbacks.invalid();
        return;
      }
      const knob = this.knobWorldToScreen();
      const dx = event.clientX - knob.x;
      const dy = event.clientY - knob.y;
      if (Math.hypot(dx, dy) > 68 && !this.hitHandle(event)) return;
      event.preventDefault();
      this.dragging = true;
      this.canvas.setPointerCapture?.(event.pointerId);
      this.prevPointerAngle = this.pointerAngle(event);
      this.stage.classList.add('dragging');
      this.dragTip.classList.add('hidden');
    };

    const move = (event) => {
      if (!this.dragging) return;
      event.preventDefault();
      const angle = this.pointerAngle(event);
      let delta = angle - this.prevPointerAngle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      delta = THREE.MathUtils.clamp(delta, -0.34, 0.34);
      this.prevPointerAngle = angle;
      if (Math.abs(delta) < 0.002) return;
      // Pointer angles use screen coordinates: clockwise gestures are positive.
      // Three.js positive Z rotation appears counter-clockwise from this camera,
      // so invert only the rendered angle while preserving the gesture delta.
      this.drumAngle -= delta;
      this.targetDrumAngle = this.drumAngle;
      this.drumPivot.rotation.z = this.drumAngle;
      this.callbacks.delta(delta);
    };

    const up = (event) => {
      if (!this.dragging) return;
      this.dragging = false;
      try { this.canvas.releasePointerCapture?.(event.pointerId); } catch (_) {}
      this.stage.classList.remove('dragging');
      this.dragTip.classList.remove('hidden');
    };

    this.canvas.addEventListener('pointerdown', down, { passive: false });
    this.canvas.addEventListener('pointermove', move, { passive: false });
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
  }

  pointerAngle(event) {
    const center = this.centerWorldToScreen();
    return Math.atan2(event.clientY - center.y, event.clientX - center.x);
  }

  centerWorldToScreen() {
    const point = new THREE.Vector3();
    this.drumPivot.getWorldPosition(point);
    point.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (point.x + 1) * rect.width / 2,
      y: rect.top + (1 - point.y) * rect.height / 2,
    };
  }

  knobWorldToScreen() {
    const point = new THREE.Vector3();
    this.knobHit.getWorldPosition(point);
    point.project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (point.x + 1) * rect.width / 2,
      y: rect.top + (1 - point.y) * rect.height / 2,
    };
  }

  hitHandle(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.dragTargets, false).length > 0;
  }

  setInteractionState() {}


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

  pilePosition(index) {
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

  clearPile() {
    for (const ball of this.pileBalls) this.pileGroup.remove(ball);
    this.pileBalls = [];
  }


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

  setPileBalls(items = []) {
    this.clearPile();
    items.slice(0, 144).forEach((item, index) => {
      this.addPileBall(item.color, item.edge, index);
    });
  }

  resetBall() {
    this.ballAnim = null;
    this.resultBall.visible = false;
    this.resultBall.scale.setScalar(0.01);
    if (this.resultGlint) this.resultGlint.visible = false;
    this.clearPile();
  }


  outletPosition(target = new THREE.Vector3()) {
    this.root.updateMatrixWorld(true);
    this.outletAnchor.getWorldPosition(target);
    return this.root.worldToLocal(target);
  }

  releaseBall(color, edge, done) {
    const targetIndex = this.pileBalls.length;
    this.resultBall.material = this.materialForBall(color, edge);
    this.resultGlint.visible = this.isMetallicBall(color);
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
        this.drumAngle = from + fullTurn * eased;
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

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  cubicBezier(a, b, c, d, t, target) {
    const s = 1 - t;
    return target.copy(a)
      .multiplyScalar(s * s * s)
      .addScaledVector(b, 3 * s * s * t)
      .addScaledVector(c, 3 * s * t * t)
      .addScaledVector(d, t * t * t);
  }

  renderFrame() {
    const now = performance.now();
    const deltaTime = Math.min(0.05, this.clock.getDelta());

    if (this.autoAnim) this.autoAnim.tick(now);

    if (!this.dragging && !this.autoAnim) {
      const diff = this.targetDrumAngle - this.drumAngle;
      this.drumAngle += diff * Math.min(1, deltaTime * 8);
      this.drumPivot.rotation.z = this.drumAngle;
    }

    if (this.ballAnim) {
      const t = Math.min(1, (now - this.ballAnim.start) / this.ballAnim.duration);
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
      const scale = Math.min(1, t / 0.22);
      this.resultBall.scale.setScalar(scale);
      this.resultBall.rotation.x += deltaTime * 7;
      this.resultBall.rotation.z += deltaTime * 4;

      if (t >= 1) {
        const { color, edge, targetIndex, done } = this.ballAnim;
        this.ballAnim = null;
        this.addPileBall(color, edge, targetIndex);
        this.resultBall.visible = false;
        this.resultBall.scale.setScalar(0.01);
        done?.();
      }
    }

    if (this.metallicGlintMaterial) {
      this.metallicGlintMaterial.opacity = 0.78 + Math.sin(now * 0.0075) * 0.17;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
