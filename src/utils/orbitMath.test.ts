// Rigid-ring spacing proof: samples the production orbit math
// (orbitMath.ts) from t=0 to t=600s and asserts avatars can never collide.
// Run with: npx tsx src/utils/orbitMath.test.ts
import { heroAvatars, tabletDroppedIds, type HeroAvatar } from "../data/heroAvatars";
import { avatarRadius, ringPosition, type Ring } from "./orbitMath";

interface Layout {
  name: string;
  avatars: HeroAvatar[];
  ring: Ring;
  sizeScale: number;
  depthScale: number; // smallest rendered scale (back half)
  maxX: number;
  maxY: number;
}

// Desktop ring sized for 13 avatars; tablet ring tighter for 10.
const layouts: Layout[] = [
  {
    name: "desktop-13",
    avatars: heroAvatars,
    ring: { rx: 240, ry: 200 },
    sizeScale: 1,
    depthScale: 0.84,
    maxX: 300,
    maxY: 300,
  },
  {
    name: "tablet-10",
    avatars: heroAvatars.filter((a) => !tabletDroppedIds.includes(a.id)),
    ring: { rx: 154, ry: 128 },
    sizeScale: 0.8,
    depthScale: 0.84,
    maxX: 220,
    maxY: 220,
  },
];

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.log(`FAIL: ${msg}`);
};

for (const layout of layouts) {
  const radii = layout.avatars.map((a) => avatarRadius(a, layout.sizeScale));
  let minRatio = Infinity;
  let worst = "";
  let extentX = 0;
  let extentY = 0;

  for (let t = 0; t <= 600; t += 0.25) {
    const pts = layout.avatars.map((_, i) =>
      ringPosition(i, layout.avatars.length, t, layout.ring)
    );
    for (let i = 0; i < pts.length; i++) {
      const pi = pts[i];
      if (!pi) continue;
      extentX = Math.max(extentX, Math.abs(pi.x) + (radii[i] ?? 0));
      extentY = Math.max(extentY, Math.abs(pi.y) + (radii[i] ?? 0));
      for (let j = i + 1; j < pts.length; j++) {
        const pj = pts[j];
        if (!pj) continue;
        const dist = Math.hypot(pi.x - pj.x, pi.y - pj.y);
        // Worst case: both avatars at the smallest depth scale.
        const need = ((radii[i] ?? 0) + (radii[j] ?? 0)) * layout.depthScale;
        const ratio = need > 0 ? dist / need : Infinity;
        if (ratio < minRatio) {
          minRatio = ratio;
          const ai = layout.avatars[i];
          const aj = layout.avatars[j];
          worst = `t=${t.toFixed(2)}s ${ai?.id}+${aj?.id}`;
        }
      }
    }
  }

  console.log(
    `${layout.name}: min spacing ${minRatio.toFixed(2)}x at smallest scale (worst ${worst}), ` +
      `extent x=${extentX.toFixed(0)} y=${extentY.toFixed(0)}`
  );

  if (minRatio < 1.15) fail(`${layout.name}: spacing ${minRatio.toFixed(2)}x below 1.15x`);
  else console.log(`PASS: ${layout.name} avatars can never overlap (>= 1.15x)`);

  if (extentX > layout.maxX || extentY > layout.maxY)
    fail(`${layout.name}: extent x=${extentX.toFixed(0)} y=${extentY.toFixed(0)} exceeds ${layout.maxX}/${layout.maxY}`);
  else console.log(`PASS: ${layout.name} orbit stays inside bounds`);
}

if (failures > 0) {
  console.log(`${failures} ORBIT SPACING CHECK(S) FAILED`);
  process.exitCode = 1;
} else {
  console.log("ALL ORBIT SPACING CHECKS PASSED");
}
