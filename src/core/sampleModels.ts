import * as THREE from 'three';
import { resolveAssetUrl } from '../utils/assetUrl';

export interface PresetModelDefinition {
  id: string;
  name: string;
  category: 'Anime & Manga' | 'Characters & Figures' | 'Houses & Architecture' | 'Vehicles & Tech' | 'Animals & Creatures' | 'Shapes & Benchmarks';
  description: string;
  file?: string;
  remoteUrl?: string;
  scale?: number;
  rotation?: { x: number; y: number; z: number };
  position?: { x: number; y: number; z: number };
  createMesh?: () => THREE.Object3D;
}

export class SampleModelFactory {
  public static getPresets(): PresetModelDefinition[] {
    const rawPresets: PresetModelDefinition[] = [
      // SHAPES & BENCHMARKS / CANVAS
      {
        id: 'drawing_plane',
        name: 'Drawing Canvas Plane',
        category: 'Shapes & Benchmarks',
        description: 'Tilted 3D drawing plane canvas with double-sided painting support.',
        createMesh: () => SampleModelFactory.createDrawingPlane(),
      },
      {
        id: 'cyber_drone',
        name: 'Cyber Sentry Drone',
        category: 'Vehicles & Tech',
        description: 'High-poly drone with dual thruster pods, glowing lens, and sensors.',
        createMesh: () => SampleModelFactory.createCyberDrone(),
      },
      {
        id: 'robotic_arm',
        name: 'Industrial Robot Arm',
        category: 'Vehicles & Tech',
        description: 'Multi-jointed factory arm with hydraulic piston and gripper claws.',
        createMesh: () => SampleModelFactory.createRoboticArm(),
      },
      {
        id: 'quantum_matrix',
        name: 'Quantum Core Reactor',
        category: 'Vehicles & Tech',
        description: 'Futuristic pedestal with floating energy core and gold orbit rings.',
        createMesh: () => SampleModelFactory.createSciFiGenerator(),
      },
      {
        id: 'arcade_cabinet',
        name: 'Neon Arcade Cabinet',
        category: 'Houses & Architecture',
        description: 'Retro cabinet with grid display, dual joysticks, and illuminated marquee.',
        createMesh: () => SampleModelFactory.createRetroArcade(),
      },

      // ANIME & MANGA
      {
        id: 'pusheen_classic',
        name: 'Pusheen Cat',
        category: 'Anime & Manga',
        description: 'Iconic chubby grey tabby cat with smooth organic geometry.',
        file: '/models/pusheen_classic.glb',
        scale: 4,
      },
      {
        id: 'pusheen_busy',
        name: 'Pusheen at Laptop',
        category: 'Anime & Manga',
        description: 'Pusheen working diligently on a miniature laptop computer.',
        file: '/models/pusheen_busy.glb',
        scale: 12,
      },
      {
        id: 'pusheen_vs_noodle',
        name: 'Pusheen vs Ramen Bowl',
        category: 'Anime & Manga',
        description: 'Pusheen enjoying a giant bowl of ramen noodles.',
        file: '/models/pusheen_vs_noodle.glb',
        scale: 4,
      },
      {
        id: 'pompompurin',
        name: 'Pompompurin Dog',
        category: 'Anime & Manga',
        description: 'Golden retriever dog character wearing his trademark brown beret.',
        file: '/models/pompompurin.glb',
        scale: 4,
      },
      {
        id: 'son_goku_and_kintoun_nimbus',
        name: 'Goku & Flying Nimbus',
        category: 'Anime & Manga',
        description: 'Son Goku riding on the golden mystical Flying Nimbus cloud.',
        file: '/models/son_goku_and_kintoun_nimbus.glb',
        scale: 16.7,
      },
      {
        id: 'sailormoon_casual_bun',
        name: 'Sailor Moon (Casual)',
        category: 'Anime & Manga',
        description: 'Usagi Tsukino in casual style with signature twin buns.',
        file: '/models/sailormoon_casual_bun.glb',
      },
      {
        id: 'shinobu_oshino',
        name: 'Shinobu Oshino',
        category: 'Anime & Manga',
        description: 'Detailed anime figure character with dress and straw hat.',
        file: '/models/shinobu_oshino.glb',
      },
      {
        id: 'krillin',
        name: 'Krillin (Dragon Ball)',
        category: 'Anime & Manga',
        description: 'Martial artist Krillin in iconic martial arts gi uniform.',
        file: '/models/krillin.glb',
      },
      {
        id: 'reg_riko_nanachi',
        name: 'Made in Abyss Trio',
        category: 'Anime & Manga',
        description: 'Riko, Reg, and Nanachi gathered together from Made in Abyss.',
        file: '/models/reg_riko_nanachi_from_made_in_abyss.glb',
      },

      // POKEMON & CHARACTERS
      {
        id: 'ash_ketchum_pokemon',
        name: 'Ash Ketchum (Pokemon)',
        category: 'Characters & Figures',
        description: 'Pokemon trainer Ash Ketchum in trainer cap and jacket.',
        file: '/models/ash_ketchup_-_pokemon.glb',
        scale: 34.9,
      },
      {
        id: 'bulbasaur_pokemon',
        name: 'Bulbasaur',
        category: 'Characters & Figures',
        description: 'Grass-type seed Pokemon with bulb and rounded body contours.',
        file: '/models/bulbasaur_-_pokemon.glb',
      },
      {
        id: 'charmander_pokemon',
        name: 'Charmander',
        category: 'Characters & Figures',
        description: 'Fire-type lizard Pokemon with flame tail and smooth scales.',
        file: '/models/charmanderpokemon.glb',
      },
      {
        id: 'charizard_pokemon',
        name: 'Charizard',
        category: 'Characters & Figures',
        description: 'Draconic flame Pokemon with expansive wings and horns.',
        file: '/models/charizardpokemon.glb',
      },
      {
        id: 'ninetales_pokemon',
        name: 'Ninetales',
        category: 'Characters & Figures',
        description: 'Majestic fox Pokemon with nine golden streaming tails.',
        file: '/models/ninetalespokemon.glb',
      },
      {
        id: 'cherubi_pokemon',
        name: 'Cherubi (Low-Poly)',
        category: 'Characters & Figures',
        description: 'Stylized low-poly cherry Pokemon with smiling small sphere.',
        file: '/models/lowpoly_pokemon_cherubi.glb',
      },
      {
        id: 'matilda',
        name: 'Matilda Character',
        category: 'Characters & Figures',
        description: 'Complex multi-component stylized character mesh with clothing and hair.',
        file: '/models/matilda.glb',
        scale: 4.5,
      },
      {
        id: 'boxy_lankybox_2',
        name: 'Boxy 1 (LankyBox)',
        category: 'Characters & Figures',
        description: 'Boxy cartoon character with box head and friendly expression.',
        file: '/models/boxy_lankybox (2).glb',
        scale: 4,
      },
      {
        id: 'boxy_lankybox_3',
        name: 'Boxy 2 (LankyBox)',
        category: 'Characters & Figures',
        description: 'Alternative Boxy variant character model.',
        file: '/models/boxy_lankybox (3).glb',
      },
      {
        id: 'foxy_lankybox',
        name: 'Foxy (LankyBox)',
        category: 'Characters & Figures',
        description: 'Foxy fox character with orange fur and hooded sweater.',
        file: '/models/foxy_lankybox.glb',
      },
      {
        id: 'foxy_lankybox_1',
        name: 'Foxy Plush (LankyBox)',
        category: 'Characters & Figures',
        description: 'Plush edition of Foxy with rounded soft proportions.',
        file: '/models/foxy_lankybox (1).glb',
      },

      // HOUSES & ARCHITECTURE
      {
        id: 'korean_bakery',
        name: 'Korean Bakery Cafe',
        category: 'Houses & Architecture',
        description: 'Charming pastel pastry bakery with display window, awnings, and sign.',
        file: '/models/korean_bakery.glb',
        scale: 5.5,
      },
      {
        id: 'pawtisserie',
        name: 'Pawtisserie Pastry Shop',
        category: 'Houses & Architecture',
        description: 'Pet bakery shop with playful architectural details and patio.',
        file: '/models/pawtisserie.glb',
      },
      {
        id: 'fantasy_house',
        name: 'Storybook House',
        category: 'Houses & Architecture',
        description: 'Curved roof fairytale cottage with stone chimney and garden fence.',
        file: '/models/fantasy_house.glb',
        scale: 5,
      },
      {
        id: 'isometric_castle',
        name: 'Isometric Fantasy Castle',
        category: 'Houses & Architecture',
        description: 'Multi-tower fortified stone castle with parapets and courtyard.',
        file: '/models/isometric_fantasy_castle.glb',
        scale: 6,
      },
      {
        id: 'medieval_house',
        name: 'Medieval Timber House',
        category: 'Houses & Architecture',
        description: 'Half-timbered medieval European house with shingle roof.',
        file: '/models/stylized_medieval_house.glb',
        scale: 5.5,
      },
      {
        id: 'car_house',
        name: 'Camper Van Cottage',
        category: 'Houses & Architecture',
        description: 'Vintage travel camper converted into a cozy mobile home.',
        file: '/models/car_house.glb',
        scale: 5.5,
      },
      {
        id: 'house',
        name: 'Modern Village Cottage',
        category: 'Houses & Architecture',
        description: 'Clean contemporary residential cottage with pitched roof.',
        file: '/models/house.glb',
        scale: 5.5,
      },
      {
        id: 'halloween',
        name: 'Halloween Spooky Manor',
        category: 'Houses & Architecture',
        description: 'Gothic house scene with jack-o-lanterns and bat perches.',
        file: '/models/halloween.glb',
      },

      // VEHICLES & TECH
      {
        id: 'akira_bike',
        name: 'Kaneda Akira Bike',
        category: 'Vehicles & Tech',
        description: 'Legendary futuristic crimson cyber motorcycle with aerodynamic decals.',
        file: '/models/akira_bike.glb',
        scale: 33.8,
      },
      {
        id: 'kanedas_bike_akira',
        name: 'Kaneda Akira Bike (Classic Edition)',
        category: 'Vehicles & Tech',
        description: 'Classic high-fidelity edition of the iconic cyberpunk Akira motorcycle.',
        file: '/models/kanedas_bike_akira.glb',
        scale: 33.8,
      },
      {
        id: 'akira_motorcycle',
        name: 'Akira Motorcycle (Alt)',
        category: 'Vehicles & Tech',
        description: 'High-detail cyberpunk motorcycle with instrument cluster.',
        file: '/models/akira_motorcycle.glb',
        scale: 33.5,
      },
      {
        id: 'psx_saviola_s21',
        name: 'PSX Seaplane S-21',
        category: 'Vehicles & Tech',
        description: 'Retro PlayStation 1 aesthetic vintage seaplane with pontoons and propeller.',
        file: '/models/psx_saviola_s21.glb',
        scale: 3,
      },
      {
        id: 'cyber_helmet',
        name: 'Cyber Visor Helmet',
        category: 'Vehicles & Tech',
        description: 'Aerodynamic armored cyber helmet with faceted plating and reflective visor.',
        createMesh: () => SampleModelFactory.createCyberHelmet(),
      },
      {
        id: 'scifi_drone',
        name: 'Recon Drone',
        category: 'Vehicles & Tech',
        description: 'Spherical hull drone with quad directional thruster pods.',
        createMesh: () => SampleModelFactory.createSciFiDrone(),
      },

      // ANIMALS & CREATURES
      {
        id: 'capybara_bath',
        name: 'Capybara Onsen Bath',
        category: 'Animals & Creatures',
        description: 'Relaxed capybara soaking in a traditional wooden hot spring tub with citrus.',
        file: '/models/capybara_bath.glb',
        scale: 3.5,
      },
      {
        id: 'capybara_cute',
        name: 'Cute Capybara',
        category: 'Animals & Creatures',
        description: 'Adorable standing capybara with rounded snout and small ears.',
        file: '/models/capybara_cute.glb',
        scale: 1,
      },
      {
        id: 'chonky_axolotl',
        name: 'Chonky Axolotl',
        category: 'Animals & Creatures',
        description: 'Plump cheerful aquatic axolotl with external gill frills.',
        file: '/models/chonky_axolotl.glb',
        scale: 1.1,
      },
      {
        id: 'cat_cuddly_toy',
        name: 'Kawaii Cat Plush',
        category: 'Animals & Creatures',
        description: 'Soft cuddly Japanese manga plush kitten.',
        file: '/models/cat_cuddly_toy_manga_anime_otaku_kawaii.glb',
      },
      {
        id: 'this_model_is_cute_and_kawaii',
        name: 'Kawaii Friend',
        category: 'Animals & Creatures',
        description: 'Whimsical sweet chibi character with charming expression.',
        file: '/models/this_model_is_cute_and_kawaii.glb',
      },

      // SHAPES & BENCHMARKS
      {
        id: 'sculpted_bust',
        name: 'Classical Sculpted Bust',
        category: 'Shapes & Benchmarks',
        description: 'Smooth marble anatomical contours for testing precision normal snapping.',
        createMesh: () => SampleModelFactory.createSculptedBust(),
      },
      {
        id: 'ceramic_vase',
        name: 'Ceramic Amphora',
        category: 'Shapes & Benchmarks',
        description: 'Curved porcelain vase with handles and lathe contour curvature.',
        createMesh: () => SampleModelFactory.createCeramicVase(),
      },
      {
        id: 'torus_knot',
        name: 'Torus Knot Benchmark',
        category: 'Shapes & Benchmarks',
        description: 'Continuous non-planar topology loop for zero-clipping validation.',
        createMesh: () => SampleModelFactory.createTorusKnot(),
      },
    ];

    return rawPresets.map((p) => ({
      ...p,
      file: p.file ? resolveAssetUrl(p.file) : undefined,
    }));
  }

  public static createCyberHelmet(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'CyberHelmet';

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const visorMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const skullGeom = new THREE.SphereGeometry(1.0, 48, 36);
    const pos = skullGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      let nz = z * 1.15;
      let ny = y * 1.05;
      if (z > 0.3 && y < 0.2) {
        nz += 0.15 * Math.sin(y * Math.PI);
      }
      pos.setXYZ(i, x * 0.95, ny, nz);
    }
    skullGeom.computeVertexNormals();
    const skullMesh = new THREE.Mesh(skullGeom, baseMaterial);
    group.add(skullMesh);

    const visorGeom = new THREE.CylinderGeometry(0.85, 0.82, 0.65, 32, 16, true, -Math.PI * 0.45, Math.PI * 0.9);
    const visorPos = visorGeom.attributes.position;
    for (let i = 0; i < visorPos.count; i++) {
      const z = visorPos.getZ(i);
      visorPos.setZ(i, z + 0.35);
    }
    visorGeom.computeVertexNormals();
    const visorMesh = new THREE.Mesh(visorGeom, visorMaterial);
    visorMesh.position.set(0, 0.05, 0.3);
    group.add(visorMesh);

    const earGeom = new THREE.CylinderGeometry(0.28, 0.25, 0.2, 24);
    earGeom.rotateZ(Math.PI / 2);
    const earL = new THREE.Mesh(earGeom, accentMaterial);
    earL.position.set(0.92, -0.05, 0.1);
    group.add(earL);

    const earR = earL.clone();
    earR.position.set(-0.92, -0.05, 0.1);
    group.add(earR);

    const chinGeom = new THREE.BoxGeometry(0.55, 0.35, 0.65);
    const chinMesh = new THREE.Mesh(chinGeom, accentMaterial);
    chinMesh.position.set(0, -0.75, 0.6);
    chinMesh.rotation.x = Math.PI * 0.12;
    group.add(chinMesh);

    return group;
  }

  public static createSculptedBust(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'SculptedBust';

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xedebe6,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const headGeom = new THREE.SphereGeometry(0.75, 48, 36);
    const pos = headGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      let ny = y * 1.25;
      let nz = z;
      if (y < 0 && z > 0.2) {
        nz += 0.12;
      }
      pos.setXYZ(i, x * 0.85, ny, nz);
    }
    headGeom.computeVertexNormals();
    const head = new THREE.Mesh(headGeom, marbleMat);
    head.position.set(0, 0.6, 0);
    group.add(head);

    const neckGeom = new THREE.CylinderGeometry(0.32, 0.42, 0.7, 32);
    const neck = new THREE.Mesh(neckGeom, marbleMat);
    neck.position.set(0, -0.05, -0.05);
    group.add(neck);

    const torsoGeom = new THREE.CylinderGeometry(0.45, 0.95, 1.1, 32);
    const tPos = torsoGeom.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const x = tPos.getX(i);
      const y = tPos.getY(i);
      const z = tPos.getZ(i);
      tPos.setXYZ(i, x * 1.7, y, z * 0.85);
    }
    torsoGeom.computeVertexNormals();
    const torso = new THREE.Mesh(torsoGeom, marbleMat);
    torso.position.set(0, -0.75, -0.05);
    group.add(torso);

    const baseGeom = new THREE.CylinderGeometry(0.7, 0.85, 0.35, 36);
    const pedestal = new THREE.Mesh(baseGeom, marbleMat);
    pedestal.position.set(0, -1.45, -0.05);
    group.add(pedestal);

    return group;
  }

  public static createCeramicVase(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'CeramicVase';

    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1eb,
      roughness: 0.25,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const y = (t - 0.5) * 2.4;
      const r = 0.35 + 0.45 * Math.sin(t * Math.PI) + 0.15 * Math.sin(t * Math.PI * 2.5);
      points.push(new THREE.Vector2(Math.max(0.12, r), y));
    }

    const latheGeom = new THREE.LatheGeometry(points, 48);
    latheGeom.computeVertexNormals();
    const vaseMesh = new THREE.Mesh(latheGeom, ceramicMat);
    group.add(vaseMesh);

    const handleGeom = new THREE.TorusGeometry(0.35, 0.065, 20, 32, Math.PI);
    handleGeom.rotateZ(-Math.PI / 2);

    const handleL = new THREE.Mesh(handleGeom, ceramicMat);
    handleL.position.set(0.72, 0.25, 0);
    group.add(handleL);

    const handleR = new THREE.Mesh(handleGeom, ceramicMat);
    handleR.rotation.y = Math.PI;
    handleR.position.set(-0.72, 0.25, 0);
    group.add(handleR);

    return group;
  }

  public static createSciFiDrone(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'SciFiDrone';

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      roughness: 0.1,
      metalness: 0.1,
      emissive: 0x005577,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });

    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xdf8435,
      roughness: 0.4,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 36), hullMat);
    group.add(sphere);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 24), lensMat);
    eye.position.set(0, 0, 0.75);
    eye.scale.set(1, 1, 0.5);
    group.add(eye);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 24, 48), plateMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.6, 24), hullMat);
      thruster.position.set(Math.cos(angle) * 0.95, -0.4, Math.sin(angle) * 0.95);
      thruster.rotation.x = Math.PI * 0.15 * Math.sin(angle);
      thruster.rotation.z = -Math.PI * 0.15 * Math.cos(angle);
      group.add(thruster);
    }

    return group;
  }

  public static createDrawingPlane(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'DrawingCanvasPlane';

    // 3D Canvas Sheet Plane with double-sided painting support
    const geom = new THREE.PlaneGeometry(3.6, 2.4, 48, 48);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xfcfdfd,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Subtle edge border outline for clean visibility
    const edges = new THREE.EdgesGeometry(geom);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x94a3b8, linewidth: 2 })
    );
    group.add(line);

    // Slight dynamic perspective tilt
    group.rotation.x = -Math.PI * 0.15;
    group.rotation.y = Math.PI * 0.1;

    return group;
  }

  public static createTorusKnot(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'TorusKnot';

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3f51b5,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.DoubleSide,
    });

    const geom = new THREE.TorusKnotGeometry(0.8, 0.26, 128, 32, 2, 3);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    return group;
  }

  public static createCube(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveCube';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.BoxGeometry(1.6, 1.6, 1.6, 24, 24, 24);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createSphere(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveSphere';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.SphereGeometry(1.0, 48, 36);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createCylinder(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveCylinder';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.CylinderGeometry(0.8, 0.8, 1.8, 48, 16);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createTorus(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveTorus';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.TorusGeometry(0.9, 0.3, 32, 64);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createCapsule(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveCapsule';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.CapsuleGeometry(0.7, 1.2, 16, 32);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createCone(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveCone';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.ConeGeometry(0.9, 1.8, 48);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createPyramid(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitivePyramid';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.ConeGeometry(1.0, 1.6, 4);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createDisk(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'PrimitiveDisk';
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe2e4ea,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.CylinderGeometry(1.1, 1.1, 0.1, 48);
    geom.computeVertexNormals();
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static createProceduralGridTexture(color1 = '#1e293b', color2 = '#0f172a', lines = '#38bdf8'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 512, 512);

    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillRect(256, 256, 256, 256);

    ctx.strokeStyle = lines;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, 512, 512);
    ctx.strokeRect(128, 128, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public static createCyberDrone(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Cyber_Sentry_Drone';

    const bodyGeo = new THREE.SphereGeometry(1.2, 32, 24);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.08,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    const eyeGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.2, 0.9);
    eye.scale.set(1, 1, 0.4);
    group.add(eye);

    const ringGeo = new THREE.TorusGeometry(0.65, 0.08, 16, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.08,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.2, 0.95);
    group.add(ring);

    const thrusterRingGeo = new THREE.TorusGeometry(1.8, 0.12, 16, 48);
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.08,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    const thrusterRing = new THREE.Mesh(thrusterRingGeo, thrusterMat);
    thrusterRing.rotation.x = Math.PI / 2.5;
    thrusterRing.castShadow = true;
    group.add(thrusterRing);

    const podGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.7, 16);
    const podGlowMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
    });

    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    angles.forEach((ang) => {
      const pod = new THREE.Mesh(podGeo, bodyMat);
      pod.position.set(Math.cos(ang) * 1.8, Math.sin(ang) * 0.4, Math.sin(ang) * 1.4);
      pod.rotation.x = Math.PI / 3;
      pod.castShadow = true;

      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 12), podGlowMat);
      plume.position.y = -0.45;
      plume.rotation.x = Math.PI;
      pod.add(plume);

      group.add(pod);
    });

    const antGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.9, 8);
    const ant1 = new THREE.Mesh(antGeo, ringMat);
    ant1.position.set(0.6, 1.2, -0.2);
    ant1.rotation.z = -0.3;
    ant1.rotation.x = -0.2;
    group.add(ant1);

    const ant2 = new THREE.Mesh(antGeo, ringMat);
    ant2.position.set(-0.6, 1.2, -0.2);
    ant2.rotation.z = 0.3;
    ant2.rotation.x = -0.2;
    group.add(ant2);

    return group;
  }

  public static createRoboticArm(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Industrial_Robotic_Arm';

    const metalDark = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.08, roughness: 0.45, side: THREE.DoubleSide });
    const yellowHazard = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.05, roughness: 0.4, side: THREE.DoubleSide });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.1, roughness: 0.3, side: THREE.DoubleSide });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.4, 32), metalDark);
    base.position.y = 0.2;
    base.castShadow = true;
    group.add(base);

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.6, 24), yellowHazard);
    turret.position.y = 0.7;
    turret.castShadow = true;
    group.add(turret);

    const joint1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), chrome);
    joint1.position.y = 1.2;
    joint1.castShadow = true;
    group.add(joint1);

    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.6), yellowHazard);
    arm1.position.set(0.4, 2.2, 0.3);
    arm1.rotation.z = -0.35;
    arm1.castShadow = true;
    group.add(arm1);

    const pistonOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 12), metalDark);
    pistonOuter.position.set(-0.2, 2.0, 0.3);
    pistonOuter.rotation.z = -0.25;
    group.add(pistonOuter);

    const pistonShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 12), chrome);
    pistonShaft.position.set(-0.35, 2.6, 0.3);
    pistonShaft.rotation.z = -0.25;
    group.add(pistonShaft);

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 20), chrome);
    elbow.position.set(0.8, 3.2, 0.3);
    group.add(elbow);

    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.8, 0.45), metalDark);
    arm2.position.set(1.5, 3.0, 0.3);
    arm2.rotation.z = 0.8;
    arm2.castShadow = true;
    group.add(arm2);

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16), chrome);
    wrist.position.set(2.2, 2.6, 0.3);
    wrist.rotation.z = Math.PI / 2;
    group.add(wrist);

    const clawGeo = new THREE.BoxGeometry(0.12, 0.6, 0.18);
    const clawLeft = new THREE.Mesh(clawGeo, yellowHazard);
    clawLeft.position.set(2.6, 2.8, 0.3);
    clawLeft.rotation.z = -0.2;
    group.add(clawLeft);

    const clawRight = new THREE.Mesh(clawGeo, yellowHazard);
    clawRight.position.set(2.6, 2.4, 0.3);
    clawRight.rotation.z = 0.2;
    group.add(clawRight);

    return group;
  }

  public static createSciFiGenerator(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Quantum_Core_Matrix';

    const reactorMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.08,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });

    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x8b5cf6,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.1,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.5, 8), reactorMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.8, 0.3), reactorMat);
      pillar.position.set(Math.cos(angle) * 1.5, 1.6, Math.sin(angle) * 1.5);
      pillar.castShadow = true;
      group.add(pillar);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 0.08), neonMat);
      strip.position.set(Math.cos(angle) * 1.35, 1.6, Math.sin(angle) * 1.35);
      group.add(strip);
    }

    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.4, 8), reactorMat);
    topCap.position.y = 3.1;
    topCap.castShadow = true;
    group.add(topCap);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 2), neonMat);
    core.position.y = 1.7;
    group.add(core);

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 16, 32), goldMat);
    ring1.position.y = 1.7;
    ring1.rotation.x = Math.PI / 3;
    group.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.06, 16, 32), goldMat);
    ring2.position.y = 1.7;
    ring2.rotation.y = Math.PI / 3;
    group.add(ring2);

    return group;
  }

  public static createPusheenCat(variant: string = 'classic'): THREE.Group {
    const group = new THREE.Group();
    group.name = `Pusheen_${variant}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const darkGreyMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });

    // Chubby ovular body
    const bodyGeom = new THREE.SphereGeometry(1.2, 32, 24);
    bodyGeom.scale(1.2, 0.95, 1.4);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.0;
    group.add(body);

    // Tabby Stripes on Back
    for (let i = -0.3; i <= 0.3; i += 0.3) {
      const stripeGeom = new THREE.TorusGeometry(1.18, 0.04, 8, 24, Math.PI * 0.5);
      stripeGeom.rotateZ(Math.PI * 0.25);
      const stripe = new THREE.Mesh(stripeGeom, darkGreyMat);
      stripe.position.set(0, 1.35, i);
      stripe.scale.set(1.1, 0.9, 1.3);
      group.add(stripe);
    }

    // Cute triangular cat ears
    const earGeom = new THREE.ConeGeometry(0.3, 0.45, 16);
    const earL = new THREE.Mesh(earGeom, bodyMat);
    earL.position.set(-0.55, 2.0, 0.8);
    earL.rotation.set(-0.2, 0, -0.2);
    const earR = new THREE.Mesh(earGeom, bodyMat);
    earR.position.set(0.55, 2.0, 0.8);
    earR.rotation.set(-0.2, 0, 0.2);
    group.add(earL, earR);

    // Eyes
    const eyeGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeL = new THREE.Mesh(eyeGeom, blackMat);
    eyeL.position.set(-0.4, 1.15, 1.48);
    const eyeR = new THREE.Mesh(eyeGeom, blackMat);
    eyeR.position.set(0.4, 1.15, 1.48);
    group.add(eyeL, eyeR);

    // Whiskers
    const whiskerGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
    whiskerGeom.rotateZ(Math.PI / 2);
    [-0.1, 0.05].forEach((yOff) => {
      const wL = new THREE.Mesh(whiskerGeom, darkGreyMat);
      wL.position.set(-0.85, 1.05 + yOff, 1.25);
      wL.rotation.y = -0.3;
      const wR = new THREE.Mesh(whiskerGeom, darkGreyMat);
      wR.position.set(0.85, 1.05 + yOff, 1.25);
      wR.rotation.y = 0.3;
      group.add(wL, wR);
    });

    // Chubby Paws
    const pawGeom = new THREE.SphereGeometry(0.22, 16, 16);
    const pawFL = new THREE.Mesh(pawGeom, bodyMat);
    pawFL.position.set(-0.5, 0.22, 0.9);
    const pawFR = new THREE.Mesh(pawGeom, bodyMat);
    pawFR.position.set(0.5, 0.22, 0.9);
    const pawBL = new THREE.Mesh(pawGeom, bodyMat);
    pawBL.position.set(-0.6, 0.22, -0.7);
    const pawBR = new THREE.Mesh(pawGeom, bodyMat);
    pawBR.position.set(0.6, 0.22, -0.7);
    group.add(pawFL, pawFR, pawBL, pawBR);

    // Striped Tail
    const tailGeom = new THREE.CylinderGeometry(0.14, 0.1, 0.8, 16);
    tailGeom.rotateX(Math.PI * 0.35);
    const tail = new THREE.Mesh(tailGeom, bodyMat);
    tail.position.set(0, 0.7, -1.5);
    group.add(tail);

    if (variant === 'busy') {
      // Laptop
      const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.6), darkGreyMat);
      laptopBase.position.set(0, 0.5, 1.4);
      const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.04), darkGreyMat);
      laptopScreen.position.set(0, 0.75, 1.7);
      laptopScreen.rotation.x = -0.2;
      const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.42), new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.8,
        side: THREE.DoubleSide,
      }));
      screenGlow.position.set(0, 0.75, 1.67);
      screenGlow.rotation.x = -0.2;
      group.add(laptopBase, laptopScreen, screenGlow);
    } else if (variant === 'noodle') {
      // Ramen Bowl
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.3, 0.45, 24), pinkMat);
      bowl.position.set(0, 0.35, 1.4);
      const soup = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      soup.rotation.x = -Math.PI / 2;
      soup.position.set(0, 0.56, 1.4);
      group.add(bowl, soup);
    }

    return group;
  }

  public static createPompompurinDog(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Pompompurin_Dog';

    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.6,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const brownMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });

    // Body
    const bodyGeom = new THREE.SphereGeometry(1.2, 32, 24);
    bodyGeom.scale(1.15, 1.1, 1.15);
    const body = new THREE.Mesh(bodyGeom, yellowMat);
    body.position.y = 1.2;
    group.add(body);

    // Brown Beret Hat
    const hatBase = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 0.16, 24), brownMat);
    hatBase.position.set(0, 2.38, 0);
    const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), brownMat);
    hatTop.position.set(0, 2.5, 0);
    group.add(hatBase, hatTop);

    // Floppy puppy ears
    const earGeom = new THREE.SphereGeometry(0.3, 16, 16);
    earGeom.scale(0.6, 1.4, 0.8);
    const earL = new THREE.Mesh(earGeom, yellowMat);
    earL.position.set(-1.0, 1.8, 0.2);
    earL.rotation.set(0.2, 0, 0.3);
    const earR = new THREE.Mesh(earGeom, yellowMat);
    earR.position.set(1.0, 1.8, 0.2);
    earR.rotation.set(0.2, 0, -0.3);
    group.add(earL, earR);

    // Face eyes & nose
    const eyeGeom = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeL = new THREE.Mesh(eyeGeom, blackMat);
    eyeL.position.set(-0.35, 1.35, 1.12);
    const eyeR = new THREE.Mesh(eyeGeom, blackMat);
    eyeR.position.set(0.35, 1.35, 1.12);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), brownMat);
    nose.position.set(0, 1.22, 1.18);
    group.add(eyeL, eyeR, nose);

    // Feet
    const footGeom = new THREE.SphereGeometry(0.28, 16, 16);
    const footL = new THREE.Mesh(footGeom, yellowMat);
    footL.position.set(-0.55, 0.25, 0.4);
    const footR = new THREE.Mesh(footGeom, yellowMat);
    footR.position.set(0.55, 0.25, 0.4);
    group.add(footL, footR);

    return group;
  }

  public static createPokemonCreature(type: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `Pokemon_${type}`;

    if (type.includes('bulbasaur')) {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x5eead4, roughness: 0.5, side: THREE.DoubleSide });
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, side: THREE.DoubleSide });
      const spotMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.5, side: THREE.DoubleSide });

      const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 20), skinMat);
      body.scale.set(1.1, 0.9, 1.2);
      body.position.y = 0.9;
      group.add(body);

      const bulbGeom = new THREE.ConeGeometry(0.7, 1.0, 16);
      const bulb = new THREE.Mesh(bulbGeom, bulbMat);
      bulb.position.set(0, 1.7, -0.2);
      group.add(bulb);

      const legGeom = new THREE.CylinderGeometry(0.22, 0.25, 0.6, 16);
      [[-0.6, 0.5], [0.6, 0.5], [-0.6, -0.5], [0.6, -0.5]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeom, skinMat);
        leg.position.set(x, 0.3, z);
        group.add(leg);
      });
    } else if (type.includes('charmander') || type.includes('charizard')) {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45, side: THREE.DoubleSide });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5, side: THREE.DoubleSide });
      const flameMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf97316,
        emissiveIntensity: 1.2,
        side: THREE.DoubleSide,
      });

      const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 20), skinMat);
      body.scale.set(0.9, 1.2, 0.9);
      body.position.y = 1.2;
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 16), bellyMat);
      belly.scale.set(0.8, 1.0, 0.6);
      belly.position.set(0, 1.1, 0.4);
      group.add(body, belly);

      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 1.1, 16), skinMat);
      tail.position.set(0, 0.8, -0.8);
      tail.rotation.x = -0.6;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 12), flameMat);
      flame.position.set(0, 1.4, -1.3);
      group.add(tail, flame);

      if (type.includes('charizard')) {
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
        const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), wingMat);
        wingL.position.set(-1.2, 1.8, -0.3);
        wingL.rotation.y = 0.5;
        const wingR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), wingMat);
        wingR.position.set(1.2, 1.8, -0.3);
        wingR.rotation.y = -0.5;
        group.add(wingL, wingR);
      }
    } else {
      // Default cute creature
      const mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, side: THREE.DoubleSide });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 20), mat);
      body.position.y = 1.1;
      group.add(body);
    }

    return group;
  }

  public static createFantasyCottage(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `FantasyCottage_${name}`;

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, side: THREE.DoubleSide });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5, side: THREE.DoubleSide });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6, side: THREE.DoubleSide });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, side: THREE.DoubleSide });

    const walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.0), wallMat);
    walls.position.set(0, 0.8, 0);
    walls.castShadow = true;
    group.add(walls);

    const roofGeom = new THREE.ConeGeometry(2.0, 1.4, 4);
    roofGeom.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(0, 2.2, 0);
    group.add(roof);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.45), stoneMat);
    chimney.position.set(0.7, 2.2, 0.4);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.08), woodMat);
    door.position.set(0, 0.45, 1.02);
    group.add(chimney, door);

    return group;
  }

  public static createCyberBike(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Kaneda_Akira_CyberBike';

    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.08, side: THREE.DoubleSide });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, side: THREE.DoubleSide });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.2,
      side: THREE.DoubleSide,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 2.8), redMat);
    body.position.set(0, 0.9, 0);
    group.add(body);

    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.4, 16), redMat);
    canopy.rotation.x = Math.PI / 2;
    canopy.position.set(0, 1.1, 0.5);
    group.add(canopy);

    const tireGeom = new THREE.CylinderGeometry(0.65, 0.65, 0.4, 24);
    tireGeom.rotateZ(Math.PI / 2);
    const frontTire = new THREE.Mesh(tireGeom, tireMat);
    frontTire.position.set(0, 0.65, 1.5);
    const rearTire = new THREE.Mesh(tireGeom, tireMat);
    rearTire.position.set(0, 0.65, -1.3);
    group.add(frontTire, rearTire);

    const light = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.25), glowMat);
    light.position.set(0, 0.9, 2.0);
    group.add(light);

    return group;
  }

  public static createCapybaraBath(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Capybara_Bath';

    const tubMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.6, side: THREE.DoubleSide });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const capyMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.65, side: THREE.DoubleSide });
    const yuzuMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, side: THREE.DoubleSide });

    const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.9, 24, 1, true), tubMat);
    tub.position.set(0, 0.45, 0);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.35, 24), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.75, 0);
    group.add(tub, water);

    const capyHead = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), capyMat);
    capyHead.scale.set(0.9, 1.0, 1.3);
    capyHead.position.set(0, 1.05, 0);
    const yuzu = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), yuzuMat);
    yuzu.position.set(0, 1.6, 0.1);
    group.add(capyHead, yuzu);

    return group;
  }

  public static createFallbackModelForPreset(preset: PresetModelDefinition): THREE.Object3D {
    const id = preset.id.toLowerCase();
    if (id.includes('pusheen')) {
      if (id.includes('busy')) return SampleModelFactory.createPusheenCat('busy');
      if (id.includes('noodle')) return SampleModelFactory.createPusheenCat('noodle');
      return SampleModelFactory.createPusheenCat('classic');
    }
    if (id.includes('pompompurin')) {
      return SampleModelFactory.createPompompurinDog();
    }
    if (id.includes('pokemon') || id.includes('bulbasaur') || id.includes('charmander') || id.includes('charizard') || id.includes('ninetales') || id.includes('cherubi')) {
      return SampleModelFactory.createPokemonCreature(id);
    }
    if (id.includes('bakery') || id.includes('house') || id.includes('castle') || id.includes('pawtisserie') || id.includes('halloween')) {
      return SampleModelFactory.createFantasyCottage(preset.name);
    }
    if (id.includes('bike') || id.includes('motorcycle')) {
      return SampleModelFactory.createCyberBike();
    }
    if (id.includes('capybara')) {
      return SampleModelFactory.createCapybaraBath();
    }
    if (id.includes('drone')) {
      return SampleModelFactory.createSciFiDrone();
    }
    if (id.includes('helmet')) {
      return SampleModelFactory.createCyberHelmet();
    }
    return SampleModelFactory.createSculptedBust();
  }

  public static createRetroArcade(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Neon_Arcade_Cabinet';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    const screenTexture = SampleModelFactory.createProceduralGridTexture('#09090b', '#18181b', '#ec4899');
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: 0xec4899,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });

    const neonPink = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xf43f5e,
      emissiveIntensity: 1.0,
      side: THREE.DoubleSide,
    });

    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.3, side: THREE.DoubleSide });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.3, side: THREE.DoubleSide });

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.8, 1.4), bodyMat);
    cab.position.set(0, 1.4, 0);
    cab.castShadow = true;
    group.add(cab);

    const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.4, 0.5), neonPink);
    marquee.position.set(0, 2.5, 0.55);
    group.add(marquee);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), screenMat);
    screen.position.set(0, 1.75, 0.71);
    screen.rotation.x = -0.25;
    group.add(screen);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.25, 0.6), bodyMat);
    deck.position.set(0, 1.2, 0.85);
    deck.rotation.x = 0.2;
    group.add(deck);

    const stickBase1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), yellowMat);
    stickBase1.position.set(-0.35, 1.35, 0.85);
    const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), neonPink);
    ball1.position.set(-0.35, 1.48, 0.85);
    group.add(stickBase1, ball1);

    const stickBase2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), yellowMat);
    stickBase2.position.set(0.35, 1.35, 0.85);
    const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), cyanMat);
    ball2.position.set(0.35, 1.48, 0.85);
    group.add(stickBase2, ball2);

    const btnGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12);
    [-0.1, 0.05, 0.2].forEach((offset, idx) => {
      const btn1 = new THREE.Mesh(btnGeo, idx % 2 === 0 ? neonPink : cyanMat);
      btn1.position.set(-0.2 + offset * 0.5, 1.3, 0.95);
      const btn2 = new THREE.Mesh(btnGeo, idx % 2 === 0 ? cyanMat : yellowMat);
      btn2.position.set(0.4 + offset * 0.5, 1.3, 0.95);
      group.add(btn1, btn2);
    });

    return group;
  }
}

