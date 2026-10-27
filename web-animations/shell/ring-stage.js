// Loose Ends · Web animations — the shared Three.js stage for the ring effects
// (01, 02, 05, 06): renderer, lights, a perspective + orthographic camera, the
// torus geometry, and two things every ring effect shares:
//
// - Shading: Lit 3D (standard, a little sheen), Matte (diffuse, no
//   highlights) or Flat (solid colour, no lighting — reads as 2D line art).
// - Fit to the viewport: the module hands over points that outline its
//   formation and a viewing direction; the camera backs off until those
//   points fill the window (minus the HUD bars), recomputed on every resize.
import * as THREE from "three";

const HUD_PX = 108; // top + bottom bars; 0 in presentation mode (H), when they slide away
const hudPx = () => (document.body.classList.contains("hud-hidden") ? 0 : HUD_PX);

export function createRingStage(stage, { fov = 50 } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 6);
  scene.add(key);

  const perspective = new THREE.PerspectiveCamera(fov, 1, 0.05, 500);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 500);
  const materials = {
    lit: new THREE.MeshStandardMaterial({ color: 0x3fbdac, metalness: 0.15, roughness: 0.4 }),
    matte: new THREE.MeshLambertMaterial({ color: 0x3fbdac }),
    flat: new THREE.MeshBasicMaterial({ color: 0x3fbdac }),
  };


  const onResize = [];
  const view = { dir: new THREE.Vector3(0, 0, 1), target: new THREE.Vector3(), distance: 8, orthoHalf: 2 };
  const tmp = new THREE.Vector3();

  const s = {
    THREE,
    renderer,
    scene,
    camera: perspective,
    perspective,
    ortho,
    shading: "lit",
    get material() {
      return materials[s.shading];
    },
    /** A ring of `radius`, `tube` thick. */
    ringGeometry(_shape, radius, tube) {
      return new THREE.TorusGeometry(radius, tube, 20, 128);
    },
    /** Shading: "lit" | "matte" | "flat"; re-skins the given meshes. */
    setShading(mode, meshes = [], wireframe = false) {
      s.shading = materials[mode] ? mode : "lit";
      for (const m of Object.values(materials)) m.wireframe = wireframe;
      for (const mesh of meshes) mesh.material = s.material;
    },
    /** Ring colour: a palette hex, or "theme" for the theme accent. */
    applyTheme(ringColor = "theme") {
      const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim();
      const c = ringColor !== "theme" ? ringColor : accent || "#3fbdac";
      for (const m of Object.values(materials)) m.color.set(c);
    },
    setFov(deg) {
      perspective.fov = deg;
      perspective.updateProjectionMatrix();
    },
    useCamera(type) {
      s.camera = type === "orthographic" ? ortho : perspective;
      s.resize();
    },
    onResize(f) {
      onResize.push(f);
    },
    /**
     * Back the camera off along `dir` (from `target`) until every point sits
     * inside `fill` of the usable window (1 = touching the edges). Points are
     * world-space outlines of the formation. `zoom` > 1 comes closer still.
     */
    fit(points, { dir = new THREE.Vector3(0, 0, 1), target = new THREE.Vector3(), fill = 0.92, zoom = 1 } = {}) {
      view.dir.copy(dir).normalize();
      view.target.copy(target);
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      const yLimit = Math.max(0.2, (h - hudPx()) / h) * fill;
      const xLimit = fill;
      // Perspective: binary-search the distance at which the widest point just fits.
      const cam = perspective;
      const fits = (d) => {
        cam.position.copy(view.target).addScaledVector(view.dir, d);
        cam.lookAt(view.target);
        cam.updateMatrixWorld();
        for (const p of points) {
          tmp.copy(p).applyMatrix4(cam.matrixWorldInverse);
          if (tmp.z > -cam.near) return false; // behind or too close
          tmp.applyMatrix4(cam.projectionMatrix);
          if (Math.abs(tmp.x) > xLimit || Math.abs(tmp.y) > yLimit) return false;
        }
        return true;
      };
      let lo = 0.1;
      let hi = 400;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) hi = mid;
        else lo = mid;
      }
      view.distance = hi / zoom;
      // Orthographic: the frame's half-height that holds the same points.
      cam.position.copy(view.target).addScaledVector(view.dir, view.distance);
      cam.lookAt(view.target);
      cam.updateMatrixWorld();
      let half = 0.1;
      for (const p of points) {
        tmp.copy(p).applyMatrix4(cam.matrixWorldInverse);
        half = Math.max(half, Math.abs(tmp.y) / yLimit, Math.abs(tmp.x) / (xLimit * (w / h)));
      }
      view.orthoHalf = half / zoom;
      s.resize(false);
      return view.distance;
    },
    /** Put the camera on its fitted spot, nudged by (dx, dy) as a fraction of the distance (mouse parallax). */
    placeCamera(dx = 0, dy = 0) {
      const cam = s.camera;
      const d = cam === perspective ? view.distance : view.distance;
      cam.position.copy(view.target).addScaledVector(view.dir, d);
      if (dx || dy) {
        const right = tmp.set(0, 1, 0).cross(view.dir).normalize();
        cam.position.addScaledVector(right, -dx * d);
        cam.position.y += dy * d;
      }
      cam.lookAt(view.target);
    },
    resize(notify = true) {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      perspective.aspect = w / h;
      perspective.updateProjectionMatrix();
      const half = view.orthoHalf;
      Object.assign(ortho, { left: (-half * w) / h, right: (half * w) / h, top: half, bottom: -half });
      ortho.updateProjectionMatrix();
      if (notify) onResize.forEach((f) => f());
    },
    render() {
      renderer.render(scene, s.camera);
    },
  };
  window.addEventListener("resize", () => s.resize());
  window.addEventListener("lab:hud", () => onResize.forEach((f) => f()));
  s.resize(false);
  return s;
}

/** Outline points for a ring of radius r centred at `c`, in a plane spanned by unit vectors u and v. */
export function ringOutline(THREE, c, r, u = new THREE.Vector3(1, 0, 0), v = new THREE.Vector3(0, 1, 0), samples = 12) {
  const pts = [];
  for (let k = 0; k < samples; k++) {
    const a = (k / samples) * Math.PI * 2;
    pts.push(c.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r));
  }
  return pts;
}
