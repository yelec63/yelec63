import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const stage = document.getElementById("repairScene");
const canvas = document.getElementById("repairCanvas");
const greetingButton = document.getElementById("repairControl");
const title = document.getElementById("repairTitle");
const status = document.getElementById("repairStatus");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (stage && canvas && greetingButton && title && status) {
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
    greetingButton.disabled = true;
    console.error("YELEC63 WebGL initialization failed:", error);
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0, 1.7, 6.3);
    camera.lookAt(0, 1.05, 0);
    renderer.setClearColor(0x141416, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
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
      new THREE.MeshBasicMaterial({ color: 0xe9b824, transparent: true, opacity: 0.3 }),
    );
    currentRing.rotation.x = -Math.PI / 2;
    currentRing.position.y = 0.012;
    scene.add(currentRing);

    const technicianPivot = new THREE.Group();
    const workYaw = 0.5;
    technicianPivot.position.set(-0.52, 0, 0.05);
    technicianPivot.rotation.y = workYaw;
    scene.add(technicianPivot);

    const repairLight = new THREE.PointLight(0xe9b824, 0, 3.4, 2);
    repairLight.position.set(0.72, 0.96, 0.95);
    scene.add(repairLight);
    const statusBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe9b824, emissive: 0xe9b824, emissiveIntensity: 1.7 }),
    );
    statusBeacon.position.set(0.72, 1.58, 0.5);
    scene.add(statusBeacon);

    const loader = new GLTFLoader();
    const clock = new THREE.Clock();
    const cameraTarget = { x: 0, y: 0 };
    const cameraCurrent = { x: 0, y: 0 };
    const wave = { active: false, elapsed: 0, duration: 2.2 };
    const localZ = new THREE.Vector3(0, 0, 1);
    const localY = new THREE.Vector3(0, 1, 0);
    const offsetQuaternion = new THREE.Quaternion();
    let mixer = null;
    let repairAction = null;
    let repairActive = false;
    let technician = null;
    let waveBones = null;
    let raf = 0;

    function setStatus(heading, message, mode) {
      title.textContent = heading;
      status.textContent = message;
      stage.dataset.state = mode;
    }

    function fitModel(object, targetHeight) {
      const before = new THREE.Box3().setFromObject(object);
      const size = before.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) {
        throw new Error("Le modèle 3D n'a pas de hauteur exploitable.");
      }
      object.scale.setScalar(targetHeight / size.y);
      const after = new THREE.Box3().setFromObject(object);
      object.position.y -= after.min.y;
      object.traverse((part) => {
        if (part.isMesh) {
          part.castShadow = true;
          part.receiveShadow = true;
          if (part.material && "envMapIntensity" in part.material) {
            part.material.envMapIntensity = 0.8;
          }
        }
      });
      return size;
    }

    function findSkinnedMesh(root) {
      let result = null;
      root.traverse((part) => {
        if (!result && part.isSkinnedMesh && part.skeleton) result = part;
      });
      return result;
    }

    function findBone(root, names) {
      let result = null;
      root.traverse((part) => {
        if (!result && part.isBone && names.includes(part.name)) result = part;
      });
      return result;
    }

    function pickClip(clips, name) {
      return clips.find((clip) => clip.name.toLowerCase() === name.toLowerCase()) || null;
    }

    function disposeHiddenModel(root) {
      root.traverse((part) => {
        if (!part.isMesh) return;
        part.geometry?.dispose();
        const materials = Array.isArray(part.material) ? part.material : [part.material];
        materials.forEach((material) => {
          if (!material) return;
          Object.values(material).forEach((value) => {
            if (value?.isTexture) value.dispose();
          });
          material.dispose();
        });
      });
    }

    function smoothstep(edge0, edge1, value) {
      const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function applyWavePose(progress) {
      if (!waveBones) return;
      const lift = smoothstep(0, 0.12, progress) * (1 - smoothstep(0.9, 1, progress));
      const greetingProgress = THREE.MathUtils.clamp((progress - 0.1) / 0.78, 0, 1);
      const armSway = Math.sin(greetingProgress * Math.PI * 6)
        * Math.sin(greetingProgress * Math.PI) * 0.36;
      const forearmSwing = Math.sin(greetingProgress * Math.PI * 6)
        * Math.sin(greetingProgress * Math.PI) * 0.1;
      const handSwing = Math.sin(greetingProgress * Math.PI * 6)
        * Math.sin(greetingProgress * Math.PI) * 1.05;
      const handRoll = Math.sin(greetingProgress * Math.PI * 6)
        * Math.sin(greetingProgress * Math.PI) * 0.45;

      if (waveBones.upperArm) {
        offsetQuaternion.setFromAxisAngle(localZ, -1.65 * lift);
        waveBones.upperArm.quaternion.multiply(offsetQuaternion);
        offsetQuaternion.setFromAxisAngle(localY, armSway);
        waveBones.upperArm.quaternion.multiply(offsetQuaternion);
      }
      if (waveBones.forearm) {
        offsetQuaternion.setFromAxisAngle(localZ, 0.45 * lift + forearmSwing);
        waveBones.forearm.quaternion.multiply(offsetQuaternion);
      }
      if (waveBones.hand) {
        offsetQuaternion.setFromAxisAngle(localY, handSwing);
        waveBones.hand.quaternion.multiply(offsetQuaternion);
        offsetQuaternion.setFromAxisAngle(localZ, handRoll);
        waveBones.hand.quaternion.multiply(offsetQuaternion);
      }
    }

    function greetVisitor() {
      if (!repairActive || wave.active) return;
      if (reducedMotion.matches) {
        setStatus(
          "Réparation en cours",
          "Merci pour votre signe ! L'animation est réduite selon vos préférences.",
          "repair",
        );
        return;
      }
      wave.active = true;
      wave.elapsed = 0;
      stage.dataset.animation = "wave";
      setStatus("Bonjour !", "Le technicien vous salue et poursuit sa réparation.", "wave");
    }

    stage.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") greetVisitor();
    });
    stage.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".ye-3d-control")) return;
      if (event.pointerType === "touch") greetVisitor();
    }, { passive: true });
    stage.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const bounds = stage.getBoundingClientRect();
      cameraTarget.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.3;
      cameraTarget.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.12;
    });
    stage.addEventListener("pointerleave", () => {
      cameraTarget.x = 0;
      cameraTarget.y = 0;
    });
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
      raf = requestAnimationFrame(render);
      const delta = Math.min(clock.getDelta(), 0.1);
      if (mixer && !reducedMotion.matches) mixer.update(delta);
      if (wave.active && !reducedMotion.matches) {
      wave.elapsed += delta;
      applyWavePose(Math.min(1, wave.elapsed / wave.duration));
      if (wave.elapsed >= wave.duration) {
        wave.active = false;
        stage.dataset.animation = "Fixing_Kneeling";
        setStatus("Réparation en cours", "Le technicien poursuit son intervention.", "repair");
      }
    }
      const greetingYaw = workYaw + (wave.active ? 0.55 : 0);
      const yawDelta = Math.atan2(
        Math.sin(greetingYaw - technicianPivot.rotation.y),
        Math.cos(greetingYaw - technicianPivot.rotation.y),
      );
      technicianPivot.rotation.y += yawDelta * (reducedMotion.matches ? 1 : 0.055);
      const ease = reducedMotion.matches ? 1 : 0.055;
      cameraCurrent.x += (cameraTarget.x - cameraCurrent.x) * ease;
      cameraCurrent.y += (cameraTarget.y - cameraCurrent.y) * ease;
      camera.position.x = cameraCurrent.x;
      camera.position.y = 1.7 - cameraCurrent.y;
      camera.lookAt(0, 1.05, 0);
      const pulse = repairActive && !reducedMotion.matches
        ? 0.7 + Math.sin(performance.now() * 0.009) * 0.3
        : 0.35;
      repairLight.intensity = repairActive ? 1.35 + pulse * 0.35 : 0.16;
      currentRing.material.opacity = repairActive ? 0.48 + pulse * 0.18 : 0.25;
      statusBeacon.material.emissiveIntensity = repairActive ? 2 + pulse * 1.3 : 1.5;
      if (!reducedMotion.matches) currentRing.rotation.z += delta * 0.11;
      renderer.render(scene, camera);
    }

    async function loadScene() {
      try {
        setStatus("Préparation de l'atelier", "Chargement du technicien et de l'appareil…", "loading");
        const [technicianAsset, applianceAsset, motionAsset] = await Promise.all([
          loader.loadAsync("electrician-high-detail-animated.glb"),
          loader.loadAsync("washing-machine-high-detail.glb"),
          loader.loadAsync("quaternius-ual1-standard.glb"),
        ]);

        technician = technicianAsset.scene;
        fitModel(technician, 2.32);
        technicianPivot.add(technician);

        const appliance = applianceAsset.scene;
        fitModel(appliance, 1.62);
        appliance.rotation.y = -Math.PI / 2;
        appliance.position.set(0.72, 0, -0.08);
        scene.add(appliance);

        const targetMesh = findSkinnedMesh(technician);
        const sourceMesh = findSkinnedMesh(motionAsset.scene);
        const sourceClip = pickClip(motionAsset.animations, "Fixing_Kneeling");
        if (!targetMesh || !sourceMesh || !sourceClip) {
          throw new Error("La scène ne contient pas le squelette ou le mouvement de réparation requis.");
        }

        const boneNames = {
          Root: "root",
          Pelvis: "pelvis",
          L_Thigh: "thigh_l",
          L_Calf: "calf_l",
          L_Foot: "foot_l",
          L_ToeBase: "ball_l",
          R_Thigh: "thigh_r",
          R_Calf: "calf_r",
          R_Foot: "foot_r",
          R_ToeBase: "ball_r",
          Waist: "spine_01",
          Spine01: "spine_02",
          Spine02: "spine_03",
          NeckTwist01: "neck_01",
          L_Clavicle: "clavicle_l",
          L_Upperarm: "upperarm_l",
          L_Forearm: "lowerarm_l",
          L_Hand: "hand_l",
          R_Clavicle: "clavicle_r",
          R_Upperarm: "upperarm_r",
          R_Forearm: "lowerarm_r",
          R_Hand: "hand_r",
        };
        technician.updateMatrixWorld(true);
        motionAsset.scene.updateMatrixWorld(true);
        const repairClip = SkeletonUtils.retargetClip(
          targetMesh,
          sourceMesh,
          sourceClip,
          { names: boneNames, hip: "pelvis", preserveBonePositions: true, trim: [2.0, 4.7] },
        );
        repairClip.name = "Fixing_Kneeling";
        if (!repairClip.tracks.length) throw new Error("Le mouvement de réparation n'a pas pu être adapté au technicien.");
        targetMesh.skeleton.pose();
        technician.updateMatrixWorld(true);

        waveBones = {
          upperArm: findBone(technician, ["R_Upperarm"]),
          forearm: findBone(technician, ["R_Forearm"]),
          hand: findBone(technician, ["R_Hand"]),
        };
        mixer = new THREE.AnimationMixer(targetMesh);
        repairAction = mixer.clipAction(repairClip);
        repairAction.setLoop(THREE.LoopRepeat, Infinity);
        repairAction.enabled = true;
        repairAction.play();
        repairActive = true;
        if (reducedMotion.matches) {
          repairAction.time = repairClip.duration * 0.35;
          mixer.update(0.001);
        }

        disposeHiddenModel(motionAsset.scene);
        repairLight.intensity = 1.55;
        currentRing.material.opacity = 0.62;
        statusBeacon.material.emissiveIntensity = 2.5;
        greetingButton.disabled = false;
        stage.dataset.loaded = "true";
        stage.dataset.animation = "Fixing_Kneeling";
        setStatus(
          "Réparation en cours",
          "Survolez ou touchez la scène pour saluer l'artisan.",
          "repair",
        );
        resize();
      } catch (error) {
        stage.dataset.state = "error";
        title.textContent = "Scène 3D indisponible";
        status.textContent = "Impossible de charger l'animation. Vérifiez votre connexion puis réessayez.";
        greetingButton.disabled = true;
        console.error("YELEC63 3D assets failed to load:", error);
      }
    }

    greetingButton.disabled = true;
    resize();
    raf = requestAnimationFrame(render);
    loadScene();
    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mixer?.stopAllAction();
      renderer.dispose();
    }, { once: true });
  }
}
