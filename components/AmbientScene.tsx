"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

import { pointer } from "@/lib/pointer";

/**
 * The scene behind every page: violet shards, rising embers, and a point light
 * that tracks the cursor so the whole background lights up where you point.
 *
 * Everything here is emissive and then pushed through Bloom, which is what
 * turns "a violet object" into "a violet glow" — without the postprocessing
 * pass this reads as flat plastic.
 *
 * One colour only: `--accent` violet, plus the lighter tint of it used for
 * highlights. The theme rule forbids a fourth decorative colour, and an
 * ambient layer is exactly where a stray hue would be most tempting.
 */

/** Scratch vectors, module-scope so the frame loop allocates nothing. */
const ndc = new THREE.Vector3();
const direction = new THREE.Vector3();
const target = new THREE.Vector3();

/**
 * Deterministic PRNG. Math.random() inside useMemo would give a different sky
 * on every mount (and twice-different under StrictMode); a fixed seed means
 * the same composition every load.
 */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHARD_COUNT = 54;

interface ShardSeed {
  x: number;
  y: number;
  z: number;
  driftX: number;
  driftY: number;
  driftZ: number;
  spin: number;
  scale: number;
  phase: number;
}

/** Floating geometry. Instanced so 46 shards cost one draw call. */
function Shards() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo<ShardSeed[]>(() => {
    const random = mulberry32(0x5eed);
    return Array.from({ length: SHARD_COUNT }, () => ({
      // Spread wider than the viewport so the edges never show a hard border,
      // and kept far enough back that nothing lands huge behind the content —
      // big bright shards showed through the translucent cards as blotches.
      x: (random() - 0.5) * 24,
      y: (random() - 0.5) * 15,
      z: -3 - random() * 12,
      driftX: 0.1 + random() * 0.3,
      driftY: 0.08 + random() * 0.26,
      driftZ: 0.06 + random() * 0.2,
      spin: (random() - 0.5) * 0.5,
      // Small and numerous reads as texture; large and few reads as blotches.
      scale: 0.05 + random() * 0.15,
      phase: random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    const shards = mesh.current;
    if (!shards) return;

    const t = state.clock.elapsedTime;
    for (let i = 0; i < seeds.length; i += 1) {
      const seed = seeds[i];
      dummy.position.set(
        seed.x + Math.sin(t * seed.driftX + seed.phase) * 1.1,
        seed.y + Math.cos(t * seed.driftY + seed.phase * 1.7) * 0.8,
        seed.z + Math.sin(t * seed.driftZ + seed.phase) * 0.7,
      );
      dummy.rotation.set(t * seed.spin, t * seed.spin * 0.6, seed.phase);
      dummy.scale.setScalar(seed.scale);
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, SHARD_COUNT]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#3b0764"
        emissive="#8b5cf6"
        // Held well under blowout: the bloom does the glowing, this only
        // supplies the energy, and at 2.6+ the shards turned white-hot.
        emissiveIntensity={1.5}
        roughness={0.4}
        metalness={0.15}
        flatShading
      />
    </instancedMesh>
  );
}

const EMBER_COUNT = 240;

/** Slowly rising motes, additive so they overlap into brighter specks. */
function Embers() {
  const points = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const random = mulberry32(0xbeef);
    const positions = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i += 1) {
      positions[i * 3] = (random() - 0.5) * 24;
      positions[i * 3 + 1] = (random() - 0.5) * 16;
      positions[i * 3 + 2] = -1 - random() * 11;
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, []);

  // Dispose on unmount, or the GPU keeps the buffers for the life of the tab.
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const cloud = points.current;
    if (!cloud) return;

    const attribute = cloud.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    for (let i = 1; i < array.length; i += 3) {
      array[i] += 0.007;
      if (array[i] > 8) array[i] = -8;
    }
    attribute.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.06}
        color="#c4b5fd"
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** The lamp. Moves to wherever the cursor is over the z=0 plane. */
function CursorLamp() {
  const light = useRef<THREE.PointLight>(null);
  const { camera } = useThree();

  useFrame(() => {
    const lamp = light.current;
    if (!lamp) return;

    if (!pointer.active) {
      // Fade rather than snap: a light that blinks off reads as a glitch.
      lamp.intensity = THREE.MathUtils.lerp(lamp.intensity, 0, 0.15);
      return;
    }

    // Screen position -> world position on the plane the shards sit in.
    ndc.set(pointer.x * 2 - 1, -(pointer.y * 2 - 1), 0.5).unproject(camera);
    direction.copy(ndc).sub(camera.position).normalize();

    // Ray from the camera to z=0. Skipped at grazing angles, where the
    // intersection would run to infinity and fling the light off-screen.
    const distance = -camera.position.z / direction.z;
    if (!Number.isFinite(distance) || distance <= 0 || distance > 80) return;

    target.copy(camera.position).addScaledVector(direction, distance);
    lamp.position.lerp(target, 0.2);
    // Deliberately the brightest thing in the scene: the point of the whole
    // effect is that light visibly pools where the cursor is.
    lamp.intensity = THREE.MathUtils.lerp(lamp.intensity, 52, 0.12);
  });

  return <pointLight ref={light} color="#a78bfa" intensity={0} distance={26} decay={1.6} />;
}

export function AmbientScene() {
  return (
    <>
      {/* Matches the page background, so far shards dissolve into the dark
          rather than ending at a visible edge. */}
      <fog attach="fog" args={["#0a0a12", 5, 20]} />

      {/* Kept low and violet: enough to give the shards a dark side, not
          enough to wash the glow out. */}
      <ambientLight intensity={0.4} color="#4c1d95" />
      <directionalLight position={[-6, 5, 4]} intensity={1.2} color="#8b5cf6" />

      <CursorLamp />
      <Shards />
      <Embers />

      {/* Bloom is what turns "a violet object" into "a violet glow" — but
          tuned down from the first pass. A low threshold and wide radius blew
          every shard to white and showed through the translucent cards as
          blotches; a higher threshold keeps only the brightest cores glowing
          and lets the fog handle everything else. */}
      <EffectComposer>
        <Bloom intensity={0.75} luminanceThreshold={0.4} luminanceSmoothing={0.3} mipmapBlur radius={0.5} />
      </EffectComposer>
    </>
  );
}
