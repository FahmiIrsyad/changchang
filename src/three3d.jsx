// Three.js scenes — all geometry is procedural (no external models/textures).
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { level } from './audio';

/* ---------- shared runtime ---------- */
function useScene(build, deps = []) {
  const mount = useRef(null);
  const props = useRef({});
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return; // no WebGL: the page still works without the 3D layer
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    lights(scene);
    const api = build({ scene, camera, renderer, props: props.current });
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const clock = new THREE.Timer();
    let raf;
    const loop = () => {
      clock.update();
      const dt = Math.min(clock.getDelta(), 0.05);
      api.update?.(clock.getElapsed(), dt);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const m = o.material;
        (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); });
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [mount, props];
}

function lights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x6b3a2a, 1.6));
  const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb36b, 1.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
}

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, ...o });
const GOLD = () => mat(0xf2b544, { metalness: 0.5, roughness: 0.3, emissive: 0x6b4008, emissiveIntensity: 0.25 });

function textTexture(text, { bg = '#fff', fg = '#22190F', size = 256, font = 150, radius = 46, sub } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(8, 8, size - 16, size - 16, radius);
  g.fill();
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${font}px "Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif`;
  g.fillText(text, size / 2, size / 2 + (sub ? -14 : 8));
  if (sub) {
    g.font = `800 34px sans-serif`;
    g.fillText(sub, size / 2, size - 46);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------- mascot: Deng Deng the lantern ---------- */
function makeLantern() {
  const g = new THREE.Group();
  // body with ribs (lathe)
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI;
    pts.push(new THREE.Vector2(Math.sin(a) * 1.0 + 0.02, -Math.cos(a) * 0.85));
  }
  const bodyGeo = new THREE.LatheGeometry(pts, 48);
  const body = new THREE.Mesh(bodyGeo, mat(0xe8453c, { roughness: 0.55, emissive: 0x5a0f08, emissiveIntensity: 0.35 }));
  g.add(body);
  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.985, 0.012, 6, 48, Math.PI), mat(0xb8302a));
    rib.rotation.y = (i / 8) * Math.PI;
    rib.rotation.z = Math.PI / 2;
    rib.scale.set(0.86, 1, 1);
    g.add(rib);
  }
  // caps
  const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 32), GOLD());
  capT.position.y = 0.88;
  const capB = capT.clone();
  capB.position.y = -0.88;
  capB.rotation.x = Math.PI;
  g.add(capT, capB);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 10, 24), GOLD());
  hook.position.y = 1.08;
  g.add(hook);
  // face
  const face = new THREE.Group();
  face.position.set(0, 0.02, 0);
  const eyeM = mat(0x1d1410, { roughness: 0.2 });
  const shineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  [-0.3, 0.3].forEach((x) => {
    const e = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), eyeM);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), shineM);
    sh.position.set(0.04, 0.05, 0.1);
    e.add(ball, sh);
    e.position.set(x, 0.1, 0.93);
    face.add(e);
    eyes.push(e);
  });
  const blushM = new THREE.MeshBasicMaterial({ color: 0xff8f8a, transparent: true, opacity: 0.85 });
  [-0.5, 0.5].forEach((x) => {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), blushM);
    b.position.set(x, -0.08, 0.86);
    b.rotation.y = x * 0.6;
    face.add(b);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 8, 20, Math.PI), eyeM);
  smile.position.set(0, -0.12, 0.96);
  smile.rotation.z = Math.PI;
  face.add(smile);
  // 唱 badge on forehead
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshBasicMaterial({ map: textTexture('唱', { bg: '#F5C451', fg: '#B8302A', font: 160, radius: 128 }), transparent: true }));
  badge.position.set(0, 0.48, 0.83);
  badge.rotation.x = -0.45;
  face.add(badge);
  g.add(face);
  // tassel
  const tassel = new THREE.Group();
  tassel.position.y = -0.96;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), GOLD());
  cord.position.y = -0.12;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(0xe8453c));
  knot.position.y = -0.27;
  const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 16, 1, true), mat(0xf5c451, { side: THREE.DoubleSide }));
  fringe.position.y = -0.52;
  fringe.rotation.x = Math.PI;
  tassel.add(cord, knot, fringe);
  g.add(tassel);
  // glow inside
  const glow = new THREE.PointLight(0xffb070, 2.2, 4);
  glow.position.set(0, 0, 0.4);
  g.add(glow);
  return { group: g, eyes, tassel, glow, smile };
}

function makeNote(color) {
  const g = new THREE.Group();
  const m = mat(color, { roughness: 0.3, emissive: color, emissiveIntensity: 0.15 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), m);
  head.scale.set(1.25, 0.9, 0.9);
  head.rotation.z = 0.4;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), m);
  stem.position.set(0.16, 0.27, 0);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.05), m);
  flag.position.set(0.25, 0.5, 0);
  flag.rotation.z = -0.5;
  g.add(head, stem, flag);
  return g;
}

function makeTile(ch, color) {
  const t = textTexture(ch, { bg: '#ffffff', fg: color, font: 150 });
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.08),
    [mat(0xf3e7da), mat(0xf3e7da), mat(0xf3e7da), mat(0xf3e7da), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }), mat(0xf3e7da)],
  );
  return m;
}

/* ---------- Mascot hero (login / home) ---------- */
export function MascotHero({ height = 190, chars = ['你', '好', '唱', '歌'], className = '' }) {
  const [ref] = useScene(({ scene, camera }) => {
    camera.position.set(0, 0.15, 6.2);
    const L = makeLantern();
    scene.add(L.group);
    const colors = [0xe53935, 0xf08c00, 0x2e9e4f, 0x1e73d8, 0x7b61ff];
    const orbit = [];
    chars.forEach((c, i) => {
      const tile = makeTile(c, ['#E53935', '#F08C00', '#2E9E4F', '#1E73D8'][i % 4]);
      scene.add(tile);
      orbit.push({ o: tile, r: 1.9, a: (i / chars.length) * Math.PI * 2, y: 0.5 - (i % 2) * 0.9, s: 0.35 });
    });
    for (let i = 0; i < 3; i++) {
      const n = makeNote(colors[i + 1]);
      scene.add(n);
      orbit.push({ o: n, r: 2.35, a: Math.PI / 3 + (i / 3) * Math.PI * 2, y: -0.1 + i * 0.35, s: -0.25 });
    }
    let blink = 0;
    return {
      update(t, dt) {
        L.group.position.y = Math.sin(t * 1.6) * 0.12;
        L.group.rotation.y = Math.sin(t * 0.7) * 0.35;
        L.group.rotation.z = Math.sin(t * 1.3) * 0.05;
        L.tassel.rotation.z = Math.sin(t * 2.2) * 0.25;
        L.glow.intensity = 2 + Math.sin(t * 3) * 0.4;
        blink -= dt;
        if (blink < -3.2) blink = 0.14;
        const s = blink > 0 ? 0.15 : 1;
        L.eyes.forEach((e) => (e.scale.y = s));
        orbit.forEach((p) => {
          p.a += dt * p.s;
          p.o.position.set(Math.cos(p.a) * p.r, p.y + Math.sin(t * 1.5 + p.a) * 0.12, Math.sin(p.a) * p.r * 0.55);
          p.o.rotation.y = -p.a + Math.PI / 2;
          p.o.rotation.x = Math.sin(t + p.a) * 0.2;
        });
      },
    };
  });
  return <div ref={ref} className={`three ${className}`} style={{ height }} />;
}

/* ---------- Vinyl (song step) ---------- */
export function VinylStage({ playing, color = '#E8453C', title = '', height = 150 }) {
  const [ref, props] = useScene(({ scene, camera, props: P }) => {
    camera.position.set(0, 1.9, 3.5);
    camera.lookAt(0, 0, 0);
    const disc = new THREE.Group();
    // grooves texture
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#16110e';
    g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
    for (let r = 250; r > 110; r -= 4) {
      g.strokeStyle = r % 12 === 0 ? '#2d2420' : '#1e1814';
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = color;
    g.beginPath(); g.arc(256, 256, 104, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 60px "Noto Sans CJK SC","PingFang SC",sans-serif';
    g.fillText(title.slice(0, 4), 256, 246);
    g.font = '800 22px sans-serif';
    g.fillText('ChangChang', 256, 300);
    g.fillStyle = '#f3e7da';
    g.beginPath(); g.arc(256, 256, 10, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.2 });
    const side = mat(0x16110e, { roughness: 0.3 });
    const rec = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 96), [side, top, side]);
    disc.add(rec);
    scene.add(disc);
    // platter + arm
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 2.9), mat(0xf6ecdf, { roughness: 0.7 }));
    base.position.y = -0.14;
    scene.add(base);
    const arm = new THREE.Group();
    const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 20), GOLD());
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 10), GOLD());
    bar.rotation.z = Math.PI / 2;
    bar.position.x = -0.75;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.14), mat(0x22190f));
    head.position.set(-1.5, -0.04, 0);
    arm.add(pivot, bar, head);
    arm.position.set(1.45, 0.15, -0.9);
    scene.add(arm);
    const notes = [];
    const palette = [0xe53935, 0xf08c00, 0x2e9e4f, 0x1e73d8];
    for (let i = 0; i < 8; i++) {
      const n = makeNote(palette[i % 4]);
      n.scale.setScalar(0.7);
      n.visible = false;
      scene.add(n);
      notes.push({ o: n, life: Math.random() * 2, x: 0, z: 0 });
    }
    let spin = 0;
    return {
      update(t, dt) {
        const p = P.playing;
        spin += dt * (p ? 3.2 : 0.25);
        disc.rotation.y = -spin;
        disc.position.y = p ? 0.02 + level.value * 0.05 : 0.02;
        const target = p ? -0.55 : -0.05;
        arm.rotation.y += (target - arm.rotation.y) * Math.min(1, dt * 4);
        notes.forEach((n) => {
          n.life += dt;
          if (n.life > 2.2) {
            n.life = 0;
            n.x = (Math.random() - 0.5) * 2.4;
            n.z = (Math.random() - 0.5) * 1.2;
            n.o.visible = p;
          }
          const k = n.life / 2.2;
          n.o.position.set(n.x + Math.sin(t * 2 + n.x) * 0.15, 0.2 + k * 1.8, n.z);
          n.o.rotation.y = t + n.x;
          n.o.scale.setScalar(0.7 * Math.sin(Math.PI * Math.min(1, k * 1.1)));
          if (!p && k > 0.95) n.o.visible = false;
        });
      },
    };
  }, [color, title]);
  props.current.playing = playing;
  return <div ref={ref} className="three" style={{ height }} />;
}

/* ---------- Voice orb (speaking step) ---------- */
export function VoiceOrb({ state = 'idle', height = 150 }) {
  const [ref, props] = useScene(({ scene, camera, props: P }) => {
    camera.position.set(0, 0, 5);
    const geo = new THREE.IcosahedronGeometry(1, 24);
    const base = geo.attributes.position.array.slice();
    const m = new THREE.MeshStandardMaterial({ color: 0xe8453c, roughness: 0.25, metalness: 0.1, emissive: 0x7a1c14, emissiveIntensity: 0.4 });
    const orb = new THREE.Mesh(geo, m);
    scene.add(orb);
    const ringM = new THREE.MeshBasicMaterial({ color: 0xf5c451, transparent: true, opacity: 0.6 });
    const rings = [0, 1, 2].map((i) => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.35 + i * 0.22, 0.012, 6, 96), ringM.clone());
      r.rotation.x = Math.PI / 2.4;
      scene.add(r);
      return r;
    });
    const col = { idle: new THREE.Color(0xe8453c), recording: new THREE.Color(0xff5a4e), scoring: new THREE.Color(0xf5a623), good: new THREE.Color(0x1fa971), bad: new THREE.Color(0xe8453c), listening: new THREE.Color(0x1e73d8) };
    let amp = 0.04;
    const v = new THREE.Vector3();
    return {
      update(t, dt) {
        const s = P.state;
        const want = s === 'recording' ? 0.28 : s === 'listening' ? 0.16 + level.value * 0.1 : s === 'scoring' ? 0.12 : s === 'good' ? 0.08 : 0.04;
        amp += (want - amp) * Math.min(1, dt * 5);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
          const n = Math.sin(v.x * 3.1 + t * 3.3) * Math.sin(v.y * 2.7 + t * 2.1) * Math.sin(v.z * 3.7 + t * 2.7);
          v.multiplyScalar(1 + n * amp);
          pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        m.color.lerp(col[s] || col.idle, Math.min(1, dt * 4));
        m.emissive.copy(m.color).multiplyScalar(0.35);
        orb.rotation.y += dt * 0.4;
        orb.scale.setScalar(s === 'good' ? 1 + Math.sin(t * 6) * 0.03 : 1);
        rings.forEach((r, i) => {
          r.rotation.z += dt * (0.3 + i * 0.2) * (s === 'recording' ? 3 : 1);
          const pulse = s === 'recording' ? 1 + ((t * 0.9 + i / 3) % 1) * 0.35 : 1;
          r.scale.setScalar(pulse);
          r.material.opacity = s === 'recording' ? 0.7 * (1 - ((t * 0.9 + i / 3) % 1)) : 0.35;
          r.material.color.copy(m.color).lerp(new THREE.Color(0xf5c451), 0.5);
        });
      },
    };
  });
  props.current.state = state;
  return <div ref={ref} className="three" style={{ height }} />;
}

/* ---------- Trophy (lesson complete) ---------- */
export function Trophy3D({ height = 200 }) {
  const [ref] = useScene(({ scene, camera }) => {
    camera.position.set(0, 0.6, 5.4);
    camera.lookAt(0, 0.3, 0);
    const g = new THREE.Group();
    const pts = [];
    const prof = [[0, 1.4], [0.85, 1.4], [0.82, 1.1], [0.7, 0.75], [0.48, 0.45], [0.18, 0.25], [0.12, 0.0], [0.12, -0.25], [0.35, -0.38], [0.4, -0.45], [0, -0.45]];
    prof.forEach(([x, y]) => pts.push(new THREE.Vector2(x, y)));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshStandardMaterial({ color: 0xf5bd4a, metalness: 0.45, roughness: 0.3, emissive: 0x7a4a08, emissiveIntensity: 0.35, side: THREE.DoubleSide }));
    g.add(cup);
    [-1, 1].forEach((sx) => {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 12, 32, Math.PI * 1.2), GOLD());
      h.position.set(sx * 0.82, 0.95, 0);
      h.rotation.z = sx > 0 ? -Math.PI * 0.6 : Math.PI * 1.6;
      g.add(h);
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.8), mat(0x6b3a2a, { roughness: 0.4 }));
    base.position.y = -0.65;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), new THREE.MeshBasicMaterial({ map: textTexture('完美', { bg: '#F5C451', fg: '#6B3A2A', font: 110, radius: 20, size: 256 }) }));
    plate.position.set(0, -0.65, 0.41);
    plate.scale.set(1, 0.9, 1);
    g.add(base, plate);
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.12 : 0.28, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    const topStar = new THREE.Mesh(starGeo, mat(0xe8453c, { metalness: 0.3, roughness: 0.3 }));
    topStar.position.y = 1.75;
    g.add(topStar);
    scene.add(g);
    // confetti burst
    const parts = [];
    const pal = [0xe8453c, 0xf5a623, 0x1fa971, 0x7b61ff, 0x1e73d8];
    for (let i = 0; i < 60; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), new THREE.MeshBasicMaterial({ color: pal[i % 5], side: THREE.DoubleSide }));
      scene.add(p);
      parts.push({ o: p, v: new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 2), r: Math.random() * 6, t: -Math.random() * 1.5 });
    }
    return {
      update(t, dt) {
        g.rotation.y = Math.sin(t * 0.8) * 0.6;
        g.position.y = Math.sin(t * 1.6) * 0.06;
        topStar.rotation.y = t * 2;
        const pop = Math.min(1, t * 2.2);
        g.scale.setScalar(0.2 + 0.8 * (1 - Math.pow(1 - pop, 3)) * (1 + Math.sin(pop * Math.PI) * 0.15));
        parts.forEach((p) => {
          p.t += dt;
          if (p.t < 0) { p.o.visible = false; return; }
          p.o.visible = true;
          if (p.t > 2.4) { p.t = 0; p.o.position.set(0, 0.6, 0); p.v.set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 2); }
          if (p.t === dt || p.o.position.lengthSq() === 0) p.o.position.set(0, 0.6, 0);
          p.v.y -= 4.5 * dt;
          p.o.position.addScaledVector(p.v, dt);
          p.o.rotation.x += p.r * dt;
          p.o.rotation.y += p.r * 0.7 * dt;
        });
      },
    };
  });
  return <div ref={ref} className="three" style={{ height }} />;
}
