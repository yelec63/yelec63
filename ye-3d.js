import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const stage = document.getElementById("greetingScene");
const canvas = document.getElementById("greetingCanvas");
const greetingButton = document.getElementById("greetingControl");
const title = document.getElementById("greetingTitle");
const status = document.getElementById("greetingStatus");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (stage && canvas && greetingButton && title && status) {
  function setMessage(heading, message, mode) {
    title.textContent = heading;
    status.textContent = message;
    stage.dataset.state = mode;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    setMessage("Bonjour !", "L’animation 3D n’est pas disponible dans ce navigateur.", "error");
    greetingButton.disabled = true;
    console.error("YELEC63 WebGL initialization failed:", error);
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 1.58, 6.2);
    camera.lookAt(0, 1.04, 0);

    renderer.setClearColor(0x141416, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.HemisphereLight(0xf5f0e7, 0x28252a, 2.1));
    const keyLight = new THREE.DirectionalLight(0xfff4dd, 3.0);
    keyLight.position.set(-3.5, 5.2, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8a9fc3, 1.1);
    rimLight.position.set(3.6, 3.1, -2.8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({ color: 0x1b1a1d, roughness: 0.84 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.015;
    floor.receiveShadow = true;
    scene.add(floor);

    const technicianPivot = new THREE.Group();
    technicianPivot.position.set(-0.48, 0, 0.14);
    technicianPivot.rotation.y = -Math.PI / 2;
    scene.add(technicianPivot);

    const loader = new GLTFLoader();
    const clock = new THREE.Clock();
    const localY = new THREE.Vector3(0, 1, 0);
    const localZ = new THREE.Vector3(0, 0, 1);
    const offsetQuaternion = new THREE.Quaternion();
    const wave = { active: false, startedAt: 0, duration: 2.1 };
    let mixer = null;
    let waveBones = null;
    let technicianReady = false;

    function fitModel(object, targetHeight) {
      const initial = new THREE.Box3().setFromObject(object);
      const size = initial.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) {
        throw new Error("Le modèle 3D n’a pas de hauteur exploitable.");
      }
      object.scale.setScalar(targetHeight / size.y);
      const fitted = new THREE.Box3().setFromObject(object);
      object.position.y -= fitted.min.y;
      object.traverse((part) => {
        if (part.isMesh) {
          part.castShadow = true;
          part.receiveShadow = true;
          if (part.material && "envMapIntensity" in part.material) {
            part.material.envMapIntensity = 0.8;
          }
        }
      });
    }

    function findBone(root, name) {
      let result = null;
      root.traverse((part) => {
        if (!result && part.isBone && part.name === name) result = part;
      });
      return result;
    }

    function smoothstep(edge0, edge1, value) {
      const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function applyWave(progress) {
      if (!waveBones) return;
      const lift = smoothstep(0, 0.14, progress) * (1 - smoothstep(0.88, 1, progress));
      const swing = Math.sin(progress * Math.PI * 6) * Math.sin(progress * Math.PI);

      offsetQuaternion.setFromAxisAngle(localZ, -1.95 * lift);
      waveBones.upperArm.quaternion.multiply(offsetQuaternion);
      offsetQuaternion.setFromAxisAngle(localZ, -1.35 * lift + swing * 0.1);
      waveBones.forearm.quaternion.multiply(offsetQuaternion);
      offsetQuaternion.setFromAxisAngle(localY, swing * 0.8);
      waveBones.hand.quaternion.multiply(offsetQuaternion);
      offsetQuaternion.setFromAxisAngle(localZ, swing * 0.45);
      waveBones.hand.quaternion.multiply(offsetQuaternion);
    }

    function greetVisitor() {
      if (!technicianReady || wave.active) return;
      if (reducedMotion.matches) {
        setMessage("Bonjour !", "Votre artisan YELEC63 vous salue.", "idle");
        return;
      }
      wave.active = true;
      wave.startedAt = performance.now();
      stage.dataset.animation = "wave";
      setMessage("Bonjour !", "Votre artisan YELEC63 vous salue.", "wave");
    }

    stage.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") greetVisitor();
    });
    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch" && !event.target.closest(".ye-3d-control")) {
        greetVisitor();
      }
    }, { passive: true });
    greetingButton.addEventListener("click", greetVisitor);

    function resize() {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    window.addEventListener("resize", resize, { passive: true });

    function render() {
      requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.1);
      if (mixer && !reducedMotion.matches) mixer.update(delta);
      if (wave.active && !reducedMotion.matches) {
        const progress = THREE.MathUtils.clamp(
          (performance.now() - wave.startedAt) / (wave.duration * 1000),
          0,
          1,
        );
        applyWave(progress);
        if (progress >= 1) {
          wave.active = false;
          stage.dataset.animation = "idle";
          setMessage("Bonjour !", "Touchez ou survolez pour lui dire bonjour.", "idle");
        }
      }
      renderer.render(scene, camera);
    }

    async function loadScene() {
      try {
        setMessage("Bonjour !", "Chargement du technicien…", "loading");
        const [technicianAsset, applianceAsset] = await Promise.all([
          loader.loadAsync("electrician-high-detail-animated.glb"),
          loader.loadAsync("washing-machine-high-detail.glb"),
        ]);

        const technician = technicianAsset.scene;
        fitModel(technician, 2.18);
        technicianPivot.add(technician);

        const appliance = applianceAsset.scene;
        fitModel(appliance, 1.56);
        appliance.rotation.y = -Math.PI / 2;
        appliance.position.set(0.82, 0, -0.16);
        scene.add(appliance);

        const idleClip = technicianAsset.animations.find(
          (clip) => clip.name.toLowerCase() === "idle",
        );
        waveBones = {
          upperArm: findBone(technician, "R_Upperarm"),
          forearm: findBone(technician, "R_Forearm"),
          hand: findBone(technician, "R_Hand"),
        };
        if (!idleClip || !waveBones.upperArm || !waveBones.forearm || !waveBones.hand) {
          throw new Error("L’animation debout du technicien n’est pas disponible.");
        }

        mixer = new THREE.AnimationMixer(technician);
        const idleAction = mixer.clipAction(idleClip);
        idleAction.setLoop(THREE.LoopRepeat, Infinity);
        idleAction.play();
        mixer.update(0.001);

        technicianReady = true;
        greetingButton.disabled = false;
        stage.dataset.loaded = "true";
        stage.dataset.animation = "idle";
        setMessage("Bonjour !", "Touchez ou survolez pour lui dire bonjour.", "idle");
        resize();
        greetVisitor();
      } catch (error) {
        stage.dataset.state = "error";
        title.textContent = "Bonjour !";
        status.textContent = "Impossible de charger l’animation 3D.";
        greetingButton.disabled = true;
        console.error("YELEC63 3D scene failed to load:", error);
      }
    }

    greetingButton.disabled = true;
    resize();
    requestAnimationFrame(render);
    loadScene();
  }
}
