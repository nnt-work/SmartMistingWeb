
(function () {
  'use strict';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let isInitialized = false;
  let activeHost = null;
  let sprayOverrideActive = false;
  let sprayTimer = null;
  let rainStateOverride = null;
  let dayNightHourOverride = null;
  let soilMoistureOverride = null;
  let waterLevelOverride = null;

  let internalFocus = null;
  let internalHome = null;
  let internalToggleAuto = null;
  let internalResize = null;
  let internalGetState = null;
  let internalTriggerSpray = null;
  let internalSetRainState = null;
  let internalSetDayNightHour = null;
  let internalSetSoilMoisture = null;
  let internalSetWaterLevel = null;
  let internalReplaceModel = null;
  let panOffsetX = 0;
  let internalSetPan = null;
  let internalGetPan = null;
  let internalPanStep = null;
  let internalResetPan = null;
  let internalGetScreenCoords = null;

  const SENSOR_ANCHORS = {
    soil: { x: -2.17, y: 0.95, z: 1.08, point: [-2.17, 0.95, 1.08], title: 'Soil Moisture Probe' },
    water: { x: 2.04, y: 1.76, z: 1.10, point: [2.04, 1.76, 1.10], title: 'Water Level' },
    humidity: { x: -1.05, y: 2.30, z: -1.42, point: [-1.05, 2.30, -1.42], title: 'DHT11 Humidity' },
    temperature: { x: -1.05, y: 2.30, z: -1.42, point: [-1.05, 2.30, -1.42], title: 'Temperature & Humidity' },
    relay: { x: 2.04, y: 1.52, z: 0.58, point: [2.04, 1.52, 0.58], title: 'Pump Relay' },
    nozzle: { x: -1.20, y: 3.52, z: 0.00, point: [-1.20, 3.52, 0.00], title: 'Aerosol Nozzles' }
  };

  window.Garden3D = {
    SENSOR_ANCHORS: SENSOR_ANCHORS,
    focusSensor: function(sensorKey) {
      if (typeof window.Garden3D.focus === 'function') window.Garden3D.focus(sensorKey);
    },
    replaceTerrariumModel: function(builderOrGltfConfig) {
      if (typeof internalReplaceModel === 'function') {
        internalReplaceModel(builderOrGltfConfig);
      }
    },
    init: function (containerId) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => boot(containerId), { once: true });
      } else {
        boot(containerId);
      }
    },
    focus: function (sensorKey) {
      if (!isInitialized) boot();
      if (typeof internalFocus === 'function') internalFocus(sensorKey);
    },
    home: function () {
      if (!isInitialized) boot();
      if (typeof internalHome === 'function') internalHome();
    },
    resetView: function () {
      window.Garden3D.home();
    },
    toggleAutoRotate: function (enable) {
      if (!isInitialized) boot();
      if (typeof internalToggleAuto === 'function') internalToggleAuto(enable);
    },
    setPanOffset: function (x) {
      if (typeof internalSetPan === 'function') internalSetPan(x);
      else panOffsetX = clamp(Number(x) || 0, -4.5, 4.5);
    },
    getPanOffset: function () {
      return typeof internalGetPan === 'function' ? internalGetPan() : panOffsetX;
    },
    panStep: function (delta) {
      if (typeof internalPanStep === 'function') internalPanStep(delta);
      else panOffsetX = clamp(panOffsetX + (Number(delta) || 0), -4.5, 4.5);
    },
    resetPan: function () {
      if (typeof internalResetPan === 'function') internalResetPan();
      else panOffsetX = 0;
    },
    getScreenCoords: function (key) {
      if (typeof internalGetScreenCoords === 'function') return internalGetScreenCoords(key);
      return null;
    },
    triggerSpray: function (activeOrSeconds) {
      if (!isInitialized) boot();
      if (typeof internalTriggerSpray === 'function') {
        internalTriggerSpray(activeOrSeconds);
      } else {
        if (typeof activeOrSeconds === 'number' && activeOrSeconds > 0) {
          sprayOverrideActive = true;
          if (sprayTimer) clearTimeout(sprayTimer);
          sprayTimer = setTimeout(() => {
            sprayOverrideActive = false;
            sprayTimer = null;
          }, activeOrSeconds * 1000);
        } else {
          sprayOverrideActive = Boolean(activeOrSeconds);
          if (sprayTimer) {
            clearTimeout(sprayTimer);
            sprayTimer = null;
          }
        }
      }
    },
    setRainState: function (isRaining) {
      if (!isInitialized) boot();
      if (typeof internalSetRainState === 'function') {
        internalSetRainState(isRaining);
      } else {
        rainStateOverride = (isRaining !== null && isRaining !== undefined) ? Boolean(isRaining) : null;
      }
    },
    syncTheme: function (themeName) {
      if (dayNightHourOverride === null || dayNightHourOverride === undefined) {
        if (typeof internalSetDayNightHour === 'function') {
          internalSetDayNightHour(themeName === 'light' ? 12.0 : null);
        }
      }
    },
    setDayNightHour: function (hourFloat) {
      if (!isInitialized) boot();
      if (typeof internalSetDayNightHour === 'function') {
        internalSetDayNightHour(hourFloat);
      } else {
        dayNightHourOverride = (typeof hourFloat === 'number' && Number.isFinite(hourFloat)) ? hourFloat : null;
      }
    },
    setSoilMoisture: function (percent) {
      if (!isInitialized) boot();
      if (typeof internalSetSoilMoisture === 'function') {
        internalSetSoilMoisture(percent);
      } else {
        soilMoistureOverride = (typeof percent === 'number' && Number.isFinite(percent)) ? clamp(percent, 0, 100) : null;
      }
    },
    setWaterLevel: function (percent) {
      if (!isInitialized) boot();
      if (typeof internalSetWaterLevel === 'function') {
        internalSetWaterLevel(percent);
      } else {
        waterLevelOverride = (typeof percent === 'number' && Number.isFinite(percent)) ? clamp(percent, 0, 100) : null;
      }
    },
    resize: function () {
      if (isInitialized && typeof internalResize === 'function') internalResize();
    },
    getState: function () {
      if (typeof internalGetState === 'function') return internalGetState();
      return {
        isReady: isInitialized,
        activeFocus: null,
        isPumpActive: sprayOverrideActive,
        isRaining: Boolean(rainStateOverride),
        waterLevel: waterLevelOverride !== null ? waterLevelOverride : 0,
        soilMoisture: soilMoistureOverride !== null ? soilMoistureOverride : 45,
        dayNightHour: dayNightHourOverride !== null ? dayNightHourOverride : 12,
        camera: {
          distance: 10.70,
          theta: 0.25,
          phi: 1.16,
          target: [0.00, 1.78, 0.00]
        }
      };
    }
  };

  function boot(containerId) {
    try {
      const targetId = containerId || 'garden3d';
      let host = document.getElementById(targetId);
      if (!host) {
        host = document.getElementById('digital-twin-viewport') || document.querySelector('.garden3d');
      }
      if (!host) return;
      if (host.dataset.gardenReady === 'v3-twin-active' && typeof internalResize === 'function') {
        internalResize();
        return;
      }
      host.dataset.gardenReady = 'v3-twin-active';
      activeHost = host;

      let stage = host.querySelector('.garden3d-stage');
      if (!stage) {
        stage = document.createElement('div');
        stage.className = 'garden3d-stage';
        stage.tabIndex = 0;
        stage.setAttribute('aria-label', '3D Botanical Digital Twin Viewport');
        host.appendChild(stage);
      }
      const status = host.querySelector('.garden3d-status');

      const fail = message => {
        const p = document.createElement('p');
        p.className = 'garden3d-error';
        p.textContent = message;
        stage.appendChild(p);
      };

      if (!window.THREE) {
        fail('Unable to load Three.js 3D library. Please check js/vendor/three.min.js.');
        return;
      }
      const T = window.THREE;

      let renderer;
      try {
        renderer = new T.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      } catch (_) {
        fail('Unable to initialize WebGL. Please enable hardware acceleration in browser settings.');
        return;
      }

      stage.querySelectorAll('canvas').forEach(c => c.remove());
      stage.appendChild(renderer.domElement);
      stage.tabIndex = 0;
      stage.setAttribute('aria-label', '3D Digital Twin. Left-drag to orbit 360 deg, right-drag to pan, scroll to zoom.');

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.45;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;

      const scene = new T.Scene();
      scene.background = null;

      const camera = new T.PerspectiveCamera(36, 1, 0.015, 90);
      const model = new T.Group();
      scene.add(model);

      const terrariumAssetGroup = new T.Group();
      model.add(terrariumAssetGroup);

      const hemiLight = new T.HemisphereLight(0xf4fbff, 0x7b8c74, 2.4);
      scene.add(hemiLight);

      const sun = new T.DirectionalLight(0xfff4e0, 3.4);
      sun.position.set(-3.5, 7.2, 5.2);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 0.1, far: 35 });
      sun.shadow.bias = -0.0003;
      sun.shadow.normalBias = 0.018;
      sun.shadow.radius = 3.5;
      scene.add(sun);

      const fill = new T.DirectionalLight(0xcce6f4, 1.65);
      fill.position.set(4.5, 3.5, -2.5);
      scene.add(fill);

      const canopySpot = new T.PointLight(0xfff7e8, 3.6, 7.5, 1.2);
      canopySpot.position.set(-1.15, 2.85, 0.25);
      scene.add(canopySpot);

      const controlBaySpot = new T.PointLight(0xf0f9ff, 3.8, 7.5, 1.1);
      controlBaySpot.position.set(2.04, 3.6, -0.6);
      scene.add(controlBaySpot);

      const frontCanopyFill = new T.PointLight(0xfff5ea, 3.2, 7.0, 1.2);
      frontCanopyFill.position.set(-1.2, 2.4, 2.2);
      scene.add(frontCanopyFill);

      const studioKeySpot = new T.SpotLight(0xffffff, 4.5, 18, Math.PI / 4.2, 0.45, 1.2);
      studioKeySpot.position.set(-0.8, 7.5, 3.5);
      studioKeySpot.target.position.set(-0.6, 1.2, 0);
      scene.add(studioKeySpot);
      scene.add(studioKeySpot.target);

      const growLight = new T.PointLight(0xffe4af, 1.2, 4.5, 2);
      growLight.position.set(-1.1, 3.25, -0.7);
      scene.add(growLight);

      const ledStripMat = new T.MeshStandardMaterial({
        color: 0xffe7b3,
        emissive: 0xffd17b,
        emissiveIntensity: 1.2,
        roughness: 0.25
      });

      let seed = 53;
      function random() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }
      const material = (color, extra = {}) =>
        new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.65 }, extra));

      function canvasTexture(width, height, paint) {
        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        paint(c.getContext('2d'), width, height);
        const tx = new T.CanvasTexture(c);
        tx.colorSpace = T.SRGBColorSpace;
        tx.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        return tx;
      }

      const dirtTexture = canvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#251a12';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 20000; i++) {
          const v = 24 + Math.floor(random() * 62);
          ctx.fillStyle = 'rgb(' + (v + 18) + ',' + (v + 4) + ',' + Math.max(10, v - 10) + ')';
          ctx.fillRect(random() * w, random() * h, 1.2 + random() * 4, 1.2 + random() * 3);
        }

        for (let i = 0; i < 260; i++) {
          const sx = random() * w, sy = random() * h;
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = random() > 0.45 ? 'rgba(195, 160, 100, 0.5)' : 'rgba(65, 130, 75, 0.45)';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(sx + (random() - 0.5) * 22, sy + (random() - 0.5) * 18, sx + (random() - 0.5) * 36, sy + (random() - 0.5) * 28);
          ctx.stroke();
        }

        for (let i = 0; i < 380; i++) {
          const px = random() * w, py = random() * h, pr = 1.3 + random() * 2.4;
          ctx.fillStyle = 'rgba(242, 248, 255, 0.88)';
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const leafTexture = canvasTexture(512, 1024, (ctx, w, h) => {
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#0c261b');
        bgGrad.addColorStop(0.35, '#163b2c');
        bgGrad.addColorStop(0.65, '#24121e');
        bgGrad.addColorStop(1, '#0e241a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 28000; i++) {
          const vx = random() * w;
          const vy = random() * h;
          const alpha = 0.05 + random() * 0.09;
          ctx.fillStyle = (random() > 0.45) ? ('rgba(244, 114, 182,' + alpha + ')') : ('rgba(52, 211, 153,' + alpha + ')');
          ctx.fillRect(vx, vy, 1.2 + random() * 2, 1.2 + random() * 2);
        }

        function drawGoldVein(pts, width, glowColor, coreColor) {
          ctx.save();
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;
          ctx.lineWidth = width + 2.8;
          ctx.strokeStyle = glowColor;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();
          ctx.restore();

          ctx.lineWidth = width;
          ctx.strokeStyle = coreColor;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length - 1; i++) {
            const xc = (pts[i].x + pts[i + 1].x) / 2;
            const yc = (pts[i].y + pts[i + 1].y) / 2;
            ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();
        }

        const cx = w / 2;

        drawGoldVein([
          { x: cx, y: h },
          { x: cx, y: h * 0.65 },
          { x: cx, y: h * 0.35 },
          { x: cx, y: 14 }
        ], 5.2, 'rgba(255, 205, 95, 0.85)', '#fffbeb');

        drawGoldVein([
          { x: cx, y: h },
          { x: cx - w * 0.22, y: h * 0.60 },
          { x: cx - w * 0.20, y: h * 0.30 },
          { x: cx, y: 14 }
        ], 3.6, 'rgba(251, 185, 75, 0.80)', '#fef08a');

        drawGoldVein([
          { x: cx, y: h },
          { x: cx + w * 0.22, y: h * 0.60 },
          { x: cx + w * 0.20, y: h * 0.30 },
          { x: cx, y: 14 }
        ], 3.6, 'rgba(251, 185, 75, 0.80)', '#fef08a');

        drawGoldVein([
          { x: cx, y: h },
          { x: cx - w * 0.38, y: h * 0.65 },
          { x: cx - w * 0.34, y: h * 0.35 },
          { x: cx, y: 14 }
        ], 2.6, 'rgba(245, 158, 11, 0.75)', '#fde68a');

        drawGoldVein([
          { x: cx, y: h },
          { x: cx + w * 0.38, y: h * 0.65 },
          { x: cx + w * 0.34, y: h * 0.35 },
          { x: cx, y: 14 }
        ], 2.6, 'rgba(245, 158, 11, 0.75)', '#fde68a');

        ctx.lineWidth = 1.35;
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
        for (let i = 1; i <= 30; i++) {
          const yPos = (i * h) / 32;
          const spanL = Math.sin((i / 32) * Math.PI) * (w * 0.40);
          ctx.beginPath();
          ctx.moveTo(cx, yPos);
          ctx.quadraticCurveTo(cx - spanL * 0.5, yPos - 12 + (i % 3) * 6, cx - spanL, yPos - 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, yPos);
          ctx.quadraticCurveTo(cx + spanL * 0.5, yPos - 12 + (i % 3) * 6, cx + spanL, yPos - 4);
          ctx.stroke();
        }
      });

      const darkTitanium = material(0x232d3b, { metalness: 0.72, roughness: 0.28 });
      const alumTrim = material(0xc4d4e3, { metalness: 0.85, roughness: 0.18 });
      const soilMat = material(0x735c4b, { map: dirtTexture, roughness: 0.85 });
      const black = material(0x28323a, { roughness: 0.35 });
      const metal = material(0xd0d9e0, { metalness: 0.85, roughness: 0.22 });
      const brassMat = material(0xe2b842, { metalness: 0.82, roughness: 0.25 });
      const copper = material(0xd8a657, { metalness: 0.75, roughness: 0.30 });
      const pcb = material(0x00878f, { roughness: 0.28, metalness: 0.15 });
      const red = material(0xb8333c, { roughness: 0.45 });

      const acrylic = new T.MeshPhysicalMaterial({
        color: 0xf2fbff,
        roughness: 0.06,
        metalness: 0.04,
        transmission: 0.92,
        ior: 1.5,
        transparent: true,
        opacity: 0.16,
        reflectivity: 0.95,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        depthWrite: false,
        side: T.DoubleSide
      });

      const clearFrameMat = new T.MeshPhysicalMaterial({
        color: 0xe2f5ff,
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.34,
        clearcoat: 1.0,
        depthWrite: false
      });

      const glassEdgeMat = new T.LineBasicMaterial({
        color: 0xa5e8ff,
        transparent: true,
        opacity: 0.52
      });

      const waterMat = new T.MeshPhysicalMaterial({
        color: 0x3ca5bc,
        roughness: 0.10,
        metalness: 0.12,
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      });
      const blue = material(0x2563eb, { roughness: 0.32 });

      const pickables = [];
      const componentGroups = {};

      function component(key) {
        const group = new T.Group();
        group.userData.component = key;
        model.add(group);
        componentGroups[key] = group;
        return group;
      }

      const gardenGroup = component('garden');
      const soilGroup = component('soil');
      const rainGroup = component('rain');
      const tempGroup = component('temperature');
      const lcdGroup = component('lcd');
      const unoGroup = component('uno');
      const relayGroup = component('relay');
      const tankGroup = component('water');
      const nozzleGroup = component('nozzle');

      function mesh(geometry, mat, x, y, z, parent = model) {
        const m = new T.Mesh(geometry, mat);
        m.position.set(x, y, z);
        m.castShadow = !mat.transparent;
        m.receiveShadow = true;
        parent.add(m);
        let p = parent;
        while (p && !p.userData.component && p !== model) {
          p = p.parent;
        }
        if (p && p.userData.component) {
          m.userData.component = p.userData.component;
          if (!pickables.includes(m)) pickables.push(m);
        } else if (parent.userData.component) {
          m.userData.component = parent.userData.component;
          if (!pickables.includes(m)) pickables.push(m);
        }
        return m;
      }

      function addBeveledGlassPanel(w, h, d, x, y, z, parent = model) {
        const g = new T.BoxGeometry(w, h, d);
        const m = mesh(g, acrylic, x, y, z, parent);
        const edges = new T.EdgesGeometry(g);
        const line = new T.LineSegments(edges, glassEdgeMat);
        line.position.set(x, y, z);
        parent.add(line);
        return m;
      }

      function box(w, h, d, x, y, z, mat, parent) {
        return mesh(new T.BoxGeometry(w, h, d), mat, x, y, z, parent);
      }

      function roundBox(w, h, d, r, x, y, z, mat, parent) {
        const shape = new T.Shape();
        const a = -w / 2, b = -h / 2;
        r = Math.min(r, w / 2, h / 2);
        shape.moveTo(a + r, b);
        shape.lineTo(a + w - r, b);
        shape.quadraticCurveTo(a + w, b, a + w, b + r);
        shape.lineTo(a + w, b + h - r);
        shape.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
        shape.lineTo(a + r, b + h);
        shape.quadraticCurveTo(a, b + h, a, b + h - r);
        shape.lineTo(a, b + r);
        shape.quadraticCurveTo(a, b, a + r, b);
        const g = new T.ExtrudeGeometry(shape, {
          depth: d,
          bevelEnabled: true,
          bevelSize: Math.min(0.018, d / 4),
          bevelThickness: Math.min(0.015, d / 4),
          bevelSegments: 2,
          steps: 1,
          curveSegments: 6
        });
        g.translate(0, 0, -d / 2);
        return mesh(g, mat, x, y, z, parent);
      }

      function cylinder(r1, r2, h, x, y, z, mat, parent) {
        return mesh(new T.CylinderGeometry(r1, r2, h, 24), mat, x, y, z, parent);
      }

      function tube(points, radius, mat, parent) {
        return mesh(
          new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 36, radius, 8, false),
          mat,
          0,
          0,
          0,
          parent
        );
      }

      function screw(x, y, z, parent) {
        const s = cylinder(0.038, 0.038, 0.016, x, y, z, metal, parent);
        s.rotation.x = Math.PI / 2;
        box(0.04, 0.007, 0.004, x, y, z + 0.01, black, parent);
        box(0.007, 0.04, 0.004, x, y, z + 0.012, black, parent);
      }

      function plate(text, w, h, x, y, z, bg, fg, parent, font = 36) {
        let ctx;
        const tx = canvasTexture(1024, 256, (c, cw, ch) => {
          ctx = c;
          c.fillStyle = bg;
          c.fillRect(0, 0, cw, ch);
          c.fillStyle = fg;
          c.font = '600 ' + font + 'px monospace';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          text.split('\n').forEach((t, i, rows) =>
            c.fillText(t, cw / 2, ch / 2 + (i - (rows.length - 1) / 2) * 65)
          );
        });
        mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, toneMapped: false }), x, y, z, parent);
        return { ctx, tx };
      }

      roundBox(6.05, 0.14, 3.35, 0.08, 0, 0.14, 0, clearFrameMat);
      for (const x of [-2.63, 2.63]) for (const z of [-1.3, 1.3]) cylinder(0.10, 0.12, 0.08, x, 0.04, z, black);

      try {
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 256; shadowCanvas.height = 256;
        const sCtx = shadowCanvas.getContext('2d');
        if (sCtx) {
          const grad = sCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
          grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
          grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.22)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          sCtx.fillStyle = grad;
          sCtx.fillRect(0, 0, 256, 256);
          const shadowTex = new T.CanvasTexture(shadowCanvas);
          const contactShadowMesh = new T.Mesh(
            new T.PlaneGeometry(8.2, 5.0),
            new T.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.68, depthWrite: false })
          );
          contactShadowMesh.rotation.x = -Math.PI / 2;
          contactShadowMesh.position.set(0, 0.01, 0);
          model.add(contactShadowMesh);
        }
      } catch (err) {
        console.warn('Contact shadow init error', err);
      }

      addBeveledGlassPanel(3.84, 0.28, 2.93, -0.97, 0.38, 0, gardenGroup);

      box(3.61, 0.22, 2.72, -0.97, 0.64, 0, soilMat, gardenGroup);

      addBeveledGlassPanel(1.69, 3.42, 0.06, 2.04, 2.02, -1.38);

      for (const x of [-2.85, 0.95])
        for (const z of [-1.47, 1.47]) {
          box(0.055, 2.95, 0.055, x, 2.12, z, clearFrameMat);
          screw(x, 3.48, z + 0.035);
          screw(x, 0.85, z + 0.035);
        }

      for (const z of [-1.47, 1.47]) {
        box(3.86, 0.05, 0.05, -0.95, 3.60, z, clearFrameMat);
        box(3.86, 0.04, 0.04, -0.95, 0.72, z, clearFrameMat);
      }
      for (const x of [-2.85, 0.95]) box(0.05, 0.05, 2.98, x, 3.60, 0, clearFrameMat);

      addBeveledGlassPanel(3.74, 0.028, 2.93, -0.95, 3.61, 0);
      addBeveledGlassPanel(0.028, 2.72, 2.86, -2.85, 2.15, 0);
      addBeveledGlassPanel(3.70, 2.72, 0.028, -0.95, 2.15, -1.46);
      addBeveledGlassPanel(0.028, 2.72, 2.86, 0.95, 2.15, 0);
      addBeveledGlassPanel(3.70, 2.72, 0.028, -0.95, 2.15, 1.46);

      for (let s = 0; s < 4; s++) {
        box(0.035, 0.36, 0.018, -2.855, 2.85, -0.45 + s * 0.30, alumTrim);
        box(0.035, 0.36, 0.018, 0.955, 2.85, -0.45 + s * 0.30, alumTrim);
      }

      cylinder(0.22, 0.22, 0.11, 0.45, 3.67, -0.85, black);
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * Math.PI * 2;
        box(0.018, 0.09, 0.03, 0.45 + Math.cos(ang) * 0.22, 3.67, -0.85 + Math.sin(ang) * 0.22, metal);
      }

      plate('LUDISIA DISCOLOR \u00B7 JEWEL ORCHID TWIN', 3.15, 0.19, -0.85, 0.22, 1.705, '#071018', '#10b981', model, 42);

      const stones = new T.InstancedMesh(new T.DodecahedronGeometry(0.025, 0), material(0x796444), 300);
      const mtx = new T.Object3D();
      for (let i = 0; i < 300; i++) {
        mtx.position.set(-2.7 + random() * 3.42, 0.758 + random() * 0.02, -1.27 + random() * 2.5);
        mtx.scale.setScalar(0.35 + random() * 0.95);
        mtx.rotation.set(random(), random(), random());
        mtx.updateMatrix();
        stones.setMatrixAt(i, mtx.matrix);
      }
      stones.castShadow = true;
      stones.receiveShadow = true;
      gardenGroup.add(stones);

      const mossMat = material(0x2d6a3e, { roughness: 0.92 });
      [
        [-2.25, 0.75, -0.75, 0.38],
        [-0.35, 0.75, 0.72, 0.32],
        [-1.35, 0.75, -0.88, 0.42],
        [-2.35, 0.75, 0.78, 0.35]
      ].forEach(([mx, my, mz, mr]) => {
        const m = new T.Mesh(new T.SphereGeometry(mr, 16, 12), mossMat);
        m.scale.set(1.2, 0.22, 1.0);
        m.position.set(mx, my, mz);
        m.receiveShadow = true;
        gardenGroup.add(m);
      });

      function leafGeometry() {
        const positions = [], uvs = [], indices = [];
        const rows = 14, cols = 8;
        for (let y = 0; y <= rows; y++) {
          const t = y / rows;
          const width = Math.pow(Math.sin(Math.PI * t), 0.65) * 0.35;
          for (let x = 0; x <= cols; x++) {
            const s = (x / cols) * 2 - 1;
            const cupZ = Math.sin(t * Math.PI) * 0.13 + s * s * width * 0.35 - t * t * 0.12;
            positions.push(s * width, t * 0.74, cupZ);
            uvs.push(x / cols, t);
          }
        }
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const a = y * (cols + 1) + x;
            indices.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
          }
        }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
        g.setIndex(indices);
        g.computeVertexNormals();
        return g;
      }
      const leafGeo = leafGeometry();
      const rhizomeMat = material(0x5c1d2e, { roughness: 0.55, metalness: 0.12 });
      const leafMats = [0xffffff, 0xfafafa, 0xf5f5f5, 0xffffff].map(c =>
        new T.MeshStandardMaterial({
          color: c,
          map: leafTexture,
          side: T.DoubleSide,
          roughness: 0.22,
          metalness: 0.10,
          emissive: new T.Color(0x061a10),
          emissiveIntensity: 0.25
        })
      );

      const plants = [];
      const clusterCoords = [
        { x: -1.75, z: -0.42, rot: 0.2 },
        { x: -0.82, z: 0.32, rot: -0.4 },
        { x: -1.38, z: 0.52, rot: 0.6 },
        { x: -0.42, z: -0.52, rot: -0.1 },
        { x: -2.12, z: 0.22, rot: 0.35 }
      ];

      clusterCoords.forEach((coord, idx) => {
        const plant = new T.Group();
        plant.position.set(coord.x, 0.76, coord.z);
        plant.rotation.y = coord.rot;
        gardenGroup.add(plant);
        plants.push({ group: plant, phase: idx * 1.3 });

        const rzPoints = [
          [-0.32, 0.02, (random() - 0.5) * 0.15],
          [-0.15, 0.035, (random() - 0.5) * 0.08],
          [0.0, 0.04, 0.0],
          [0.22, 0.03, (random() - 0.5) * 0.12],
          [0.35, 0.015, (random() - 0.5) * 0.18]
        ];
        tube(rzPoints, 0.024, rhizomeMat, plant);

        for (let r = 0; r < 4; r++) {
          const rx = -0.25 + r * 0.16;
          tube([[rx, 0.03, 0], [rx + (random() - 0.5) * 0.05, -0.06, (random() - 0.5) * 0.08]], 0.008, material(0xd4c2a5), plant);
        }

        const shootH = 0.62 + (idx % 3) * 0.14;
        tube([[0, 0.04, 0], [0.03, shootH * 0.5, 0.02], [-0.02, shootH, 0.01]], 0.017, rhizomeMat, plant);

        const numLeaves = 7 + (idx % 2);
        for (let j = 0; j < numLeaves; j++) {
          const a = j * 2.38 + idx * 0.5;
          const y = 0.12 + (j * shootH) / (numLeaves + 1);
          const leafGroup = new T.Group();
          leafGroup.position.set(0, y, 0);
          leafGroup.rotation.set(0, a, 0);
          plant.add(leafGroup);

          tube([[0, 0, 0], [0.08, 0.03, 0], [0.15, 0.045, 0]], 0.009, rhizomeMat, leafGroup);

          const l = mesh(leafGeo, leafMats[(idx + j) % leafMats.length], 0.14, 0.04, 0, leafGroup);
          l.rotation.z = -(0.52 + random() * 0.34);
          l.rotation.y = -0.12;
          l.rotation.x = (random() - 0.5) * 0.2;
          const leafScale = 1.12 + random() * 0.26;
          l.scale.set(leafScale, leafScale * 0.94, 1.0);
        }
      });

      const soilPivot = new T.Group();
      soilPivot.userData.component = 'soil';
      soilPivot.position.set(-2.17, 0.88, 1.08);
      soilPivot.rotation.x = -0.32;
      soilPivot.rotation.y = 0.25;
      soilGroup.add(soilPivot);

      box(0.10, 0.35, 0.03, -2.17, 0.68, 1.02, metal, soilGroup);

      roundBox(0.26, 0.18, 0.036, 0.012, 0, 0.26, 0, black, soilPivot);
      box(0.015, 0.075, 0.015, -0.045, 0.38, 0, metal, soilPivot);
      box(0.015, 0.075, 0.015, 0.045, 0.38, 0, metal, soilPivot);
      plate('SOIL MOISTURE', 0.18, 0.04, 0, 0.26, 0.021, '#0f172a', '#e2e8f0', soilPivot, 120);

      const fr4Mat = material(0xb58a2d, { roughness: 0.45, metalness: 0.35 });
      const prongH = 0.52;
      const prongW = 0.065;
      const prongThick = 0.024;
      const prongDist = 0.085;

      box(prongW, prongH, prongThick, -prongDist, -0.05, 0, fr4Mat, soilPivot);

      box(prongW, prongH, prongThick, prongDist, -0.05, 0, fr4Mat, soilPivot);

      for (let i = 0; i < 9; i++) {
        const py = -0.26 + i * 0.048;
        box(0.052, 0.010, 0.006, -prongDist, py, 0.014, metal, soilPivot);
        box(0.052, 0.010, 0.006, prongDist, py, 0.014, metal, soilPivot);
      }

      box(prongW, 0.08, 0.012, -prongDist, -0.34, 0, fr4Mat, soilPivot);
      box(prongW, 0.08, 0.012, prongDist, -0.34, 0, fr4Mat, soilPivot);

      tube([[-2.17, 1.18, 1.08], [-1.4, 1.6, 0.2], [0.5, 1.8, -0.8], [1.8, 2.2, -1.2]], 0.011, material(0xdab949), soilGroup);

      const dhtGroup = new T.Group();
      dhtGroup.userData.component = 'humidity';
      dhtGroup.position.set(-1.05, 2.30, -1.42);
      tempGroup.add(dhtGroup);

      roundBox(0.28, 0.44, 0.035, 0.015, 0, -0.05, -0.025, black, dhtGroup);

      cylinder(0.022, 0.022, 0.04, 0, -0.20, -0.025, metal, dhtGroup);
      screw(0, -0.20, -0.005, dhtGroup);

      const dhtBlueMat = material(0x38bdf8, { roughness: 0.32, metalness: 0.1 });
      const dhtDarkMat = material(0x0284c7, { roughness: 0.4 });
      roundBox(0.24, 0.32, 0.12, 0.015, 0, 0.05, 0.04, dhtBlueMat, dhtGroup);

      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 3; col++) {
          const gx = -0.06 + col * 0.06;
          const gy = -0.04 + row * 0.055;
          box(0.035, 0.028, 0.012, gx, gy + 0.05, 0.102, dhtDarkMat, dhtGroup);
        }
      }

      for (let p = 0; p < 3; p++) {
        const px = -0.05 + p * 0.05;
        box(0.012, 0.10, 0.012, px, -0.30, -0.025, metal, dhtGroup);
      }

      const smdLedMat = material(0xef4444, { emissive: 0xef4444, emissiveIntensity: 0.6 });
      box(0.02, 0.02, 0.01, 0.08, -0.12, -0.005, smdLedMat, dhtGroup);

      plate('DHT11', 0.14, 0.04, 0, 0.22, 0.102, '#0284c7', '#ffffff', dhtGroup, 120);

      tube([[-1.05, 2.05, -1.42], [-0.1, 2.15, -1.42], [0.85, 2.25, -1.35], [1.6, 2.36, -1.25]], 0.010, material(0x38bdf8), tempGroup);

      roundBox(1.22, 0.50, 0.055, 0.025, 2.04, 3.32, -1.26, material(0x1f6e43), lcdGroup);
      roundBox(1.06, 0.38, 0.065, 0.020, 2.04, 3.32, -1.20, black, lcdGroup);
      const lcd = plate('SYSTEM STANDBY\nAWAITING LINK', 0.96, 0.28, 2.04, 3.32, -1.13, '#0b2545', '#64ffda', lcdGroup, 34);
      for (const x of [1.48, 2.60]) for (const y of [3.12, 3.52]) screw(x, y, -1.225, lcdGroup);

      const unoPcbTexture = canvasTexture(1024, 800, (c, w, h) => {

        c.fillStyle = '#00878F';
        c.fillRect(0, 0, w, h);

        c.strokeStyle = 'rgba(0, 115, 122, 0.45)';
        c.lineWidth = 1;
        for (let x = 0; x < w; x += 12) {
          c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
        }
        for (let y = 0; y < h; y += 12) {
          c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        }

        c.strokeStyle = '#dab949';
        c.lineWidth = 2.5;
        const traces = [
          [[120, 200], [240, 200], [320, 280], [320, 360]],
          [[120, 220], [220, 220], [300, 300], [420, 300]],
          [[340, 420], [440, 420], [520, 500], [700, 500]],
          [[200, 600], [300, 600], [380, 520], [460, 520]],
          [[600, 200], [600, 340], [720, 460], [850, 460]],
          [[750, 620], [750, 540], [840, 540]]
        ];
        traces.forEach(pts => {
          c.beginPath();
          c.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
          c.stroke();
        });

        const holes = [[60, 60], [60, 740], [960, 140], [960, 740]];
        holes.forEach(([hx, hy]) => {
          c.fillStyle = '#d1d5db';
          c.beginPath(); c.arc(hx, hy, 32, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#ffffff';
          c.lineWidth = 3;
          c.beginPath(); c.arc(hx, hy, 36, 0, Math.PI * 2); c.stroke();
          c.fillStyle = '#06131c';
          c.beginPath(); c.arc(hx, hy, 22, 0, Math.PI * 2); c.fill();
        });

        c.fillStyle = '#ffffff';
        c.strokeStyle = '#ffffff';

        c.font = 'bold 22px monospace';
        c.textAlign = 'center';
        c.fillText('DIGITAL (PWM ~)', 640, 45);
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(420, 55); c.lineTo(870, 55); c.stroke();
        const topPins = ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8', ' ', '7', '~6', '~5', '4', '~3', '2', 'TX>1', 'RX<0'];
        c.font = 'bold 15px monospace';
        topPins.forEach((p, idx) => {
          c.fillText(p, 430 + idx * 24, 75);
        });

        c.font = 'bold 22px monospace';
        c.fillText('POWER', 520, 765);
        c.fillText('ANALOG IN', 780, 765);
        c.beginPath(); c.moveTo(380, 745); c.lineTo(650, 745); c.stroke();
        c.beginPath(); c.moveTo(690, 745); c.lineTo(890, 745); c.stroke();
        const botPins = ['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN', ' ', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
        c.font = 'bold 15px monospace';
        botPins.forEach((p, idx) => {
          c.fillText(p, 400 + idx * 36, 730);
        });

        const cx = 580, cy = 250;
        c.lineWidth = 8;
        c.beginPath(); c.arc(cx - 55, cy, 45, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(cx + 55, cy, 45, 0, Math.PI * 2); c.stroke();
        c.fillRect(cx - 75, cy - 6, 40, 12);
        c.fillRect(cx + 35, cy - 6, 40, 12);
        c.fillRect(cx + 49, cy - 20, 12, 40);

        c.font = '900 48px sans-serif';
        c.textAlign = 'center';
        c.fillText('ARDUINO', cx, cy + 90);

        c.lineWidth = 4;
        if (c.strokeRoundRect) c.strokeRoundRect(cx + 170, cy - 40, 140, 80, 20);
        else c.strokeRect(cx + 170, cy - 40, 140, 80);
        c.font = '900 42px sans-serif';
        c.fillText('UNO', cx + 240, cy + 18);

        c.font = 'bold 16px sans-serif';
        c.fillText('www.arduino.cc - MADE IN ITALY', cx + 110, cy + 130);

        c.lineWidth = 2;
        c.strokeRect(40, 120, 190, 170);
        c.font = 'bold 16px sans-serif';
        c.fillText('USB', 135, 210);

        c.strokeRect(60, 40, 70, 70);
        c.fillText('RESET', 95, 25);

        c.strokeRect(40, 560, 210, 170);
        c.fillText('DC IN', 145, 650);

        c.strokeRect(95, 330, 60, 45);
        c.font = 'bold 12px sans-serif';
        c.fillText('FUSE', 125, 355);

        c.strokeRect(100, 420, 90, 75);
        c.fillText('5V REG', 145, 460);

        c.beginPath(); c.arc(280, 660, 42, 0, Math.PI * 2); c.stroke();
        c.fillText('47uF', 280, 665);
        c.beginPath(); c.arc(385, 660, 42, 0, Math.PI * 2); c.stroke();
        c.fillText('47uF', 385, 665);

        if (c.strokeRoundRect) c.strokeRoundRect(250, 410, 110, 55, 25);
        else c.strokeRect(250, 410, 110, 55);
        c.font = 'bold 13px sans-serif';
        c.fillText('16.000', 305, 442);

        c.strokeRect(260, 200, 85, 85);
        c.fillText('16U2', 302, 248);

        c.font = 'bold 14px monospace';
        c.fillText('ON', 840, 260);
        c.fillText('L', 420, 140);
        c.fillText('TX', 420, 220);
        c.fillText('RX', 420, 245);

        c.strokeRect(880, 370, 60, 90);
        c.font = 'bold 14px sans-serif';
        c.fillText('ICSP', 910, 355);
      });

      roundBox(1.00, 0.74, 0.042, 0.035, 2.04, 2.36, -1.25, pcb, unoGroup);
      mesh(
        new T.PlaneGeometry(0.99, 0.73),
        new T.MeshStandardMaterial({ map: unoPcbTexture, roughness: 0.35, metalness: 0.08 }),
        2.04, 2.36, -1.226, unoGroup
      );

      roundBox(0.20, 0.19, 0.22, 0.015, 1.48, 2.56, -1.12, metal, unoGroup);
      box(0.21, 0.20, 0.015, 1.48, 2.56, -1.01, metal, unoGroup);
      box(0.14, 0.12, 0.02, 1.48, 2.56, -1.00, black, unoGroup);
      for (let i = 0; i < 4; i++) {
        box(0.010, 0.010, 0.035, 1.43 + i * 0.032, 2.55, -1.02, copper, unoGroup);
      }

      box(0.20, 0.17, 0.17, 1.50, 2.10, -1.14, black, unoGroup);
      const dcCollar = cylinder(0.055, 0.055, 0.025, 1.38, 2.10, -1.14, metal, unoGroup);
      dcCollar.rotation.z = Math.PI / 2;
      const dcPin = cylinder(0.014, 0.014, 0.045, 1.40, 2.10, -1.14, metal, unoGroup);
      dcPin.rotation.z = Math.PI / 2;

      box(0.08, 0.08, 0.035, 1.60, 2.67, -1.21, metal, unoGroup);
      const btnPlunger = cylinder(0.024, 0.024, 0.022, 1.60, 2.67, -1.19, copper, unoGroup);
      btnPlunger.rotation.x = Math.PI / 2;

      box(0.58, 0.17, 0.030, 2.16, 2.15, -1.218, black, unoGroup);
      roundBox(0.55, 0.14, 0.040, 0.01, 2.16, 2.15, -1.185, black, unoGroup);
      const icNotch = cylinder(0.015, 0.015, 0.025, 1.89, 2.15, -1.165, black, unoGroup);
      icNotch.rotation.x = Math.PI / 2;
      plate('ATMEGA328P-PU', 0.44, 0.06, 2.16, 2.15, -1.162, '#18181b', '#e4e4e7', unoGroup, 55);
      for (let i = 0; i < 14; i++) {
        const px = 1.92 + i * 0.037;
        box(0.014, 0.038, 0.018, px, 2.22, -1.19, metal, unoGroup);
        box(0.014, 0.038, 0.018, px, 2.08, -1.19, metal, unoGroup);
      }

      const cap1 = cylinder(0.048, 0.048, 0.10, 1.76, 2.10, -1.17, metal, unoGroup);
      cap1.rotation.x = Math.PI / 2;
      const cap2 = cylinder(0.048, 0.048, 0.10, 1.88, 2.10, -1.17, metal, unoGroup);
      cap2.rotation.x = Math.PI / 2;
      const capBase1 = cylinder(0.050, 0.050, 0.012, 1.76, 2.10, -1.22, black, unoGroup);
      capBase1.rotation.x = Math.PI / 2;
      const capBase2 = cylinder(0.050, 0.050, 0.012, 1.88, 2.10, -1.22, black, unoGroup);
      capBase2.rotation.x = Math.PI / 2;

      roundBox(0.13, 0.07, 0.04, 0.03, 1.78, 2.34, -1.21, metal, unoGroup);
      plate('SPK16.000G', 0.11, 0.045, 1.78, 2.34, -1.185, '#cbd5e1', '#0f172a', unoGroup, 95);

      box(0.085, 0.085, 0.02, 1.77, 2.52, -1.218, black, unoGroup);

      box(0.10, 0.08, 0.022, 1.63, 2.26, -1.218, black, unoGroup);
      box(0.07, 0.035, 0.012, 1.63, 2.31, -1.218, metal, unoGroup);
      for (let i = -1; i <= 1; i++) {
        box(0.012, 0.025, 0.010, 1.63 + i * 0.030, 2.21, -1.218, metal, unoGroup);
      }
      box(0.055, 0.038, 0.018, 1.55, 2.36, -1.218, copper, unoGroup);

      box(0.41, 0.055, 0.080, 1.88, 2.67, -1.18, black, unoGroup);
      box(0.33, 0.055, 0.080, 2.30, 2.67, -1.18, black, unoGroup);
      for (let i = 0; i < 18; i++) {
        box(0.018, 0.018, 0.012, 1.71 + i * 0.038, 2.67, -1.135, metal, unoGroup);
      }

      box(0.33, 0.055, 0.080, 1.96, 2.01, -1.18, black, unoGroup);
      box(0.26, 0.055, 0.080, 2.32, 2.01, -1.18, black, unoGroup);
      for (let i = 0; i < 14; i++) {
        box(0.018, 0.018, 0.012, 1.82 + i * 0.038, 2.01, -1.135, metal, unoGroup);
      }

      box(0.06, 0.085, 0.022, 2.50, 2.32, -1.218, black, unoGroup);
      for (let r = 0; r < 2; r++) {
        for (let cl = 0; cl < 3; cl++) {
          const pin = cylinder(0.006, 0.006, 0.05, 2.48 + r * 0.030, 2.28 + cl * 0.032, -1.185, copper, unoGroup);
          pin.rotation.x = Math.PI / 2;
        }
      }
      box(0.05, 0.075, 0.022, 1.67, 2.61, -1.218, black, unoGroup);
      for (let r = 0; r < 2; r++) {
        for (let cl = 0; cl < 3; cl++) {
          const pin = cylinder(0.005, 0.005, 0.045, 1.65 + r * 0.028, 2.58 + cl * 0.028, -1.195, copper, unoGroup);
          pin.rotation.x = Math.PI / 2;
        }
      }

      const unoGreenLed = material(0x22c55e, { emissive: 0x16a34a, emissiveIntensity: 1.2 });
      const unoAmberLed = material(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 1.0 });
      box(0.022, 0.018, 0.012, 2.42, 2.52, -1.218, unoGreenLed, unoGroup);
      box(0.022, 0.018, 0.012, 1.95, 2.56, -1.218, unoAmberLed, unoGroup);
      box(0.022, 0.018, 0.012, 1.95, 2.49, -1.218, unoAmberLed, unoGroup);
      box(0.022, 0.018, 0.012, 1.95, 2.43, -1.218, unoAmberLed, unoGroup);

      for (const x of [1.55, 2.50]) {
        for (const y of [2.02, 2.69]) {
          screw(x, y, -1.22, unoGroup);
        }
      }

      roundBox(0.88, 0.36, 0.042, 0.025, 2.04, 1.52, -1.25, red, relayGroup);
      roundBox(0.36, 0.26, 0.15, 0.02, 2.04, 1.52, -1.14, blue, relayGroup);
      plate('5V RELAY', 0.30, 0.08, 2.04, 1.52, -1.04, '#1d4ed8', '#d9e9f8', relayGroup, 100);
      for (const x of [1.70, 2.38]) {
        box(0.12, 0.20, 0.09, x, 1.52, -1.17, blue, relayGroup);
        for (const y of [1.46, 1.58]) screw(x, y, -1.11, relayGroup);
      }
      const relayLed = material(0x1c5543, { emissive: 0x10b981, emissiveIntensity: 0.1 });
      box(0.028, 0.02, 0.016, 1.82, 1.62, -1.20, relayLed, relayGroup);

      for (let i = 0; i < 5; i++) {
        tube(
          [
            [1.52 + i * 0.025, 1.62, -1.29],
            [1.25 + i * 0.025, 1.84, -1.28],
            [1.21 + i * 0.025, 3.50, -1.27],
            [0.65, 3.52, -1.30]
          ],
          0.012,
          material([0x2b3333, 0xc74438, 0xdab949, 0x3f7158, 0x425d92][i])
        );
      }
      for (const y of [1.88, 2.70, 3.42]) box(0.19, 0.025, 0.025, 1.28, y, -1.24, material(0xd7d9c9));

      addBeveledGlassPanel(1.40, 1.13, 1.31, 2.04, 0.95, 0.58, tankGroup);
      roundBox(
        1.45,
        0.07,
        1.35,
        0.03,
        2.04,
        1.55,
        0.58,
        material(0xdde7e3, { transparent: true, opacity: 0.38, depthWrite: false }),
        tankGroup
      );
      cylinder(0.17, 0.17, 0.13, 2.45, 1.65, 0.70, blue, tankGroup);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        box(0.014, 0.095, 0.025, 2.45 + Math.cos(a) * 0.17, 1.66, 0.70 + Math.sin(a) * 0.17, blue, tankGroup);
      }

      const water = box(1.29, 1, 1.20, 2.04, 0.90, 0.58, waterMat, tankGroup);
      water.visible = false;
      const openWaterTop = new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      water.material = [waterMat, waterMat, openWaterTop, waterMat, waterMat, waterMat];

      const surfaceGeo = new T.PlaneGeometry(1.28, 1.19, 24, 24);
      surfaceGeo.rotateX(-Math.PI / 2);
      const surface = mesh(surfaceGeo, waterMat, 2.04, 0.90, 0.58, tankGroup);
      surface.visible = false;
      const surfaceBase = surfaceGeo.attributes.position.array.slice();

      for (let i = 0; i < 6; i++) {
        box(i % 2 ? 0.07 : 0.13, 0.012, 0.01, 2.61, 0.53 + i * 0.16, 1.244, metal, tankGroup);
      }
      roundBox(0.24, 0.82, 0.024, 0.02, 1.55, 0.88, 1.25, red, tankGroup);
      for (let i = 0; i < 6; i++) box(0.012, 0.69, 0.007, 1.46 + i * 0.034, 0.85, 1.268, copper, tankGroup);

      const acrylicTubeMat = new T.MeshPhysicalMaterial({
        color: 0xcde3dc,
        roughness: 0.12,
        transparent: true,
        opacity: 0.55,
        depthWrite: false
      });
      const cottonMat = material(0xf8fafc, { roughness: 0.95 });

      cylinder(0.048, 0.048, 0.82, 2.04, 0.98, 0.58, cottonMat, tankGroup);

      cylinder(0.056, 0.056, 0.74, 2.04, 0.98, 0.58, acrylicTubeMat, tankGroup);

      cylinder(0.052, 0.052, 0.05, 2.04, 0.58, 0.58, metal, tankGroup);

      cylinder(0.125, 0.125, 0.035, 2.04, 1.48, 0.58, black, tankGroup);

      cylinder(0.10, 0.10, 0.022, 2.04, 1.50, 0.58, metal, tankGroup);

      cylinder(0.075, 0.075, 0.006, 2.04, 1.512, 0.58, copper, tankGroup);

      cylinder(0.09, 0.11, 0.07, 2.04, 1.55, 0.58, clearFrameMat, tankGroup);

      tube([[2.04, 1.50, 0.58], [2.35, 1.58, 0.35], [2.40, 1.62, -0.75], [2.04, 1.60, -1.05]], 0.012, material(0xef4444), tankGroup);
      tube([[2.04, 1.50, 0.60], [2.37, 1.58, 0.37], [2.42, 1.62, -0.73], [2.04, 1.60, -1.07]], 0.012, black, tankGroup);

      const tankAlertLed = cylinder(
        0.038,
        0.038,
        0.028,
        2.04,
        1.60,
        0.58,
        material(0x7f1d1d, { emissive: 0xef4444, emissiveIntensity: 0 }),
        tankGroup
      );

      const nozzlePositions = [
        [-1.90, 3.48, -0.65],
        [-0.50, 3.48, -0.65],
        [-1.90, 3.48,  0.65],
        [-0.50, 3.48,  0.65]
      ];

      tube([[2.04, 1.56, 0.58], [1.70, 1.85, 0.45], [0.95, 2.05, 0.30]], 0.038, acrylicTubeMat, nozzleGroup);
      cylinder(0.065, 0.065, 0.04, 0.95, 2.05, 0.30, clearFrameMat, nozzleGroup);

      box(2.75, 0.035, 0.065, -1.1, 3.49, -0.85, ledStripMat);

      const floor = mesh(new T.PlaneGeometry(150, 150), new T.ShadowMaterial({ opacity: 0.10 }), 0, -0.08, 0, scene);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;

      const shadowTx = canvasTexture(256, 256, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(0,0,0,0.48)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      const contact = mesh(
        new T.PlaneGeometry(9.2, 6.2),
        new T.MeshBasicMaterial({ map: shadowTx, transparent: true, depthWrite: false }),
        0,
        -0.065,
        0,
        scene
      );
      contact.rotation.x = -Math.PI / 2;

      const particleTx = canvasTexture(64, 64, (ctx, w, h) => {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(240,253,255,0.95)');
        g.addColorStop(0.35, 'rgba(215,245,255,0.55)');
        g.addColorStop(1, 'rgba(200,235,248,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });

      const SPRAY_COUNT = 1400;
      const spraySeeds = new Float32Array(SPRAY_COUNT * 3);
      for (let i = 0; i < spraySeeds.length; i++) spraySeeds[i] = random();

      const sprayPos = new Float32Array(SPRAY_COUNT * 3);
      const sprayGeo = new T.BufferGeometry();
      sprayGeo.setAttribute('position', new T.BufferAttribute(sprayPos, 3));
      const sprayMat = new T.PointsMaterial({
        color: 0xd6f4fa,
        size: 0.095,
        map: particleTx,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      const spray = new T.Points(sprayGeo, sprayMat);
      spray.frustumCulled = false;
      spray.visible = false;
      model.add(spray);

      const RAIN_COUNT = 1200;
      const rainPos = new Float32Array(RAIN_COUNT * 3);
      const rainSeeds = new Float32Array(RAIN_COUNT * 3);
      for (let i = 0; i < RAIN_COUNT; i++) {
        rainPos[i * 3]     = -5.5 + random() * 11.0;
        rainPos[i * 3 + 1] = random() * 8.5;
        rainPos[i * 3 + 2] = -5.0 + random() * 10.0;
        rainSeeds[i * 3]     = 7.5 + random() * 3.5;
        rainSeeds[i * 3 + 1] = -0.15 - random() * 0.10;
        rainSeeds[i * 3 + 2] = 0.04 + random() * 0.05;
      }
      const rainGeo = new T.BufferGeometry();
      rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
      const rainMat = new T.PointsMaterial({
        color: 0x9dcbe8,
        size: 0.065,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const rainPoints = new T.Points(rainGeo, rainMat);
      rainPoints.frustumCulled = false;
      rainPoints.visible = false;

      const streakCanvas = document.createElement('canvas');
      streakCanvas.width = 512;
      streakCanvas.height = 512;
      const streakCtx = streakCanvas.getContext('2d');
      const streakTexture = new T.CanvasTexture(streakCanvas);
      streakTexture.colorSpace = T.SRGBColorSpace;

      const streakGeo = new T.PlaneGeometry(3.72, 2.90);
      streakGeo.rotateX(-Math.PI / 2);
      const streakMat = new T.MeshStandardMaterial({
        map: streakTexture,
        transparent: true,
        opacity: 0.0,
        roughness: 0.08,
        metalness: 0.15,
        depthWrite: false
      });
      const streakMesh = mesh(streakGeo, streakMat, -0.95, 3.623, 0, model);
      streakMesh.visible = false;

      const rivulets = [];
      for (let i = 0; i < 45; i++) {
        rivulets.push({
          x: random() * 512,
          y: random() * 512,
          speed: 45 + random() * 85,
          length: 16 + random() * 32,
          width: 1.2 + random() * 2.2,
          wiggle: random() * 10,
          headRadius: 1.5 + random() * 2.4
        });
      }

      Object.keys(componentGroups).forEach(compKey => {
        const grp = componentGroups[compKey];
        if (grp) {
          grp.traverse(child => {
            if (child.isMesh) {
              if (!child.userData.component) {
                let p = child.parent;
                while (p && !p.userData.component && p !== model) {
                  p = p.parent;
                }
                child.userData.component = (p && p.userData.component) ? p.userData.component : compKey;
              }
              if (!pickables.includes(child)) {
                pickables.push(child);
              }
            }
          });
        }
      });

      const meta = {
        soil: {
          title: 'Soil Moisture Probe',
          description: 'Substrate capacitive probe (Pin A0). Calibrated band: 50% - 65% RH.',
          point: [-2.17, 0.95, 1.08],
          distance: 1.70,
          theta: 0.18,
          phi: 1.05
        },
        water: {
          title: 'Water Reservoir Tank',
          description: 'Monitored via depth sensor A2. Safety cutoff engages when reservoir drops below 20% to prevent pump cavitation.',
          point: [2.04, 1.05, 0.58],
          distance: 2.60,
          theta: 0.35,
          phi: 1.20
        },
        humidity: {
          title: 'DHT11 Climate Sensor',
          description: 'Digital capacitive humidity and NTC temperature sensor. Optimal microclimate: 20°C - 28°C, 60% - 85% RH.',
          point: [-1.05, 2.30, -1.42],
          distance: 1.25,
          theta: 0.15,
          phi: 1.25
        },
        temperature: {
          title: 'Thermal & Humidity Sensor',
          description: 'Microclimate thermistor. Optimal growth: 18\u00B0C - 28\u00B0C.',
          point: [-1.05, 2.30, -1.42],
          distance: 1.20,
          theta: 0.15,
          phi: 1.25
        },
        relay: {
          title: '5V Optocoupler Mist Relay',
          description: 'Controls high-pressure aerosol misting pump (Pin D8). Executes 4-second pulse misting cycles.',
          point: [2.04, 1.60, -1.10],
          distance: 1.85,
          theta: 0.42,
          phi: 1.30
        },
        home: {
          title: 'Digital Twin Overview',
          description: 'Ludisia discolor (Jewel Orchid) closed acrylic terrarium with 4 ceiling nozzles and environmental sensors.',
          point: [0.00, 1.78, 0.00],
          distance: 10.70,
          theta: 0.25,
          phi: 1.16
        },
        garden: {
          title: 'Jewel Orchid Terrarium',
          description: 'Velvet foliage with copper-gold venation, creeping succulent rhizomes, and 4 brass misting nozzles.',
          point: [-1.05, 1.50, 0.25],
          distance: 5.20,
          theta: 0.12,
          phi: 1.00
        },
        lcd: {
          title: 'LCD 16x2 Display',
          description: 'On-device real-time environmental telemetry readout and actuation status.',
          point: [2.04, 3.17, -1.15],
          distance: 2.10,
          theta: 0.12,
          phi: 1.38,
          value: 'LCD \u00B7 16 \u00D7 2'
        },
        uno: {
          title: 'Arduino UNO Microcontroller',
          description: 'ATmega328P central processing unit orchestrating multi-condition sensor validation and non-blocking pulse misting.',
          point: [2.04, 2.30, -1.15],
          distance: 2.60,
          theta: 0.12,
          phi: 1.38,
          value: 'UNO \u00B7 ATmega328P'
        },
        nozzle: {
          title: 'Ceiling Mist Nozzles',
          description: '4 brass aerosol nozzles dispersing 1,400 fine particles across the terrarium canopy.',
          point: [-1.20, 3.48, 0.00],
          distance: 2.40,
          theta: 0.12,
          phi: 1.15
        }
      };

      stage.querySelectorAll('.garden3d-label, .garden3d-spatial-pin').forEach(el => el.remove());
      const labels = [];

      let controls = host.querySelector('.garden3d-explore');
      if (!controls) {
        controls = document.createElement('div');
        controls.className = 'garden3d-explore';
        controls.innerHTML =
          '<div class="garden3d-presets" role="group" aria-label="Camera Presets">' +
          [['home', '360\u00B0 Overview'], ['garden', 'Ludisia Canopy'], ['uno', 'Control Bay'], ['water', 'Reservoir'], ['top', 'Top View']]
            .map(([key, title]) => '<button type="button" data-view="' + key + '">' + title + '</button>')
            .join('') +
          '</div><button type="button" class="garden3d-full" title="Fullscreen" aria-label="Toggle Fullscreen"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
        stage.before(controls);
      }

      let zoomUI = null;

      let inspector = host.querySelector('.garden3d-inspector');
      if (!inspector) {
        inspector = document.createElement('section');
        inspector.className = 'garden3d-inspector';
        inspector.hidden = true;
        inspector.innerHTML =
          '<button type="button" class="garden3d-close" aria-label="Close Inspector">\u00D7</button><span class="garden3d-eyebrow">DIGITAL TWIN TELEMETRY</span><h4></h4><strong></strong><p></p><small></small>';
        stage.appendChild(inspector);
      }

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const center = new T.Vector3(0.00, 1.78, 0.00);
      const target = center.clone(), targetGoal = center.clone();
      const HOME_DISTANCE = 10.70, MIN_DISTANCE = 0.55, MAX_DISTANCE = 23.0;

      let theta = 0.25, phi = 1.16, distance = HOME_DISTANCE;
      let thetaGoal = theta, phiGoal = phi, distanceGoal = distance;
      let width = 1, height = 1, auto = false, shown = true, selected = null, panMode = false;
      let viewportVisible = true, frameId = 0, contextLost = false;
      let values = {}, fresh = false, hasData = false, active = false;
      let waterGoal = 0, waterLevel = 0;
      let currentSoilMoist = 45;
      let currentTankPercent = 0;
      let currentSolarHour = 12;

      const selectionRing = mesh(
        new T.TorusGeometry(0.15, 0.008, 6, 48),
        material(0x10b981, { emissive: 0x059669, emissiveIntensity: 0.9, depthTest: false, transparent: true, opacity: 0.88 }),
        0,
        0,
        0
      );
      selectionRing.visible = false;
      selectionRing.renderOrder = 5;

      function resize() {
        width = stage.clientWidth || host.clientWidth || 960;
        height = stage.clientHeight || host.clientHeight || 620;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
      resize();

      const visibilityObserver = new IntersectionObserver(entries => {
        viewportVisible = entries[0].isIntersecting;
      });
      visibilityObserver.observe(host);

      function currentHomeDistance() {
        return HOME_DISTANCE * Math.max(1, 1.06 / Math.max(0.25, width / height));
      }
      distance = distanceGoal = currentHomeDistance();

      function stopAuto() {
        auto = false;
        const b = host.querySelector('[data-garden="rotate"]');
        if (b) b.setAttribute('aria-pressed', 'false');
      }

      function updatePresets(key) {
        if (controls) {
          controls.querySelectorAll('[data-view]').forEach(b => {
            b.setAttribute('aria-pressed', String(b.dataset.view === key));
          });
        }
        labels.forEach(l => {
          l.el.classList.toggle('is-focused', l.key === key);
        });
      }

      function home() {
        stopAuto();
        selected = null;
        inspector.hidden = true;
        selectionRing.visible = false;
        targetGoal.copy(center);
        thetaGoal = 0.25;
        phiGoal = 1.16;
        distanceGoal = currentHomeDistance();
        updatePresets('home');
      }

      function focus(key) {
        if (key === 'home') {
          home();
          return;
        }
        const info = meta[key];
        if (!info) return;
        stopAuto();
        selected = key;
        targetGoal.set(info.point[0], info.point[1], info.point[2]);
        distanceGoal = info.distance * Math.max(1, 0.70 / (width / height));
        thetaGoal = info.theta !== undefined ? info.theta : 0.18;
        phiGoal = info.phi !== undefined ? info.phi : 1.15;
        inspector.hidden = false;
        const h4 = inspector.querySelector('h4');
        if (h4) h4.textContent = info.title;
        const p = inspector.querySelector('p');
        if (p) p.textContent = info.description;
        updateInspector();
        updatePresets(key);
        selectionRing.position.set(info.point[0], info.point[1], info.point[2]);
        selectionRing.visible = (key !== 'garden' && key !== 'home');
      }

      function updateInspector() {
        if (!selected) return;
        const info = meta[selected], reading = values[selected];
        const strong = inspector.querySelector('strong');
        if (strong) {
          strong.textContent = reading || info.value || (active || sprayOverrideActive ? 'Misting Active' : 'Standby');
        }
        const measured = ['soil', 'rain', 'temperature', 'water', 'relay', 'nozzle'].includes(selected);
        const small = inspector.querySelector('small');
        if (small) {
          small.textContent = measured
            ? (!hasData
                ? 'Awaiting sensor telemetry'
                : fresh
                ? 'Real-time Live Stream'
                : 'Cached Telemetry Snapshot')
            : 'Click another component to switch camera focus';
        }
      }

      internalFocus = focus;
      internalHome = home;
      internalSetPan = function (x) {
        panOffsetX = clamp(Number(x) || 0, -1.5, 1.5);
        if (model) {
          model.position.x = panOffsetX * 1.5;
        }
        targetGoal.x = panOffsetX * 0.5;
        center.x = 0;
        const slider = document.getElementById('slider-3d-pan');
        if (slider && Math.abs(Number(slider.value) - panOffsetX) > 0.05) {
          slider.value = panOffsetX;
        }
        if (typeof window.updatePanBadge === 'function') {
          window.updatePanBadge(panOffsetX);
        }
      };
      internalGetPan = function () {
        return panOffsetX;
      };
      internalPanStep = function (delta) {
        internalSetPan(panOffsetX + delta);
      };
      internalResetPan = function () {
        const startX = panOffsetX;
        const startTime = performance.now();
        const duration = 350;
        function animateReset(now) {
          const progress = Math.min(1, (now - startTime) / duration);
          const ease = 1 - Math.pow(1 - progress, 3);
          const currentX = startX * (1 - ease);
          panOffsetX = currentX;
          if (model) model.position.x = currentX * 1.5;
          targetGoal.x = currentX * 0.5;
          const slider = document.getElementById('slider-3d-pan');
          if (slider) slider.value = currentX.toFixed(2);
          if (typeof window.updatePanBadge === 'function') {
            window.updatePanBadge(currentX);
          }
          if (progress < 1) {
            requestAnimationFrame(animateReset);
          } else {
            panOffsetX = 0;
            if (model) model.position.x = 0;
            if (slider) slider.value = 0;
            if (typeof window.updatePanBadge === 'function') window.updatePanBadge(0);
          }
        }
        requestAnimationFrame(animateReset);
        home();
      };
      internalGetScreenCoords = function (key) {
        const info = meta[key];
        if (!info || !camera || !canvas) return null;
        const pt = new T.Vector3(info.point[0] + (model ? model.position.x : 0), info.point[1], info.point[2]);
        const p = pt.project(camera);
        const rect = canvas.getBoundingClientRect();
        return {
          x: (p.x * 0.5 + 0.5) * rect.width + rect.left,
          y: (-p.y * 0.5 + 0.5) * rect.height + rect.top,
          visible: p.z > -1 && p.z < 1
        };
      };
      internalToggleAuto = function (enable) {
        if (enable !== undefined) auto = Boolean(enable);
        else auto = !auto;
        const b = document.getElementById('btn-360-spin') || host.querySelector('[data-garden="rotate"]');
        if (b) {
          b.setAttribute('aria-pressed', String(auto));
          if (auto) b.classList.add('active');
          else b.classList.remove('active');
        }
        return auto;
      };
      internalResize = resize;

      internalTriggerSpray = function (activeOrSeconds) {
        if (typeof activeOrSeconds === 'number' && activeOrSeconds > 0) {
          sprayOverrideActive = true;
          if (sprayTimer) clearTimeout(sprayTimer);
          sprayTimer = setTimeout(() => {
            sprayOverrideActive = false;
            sprayTimer = null;
            telemetry();
          }, activeOrSeconds * 1000);
        } else {
          sprayOverrideActive = Boolean(activeOrSeconds);
          if (sprayTimer) {
            clearTimeout(sprayTimer);
            sprayTimer = null;
          }
        }
        telemetry();
      };

      internalSetRainState = function (isRaining) {
        rainStateOverride = (isRaining !== null && isRaining !== undefined) ? Boolean(isRaining) : null;
        telemetry();
      };

      internalSetDayNightHour = function (hourFloat) {
        if (typeof hourFloat === 'number' && Number.isFinite(hourFloat)) {
          dayNightHourOverride = hourFloat;
          currentSolarHour = ((hourFloat % 24) + 24) % 24;
        } else {
          dayNightHourOverride = null;
          const d = new Date();
          currentSolarHour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
        }
        updateLighting(currentSolarHour, 0.05);
      };

      internalSetSoilMoisture = function (percent) {
        if (typeof percent === 'number' && Number.isFinite(percent)) {
          soilMoistureOverride = clamp(percent, 0, 100);
          currentSoilMoist = soilMoistureOverride;
          const moistFactor = currentSoilMoist / 100;
          soilMat.color.copy(new T.Color(0xb29f8a).lerp(new T.Color(0x24170d), moistFactor));
          soilMat.roughness = 0.98 - moistFactor * 0.35;
          stones.material.color.copy(new T.Color(0x796444).lerp(new T.Color(0x1b1109), moistFactor));
        } else {
          soilMoistureOverride = null;
        }
        telemetry();
      };

      internalSetWaterLevel = function (percent) {
        if (typeof percent === 'number' && Number.isFinite(percent)) {
          waterLevelOverride = clamp(percent, 0, 100);
          currentTankPercent = waterLevelOverride;
          const isLow = currentTankPercent < 20;
          if (isLow) {
            waterMat.color.setHex(0xef4444);
            waterMat.emissive.setHex(0xb91c1c);
            waterMat.emissiveIntensity = 0.85;
            tankAlertLed.material.emissive.setHex(0xef4444);
            tankAlertLed.material.emissiveIntensity = 2.8;
          } else {
            waterMat.color.setHex(0x3ca5bc);
            waterMat.emissive.setHex(0x000000);
            waterMat.emissiveIntensity = 0;
            tankAlertLed.material.emissiveIntensity = 0;
          }
        } else {
          waterLevelOverride = null;
        }
        telemetry();
      };

      internalGetState = function () {
        return {
          isReady: true,
          activeFocus: selected,
          isPumpActive: Boolean(active || sprayOverrideActive),
          isRaining: Boolean(
            rainStateOverride !== null
              ? rainStateOverride
              : (typeof AppState !== 'undefined' && AppState.telemetry && AppState.telemetry.isRaining)
          ),
          waterLevel: Math.round(currentTankPercent),
          soilMoisture: Math.round(currentSoilMoist),
          dayNightHour: Number(currentSolarHour.toFixed(2)),
          sprayCount: SPRAY_COUNT,
          rainCount: RAIN_COUNT,
          nozzlePositions: nozzlePositions,
          camera: {
            distance: Number(distanceGoal.toFixed(2)),
            currentDistance: Number(distance.toFixed(2)),
            theta: Number(thetaGoal.toFixed(2)),
            phi: Number(phiGoal.toFixed(2)),
            target: [
              Number(targetGoal.x.toFixed(2)),
              Number(targetGoal.y.toFixed(2)),
              Number(targetGoal.z.toFixed(2))
            ],
            currentTarget: [
              Number(target.x.toFixed(2)),
              Number(target.y.toFixed(2)),
              Number(target.z.toFixed(2))
            ]
          },
          lighting: {
            sunIntensity: Number(sun.intensity.toFixed(2)),
            sunColor: '#' + sun.color.getHexString(),
            growLightIntensity: Number(growLight.intensity.toFixed(2)),
            growLightColor: '#' + growLight.color.getHexString(),
            ledStripIntensity: Number(ledStripMat.emissiveIntensity.toFixed(2))
          },
          materials: {
            waterColor: '#' + waterMat.color.getHexString(),
            waterEmissive: '#' + waterMat.emissive.getHexString(),
            waterEmissiveIntensity: Number(waterMat.emissiveIntensity.toFixed(2)),
            soilColor: '#' + soilMat.color.getHexString(),
            soilRoughness: Number(soilMat.roughness.toFixed(2))
          },
          streakOverlay: {
            positionY: Number(streakMesh.position.y.toFixed(3)),
            opacity: Number(streakMat.opacity.toFixed(2)),
            isVisible: streakMesh.visible
          }
        };
      };

      if (controls) {
        controls.querySelectorAll('[data-view]').forEach(button => {
          button.addEventListener('click', () => {
            if (button.dataset.view === 'home') home();
            else if (button.dataset.view === 'top') {
              home();
              phiGoal = 0.075;
              thetaGoal = 0.0;
              updatePresets('top');
            } else focus(button.dataset.view);
          });
        });
        updatePresets('home');
      }

      const closeBtn = inspector.querySelector('.garden3d-close');
      if (closeBtn) {
        closeBtn.onclick = () => {
          inspector.hidden = true;
          selected = null;
          selectionRing.visible = false;
          updatePresets('home');
        };
      }

      const originalRotate = host.querySelector('[data-garden="rotate"]');
      if (originalRotate) {
        originalRotate.textContent = 'Auto Rotate';
        originalRotate.onclick = () => {
          auto = !auto;
          originalRotate.setAttribute('aria-pressed', String(auto));
        };
      }

      const originalReset = host.querySelector('[data-garden="reset"]');
      if (originalReset) {
        originalReset.textContent = 'Reset View';
        originalReset.onclick = () => {
          if (typeof window.closeDetailCard === 'function') window.closeDetailCard();
          home();
        };
      }

      const originalLabels = host.querySelector('[data-garden="labels"]');
      if (originalLabels) {
        originalLabels.textContent = 'Pin Readouts';
        originalLabels.onclick = () => {
          shown = !shown;
          stage.classList.toggle('garden3d-hide-labels', !shown);
          stage.classList.toggle('garden3d-expand-labels', shown);
          originalLabels.setAttribute('aria-pressed', String(shown));
        };
      }

      const footerText = host.querySelector('.garden3d-footer > span:first-child');
      if (footerText) {
        footerText.textContent = 'Left Drag: Orbit 360\u00B0 \u00B7 Right Drag: Pan \u00B7 Scroll: Zoom \u00B7 Click Sensor: Inspect';
      }

      const slider = zoomUI ? zoomUI.querySelector('input') : null;
      const zoomReadout = zoomUI ? zoomUI.querySelector('output') : null;
      function zoom(factor) {
        stopAuto();
        distanceGoal = clamp(distanceGoal * factor, MIN_DISTANCE, MAX_DISTANCE);
      }
      const zoomInBtn = zoomUI ? zoomUI.querySelector('[data-zoom="in"]') : null;
      if (zoomInBtn) zoomInBtn.onclick = () => zoom(0.78);
      const zoomOutBtn = zoomUI ? zoomUI.querySelector('[data-zoom="out"]') : null;
      if (zoomOutBtn) zoomOutBtn.onclick = () => zoom(1.28);
      if (slider) {
        slider.oninput = () => {
          stopAuto();
          distanceGoal = MAX_DISTANCE * Math.pow(MIN_DISTANCE / MAX_DISTANCE, +slider.value / 100);
        };
      }

      let previousOverflow = '', fallbackExpanded = false;
      const fullButton = controls ? controls.querySelector('.garden3d-full') : null;
      function closeExpanded() {
        if (fallbackExpanded) {
          host.classList.remove('garden3d-expanded');
          document.body.style.overflow = previousOverflow;
          fallbackExpanded = false;
          if (fullButton) fullButton.setAttribute('aria-pressed', 'false');
          resize();
        }
      }
      if (fullButton) {
        fullButton.onclick = async () => {
          if (document.fullscreenElement === host) {
            await document.exitFullscreen();
            return;
          }
          if (fallbackExpanded) {
            closeExpanded();
            return;
          }
          try {
            if (!host.requestFullscreen) throw new Error('fallback');
            await host.requestFullscreen();
          } catch (_) {
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            host.classList.add('garden3d-expanded');
            fallbackExpanded = true;
            fullButton.setAttribute('aria-pressed', 'true');
            resize();
          }
        };
        document.addEventListener('fullscreenchange', () => {
          fullButton.setAttribute('aria-pressed', String(document.fullscreenElement === host));
          resize();
        });
      }

      const pointers = new Map();
      let moved = 0, downX = 0, downY = 0, pinch = null;

      function shiftView(dx, dy) {
        const worldPerPixel = (2 * distanceGoal * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) / Math.max(1, height);
        const right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        targetGoal.addScaledVector(right, -dx * worldPerPixel);
        targetGoal.addScaledVector(up, dy * worldPerPixel);
        targetGoal.x = clamp(targetGoal.x, -4.0, 4.0);
        targetGoal.y = clamp(targetGoal.y, 0.12, 4.5);
        targetGoal.z = clamp(targetGoal.z, -3.5, 3.5);
      }

      const canvas = renderer.domElement;
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      canvas.addEventListener('pointerdown', e => {
        if (![0, 1, 2].includes(e.button)) return;
        stopAuto();
        stage.focus({ preventScroll: true });
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
        moved = 0;
        downX = e.clientX;
        downY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        stage.classList.add('is-dragging');
        pinch = null;
      });

      canvas.addEventListener('pointermove', e => {
        const old = pointers.get(e.pointerId);
        if (!old) return;
        const dx = e.clientX - old.x, dy = e.clientY - old.y;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: old.button });
        moved += Math.abs(dx) + Math.abs(dy);
        if (pointers.size === 2) {
          const p = [...pointers.values()];
          const next = {
            d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
            x: (p[0].x + p[1].x) / 2,
            y: (p[0].y + p[1].y) / 2
          };
          if (pinch && next.d > 1) {
            distanceGoal = clamp((distanceGoal * pinch.d) / next.d, MIN_DISTANCE, MAX_DISTANCE);
            shiftView(next.x - pinch.x, next.y - pinch.y);
          }
          pinch = next;
        } else if (old.button === 2 || old.button === 1 || e.shiftKey || panMode) {
          shiftView(dx, dy);
        } else {
          thetaGoal -= dx * 0.006;
          phiGoal = clamp(phiGoal - dy * 0.005, 0.08, 1.45);
        }
      });

      const raycaster = new T.Raycaster();
      function pick(x, y) {
        const rect = canvas.getBoundingClientRect();
        raycaster.setFromCamera(
          new T.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1),
          camera
        );
        const hits = raycaster.intersectObjects(pickables, true);
        if (!hits.length) return;
        let node = hits[0].object;
        let comp = node.userData.component;
        while (node && !comp) {
          node = node.parent;
          if (node && node.userData) comp = node.userData.component;
        }
        if (comp) {
          const sensorMap = {
            garden: 'soil',
            soil: 'soil',
            plant: 'soil',
            water: 'water',
            tank: 'water',
            rain: 'humidity',
            humidity: 'humidity',
            dht: 'humidity',
            temperature: 'temperature',
            temp: 'temperature',
            relay: 'relay',
            pump: 'relay',
            nozzle: 'relay',
            uno: 'relay',
            lcd: 'relay'
          };
          const targetSensor = sensorMap[comp] || comp;
          window._justPicked3D = Date.now();
          if (targetSensor && typeof window.openDetailCard === 'function') {
            const hexTile = document.querySelector('.hex-tile[data-sensor="' + targetSensor + '"]');
            window.openDetailCard(targetSensor, hexTile);
          }
          focus(targetSensor);
        }
      }

      canvas.addEventListener('mousemove', e => {
        if (pointers.size) return;
        const rect = canvas.getBoundingClientRect();
        raycaster.setFromCamera(
          new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1),
          camera
        );
        const hits = raycaster.intersectObjects(pickables, true);
        canvas.style.cursor = hits.length > 0 ? 'pointer' : '';
      });

      canvas.addEventListener('pointerup', e => {
        const old = pointers.get(e.pointerId);
        if (old && old.button === 0 && pointers.size === 1 && Math.hypot(e.clientX - downX, e.clientY - downY) < 14) {
          pick(e.clientX, e.clientY);
        }
        pointers.delete(e.pointerId);
        pinch = null;
        if (!pointers.size) stage.classList.remove('is-dragging');
      });

      ['pointercancel', 'lostpointercapture'].forEach(name =>
        canvas.addEventListener(name, e => {
          pointers.delete(e.pointerId);
          pinch = null;
          if (!pointers.size) stage.classList.remove('is-dragging');
        })
      );

      stage.addEventListener(
        'wheel',
        e => {
          if (e.target.closest('.garden3d-inspector, .garden3d-zoom')) return;
          e.preventDefault();
          const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1);
          zoom(Math.exp(clamp(delta, -300, 300) * 0.0016));
        },
        { passive: false }
      );

      stage.addEventListener('keydown', e => {
        if (e.target !== stage && e.target !== canvas) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home', 'Escape', ' '].includes(e.key)) {
          e.preventDefault();
        } else return;
        stopAuto();
        if (e.key === 'ArrowLeft') thetaGoal -= 0.12;
        if (e.key === 'ArrowRight') thetaGoal += 0.12;
        if (e.key === 'ArrowUp') phiGoal = clamp(phiGoal - 0.1, 0.075, 1.65);
        if (e.key === 'ArrowDown') phiGoal = clamp(phiGoal + 0.1, 0.075, 1.65);
        if (e.key === '+' || e.key === '=') zoom(0.8);
        if (e.key === '-') zoom(1.25);
        if (e.key === 'Home') home();
        if (e.key === 'Escape') {
          closeExpanded();
          inspector.hidden = true;
          if (typeof window.closeDetailCard === 'function') window.closeDetailCard();
        }
        if (e.key === ' ') panMode = !panMode;
      });

      function telemetry() {
        const state = typeof AppState !== 'undefined' ? AppState : window.AppState;
        const t = (state && state.telemetry) || {};
        const valid = v => typeof v === 'number' && Number.isFinite(v);

        const age = t.lastRxTime ? Date.now() - Number(t.lastRxTime) : Infinity;
        fresh = age >= 0 && age < 15000;
        const isOnline = Boolean(state && (state.hardwareConnected || state.isSimulated || (typeof isDemoMode !== 'undefined' && isDemoMode)));
        hasData = isOnline && (valid(t.soilMoisture) || valid(t.tankLevel) || valid(t.airTemperature) || valid(t.temperature));

        const pumpActive = Boolean(state && state.isPumpActive && fresh);
        active = pumpActive || sprayOverrideActive;
        spray.visible = active;

        const hasSoilOverride = soilMoistureOverride !== null;
        const hasWaterOverride = waterLevelOverride !== null;

        currentSoilMoist = hasSoilOverride
          ? clamp(soilMoistureOverride, 0, 100)
          : (hasData && valid(t.soilMoisture))
          ? clamp(t.soilMoisture, 0, 100)
          : 0;

        currentTankPercent = hasWaterOverride
          ? clamp(waterLevelOverride, 0, 100)
          : (hasData && valid(t.tankLevel))
          ? clamp(t.tankLevel, 0, 100)
          : 0;

        const fmt = (v, unit, isExplicit) => (isExplicit && Number.isFinite(v) ? v.toFixed(1) + unit : '--');
        const temp = t.airTemperature === null ? null : (t.airTemperature !== undefined ? t.airTemperature : t.temperature);
        const isRainingVal = rainStateOverride !== null
          ? rainStateOverride
          : Boolean(hasData && t.isRaining);

        values = {
          soil: fmt(currentSoilMoist, '%', hasSoilOverride || (hasData && valid(t.soilMoisture))),
          water: fmt(currentTankPercent, '%', hasWaterOverride || (hasData && valid(t.tankLevel))),
          temperature: (hasData && valid(temp)) ? temp.toFixed(1) + ' \u00B0C' : '--',
          rain: rainStateOverride !== null ? (rainStateOverride ? 'Rain Lock' : 'Dry') : (hasData ? (isRainingVal ? 'Rain Lock' : 'Dry') : '--'),
          relay: hasData ? (state.isPumpActive ? 'Misting' : 'Idle') : (active ? 'Misting' : '--'),
          nozzle: active ? 'Spraying' : 'Standby'
        };

        water.visible = surface.visible = currentTankPercent > 0;
        waterGoal = clamp(currentTankPercent, 0, 100) / 100;

        labels.forEach(label => {
          const val = values[label.key];
          const strong = label.el.querySelector('strong');
          if (strong) strong.textContent = val;
          const small = label.el.querySelector('small');
          if (small) {
            small.textContent = val === '--' ? 'Standby' : fresh ? 'Live Stream' : 'Cached';
          }
          label.el.classList.toggle('is-stale', !fresh);
        });

        if (status) {
          status.textContent = !hasData
            ? 'Standby \u00B7 Awaiting Sensor Link'
            : !fresh
            ? 'Cached Telemetry \u00B7 Check Link'
            : (state && state.hardwareConnected ? 'LIVE STREAM' : 'System Ready') + ' \u00B7 Mist ' + (active ? 'ON' : 'OFF');
        }

        relayLed.emissiveIntensity = active ? 2.0 : 0.05;

        const sVal = values.soil;
        const tVal = values.temperature;
        const wVal = values.water;
        const pVal = active || sprayOverrideActive ? 'RUNNING' : 'IDLE';

        lcd.ctx.fillStyle = '#071526';
        lcd.ctx.fillRect(0, 0, 1024, 256);
        lcd.ctx.fillStyle = '#64ffda';
        lcd.ctx.font = 'bold 42px "JetBrains Mono", monospace';
        if (!hasData || !fresh || (state && !state.hardwareConnected)) {
          lcd.ctx.fillText('SYSTEM STANDBY', 512, 96);
          lcd.ctx.fillText('AWAITING LINK', 512, 172);
        } else {
          lcd.ctx.fillText('SOIL: ' + sVal + ' | TANK: ' + wVal, 512, 96);
          const hVal = valid(t.airHumidity) ? t.airHumidity.toFixed(1) + '%' : '--';
          lcd.ctx.fillText('TEMP: ' + tVal + ' | HUM: ' + hVal, 512, 172);
        }
        lcd.tx.needsUpdate = true;

        updateInspector();
      }

      function updateLighting(hour, dt = 0.016) {
        const solarAngle = ((hour - 6) / 24) * Math.PI * 2;
        const elevation = Math.sin(((hour - 6) / 12) * Math.PI);

        if (hour >= 7.5 && hour <= 16.5) {
          sun.position.set(
            -5.5 * Math.cos(solarAngle),
            7.5 * Math.max(0.35, elevation),
            5.2 * Math.sin(solarAngle)
          );
          sun.color.setHex(0xffffff);
          sun.intensity = 3.4 + elevation * 0.4;
          fill.color.setHex(0xf8fafc);
          fill.intensity = 1.65;
          hemiLight.color.setHex(0xffffff);
          hemiLight.groundColor.setHex(0x334155);
          hemiLight.intensity = 2.4;
          canopySpot.color.setHex(0xffffff);
          canopySpot.intensity = 3.4;
          controlBaySpot.color.setHex(0xffffff);
          controlBaySpot.intensity = 3.8;
          frontCanopyFill.color.setHex(0xffffff);
          frontCanopyFill.intensity = 3.2;
          if (typeof studioKeySpot !== 'undefined') studioKeySpot.intensity = 4.2;
          growLight.intensity = 0.0;
          ledStripMat.emissiveIntensity = 0.2;
        } else if ((hour >= 5.5 && hour < 7.5) || (hour > 16.5 && hour <= 18.5)) {
          sun.position.set(
            -6.0 * Math.cos(solarAngle),
            2.8 * Math.max(0.12, Math.abs(elevation)),
            4.2 * Math.sin(solarAngle)
          );
          sun.color.setHex(0xffffff);
          sun.intensity = 2.2;
          fill.color.setHex(0xf1f5f9);
          fill.intensity = 1.15;
          hemiLight.color.setHex(0xffffff);
          hemiLight.groundColor.setHex(0x1e293b);
          hemiLight.intensity = 1.8;
          canopySpot.color.setHex(0xffffff);
          canopySpot.intensity = 3.2;
          controlBaySpot.color.setHex(0xffffff);
          controlBaySpot.intensity = 3.5;
          frontCanopyFill.color.setHex(0xffffff);
          frontCanopyFill.intensity = 3.0;
          if (typeof studioKeySpot !== 'undefined') studioKeySpot.intensity = 4.5;
          growLight.intensity = 1.2;
          ledStripMat.emissiveIntensity = 1.2;
        } else {

          sun.position.set(-1.5, 6.8, 3.8);
          sun.color.setHex(0xffffff);
          sun.intensity = 0.35;
          fill.color.setHex(0xf8fafc);
          fill.intensity = 1.8;
          hemiLight.color.setHex(0xffffff);
          hemiLight.groundColor.setHex(0x18181b);
          hemiLight.intensity = 2.6;
          canopySpot.color.setHex(0xffffff);
          canopySpot.intensity = 4.2;
          controlBaySpot.color.setHex(0xffffff);
          controlBaySpot.intensity = 4.5;
          frontCanopyFill.color.setHex(0xffffff);
          frontCanopyFill.intensity = 3.8;
          if (typeof studioKeySpot !== 'undefined') studioKeySpot.intensity = 4.8;
          growLight.color.setHex(0xffe4af);
          growLight.intensity = 2.5;
          ledStripMat.emissive.setHex(0xffd17b);
          ledStripMat.emissiveIntensity = 2.2;
        }
      }

      let lastTelemetry = -1000, previousTime = 0;

      function frame(now) {
        frameId = requestAnimationFrame(frame);
        if (document.hidden || !viewportVisible || !width || !height || contextLost) {
          previousTime = now;
          return;
        }
        const dt = Math.min(0.05, (now - previousTime) / 1000 || 0.016);
        previousTime = now;

        if (auto && !pointers.size) thetaGoal += dt * 0.32;
        const damping = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
        theta += (thetaGoal - theta) * damping;
        phi += (phiGoal - phi) * damping;
        distance += (distanceGoal - distance) * damping;
        target.lerp(targetGoal, damping);

        camera.position.set(
          target.x + distance * Math.sin(phi) * Math.sin(theta),
          target.y + distance * Math.cos(phi),
          target.z + distance * Math.sin(phi) * Math.cos(theta)
        );
        camera.lookAt(target);
        camera.updateMatrixWorld();

        if (now - lastTelemetry > 250) {
          telemetry();
          lastTelemetry = now;
        }

        if (dayNightHourOverride === null || dayNightHourOverride === undefined) {
          const isLight = document.documentElement.classList.contains('light') ||
                          (typeof AppState !== 'undefined' && AppState.theme === 'light');
          if (isLight) {
            currentSolarHour = 12.0;
          } else {
            const d = new Date();
            currentSolarHour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
          }
        }
        currentSolarHour = ((currentSolarHour % 24) + 24) % 24;
        updateLighting(currentSolarHour, dt);

        const moistFactor = clamp(currentSoilMoist / 100, 0, 1);
        const targetSoilColor = new T.Color(0xb29f8a).lerp(new T.Color(0x24170d), moistFactor);
        soilMat.color.lerp(targetSoilColor, dt * 4);
        soilMat.roughness = 0.98 - moistFactor * 0.35;
        const targetStoneColor = new T.Color(0x796444).lerp(new T.Color(0x1b1109), moistFactor);
        stones.material.color.lerp(targetStoneColor, dt * 4);

        waterLevel += (waterGoal - waterLevel) * damping;
        water.scale.y = Math.max(0.001, waterLevel);
        water.position.y = 0.40 + waterLevel / 2;
        surface.position.y = 0.402 + waterLevel;

        const isLowWater = currentTankPercent < 20;
        const isRainingActive = rainStateOverride !== null
          ? rainStateOverride
          : Boolean(typeof AppState !== 'undefined' && AppState.telemetry && AppState.telemetry.isRaining);

        if (!reducedMotion.matches) {
          plants.forEach(({ group, phase }) => {
            group.rotation.z = Math.sin(now * 0.00085 + phase) * 0.012;
            group.rotation.x = Math.cos(now * 0.00065 + phase) * 0.008;
          });

          if (surface.visible) {
            const rippleAmp = (active ? 0.012 : 0.003) * (isRainingActive ? 1.4 : 1.0);
            const arr = surfaceGeo.attributes.position.array;
            for (let i = 0; i < arr.length; i += 3) {
              arr[i + 1] =
                Math.sin(surfaceBase[i] * 13 + now * 0.0022) *
                Math.cos(surfaceBase[i + 2] * 11 + now * 0.0016) *
                rippleAmp;
            }
            surfaceGeo.attributes.position.needsUpdate = true;
            surfaceGeo.computeVertexNormals();
          }
        }

        const targetWaterColor = isLowWater ? new T.Color(0xef4444) : new T.Color(0x3ca5bc);
        waterMat.color.lerp(targetWaterColor, dt * 5);

        if (isLowWater) {
          const strobe = Math.sin(now * 0.008) * 0.5 + 0.5;
          waterMat.emissive.setHex(0xb91c1c);
          waterMat.emissiveIntensity = strobe * 0.85;
          tankAlertLed.material.emissive.setHex(0xef4444);
          tankAlertLed.material.emissiveIntensity = strobe * 2.8;
        } else {
          waterMat.emissive.setHex(0x000000);
          waterMat.emissiveIntensity = 0;
          tankAlertLed.material.emissiveIntensity = 0;
        }

        if (active) {
          spray.visible = true;
          const arr = sprayGeo.attributes.position.array;
          for (let i = 0; i < SPRAY_COUNT; i++) {
            const nz = nozzlePositions[i % 4];
            const sX = spraySeeds[i * 3];
            const sY = spraySeeds[i * 3 + 1];
            const sZ = spraySeeds[i * 3 + 2];
            const life = (sY + now * 0.00042) % 1.0;
            const a = sX * Math.PI * 2;
            const spread = Math.pow(life, 0.82) * (0.38 + sZ * 0.32);
            const fall = life * 2.50;
            const driftX = Math.sin(now * 0.0011 + i * 0.1) * 0.04;
            const driftZ = Math.cos(now * 0.0013 + i * 0.1) * 0.04;

            arr[i * 3]     = nz[0] + Math.cos(a) * spread + driftX;
            arr[i * 3 + 1] = nz[1] - 0.08 - fall;
            arr[i * 3 + 2] = nz[2] + Math.sin(a) * spread + driftZ;
          }
          sprayGeo.attributes.position.needsUpdate = true;
        } else {
          spray.visible = false;
        }

        if (isRainingActive) {
          rainMat.opacity = Math.min(0.68, rainMat.opacity + dt * 2.0);
          streakMat.opacity = Math.min(0.85, streakMat.opacity + dt * 1.5);
        } else {
          rainMat.opacity = Math.max(0.0, rainMat.opacity - dt * 1.5);
          streakMat.opacity = Math.max(0.0, streakMat.opacity - dt * 0.30);
        }

        if (rainMat.opacity > 0.005) {
          rainPoints.visible = true;
          const rarr = rainGeo.attributes.position.array;
          for (let i = 0; i < RAIN_COUNT; i++) {
            const spd = rainSeeds[i * 3];
            const vx = spd * rainSeeds[i * 3 + 1];
            const vz = spd * rainSeeds[i * 3 + 2];
            const vy = -spd;

            rarr[i * 3]     += vx * dt;
            rarr[i * 3 + 1] += vy * dt;
            rarr[i * 3 + 2] += vz * dt;

            if (rarr[i * 3 + 1] < 0) {
              rarr[i * 3 + 1] = 8.2 + random() * 1.2;
              rarr[i * 3]     = -5.5 + random() * 11.0;
              rarr[i * 3 + 2] = -5.0 + random() * 10.0;
            }
          }
          rainGeo.attributes.position.needsUpdate = true;
        } else {
          rainPoints.visible = false;
        }

        if (streakMat.opacity > 0.005) {
          streakMesh.visible = true;
          streakCtx.fillStyle = 'rgba(235, 246, 252, 0.05)';
          streakCtx.fillRect(0, 0, 512, 512);

          if (isRainingActive) {
            for (let i = 0; i < rivulets.length; i++) {
              const r = rivulets[i];
              r.y += r.speed * dt;
              r.x += Math.sin(now * 0.003 + r.wiggle) * 0.4;
              if (r.y > 512 + r.length) {
                r.y = -r.length;
                r.x = random() * 512;
                r.speed = 45 + random() * 85;
              }

              const grad = streakCtx.createLinearGradient(r.x, r.y - r.length, r.x, r.y);
              grad.addColorStop(0, 'rgba(210, 238, 255, 0)');
              grad.addColorStop(0.7, 'rgba(220, 242, 255, 0.35)');
              grad.addColorStop(1, 'rgba(240, 250, 255, 0.85)');
              streakCtx.strokeStyle = grad;
              streakCtx.lineWidth = r.width;
              streakCtx.beginPath();
              streakCtx.moveTo(r.x, r.y - r.length);
              streakCtx.lineTo(r.x, r.y);
              streakCtx.stroke();

              streakCtx.fillStyle = 'rgba(245, 252, 255, 0.9)';
              streakCtx.beginPath();
              streakCtx.ellipse(r.x, r.y, r.headRadius * 0.8, r.headRadius, 0, 0, Math.PI * 2);
              streakCtx.fill();
            }

            if (random() < 0.25) {
              streakCtx.fillStyle = 'rgba(230, 245, 255, 0.4)';
              streakCtx.beginPath();
              streakCtx.arc(random() * 512, random() * 512, 1 + random() * 2, 0, Math.PI * 2);
              streakCtx.fill();
            }
          }
          streakTexture.needsUpdate = true;
        } else {
          streakMesh.visible = false;
        }

        selectionRing.quaternion.copy(camera.quaternion);
        selectionRing.scale.setScalar(distance * 0.09);

        renderer.render(scene, camera);

        const occupied = [];
        labels.forEach(label => {
          const pt = label.point.clone();
          if (model) pt.x += model.position.x;
          const p = pt.project(camera);
          const visible =
            shown &&
            p.z > -1 &&
            p.z < 1 &&
            Math.abs(p.x) < 0.94 &&
            Math.abs(p.y) < 0.94;
          label.el.hidden = !visible;
          if (!visible) return;
          const half = (label.el.offsetWidth || 80) / 2;
          let x = clamp((p.x * 0.5 + 0.5) * width, half, width - half - 15);
          let y = clamp((-p.y * 0.5 + 0.5) * height - 12, 60, height - 30);
          for (const o of occupied) {
            if (Math.abs(o.x - x) < 80 && Math.abs(o.y - y) < 32) y = clamp(o.y - 36, 60, height - 30);
          }
          occupied.push({ x, y });
          label.el.style.left = x + 'px';
          label.el.style.top = y + 'px';
        });

        if (window.activeMorphSensor && typeof window.renderCalloutBeam === 'function') {
          window.renderCalloutBeam(window.activeMorphSensor);
        }

        if (slider) slider.value = String((100 * Math.log(MAX_DISTANCE / distanceGoal)) / Math.log(MAX_DISTANCE / MIN_DISTANCE));
        if (zoomReadout) zoomReadout.textContent = (HOME_DISTANCE / distance).toFixed(1) + '\u00D7';
      }

      canvas.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        contextLost = true;
        if (status) status.textContent = '3D Paused \u00B7 Restoring WebGL context';
      });

      canvas.addEventListener('webglcontextrestored', () => {
        contextLost = false;
        resize();
        lastTelemetry = -1000;
      });

      const cleanupObserver = new MutationObserver(() => {
        if (host.isConnected) return;
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        cleanupObserver.disconnect();
        closeExpanded();
        const geometries = new Set(), materials = new Set(), textures = new Set();
        scene.traverse(o => {
          if (o.geometry) geometries.add(o.geometry);
          if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m));
        });
        materials.forEach(m => {
          Object.values(m).forEach(v => {
            if (v && v.isTexture) textures.add(v);
          });
          m.dispose();
        });
        geometries.forEach(g => g.dispose());
        textures.forEach(t => t.dispose());
        renderer.dispose();
        isInitialized = false;
      });
      cleanupObserver.observe(document.body, { childList: true, subtree: true });

      internalReplaceModel = function(builderOrGltfConfig) {
        if (!terrariumAssetGroup) return;
        while (terrariumAssetGroup.children.length > 0) {
          const child = terrariumAssetGroup.children[0];
          terrariumAssetGroup.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            (Array.isArray(child.material) ? child.material : [child.material]).forEach(m => m.dispose());
          }
        }
        if (typeof builderOrGltfConfig === 'function') {
          builderOrGltfConfig(T, terrariumAssetGroup, scene);
        } else if (builderOrGltfConfig && builderOrGltfConfig.isObject3D) {
          terrariumAssetGroup.add(builderOrGltfConfig);
        }
        telemetry();
      };

      isInitialized = true;
      telemetry();
      frameId = requestAnimationFrame(frame);
    } catch (err) {
      console.error('BOOT ERROR:', err && err.message, err && err.stack);
      if (typeof window !== 'undefined') window.__BOOT_ERROR__ = (err && err.message) + '\n' + (err && err.stack);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  } else {
    boot();
  }
})();
