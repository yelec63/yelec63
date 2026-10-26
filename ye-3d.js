import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const stage = document.getElementById("repairScene");
const canvas = document.getElementById("repairCanvas");
const replayButton = document.getElementById("repairControl");
const title = document.getElementById("repairTitle");
const status = document.getElementById("repairStatus");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (stage && canvas && replayButton && title && status) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    stage.dataset.state = "error";
    title.textContent = "Scène 3D indisponible";
    status.textContent = "Votre navigateur ne peut pas afficher cette animation 3D.";
    replayButton.disabled = true;
    console.error("YELEC63 WebGL initialization failed:", error);
  }

  if (renderer) {
    const scene = new THREE.Scene();
    scene.background = null;
    renderer.setClearColor(0x141416, 0);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 1.7, 6.3);
    camera.lookAt(0, 1.05, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.HemisphereLight(0xf5f0e7, 0x28252a, 2.1));
    const keyLight = new THREE.DirectionalLight(0xfff4dd, 3.0);
    keyLight.position.set(-3.5, 5.2, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x8a9fc3, 1.3);
    rimLight.position.set(3.6, 3.1, -2.8);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshStandardMaterial({ color: 0x1b1a1d, roughness: 0.82, metalness: 0.06 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.015;
    floor.receiveShadow = true;
    scene.add(floor);

    const currentRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.012, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xe9b824, transparent: true, opacity: 0.34 }),
    );
    currentRing.rotation.x = -Math.PI / 2;
    currentRing.position.y = 0.012;
    scene.add(currentRing);

    const technicianPivot = new THREE.Group();
    scene.add(technicianPivot);
    const repairLight = new THREE.PointLight(0xe9b824, 0, 3.4, 2);
    repairLight.position.set(0.95, 0.96, 0.95);
    scene.add(repairLight);
    const statusBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe9b824, emissive: 0xe9b824, emissiveIntensity: 1.7 }),
    );
    statusBeacon.position.set(0.95, 1.58, 0.5);
    scene.add(statusBeacon);

    const loader = new GLTFLoader();
    let mixer = null;
    let activeAction = null;
    let idleClip = null;
    let turnClip = null;
    let technician = null;
    let hovered = false;
    let repairActive = false;
    let repairUntil = 0;
    let raf = 0;
    const clock = new THREE.Clock();
    const target = { x: 0, y: 0, yaw: 0.04 };
    const current = { x: 0, y: 0, yaw: 0.04 };

    function setStatus(heading, message, mode) {
      title.textContent = heading;
      status.textContent = message;
      stage.dataset.state = mode;
    }

    function fitModel(object, targetHeight) {
      const before = new THREE.Box3().setFromObject(object);
      const size = before.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("Le modèle 3D n'a pas de hauteur exploitable.");
      object.scale.setScalar(targetHeight / size.y);
      const after = new THREE.Box3().setFromObject(object);
      object.position.y -= after.min.y;
      object.traverse((part) => {
        if (part.isMesh) {
          part.castShadow = true;
          part.receiveShadow = true;
          if (part.material && "envMapIntensity" in part.material) part.material.envMapIntensity = 0.8;
        }
      });
      return size;
    }

    function pickClip(clips, names) {
      return clips.find((clip) => names.some((name) => clip.name.toLowerCase().includes(name))) || null;
    }

    function playClip(clip, loop) {
      if (!mixer || !clip) return null;
      const next = mixer.clipAction(clip);
      stage.dataset.animation = clip.name;
      stage.dataset.animationLoop = loop ? "repeat" : "once";
      next.reset();
      next.enabled = true;
      next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop;
      if (activeAction && activeAction !== next) activeAction.crossFadeTo(next, 0.24, false);
      next.fadeIn(0.2).play();
      activeAction = next;
      return next;
    }

    function playIdle() {
      if (idleClip) playClip(idleClip, true);
    }

    function beginRepair(source = "hover") {
      if (!technician) return;
      if (source === "hover") hovered = true;
      repairActive = true;
      repairUntil = performance.now() + Math.max(1750, (turnClip?.duration || 1.75) * 1000);
      target.yaw = 0.56;
      repairLight.intensity = 2.1;
      statusBeacon.material.emissiveIntensity = 3.4;
      currentRing.material.opacity = 0.74;
      setStatus("Le technicien se tourne vers l'appareil", "Démonstration 3D — survolez la scène pour la relancer.", "repair");
      if (turnClip) playClip(turnClip, false);
    }

    function finishRepair() {
      if (hovered) return;
      repairActive = false;
      target.yaw = 0.04;
      repairLight.intensity = 0.18;
      statusBeacon.material.emissiveIntensity = 1.7;
      currentRing.material.opacity = 0.28;
      setStatus("Appareil prêt", "Démonstration terminée — l'artisan est prêt à intervenir.", "ready");
      playIdle();
    }

    stage.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch" || reducedMotion.matches || hovered) return;
      beginRepair("hover");
    });
    stage.addEventListener("pointerleave", () => {
      hovered = false;
      if (technician) finishRepair();
    });
    stage.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const bounds = stage.getBoundingClientRect();
      target.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.42;
      target.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.17;
    });
    replayButton.addEventListener("click", () => beginRepair("button"));

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
      raf = requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.2);
      if (mixer && !reducedMotion.matches) mixer.update(delta);
      const ease = reducedMotion.matches ? 1 : 0.055;
      current.x += (target.x - current.x) * ease;
      current.y += (target.y - current.y) * ease;
      current.yaw += (target.yaw - current.yaw) * ease;
      camera.position.x = current.x;
      camera.position.y = 1.7 - current.y;
      camera.lookAt(0, 1.05, 0);
      technicianPivot.rotation.y = current.yaw;
      const pulse = repairActive && !reducedMotion.matches ? 0.7 + Math.sin(performance.now() * 0.009) * 0.3 : 0.18;
      if (technician) {
        repairLight.intensity = repairActive ? 1.5 + pulse : 0.16;
        currentRing.material.opacity = repairActive ? 0.52 + pulse * 0.28 : 0.25;
        statusBeacon.material.emissiveIntensity = repairActive ? 2 + pulse * 1.6 : 1.5;
      }
      if (!hovered && repairActive && repairUntil && performance.now() > repairUntil) finishRepair();
      currentRing.rotation.z += reducedMotion.matches ? 0 : delta * 0.11;
      renderer.render(scene, camera);
    }

    async function loadScene() {
      try {
        setStatus("Chargement de l'atelier 3D", "Préparation du technicien et de l'appareil…", "loading");
        const [technicianAsset, applianceAsset] = await Promise.all([
          loader.loadAsync("electrician-high-detail-animated.glb"),
          loader.loadAsync("washing-machine-high-detail.glb"),
        ]);
        technician = technicianAsset.scene;
        fitModel(technician, 2.32);
        technicianPivot.add(technician);
        technicianPivot.position.set(-0.78, 0, 0.05);
        const appliance = applianceAsset.scene;
        fitModel(appliance, 1.62);
        appliance.rotation.y = -Math.PI / 2;
        appliance.position.set(0.96, 0, -0.08);
        scene.add(appliance);
        mixer = new THREE.AnimationMixer(technician);
        turnClip = pickClip(technicianAsset.animations, ["turn", "walk", "climb"]) || technicianAsset.animations[0] || null;
        idleClip = pickClip(technicianAsset.animations, ["idle", "standing", "relax"]) || technicianAsset.animations[1] || turnClip;
        if (reducedMotion.matches) {
          setStatus("Scène 3D prête", "Utilisez le bouton pour lancer la démonstration.", "ready");
          renderer.render(scene, camera);
        } else {
          setStatus("Le technicien arrive", "La démonstration 3D démarre automatiquement…", "intro");
          target.yaw = 0.34;
          const intro = playClip(turnClip, false);
          if (intro) {
            mixer.addEventListener("finished", (event) => {
              if (event.action === intro && !hovered && stage.dataset.state === "intro") {
                target.yaw = 0.04;
                playIdle();
                setStatus("Appareil prêt", "Survolez la scène pour voir le technicien intervenir.", "ready");
              }
            });
          } else {
            window.setTimeout(() => {
              if (!hovered) {
                target.yaw = 0.04;
                setStatus("Appareil prêt", "Survolez la scène pour voir la démonstration 3D.", "ready");
              }
            }, 1300);
          }
        }
        replayButton.disabled = false;
        stage.dataset.loaded = "true";
        resize();
      } catch (error) {
        stage.dataset.state = "error";
        title.textContent = "Scène 3D indisponible";
        status.textContent = "Impossible de charger le modèle 3D. Vérifiez votre connexion puis réessayez.";
        replayButton.disabled = true;
        console.error("YELEC63 3D assets failed to load:", error);
      }
    }

    replayButton.disabled = true;
    resize();
    raf = requestAnimationFrame(render);
    loadScene();
    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.dispose();
    }, { once: true });
  }
}
