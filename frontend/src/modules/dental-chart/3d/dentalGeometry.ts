import * as THREE from 'three';
import {
  ToothDefinition,
  ToothSurface,
  ADULT_TEETH,
} from '../types/dentalChart.types';

// ===================================================================================================
// 1. ANATOMICAL PBR MATERIALS (Translucent Enamel, Biological Coral Gingiva, Palate, Tongue)
// ===================================================================================================

/**
 * Creates subtle organic micro-stippling canvas texture for attached gingival mucosa (orange-peel pattern)
 */
function createGingivalBumpTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 512, 512);

    // Scattered biological stippling micro-indentations
    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 1.0 + Math.random() * 2.2;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(88, 88, 88, 0.42)');
      grad.addColorStop(0.65, 'rgba(108, 108, 108, 0.22)');
      grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 8);
    tex.needsUpdate = true;
    return tex;
  } catch {
    return null;
  }
}

const sharedGingivalBump = createGingivalBumpTexture();

export function createEnamelMaterial(color: string = '#FFFFFF'): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    vertexColors: true,
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 0.96,
    clearcoatRoughness: 0.05,
    transmission: 0.0,
    ior: 1.62,
    reflectivity: 0.85,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

/**
 * Isolated tooth surface inspection material (vertexColors: false to guarantee uniform clinical enamel without black artifacts)
 */
export function createIsolatedEnamelMaterial(color: string = '#FAF8F3'): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    vertexColors: false,
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
    transmission: 0.0,
    ior: 1.62,
    reflectivity: 0.85,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

export function createRootMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#E0D2BA'),
    vertexColors: false,
    roughness: 0.38,
    metalness: 0.0,
    clearcoat: 0.20,
    clearcoatRoughness: 0.22,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

/**
 * Natural oral mucosa / coral-pink gingiva with subtle stippling tone and wetness sheen
 */
export function createGingivaMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'),
    vertexColors: true,
    roughness: 0.36,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    transmission: 0.0,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  if (sharedGingivalBump) {
    mat.bumpMap = sharedGingivalBump;
    mat.bumpScale = 0.003;
  }
  return mat;
}

/**
 * Healthy tongue mucosa with median groove definition and velvet sheen
 */
export function createTongueMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'),
    vertexColors: true,
    roughness: 0.34,
    metalness: 0.0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

/**
 * Hard palate oral mucosa with natural tissue warmth
 */
export function createPalateMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'),
    vertexColors: true,
    roughness: 0.30,
    metalness: 0.0,
    clearcoat: 0.68,
    clearcoatRoughness: 0.14,
    side: THREE.DoubleSide,
    flatShading: false,
  });
}

// =========================================================================
// 2. BROAD PARABOLIC U-ARCH COORDINATES & SPECS
// =========================================================================

export interface ArchTransform {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

// ===================================================================================================
// DENTAL ARCH ALIGNMENT & ANATOMICAL EMBEDDING CONFIGURATION
// Configurable parameters for inward tooth adjustment and gingival collar fitting
// ===================================================================================================

export interface DentalArchAlignmentConfig {
  globalMultiplier: number;
  collarPositionOffset: number;
  gingivalMarginThickness: number;
  toothDisplacements: Record<number, number>;
}

export const DENTAL_ALIGNMENT_CONFIG: DentalArchAlignmentConfig = {
  globalMultiplier: 1.0,
  collarPositionOffset: 0.018,
  gingivalMarginThickness: 0.0065,
  toothDisplacements: {
    // Upper Arch (Maxilla)
    11: 0.08, 21: 0.08, // Central Incisors
    12: 0.10, 22: 0.10, // Lateral Incisors
    13: 0.12, 23: 0.12, // Canines
    14: 0.15, 24: 0.15, // First Premolars
    15: 0.18, 25: 0.18, // Second Premolars
    16: 0.20, 26: 0.20, // First Molars
    17: 0.20, 27: 0.20, // Second Molars
    18: 0.18, 28: 0.18, // Third Molars

    // Lower Arch (Mandible)
    31: 0.08, 41: 0.08, // Central Incisors
    32: 0.10, 42: 0.10, // Lateral Incisors
    33: 0.12, 43: 0.12, // Canines
    34: 0.15, 44: 0.15, // First Premolars
    35: 0.18, 45: 0.18, // Second Premolars
    36: 0.20, 46: 0.20, // First Molars
    37: 0.20, 47: 0.20, // Second Molars
    38: 0.18, 48: 0.18, // Third Molars
  },
};

// Clinically proportioned arch coordinates (FDI 11-18, 21-28)
// Controlled 20% size reduction applied to crown width, height and thickness while strictly preserving coordinates & rotations
export const UPPER_ARCH_SPECS: Record<number, { x: number; z: number; rotY: number; width: number; height: number; thick: number }> = {
  18: { x: -2.577, z: -1.467, rotY: -0.14, width: 0.52, height: 0.60, thick: 0.54 },
  17: { x: -2.303, z: -0.933, rotY: -0.18, width: 0.58, height: 0.64, thick: 0.58 },
  16: { x: -1.957, z: -0.340, rotY: -0.22, width: 0.64, height: 0.68, thick: 0.62 },
  15: { x: -1.806, z: 0.236, rotY: -0.42, width: 0.46, height: 0.66, thick: 0.46 },
  14: { x: -1.464, z: 0.605, rotY: -0.54, width: 0.48, height: 0.68, thick: 0.48 },
  13: { x: -1.081, z: 0.916, rotY: -0.68, width: 0.45, height: 0.82, thick: 0.42 },
  12: { x: -0.674, z: 1.113, rotY: -0.42, width: 0.42, height: 0.72, thick: 0.32 }, // Lateral incisor
  11: { x: -0.246, z: 1.180, rotY: -0.12, width: 0.48, height: 0.78, thick: 0.34 }, // Central incisor

  21: { x: 0.246, z: 1.180, rotY: 0.12, width: 0.48, height: 0.78, thick: 0.34 }, // Central incisor
  22: { x: 0.674, z: 1.113, rotY: 0.42, width: 0.42, height: 0.72, thick: 0.32 }, // Lateral incisor
  23: { x: 1.081, z: 0.916, rotY: 0.68, width: 0.45, height: 0.82, thick: 0.42 },
  24: { x: 1.464, z: 0.605, rotY: 0.54, width: 0.48, height: 0.68, thick: 0.48 },
  25: { x: 1.806, z: 0.236, rotY: 0.42, width: 0.46, height: 0.66, thick: 0.46 },
  26: { x: 1.957, z: -0.340, rotY: 0.22, width: 0.64, height: 0.68, thick: 0.62 },
  27: { x: 2.303, z: -0.933, rotY: 0.18, width: 0.58, height: 0.64, thick: 0.58 },
  28: { x: 2.577, z: -1.467, rotY: 0.14, width: 0.52, height: 0.60, thick: 0.54 },
};

// Clinically proportioned mandibular arch coordinates (FDI 31-38, 41-48)
// Controlled 20% size reduction applied to crown width, height and thickness while strictly preserving coordinates & rotations
export const LOWER_ARCH_SPECS: Record<number, { x: number; z: number; rotY: number; width: number; height: number; thick: number }> = {
  48: { x: -2.564, z: -1.369, rotY: -0.15, width: 0.50, height: 0.58, thick: 0.52 },
  47: { x: -2.320, z: -0.836, rotY: -0.22, width: 0.56, height: 0.62, thick: 0.56 },
  46: { x: -2.021, z: -0.288, rotY: -0.30, width: 0.62, height: 0.66, thick: 0.60 },
  45: { x: -1.685, z: 0.201, rotY: -0.40, width: 0.44, height: 0.64, thick: 0.44 },
  44: { x: -1.336, z: 0.573, rotY: -0.52, width: 0.44, height: 0.66, thick: 0.44 },
  43: { x: -0.963, z: 0.864, rotY: -0.64, width: 0.42, height: 0.80, thick: 0.38 },
  42: { x: -0.575, z: 1.043, rotY: -0.38, width: 0.38, height: 0.72, thick: 0.30 }, // Lateral incisor
  41: { x: -0.195, z: 1.110, rotY: -0.10, width: 0.36, height: 0.70, thick: 0.30 }, // Central incisor

  31: { x: 0.195, z: 1.110, rotY: 0.10, width: 0.36, height: 0.70, thick: 0.30 }, // Central incisor
  32: { x: 0.575, z: 1.043, rotY: 0.38, width: 0.38, height: 0.72, thick: 0.30 }, // Lateral incisor
  33: { x: 0.963, z: 0.864, rotY: 0.64, width: 0.42, height: 0.80, thick: 0.38 },
  34: { x: 1.336, z: 0.573, rotY: 0.52, width: 0.44, height: 0.66, thick: 0.44 },
  35: { x: 1.685, z: 0.201, rotY: 0.40, width: 0.44, height: 0.64, thick: 0.44 },
  36: { x: 2.021, z: -0.288, rotY: 0.30, width: 0.62, height: 0.66, thick: 0.60 },
  37: { x: 2.320, z: -0.836, rotY: 0.22, width: 0.56, height: 0.62, thick: 0.56 },
  38: { x: 2.564, z: -1.369, rotY: 0.15, width: 0.50, height: 0.58, thick: 0.52 },
};

export function calculateArchTransforms(): Map<number, ArchTransform> {
  const map = new Map<number, ArchTransform>();

  Object.entries(UPPER_ARCH_SPECS).forEach(([fdiStr, s]) => {
    const fdi = parseInt(fdiStr, 10);
    map.set(fdi, {
      position: new THREE.Vector3(s.x, 0.0, s.z),
      rotation: new THREE.Euler(0.04, s.rotY, 0, 'YXZ'),
      scale: new THREE.Vector3(1, 1, 1),
    });
  });

  Object.entries(LOWER_ARCH_SPECS).forEach(([fdiStr, s]) => {
    const fdi = parseInt(fdiStr, 10);
    map.set(fdi, {
      position: new THREE.Vector3(s.x, 0.0, s.z),
      rotation: new THREE.Euler(-0.04, s.rotY, 0, 'YXZ'),
      scale: new THREE.Vector3(1, 1, 1),
    });
  });

  return map;
}

// =========================================================================
// 3. ANATOMICAL PROCEDURAL TOOTH CROWN GENERATORS (ORGANIC MORPHOLOGY & VERTEX COLORS)
// =========================================================================

// Color palette for natural tooth gradient
const COLOR_CERVICAL_DENTIN = new THREE.Color('#DFCEB1'); // Warm ivory dentin showing through thin cervical enamel
const COLOR_ENAMEL_BODY = new THREE.Color('#FAF8F3');     // Rich natural creamy enamel
const COLOR_INCISAL_TRANSLUCENT = new THREE.Color('#FFFFFF'); // Semi-translucent incisal/cusp edge
const COLOR_OCCLUSAL_FISSURE = new THREE.Color('#A89172'); // Amber-brown developmental groove/pit depth

/**
 * Incisor Crown: Broad spatula crown with authentic curved labial face,
 * 3 developmental lobes, rounded distoincisal angle, sharp mesioincisal angle,
 * beveled rounded incisal edge dome, lingual cingulum & fossa, and cervical-to-incisal color gradient.
 */
function createIncisorCrown(
  isUpper: boolean,
  isCentral: boolean,
  isRightQuadrant: boolean,
  customWidth?: number,
  customHeight?: number,
  customThick?: number
): THREE.BufferGeometry {
  const width = customWidth ?? (isUpper ? (isCentral ? 0.48 : 0.43) : (isCentral ? 0.35 : 0.37));
  const thick = customThick ?? (isUpper ? (isCentral ? 0.39 : 0.37) : (isCentral ? 0.34 : 0.34));
  const height = customHeight ?? (isUpper ? (isCentral ? 0.87 : 0.80) : (isCentral ? 0.78 : 0.76));

  const numSlices = 22;
  const numPoints = 40;
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const crownBase = isUpper ? 0.24 : -0.24;
  const crownTip = isUpper ? (0.16 - height) : (-0.16 + height);

  for (let s = 0; s <= numSlices; s++) {
    const lambda = s / numSlices; // 0 = cervical neck inside gum, 1 = incisal edge
    const baseY = THREE.MathUtils.lerp(crownBase, crownTip, lambda);

    // Flaring width mesiodistally towards incisal edge
    const wx = (width / 2) * (0.74 + 0.32 * Math.sin(lambda * Math.PI * 0.60));
    // Labiolingual thickness thins towards incisal edge, retaining biological thickness (not zero)
    const tz = (thick / 2) * Math.max(0.25, 0.96 - 0.70 * Math.pow(lambda, 1.15));

    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      // Distoincisal corner rounding:
      // If right quadrant (1 or 4), distal is -X (sinA < -0.1). If left quadrant (2 or 3), distal is +X (sinA > 0.1).
      let cornerFactor = 1.0;
      const isDistal = isRightQuadrant ? sinA < -0.1 : sinA > 0.1;
      if (isDistal && lambda > 0.55) {
        const distalAmount = Math.abs(sinA);
        const roundIntensity = isCentral ? 0.16 : 0.26;
        cornerFactor = 1.0 - roundIntensity * ((lambda - 0.55) / 0.45) * distalAmount;
      }

      // Lingual convergence: lingual half is naturally narrower mesiodistally
      const lingualConvergence = cosA < 0 ? (0.86 + 0.14 * (1.0 - Math.abs(cosA))) : 1.0;

      // Natural labial surface curvature (cosA > 0): smooth convex organic face avoiding flat rectangularity
      let labialCurve = 0;
      let lobes = 0;
      if (cosA > 0) {
        // Vertical convexity (height of contour in cervical third) + horizontal dome
        labialCurve = 0.042 * Math.sin(lambda * Math.PI * 0.72) * Math.cos(angle * 0.85) + 0.012 * Math.pow(cosA, 2.0);
        // 3 developmental lobes
        lobes = 0.012 * Math.sin(angle * 3) * Math.sin(lambda * Math.PI);
      }

      // Lingual cingulum & fossa (cosA < 0)
      let lingualFeature = 0;
      if (cosA < 0) {
        if (lambda < 0.40) {
          // Convex cingulum in cervical third
          lingualFeature = -0.042 * Math.pow(1.0 - lambda / 0.40, 1.8) * Math.abs(cosA);
        } else {
          // Concave lingual fossa framed by marginal ridges
          const fossaDepth = 0.026 * Math.sin(((lambda - 0.40) / 0.60) * Math.PI) * (1.0 - sinA * sinA);
          lingualFeature = fossaDepth * Math.abs(cosA);
        }
      }

      const x = sinA * wx * cornerFactor * lingualConvergence;
      const z = cosA * tz + labialCurve + lobes + lingualFeature + 0.015 * Math.sin(lambda * Math.PI);
      const y = baseY;

      vertices.push(x, y, z);
      uvs.push(p / numPoints, lambda);

      // Vertex color gradation: warm dentin cervical neck -> rich enamel body -> translucent edge
      const col = new THREE.Color();
      if (lambda < 0.30) {
        col.lerpColors(COLOR_CERVICAL_DENTIN, COLOR_ENAMEL_BODY, lambda / 0.30);
      } else if (lambda < 0.85) {
        col.copy(COLOR_ENAMEL_BODY);
      } else {
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_INCISAL_TRANSLUCENT, (lambda - 0.85) / 0.15);
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  // Quads for lateral walls
  for (let s = 0; s < numSlices; s++) {
    const r1 = s * numPoints;
    const r2 = (s + 1) * numPoints;
    for (let p = 0; p < numPoints; p++) {
      const nextP = (p + 1) % numPoints;
      if (!isUpper) {
        indices.push(r1 + p, r1 + nextP, r2 + p);
        indices.push(r1 + nextP, r2 + nextP, r2 + p);
      } else {
        indices.push(r1 + p, r2 + p, r1 + nextP);
        indices.push(r1 + nextP, r2 + p, r2 + nextP);
      }
    }
  }

  // Base cervical cap
  const baseCenter = vertices.length / 3;
  vertices.push(0, crownBase, 0);
  colors.push(COLOR_CERVICAL_DENTIN.r, COLOR_CERVICAL_DENTIN.g, COLOR_CERVICAL_DENTIN.b);
  uvs.push(0.5, 0.0);
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(baseCenter, nextP, p);
    } else {
      indices.push(baseCenter, p, nextP);
    }
  }

  // Rounded incisal edge dome cap (eliminates creased zero-thickness razor lines)
  const topRingStart = numSlices * numPoints;
  const incisalCenter = vertices.length / 3;
  const topY = crownTip + (isUpper ? -0.02 : 0.02);
  // Bevel slightly towards lingual for upper, towards labial for lower
  vertices.push(0, topY, isUpper ? -0.015 : 0.015);
  colors.push(COLOR_INCISAL_TRANSLUCENT.r, COLOR_INCISAL_TRANSLUCENT.g, COLOR_INCISAL_TRANSLUCENT.b);
  uvs.push(0.5, 1.0);

  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(incisalCenter, topRingStart + p, topRingStart + nextP);
    } else {
      indices.push(incisalCenter, topRingStart + nextP, topRingStart + p);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

/**
 * Canine Crown: Robust convex crown with naturally rounded cusp apex,
 * central labial ridge, and differential cusp slopes (shorter mesial, longer distal).
 */
function createCanineCrown(
  isUpper: boolean,
  isRightQuadrant: boolean,
  customWidth?: number,
  customHeight?: number,
  customThick?: number
): THREE.BufferGeometry {
  const width = customWidth ?? (isUpper ? 0.47 : 0.43);
  const thick = customThick ?? (isUpper ? 0.48 : 0.45);
  const height = customHeight ?? (isUpper ? 0.89 : 0.84);

  const numSlices = 20;
  const numPoints = 40;
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const crownBase = isUpper ? 0.24 : -0.24;
  const crownTip = isUpper ? (0.16 - height) : (-0.16 + height);

  for (let s = 0; s <= numSlices; s++) {
    const lambda = s / numSlices;
    const baseY = THREE.MathUtils.lerp(crownBase, crownTip, lambda);

    // Bulbous middle third with smooth taper towards the rounded cusp
    const bulge = 0.86 + 0.28 * Math.sin(lambda * Math.PI * 0.65) - 0.40 * Math.pow(lambda, 2.0);

    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      // Strong central labial ridge giving the canine its characteristic diamond/pentagonal face
      let labialRidge = 0;
      if (cosA > 0.15) {
        labialRidge = 0.045 * Math.sin(lambda * Math.PI * 0.80) * Math.cos(angle * 0.85);
      }

      // Differential mesial and distal slopes: distal slope is longer and more sloping
      let slopeAsymmetry = 1.0;
      const isDistal = isRightQuadrant ? sinA < -0.1 : sinA > 0.1;
      if (isDistal && lambda > 0.65) {
        slopeAsymmetry = 0.93;
      }

      const x = sinA * (width / 2) * bulge * slopeAsymmetry;
      const z = cosA * (thick / 2) * bulge + labialRidge + 0.025 * Math.sin(lambda * Math.PI * 0.7);
      const y = baseY;

      vertices.push(x, y, z);
      uvs.push(p / numPoints, lambda);

      const col = new THREE.Color();
      if (lambda < 0.30) {
        col.lerpColors(COLOR_CERVICAL_DENTIN, COLOR_ENAMEL_BODY, lambda / 0.30);
      } else if (lambda < 0.85) {
        col.copy(COLOR_ENAMEL_BODY);
      } else {
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_INCISAL_TRANSLUCENT, (lambda - 0.85) / 0.15);
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  for (let s = 0; s < numSlices; s++) {
    const r1 = s * numPoints;
    const r2 = (s + 1) * numPoints;
    for (let p = 0; p < numPoints; p++) {
      const nextP = (p + 1) % numPoints;
      if (!isUpper) {
        indices.push(r1 + p, r1 + nextP, r2 + p);
        indices.push(r1 + nextP, r2 + nextP, r2 + p);
      } else {
        indices.push(r1 + p, r2 + p, r1 + nextP);
        indices.push(r1 + nextP, r2 + p, r2 + nextP);
      }
    }
  }

  // Base cap
  const baseCenter = vertices.length / 3;
  vertices.push(0, crownBase, 0);
  colors.push(COLOR_CERVICAL_DENTIN.r, COLOR_CERVICAL_DENTIN.g, COLOR_CERVICAL_DENTIN.b);
  uvs.push(0.5, 0.0);
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(baseCenter, nextP, p);
    } else {
      indices.push(baseCenter, p, nextP);
    }
  }

  // Naturally Rounded Canine Cusp Apex (not a single sharp spike!)
  const topRingStart = numSlices * numPoints;
  const cuspRings = 4;
  const apexY = crownTip + (isUpper ? -0.12 : 0.12);
  const apexX = isRightQuadrant ? 0.03 : -0.03; // Mesially shifted cusp tip
  const apexZ = 0.02;

  let prevRingStart = topRingStart;
  for (let cr = 1; cr <= cuspRings; cr++) {
    const crRatio = cr / cuspRings;
    const currentRingStart = vertices.length / 3;

    if (cr === cuspRings) {
      // Final apex point
      vertices.push(apexX, apexY, apexZ);
      colors.push(COLOR_INCISAL_TRANSLUCENT.r, COLOR_INCISAL_TRANSLUCENT.g, COLOR_INCISAL_TRANSLUCENT.b);
      uvs.push(0.5, 1.0);

      for (let p = 0; p < numPoints; p++) {
        const nextP = (p + 1) % numPoints;
        if (!isUpper) {
          indices.push(currentRingStart, prevRingStart + p, prevRingStart + nextP);
        } else {
          indices.push(currentRingStart, prevRingStart + nextP, prevRingStart + p);
        }
      }
    } else {
      for (let p = 0; p < numPoints; p++) {
        const origIdx = topRingStart + p;
        const ox = vertices[origIdx * 3];
        const oy = vertices[origIdx * 3 + 1];
        const oz = vertices[origIdx * 3 + 2];

        const x = THREE.MathUtils.lerp(ox, apexX, crRatio);
        const y = THREE.MathUtils.lerp(oy, apexY, Math.pow(crRatio, 0.75));
        const z = THREE.MathUtils.lerp(oz, apexZ, crRatio);

        vertices.push(x, y, z);
        colors.push(COLOR_INCISAL_TRANSLUCENT.r, COLOR_INCISAL_TRANSLUCENT.g, COLOR_INCISAL_TRANSLUCENT.b);
        uvs.push(p / numPoints, 1.0);
      }

      for (let p = 0; p < numPoints; p++) {
        const nextP = (p + 1) % numPoints;
        if (!isUpper) {
          indices.push(prevRingStart + p, prevRingStart + nextP, currentRingStart + p);
          indices.push(prevRingStart + nextP, currentRingStart + nextP, currentRingStart + p);
        } else {
          indices.push(prevRingStart + p, currentRingStart + p, prevRingStart + nextP);
          indices.push(prevRingStart + nextP, currentRingStart + p, currentRingStart + nextP);
        }
      }
      prevRingStart = currentRingStart;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

/**
 * Premolar Crown: Bicuspid crown with distinct anatomical cusps
 * - Maxillary 1st (pos 4): Sharp prominent buccal cusp taller than lingual cusp, mesial marginal groove.
 * - Maxillary 2nd (pos 5): Two equal rounded cusps, oval table.
 * - Mandibular 1st (pos 4): Dominant pointed buccal cusp, very small non-functioning lingual cusp (canine-like profile).
 * - Mandibular 2nd (pos 5): 3 distinct cusps (1 buccal, 2 lingual: ML and DL) with Y-shaped central groove.
 */
function createPremolarCrown(
  isUpper: boolean,
  posInQuad: number = 4,
  isRightQuadrant: boolean = true,
  customWidth?: number,
  customHeight?: number,
  customThick?: number
): THREE.BufferGeometry {
  const isFirst = posInQuad === 4;
  const mesialDir = isRightQuadrant ? 1 : -1;

  let width: number;
  let thick: number;
  let height: number;

  if (isUpper) {
    width = customWidth ?? (isFirst ? 0.50 : 0.48);
    thick = customThick ?? (isFirst ? 0.54 : 0.52);
    height = customHeight ?? (isFirst ? 0.76 : 0.73);
  } else {
    width = customWidth ?? (isFirst ? 0.47 : 0.47);
    thick = customThick ?? (isFirst ? 0.50 : 0.50);
    height = customHeight ?? (isFirst ? 0.73 : 0.71);
  }

  const numSlices = 18;
  const numPoints = 40;
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const crownBase = isUpper ? 0.24 : -0.24;
  const crownTip = isUpper ? (0.16 - height) : (-0.16 + height);

  for (let s = 0; s <= numSlices; s++) {
    const lambda = s / numSlices;
    const baseY = THREE.MathUtils.lerp(crownBase, crownTip, lambda);

    const bulge = 0.86 + 0.26 * Math.sin(lambda * Math.PI * 0.70) - 0.10 * Math.pow(lambda, 2);
    const rx = (width / 2) * bulge;
    const rz = (thick / 2) * bulge;

    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2;
      let x = Math.sin(angle) * rx;
      let z = Math.cos(angle) * rz;

      // Axial wall contours:
      if (isUpper && isFirst) {
        // Mesial developmental depression on mesial wall
        const isMesial = isRightQuadrant ? (Math.sin(angle) > 0.3) : (Math.sin(angle) < -0.3);
        if (isMesial && lambda > 0.25 && lambda < 0.80) {
          x -= mesialDir * 0.025 * Math.sin((lambda - 0.25) / 0.55 * Math.PI);
        }
      } else if (!isUpper && isFirst) {
        // Mandibular 1st: dominant buccal ridge, lingual wall slopes inwards
        if (Math.cos(angle) < -0.2) {
          z *= 0.88; // Lingual convergence
        }
      }

      const y = baseY;

      vertices.push(x, y, z);
      uvs.push(p / numPoints, lambda);

      const col = new THREE.Color();
      if (lambda < 0.30) {
        col.lerpColors(COLOR_CERVICAL_DENTIN, COLOR_ENAMEL_BODY, lambda / 0.30);
      } else {
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_INCISAL_TRANSLUCENT, Math.min(1.0, (lambda - 0.30) / 0.70));
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  for (let s = 0; s < numSlices; s++) {
    const r1 = s * numPoints;
    const r2 = (s + 1) * numPoints;
    for (let p = 0; p < numPoints; p++) {
      const nextP = (p + 1) % numPoints;
      if (!isUpper) {
        indices.push(r1 + p, r1 + nextP, r2 + p);
        indices.push(r1 + nextP, r2 + nextP, r2 + p);
      } else {
        indices.push(r1 + p, r2 + p, r1 + nextP);
        indices.push(r1 + nextP, r2 + p, r2 + nextP);
      }
    }
  }

  // Base cap
  const baseCenter = vertices.length / 3;
  vertices.push(0, crownBase, 0);
  colors.push(COLOR_CERVICAL_DENTIN.r, COLOR_CERVICAL_DENTIN.g, COLOR_CERVICAL_DENTIN.b);
  uvs.push(0.5, 0.0);
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(baseCenter, nextP, p);
    } else {
      indices.push(baseCenter, p, nextP);
    }
  }

  // Sculpted Occlusal Table (Smooth rolling rounded anatomical cusps)
  const topRingStart = numSlices * numPoints;
  const occRings = 16;
  const occTopY = crownTip;
  const occVertexIndices: number[][] = [];

  for (let r = 0; r < occRings; r++) {
    const rRatio = (r + 1) / (occRings + 1);
    const ringIndices: number[] = [];

    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2;
      const maxRx = width / 2;
      const maxRz = thick / 2;

      const x = Math.sin(angle) * maxRx * rRatio;
      const z = Math.cos(angle) * maxRz * rRatio;

      const u = x / maxRx;
      const v = z / maxRz;

      let cuspSculpt = 0;
      let grooveSculpt = 0;

      if (isUpper) {
        if (isFirst) {
          // Upper 1st: Sharp prominent buccal cusp (+0.17), smaller lingual cusp (+0.11)
          const dBuccal = Math.hypot(u, v - 0.38);
          const dLingual = Math.hypot(u - mesialDir * 0.08, v + 0.38);
          const bCusp = dBuccal < 0.44 ? 0.17 * Math.pow(Math.cos((dBuccal / 0.44) * Math.PI * 0.5), 2) : 0;
          const lCusp = dLingual < 0.40 ? 0.11 * Math.pow(Math.cos((dLingual / 0.40) * Math.PI * 0.5), 2) : 0;
          cuspSculpt = bCusp + lCusp;

          // Central groove + mesial marginal groove
          const dGroove = Math.abs(v);
          const groove = dGroove < 0.20 ? -0.07 * Math.pow(Math.cos((dGroove / 0.20) * Math.PI * 0.5), 2) : 0;
          const dMesialG = Math.hypot(u - mesialDir * 0.38, v);
          const mesialGroove = dMesialG < 0.24 ? -0.045 * Math.pow(Math.cos((dMesialG / 0.24) * Math.PI * 0.5), 2) : 0;
          grooveSculpt = groove + mesialGroove;
        } else {
          // Upper 2nd: Equal rounded cusps
          const dBuccal = Math.hypot(u, v - 0.36);
          const dLingual = Math.hypot(u, v + 0.36);
          const bCusp = dBuccal < 0.42 ? 0.14 * Math.pow(Math.cos((dBuccal / 0.42) * Math.PI * 0.5), 2) : 0;
          const lCusp = dLingual < 0.42 ? 0.14 * Math.pow(Math.cos((dLingual / 0.42) * Math.PI * 0.5), 2) : 0;
          cuspSculpt = bCusp + lCusp;

          const dGroove = Math.abs(v);
          grooveSculpt = dGroove < 0.20 ? -0.065 * Math.pow(Math.cos((dGroove / 0.20) * Math.PI * 0.5), 2) : 0;
        }
      } else {
        if (isFirst) {
          // Lower 1st: Dominant pointed buccal cusp (+0.175), small non-functional lingual cusp (+0.045)
          const dBuccal = Math.hypot(u, v - 0.38);
          const dLingual = Math.hypot(u, v + 0.42);
          const bCusp = dBuccal < 0.46 ? 0.175 * Math.pow(Math.cos((dBuccal / 0.46) * Math.PI * 0.5), 2) : 0;
          const lCusp = dLingual < 0.34 ? 0.045 * Math.pow(Math.cos((dLingual / 0.34) * Math.PI * 0.5), 2) : 0;

          // Prominent transverse ridge connecting the cusps
          const dRidge = Math.abs(u);
          const transRidge = (dRidge < 0.18 && Math.abs(v) < 0.25) ? 0.04 * Math.pow(Math.cos((dRidge / 0.18) * Math.PI * 0.5), 2) : 0;
          cuspSculpt = bCusp + lCusp + transRidge;

          // Mesial and distal circular fossae (snake-eyes)
          const dMF = Math.hypot(u - mesialDir * 0.34, v);
          const dDF = Math.hypot(u + mesialDir * 0.34, v);
          const mf = dMF < 0.20 ? -0.055 * Math.pow(Math.cos((dMF / 0.20) * Math.PI * 0.5), 2) : 0;
          const df = dDF < 0.20 ? -0.055 * Math.pow(Math.cos((dDF / 0.20) * Math.PI * 0.5), 2) : 0;
          grooveSculpt = mf + df;
        } else {
          // Lower 2nd: 3-cusp type (Buccal, Mesiolingual, Distolingual)
          const dBuccal = Math.hypot(u, v - 0.36);
          const dML = Math.hypot(u - mesialDir * 0.28, v + 0.36);
          const dDL = Math.hypot(u + mesialDir * 0.28, v + 0.36);

          const bCusp = dBuccal < 0.44 ? 0.155 * Math.pow(Math.cos((dBuccal / 0.44) * Math.PI * 0.5), 2) : 0;
          const mlCusp = dML < 0.38 ? 0.12 * Math.pow(Math.cos((dML / 0.38) * Math.PI * 0.5), 2) : 0;
          const dlCusp = dDL < 0.34 ? 0.09 * Math.pow(Math.cos((dDL / 0.34) * Math.PI * 0.5), 2) : 0;
          cuspSculpt = bCusp + mlCusp + dlCusp;

          // Y-shaped central groove
          const dPit = Math.hypot(u, v);
          const centralPit = dPit < 0.22 ? -0.08 * Math.pow(Math.cos((dPit / 0.22) * Math.PI * 0.5), 2) : 0;
          const lingualG = (Math.abs(u) < 0.12 && v > 0.05) ? -0.05 * Math.pow(Math.cos((Math.abs(u) / 0.12) * Math.PI * 0.5), 2) : 0;
          grooveSculpt = centralPit + lingualG;
        }
      }

      // Marginal ridges at mesial and distal rims
      const marginalRidge = 0.04 * Math.exp(-Math.pow(Math.abs(u) - 0.50, 2) * 20);

      const blend = 1.0 - Math.pow(rRatio, 2.5);
      const sculptY = (cuspSculpt + grooveSculpt + marginalRidge) * blend;
      const y = occTopY + (isUpper ? -sculptY : sculptY);

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      uvs.push((u + 1) * 0.5, (v + 1) * 0.5);

      // Developmental fissure shading in the central groove
      const col = new THREE.Color();
      if (sculptY < -0.015) {
        const f = Math.min(1.0, (-sculptY - 0.015) / 0.05);
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_OCCLUSAL_FISSURE, f);
      } else {
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_INCISAL_TRANSLUCENT, Math.min(1.0, sculptY / 0.16));
      }
      colors.push(col.r, col.g, col.b);
      ringIndices.push(idx);
    }
    occVertexIndices.push(ringIndices);
  }

  // Center groove point
  const occCenterIdx = vertices.length / 3;
  const centerGroove = -0.07;
  vertices.push(0, occTopY + (isUpper ? -centerGroove : centerGroove), 0);
  colors.push(COLOR_OCCLUSAL_FISSURE.r, COLOR_OCCLUSAL_FISSURE.g, COLOR_OCCLUSAL_FISSURE.b);
  uvs.push(0.5, 0.5);

  const firstRing = occVertexIndices[0];
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(occCenterIdx, firstRing[p], firstRing[nextP]);
    } else {
      indices.push(occCenterIdx, firstRing[nextP], firstRing[p]);
    }
  }

  for (let r = 0; r < occRings - 1; r++) {
    const inner = occVertexIndices[r];
    const outer = occVertexIndices[r + 1];
    for (let p = 0; p < numPoints; p++) {
      const nextP = (p + 1) % numPoints;
      if (!isUpper) {
        indices.push(inner[p], outer[p], inner[nextP]);
        indices.push(inner[nextP], outer[p], outer[nextP]);
      } else {
        indices.push(inner[p], inner[nextP], outer[p]);
        indices.push(inner[nextP], outer[nextP], outer[p]);
      }
    }
  }

  const lastRing = occVertexIndices[occRings - 1];
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    const rimP = topRingStart + p;
    const rimNextP = topRingStart + nextP;
    if (!isUpper) {
      indices.push(lastRing[p], rimP, lastRing[nextP]);
      indices.push(lastRing[nextP], rimP, rimNextP);
    } else {
      indices.push(lastRing[p], lastRing[nextP], rimP);
      indices.push(lastRing[nextP], rimNextP, rimP);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

/**
 * Molar Crown: Broad anatomical crown with 4-5 distinct rounded rolling cusps,
 * triangular ridges, developmental fissures, and deep central fossa pit.
 */
function createMolarCrown(
  isUpper: boolean,
  posInQuad: number,
  isRightQuadrant: boolean,
  customWidth?: number,
  customHeight?: number,
  customThick?: number
): THREE.BufferGeometry {
  const sizeFactor = posInQuad === 6 ? 1.0 : posInQuad === 7 ? 0.92 : 0.84;
  const width = customWidth ?? (0.67 * sizeFactor);
  const thick = customThick ?? (0.67 * sizeFactor);
  const height = customHeight ?? (0.74 * sizeFactor);

  const numSlices = 18;
  const numPoints = 40;
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const crownBase = isUpper ? 0.24 : -0.24;
  const crownTip = isUpper ? (0.16 - height) : (-0.16 + height);

  for (let s = 0; s <= numSlices; s++) {
    const lambda = s / numSlices;
    const baseY = THREE.MathUtils.lerp(crownBase, crownTip, lambda);

    const bulge = 0.88 + 0.26 * Math.sin(lambda * Math.PI * 0.65) - 0.12 * Math.pow(lambda, 2);
    const rx = (width / 2) * bulge;
    const rz = (thick / 2) * bulge;

    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2;
      const x = Math.sin(angle) * rx;
      const z = Math.cos(angle) * rz;
      const y = baseY;

      vertices.push(x, y, z);
      uvs.push(p / numPoints, lambda);

      const col = new THREE.Color();
      if (lambda < 0.30) {
        col.lerpColors(COLOR_CERVICAL_DENTIN, COLOR_ENAMEL_BODY, lambda / 0.30);
      } else {
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_INCISAL_TRANSLUCENT, Math.min(1.0, (lambda - 0.30) / 0.70));
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  for (let s = 0; s < numSlices; s++) {
    const r1 = s * numPoints;
    const r2 = (s + 1) * numPoints;
    for (let p = 0; p < numPoints; p++) {
      const nextP = (p + 1) % numPoints;
      if (!isUpper) {
        indices.push(r1 + p, r1 + nextP, r2 + p);
        indices.push(r1 + nextP, r2 + nextP, r2 + p);
      } else {
        indices.push(r1 + p, r2 + p, r1 + nextP);
        indices.push(r1 + nextP, r2 + p, r2 + nextP);
      }
    }
  }

  // Base cap
  const baseCenter = vertices.length / 3;
  vertices.push(0, crownBase, 0);
  colors.push(COLOR_CERVICAL_DENTIN.r, COLOR_CERVICAL_DENTIN.g, COLOR_CERVICAL_DENTIN.b);
  uvs.push(0.5, 0.0);
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(baseCenter, nextP, p);
    } else {
      indices.push(baseCenter, p, nextP);
    }
  }

  // Sculpted Molar Occlusal Table (Smooth Rolling Anatomical Cusps)
  const topRingStart = numSlices * numPoints;
  const occRings = 18;
  const occTopY = crownTip;
  const occVertexIndices: number[][] = [];

  // Quadrant-aware mesial/distal direction:
  // For right quadrant, +X is mesial, -X is distal. For left quadrant, -X is mesial, +X is distal.
  const mesialDir = isRightQuadrant ? 1 : -1;

  for (let r = 0; r < occRings; r++) {
    const rRatio = (r + 1) / (occRings + 1);
    const ringIndices: number[] = [];

    for (let p = 0; p < numPoints; p++) {
      const angle = (p / numPoints) * Math.PI * 2;
      const maxRx = width / 2;
      const maxRz = thick / 2;

      const x = Math.sin(angle) * maxRx * rRatio;
      const z = Math.cos(angle) * maxRz * rRatio;

      const u = x / maxRx;
      const v = z / maxRz;

      let cuspSculpt = 0;
      let grooveSculpt = 0;

      if (isUpper) {
        // Maxillary Molar: 4 Cusps (ML is largest, MB, DB, DL + Oblique Ridge)
        const dMB = Math.hypot(u - mesialDir * 0.36, v - 0.34);
        const dDB = Math.hypot(u + mesialDir * 0.36, v - 0.34);
        const dML = Math.hypot(u - mesialDir * 0.32, v + 0.32);
        const dDL = Math.hypot(u + mesialDir * 0.36, v + 0.36);

        const mb = dMB < 0.40 ? 0.17 * Math.pow(Math.cos((dMB / 0.40) * Math.PI * 0.5), 2) : 0;
        const db = dDB < 0.36 ? 0.14 * Math.pow(Math.cos((dDB / 0.36) * Math.PI * 0.5), 2) : 0;
        const ml = dML < 0.44 ? 0.19 * Math.pow(Math.cos((dML / 0.44) * Math.PI * 0.5), 2) : 0; // Largest cusp
        const dl = dDL < 0.34 ? 0.12 * Math.pow(Math.cos((dDL / 0.34) * Math.PI * 0.5), 2) : 0;

        // Oblique Ridge running diagonally between ML and DB
        const dOblique = Math.abs((u - mesialDir * 0.32) + (v - 0.34) * mesialDir);
        const obliqueRidge = dOblique < 0.28 ? 0.05 * Math.pow(Math.cos((dOblique / 0.28) * Math.PI * 0.5), 2) * (1.0 - (u * u + v * v)) : 0;

        cuspSculpt = mb + db + ml + dl + obliqueRidge;

        // Central pit & developmental grooves
        const dPit = Math.hypot(u, v);
        const centralPit = dPit < 0.22 ? -0.09 * Math.pow(Math.cos((dPit / 0.22) * Math.PI * 0.5), 2) : 0;
        const buccalGroove = Math.abs(u) < 0.15 && v > 0.1 ? -0.05 * Math.pow(Math.cos((Math.abs(u) / 0.15) * Math.PI * 0.5), 2) : 0;
        grooveSculpt = centralPit + buccalGroove;
      } else {
        // Mandibular Molar: 5 Cusps on 1st molar (pos 6), 4 on others
        const isFiveCusps = posInQuad === 6;
        if (isFiveCusps) {
          const dMB = Math.hypot(u - mesialDir * 0.40, v - 0.34);
          const dDB = Math.hypot(u, v - 0.36);
          const dD = Math.hypot(u + mesialDir * 0.42, v - 0.28); // Distal cusp
          const dML = Math.hypot(u - mesialDir * 0.30, v + 0.34);
          const dDL = Math.hypot(u + mesialDir * 0.28, v + 0.34);

          const mb = dMB < 0.38 ? 0.17 * Math.pow(Math.cos((dMB / 0.38) * Math.PI * 0.5), 2) : 0;
          const db = dDB < 0.36 ? 0.15 * Math.pow(Math.cos((dDB / 0.36) * Math.PI * 0.5), 2) : 0;
          const d = dD < 0.30 ? 0.11 * Math.pow(Math.cos((dD / 0.30) * Math.PI * 0.5), 2) : 0;
          const ml = dML < 0.40 ? 0.18 * Math.pow(Math.cos((dML / 0.40) * Math.PI * 0.5), 2) : 0;
          const dl = dDL < 0.38 ? 0.16 * Math.pow(Math.cos((dDL / 0.38) * Math.PI * 0.5), 2) : 0;

          cuspSculpt = mb + db + d + ml + dl;
        } else {
          // 4 Cusps in symmetrical cruciform
          const dMB = Math.hypot(u - mesialDir * 0.36, v - 0.34);
          const dDB = Math.hypot(u + mesialDir * 0.36, v - 0.34);
          const dML = Math.hypot(u - mesialDir * 0.34, v + 0.34);
          const dDL = Math.hypot(u + mesialDir * 0.34, v + 0.34);

          const mb = dMB < 0.38 ? 0.16 * Math.pow(Math.cos((dMB / 0.38) * Math.PI * 0.5), 2) : 0;
          const db = dDB < 0.36 ? 0.14 * Math.pow(Math.cos((dDB / 0.36) * Math.PI * 0.5), 2) : 0;
          const ml = dML < 0.40 ? 0.18 * Math.pow(Math.cos((dML / 0.40) * Math.PI * 0.5), 2) : 0;
          const dl = dDL < 0.38 ? 0.16 * Math.pow(Math.cos((dDL / 0.38) * Math.PI * 0.5), 2) : 0;

          cuspSculpt = mb + db + ml + dl;
        }

        const dPit = Math.hypot(u, v);
        const centralPit = dPit < 0.22 ? -0.09 * Math.pow(Math.cos((dPit / 0.22) * Math.PI * 0.5), 2) : 0;
        grooveSculpt = centralPit;
      }

      const blend = 1.0 - Math.pow(rRatio, 2.5);
      const totalSculpt = (cuspSculpt + grooveSculpt) * blend;
      const y = occTopY + (isUpper ? -totalSculpt : totalSculpt);

      const idx = vertices.length / 3;
      vertices.push(x, y, z);
      uvs.push((u + 1) * 0.5, (v + 1) * 0.5);

      // Developmental fissure shading in pits and grooves
      const col = new THREE.Color();
      if (totalSculpt < -0.015) {
        const f = Math.min(1.0, (-totalSculpt - 0.015) / 0.06);
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_OCCLUSAL_FISSURE, f);
      } else {
        col.lerpColors(COLOR_ENAMEL_BODY, COLOR_INCISAL_TRANSLUCENT, Math.min(1.0, totalSculpt / 0.18));
      }
      colors.push(col.r, col.g, col.b);
      ringIndices.push(idx);
    }
    occVertexIndices.push(ringIndices);
  }

  // Center pit vertex
  const occCenterIdx = vertices.length / 3;
  const pitY = -0.09;
  vertices.push(0, occTopY + (isUpper ? -pitY : pitY), 0);
  colors.push(COLOR_OCCLUSAL_FISSURE.r, COLOR_OCCLUSAL_FISSURE.g, COLOR_OCCLUSAL_FISSURE.b);
  uvs.push(0.5, 0.5);

  const firstRing = occVertexIndices[0];
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    if (!isUpper) {
      indices.push(occCenterIdx, firstRing[p], firstRing[nextP]);
    } else {
      indices.push(occCenterIdx, firstRing[nextP], firstRing[p]);
    }
  }

  for (let r = 0; r < occRings - 1; r++) {
    const inner = occVertexIndices[r];
    const outer = occVertexIndices[r + 1];
    for (let p = 0; p < numPoints; p++) {
      const nextP = (p + 1) % numPoints;
      if (!isUpper) {
        indices.push(inner[p], outer[p], inner[nextP]);
        indices.push(inner[nextP], outer[p], outer[nextP]);
      } else {
        indices.push(inner[p], inner[nextP], outer[p]);
        indices.push(inner[nextP], outer[nextP], outer[p]);
      }
    }
  }

  const lastRing = occVertexIndices[occRings - 1];
  for (let p = 0; p < numPoints; p++) {
    const nextP = (p + 1) % numPoints;
    const rimP = topRingStart + p;
    const rimNextP = topRingStart + nextP;
    if (!isUpper) {
      indices.push(lastRing[p], rimP, lastRing[nextP]);
      indices.push(lastRing[nextP], rimP, rimNextP);
    } else {
      indices.push(lastRing[p], lastRing[nextP], rimP);
      indices.push(lastRing[nextP], rimNextP, rimP);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return geo;
}

// =========================================================================
// 5B. PROTOTYPE REALISTIC UPPER CENTRAL INCISOR (FDI 11)
// =========================================================================

/**
 * Scalloped CEJ Y-contour for Tooth 11
 */
function getIncisor11CejY(theta: number, mesialDir: number): number {
  const sinA = Math.sin(theta);
  const cosA = Math.cos(theta);
  const isMesial = sinA * mesialDir >= 0;
  const proximalArch = isMesial ? 0.088 : 0.065;
  const facialDip = cosA >= 0 ? -0.038 : -0.030;
  const sin2 = sinA * sinA;
  const cos2 = cosA * cosA;
  return proximalArch * sin2 + facialDip * cos2;
}

/**
 * Upper Central Incisor Crown for Maxillary Arch (FDI 11)
 * Oriented for Upper Arch: points down into oral cavity with natural embed offset.
 */
export function createRealisticCentralIncisorCrownGeometry(isRightQuadrant: boolean = true): THREE.BufferGeometry {
  const mesialDir = isRightQuadrant ? 1 : -1;
  const crownRings = 28;
  const numCols = 48;
  const crownH = 0.74;
  const embedOffset = 0.16;

  const vertices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= crownRings; r++) {
    const lambda = r / crownRings;
    const cejOffset = getIncisor11CejY(0, mesialDir) * (1.0 - lambda);

    let distalIncisalSlope = 0;
    for (let c = 0; c < numCols; c++) {
      const theta = (c / numCols) * Math.PI * 2;
      const sinA = Math.sin(theta);
      const cosA = Math.cos(theta);

      const isDistal = sinA * mesialDir < -0.15;
      if (isDistal && lambda > 0.55) {
        const lRatio = (lambda - 0.55) / 0.45;
        distalIncisalSlope = -0.040 * Math.pow(lRatio, 1.8) * Math.abs(sinA);
      }

      const y = embedOffset - (lambda * crownH + cejOffset - distalIncisalSlope);

      const rx = 0.20 + 0.055 * Math.sin(lambda * Math.PI * 0.65) + 0.010 * Math.sin(lambda * Math.PI);
      const rz = 0.21 * (1.0 + 0.05 * Math.sin(lambda * Math.PI * 0.85)) * Math.max(0.16, 1.0 - 0.82 * Math.pow(lambda, 1.15));

      let labialCurve = 0;
      let lobes = 0;
      if (cosA > 0) {
        labialCurve = (0.038 * Math.sin(lambda * Math.PI * 0.75) * Math.cos(theta * 0.85) + 0.012 * Math.pow(cosA, 2.0)) * Math.sin(lambda * Math.PI * 0.5);
        const grooveM = Math.exp(-Math.pow((theta - 0.35) / 0.14, 2));
        const grooveD = Math.exp(-Math.pow((theta + 0.35) / 0.14, 2));
        lobes = -0.010 * Math.sin(lambda * Math.PI) * (grooveM + grooveD);
      }

      let cornerFactor = 1.0;
      if (isDistal && lambda > 0.45) {
        const dRatio = (lambda - 0.45) / 0.55;
        cornerFactor = 1.0 - 0.16 * Math.pow(dRatio, 1.8) * Math.abs(sinA);
      }

      let lingualFeature = 0;
      let marginalRidges = 0;
      if (cosA < 0) {
        if (lambda < 0.40) {
          lingualFeature = -0.048 * Math.sin((lambda / 0.40) * Math.PI * 0.5) * Math.pow(1.0 - lambda / 0.40, 1.2) * Math.abs(cosA);
        } else {
          const fossaDepth = 0.030 * Math.sin(((lambda - 0.40) / 0.60) * Math.PI) * (1.0 - sinA * sinA);
          lingualFeature = fossaDepth * Math.abs(cosA);
        }

        if (lambda > 0.20) {
          const ridgeM = Math.exp(-Math.pow((theta - (Math.PI - 0.42)) / 0.18, 2));
          const ridgeD = Math.exp(-Math.pow((theta - (Math.PI + 0.42)) / 0.18, 2));
          marginalRidges = -0.018 * Math.sin(((lambda - 0.2) / 0.8) * Math.PI) * (ridgeM + ridgeD);
        }
      }

      const lingualConvergence = cosA < 0 ? (1.0 - 0.15 * Math.sin(lambda * Math.PI * 0.5) * Math.abs(cosA)) : 1.0;
      const proximalIndent = 1.0 - 0.07 * Math.cos(lambda * Math.PI * 0.5) * sinA * sinA;

      const x = sinA * rx * cornerFactor * lingualConvergence * proximalIndent;
      const z = cosA * rz + labialCurve + lobes + lingualFeature + marginalRidges;

      vertices.push(x, y, z);
      uvs.push(c / numCols, lambda);

      const col = new THREE.Color();
      if (lambda < 0.25) {
        col.lerpColors(new THREE.Color('#DFCDB0'), new THREE.Color('#FAF8F3'), lambda / 0.25);
      } else if (lambda < 0.85) {
        col.copy(new THREE.Color('#FAF8F3'));
      } else {
        col.lerpColors(new THREE.Color('#FAF8F3'), new THREE.Color('#FFFFFF'), (lambda - 0.85) / 0.15);
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  for (let r = 0; r < crownRings; r++) {
    const r1 = r * numCols;
    const r2 = (r + 1) * numCols;
    for (let c = 0; c < numCols; c++) {
      const nextC = (c + 1) % numCols;
      indices.push(r1 + c, r2 + c, r1 + nextC);
      indices.push(r1 + nextC, r2 + c, r2 + nextC);
    }
  }

  const topRingStart = crownRings * numCols;
  for (let i = 0; i < 24; i++) {
    const lab1 = topRingStart + i;
    const lab2 = topRingStart + (i + 1);
    const ling1 = topRingStart + ((numCols - i) % numCols);
    const ling2 = topRingStart + ((numCols - (i + 1)) % numCols);
    if (i < 23) {
      indices.push(lab1, ling1, lab2);
      indices.push(lab2, ling1, ling2);
    }
  }

  const baseCenterIdx = vertices.length / 3;
  vertices.push(0, embedOffset + 0.02, 0);
  colors.push(0.85, 0.77, 0.65);
  uvs.push(0.5, 0.0);

  for (let c = 0; c < numCols; c++) {
    const nextC = (c + 1) % numCols;
    indices.push(baseCenterIdx, c, nextC);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Isolated Tooth Model for FDI 11 (Maxillary Right Central Incisor)
 * ONE continuous, fully connected watertight anatomical tooth geometry.
 * Seamless crown-to-root junction (0 gap, smooth normal continuity).
 */
export function buildRealisticCentralIncisorModel(
  tooth: ToothDefinition
): {
  group: THREE.Group;
  surfaceMeshes: Map<ToothSurface, THREE.Object3D>;
} {
  const group = new THREE.Group();
  group.name = `isolated_tooth_${tooth.fdi}`;
  const surfaceMeshes = new Map<ToothSurface, THREE.Object3D>();

  const isRightQuadrant = tooth.quadrant === 'UR' || tooth.quadrant === 'LR';
  const mesialDir = isRightQuadrant ? 1 : -1;

  const rootRings = 24;
  const crownRings = 36;
  const totalRings = rootRings + crownRings;
  const numCols = 48;

  const getPoint = (r: number, c: number): { x: number; y: number; z: number; color: THREE.Color } => {
    const theta = (c / numCols) * Math.PI * 2;
    const sinA = Math.sin(theta);
    const cosA = Math.cos(theta);

    if (r <= rootRings) {
      const u = r / rootRings;
      const cejY = getIncisor11CejY(theta, mesialDir);
      const y = -1.35 + 1.35 * u + Math.pow(u, 1.8) * cejY;

      const xCenter = -mesialDir * 0.068 * Math.pow(1.0 - u, 1.8);
      const zCenter = -0.038 * Math.pow(1.0 - u, 1.6);

      const rxCej = 0.20;
      const rzCej = 0.21;

      const rx = rxCej * (0.10 + 0.90 * Math.pow(u, 0.75));
      const rz = rzCej * (0.12 + 0.88 * Math.pow(u, 0.70));

      const proximalIndent = 1.0 - 0.07 * Math.sin(u * Math.PI * 0.5) * sinA * sinA;

      const x = xCenter + sinA * rx * proximalIndent;
      const z = zCenter + cosA * rz;

      const col = new THREE.Color();
      if (u < 0.25) {
        col.lerpColors(new THREE.Color('#C4A77D'), new THREE.Color('#D2BC92'), u / 0.25);
      } else if (u < 0.85) {
        col.lerpColors(new THREE.Color('#D2BC92'), new THREE.Color('#DFCDB0'), (u - 0.25) / 0.60);
      } else {
        col.lerpColors(new THREE.Color('#DFCDB0'), new THREE.Color('#E8DCB8'), (u - 0.85) / 0.15);
      }

      return { x, y, z, color: col };
    } else {
      const lambda = (r - rootRings) / crownRings;
      const cejY = getIncisor11CejY(theta, mesialDir);
      const crownH = 0.74;

      let distalIncisalSlope = 0;
      const isDistal = sinA * mesialDir < -0.15;
      if (isDistal && lambda > 0.55) {
        const lRatio = (lambda - 0.55) / 0.45;
        distalIncisalSlope = -0.040 * Math.pow(lRatio, 1.8) * Math.abs(sinA);
      }

      const y = cejY * (1.0 - lambda) + lambda * crownH + distalIncisalSlope;

      const rx = 0.20 + 0.055 * Math.sin(lambda * Math.PI * 0.65) + 0.010 * Math.sin(lambda * Math.PI);
      const rz = 0.21 * (1.0 + 0.05 * Math.sin(lambda * Math.PI * 0.85)) * Math.max(0.16, 1.0 - 0.82 * Math.pow(lambda, 1.15));

      let labialCurve = 0;
      let lobes = 0;
      if (cosA > 0) {
        labialCurve = (0.038 * Math.sin(lambda * Math.PI * 0.75) * Math.cos(theta * 0.85) + 0.012 * Math.pow(cosA, 2.0)) * Math.sin(lambda * Math.PI * 0.5);
        const grooveM = Math.exp(-Math.pow((theta - 0.35) / 0.14, 2));
        const grooveD = Math.exp(-Math.pow((theta + 0.35) / 0.14, 2));
        lobes = -0.010 * Math.sin(lambda * Math.PI) * (grooveM + grooveD);
      }

      let cornerFactor = 1.0;
      if (isDistal && lambda > 0.45) {
        const dRatio = (lambda - 0.45) / 0.55;
        cornerFactor = 1.0 - 0.16 * Math.pow(dRatio, 1.8) * Math.abs(sinA);
      }

      let lingualFeature = 0;
      let marginalRidges = 0;
      if (cosA < 0) {
        if (lambda < 0.40) {
          lingualFeature = -0.048 * Math.sin((lambda / 0.40) * Math.PI * 0.5) * Math.pow(1.0 - lambda / 0.40, 1.2) * Math.abs(cosA);
        } else {
          const fossaDepth = 0.030 * Math.sin(((lambda - 0.40) / 0.60) * Math.PI) * (1.0 - sinA * sinA);
          lingualFeature = fossaDepth * Math.abs(cosA);
        }

        if (lambda > 0.20) {
          const ridgeM = Math.exp(-Math.pow((theta - (Math.PI - 0.42)) / 0.18, 2));
          const ridgeD = Math.exp(-Math.pow((theta - (Math.PI + 0.42)) / 0.18, 2));
          marginalRidges = -0.018 * Math.sin(((lambda - 0.2) / 0.8) * Math.PI) * (ridgeM + ridgeD);
        }
      }

      const lingualConvergence = cosA < 0 ? (1.0 - 0.15 * Math.sin(lambda * Math.PI * 0.5) * Math.abs(cosA)) : 1.0;
      const proximalIndent = 1.0 - 0.07 * Math.cos(lambda * Math.PI * 0.5) * sinA * sinA;

      const x = sinA * rx * cornerFactor * lingualConvergence * proximalIndent;
      const z = cosA * rz + labialCurve + lobes + lingualFeature + marginalRidges;

      const col = new THREE.Color();
      if (lambda < 0.25) {
        col.lerpColors(new THREE.Color('#DFCDB0'), new THREE.Color('#FAF8F3'), lambda / 0.25);
      } else if (lambda < 0.85) {
        col.copy(new THREE.Color('#FAF8F3'));
      } else {
        col.lerpColors(new THREE.Color('#FAF8F3'), new THREE.Color('#FFFFFF'), (lambda - 0.85) / 0.15);
      }

      return { x, y, z, color: col };
    }
  };

  const vertices: number[] = [];
  const baseColors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= totalRings; r++) {
    const v = r / totalRings;
    for (let c = 0; c < numCols; c++) {
      const pt = getPoint(r, c);
      vertices.push(pt.x, pt.y, pt.z);
      baseColors.push(pt.color.r, pt.color.g, pt.color.b);
      uvs.push(c / numCols, v);
    }
  }

  for (let r = 0; r < totalRings; r++) {
    const r1 = r * numCols;
    const r2 = (r + 1) * numCols;
    for (let c = 0; c < numCols; c++) {
      const nextC = (c + 1) % numCols;
      indices.push(r1 + c, r1 + nextC, r2 + c);
      indices.push(r1 + nextC, r2 + nextC, r2 + c);
    }
  }

  const apexCenterIdx = vertices.length / 3;
  vertices.push(-mesialDir * 0.068, -1.37, -0.038);
  baseColors.push(0.77, 0.65, 0.49);
  uvs.push(0.5, 0.0);

  for (let c = 0; c < numCols; c++) {
    const nextC = (c + 1) % numCols;
    indices.push(apexCenterIdx, nextC, c);
  }

  const topRingStart = totalRings * numCols;
  for (let i = 0; i < 24; i++) {
    const lab1 = topRingStart + i;
    const lab2 = topRingStart + (i + 1);
    const ling1 = topRingStart + ((numCols - i) % numCols);
    const ling2 = topRingStart + ((numCols - (i + 1)) % numCols);
    if (i < 23) {
      indices.push(lab1, lab2, ling1);
      indices.push(lab2, ling2, ling1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute([...baseColors], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const numVerts = geo.attributes.position.count;
  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const vertexSurfaces: ToothSurface[] = [];

  for (let i = 0; i < numVerts; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const ny = normAttr.getY(i);
    const nz = normAttr.getZ(i);

    const theta = Math.atan2(x, z);
    const cejY = getIncisor11CejY(theta, mesialDir);

    if (y < cejY) {
      vertexSurfaces.push('Root');
    } else if (y > 0.68 || ny > 0.65) {
      vertexSurfaces.push('Incisal');
    } else if (nz > 0.38) {
      vertexSurfaces.push('Labial');
    } else if (nz < -0.38) {
      vertexSurfaces.push('Lingual');
    } else if (x * mesialDir > 0) {
      vertexSurfaces.push('Mesial');
    } else {
      vertexSurfaces.push('Distal');
    }
  }

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFFFFF'),
    vertexColors: true,
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 0.96,
    clearcoatRoughness: 0.05,
    side: THREE.FrontSide,
  });

  const mainMesh = new THREE.Mesh(geo, material);
  mainMesh.name = `tooth_${tooth.fdi}_continuous`;
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;

  mainMesh.userData = {
    tooth,
    getSurfaceAtHit: (point: THREE.Vector3, normal: THREE.Vector3): ToothSurface => {
      const theta = Math.atan2(point.x, point.z);
      const cejY = getIncisor11CejY(theta, mesialDir);
      if (point.y < cejY) return 'Root';
      if (point.y > 0.68 || normal.y > 0.60) return 'Incisal';
      if (normal.z > 0.38) return 'Labial';
      if (normal.z < -0.38) return 'Lingual';
      if (point.x * mesialDir > 0) return 'Mesial';
      return 'Distal';
    },
    updateSurfaceHighlight: (surfaceToHighlight: ToothSurface) => {
      const colorAttr = geo.attributes.color as THREE.BufferAttribute;
      const highlightCol = new THREE.Color('#38bdf8');

      for (let i = 0; i < numVerts; i++) {
        if (vertexSurfaces[i] === surfaceToHighlight) {
          colorAttr.setXYZ(i, highlightCol.r, highlightCol.g, highlightCol.b);
        } else {
          colorAttr.setXYZ(i, baseColors[i * 3], baseColors[i * 3 + 1], baseColors[i * 3 + 2]);
        }
      }
      colorAttr.needsUpdate = true;
    },
  };

  group.add(mainMesh);

  const surfaces: ToothSurface[] = ['Incisal', 'Labial', 'Lingual', 'Mesial', 'Distal', 'Root'];
  surfaces.forEach((surf) => {
    surfaceMeshes.set(surf, mainMesh);
  });

  // Apply consistent additional 10% vertical crown height reduction to ToothPreview3D model (0.88 * 0.90 = 0.792)
  group.scale.set(1.0, 0.792, 1.0);

  return { group, surfaceMeshes };
}

export function createAnatomicalToothMesh(tooth: ToothDefinition): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  const isUpper = tooth.arch === 'UPPER';
  const posInQuad = tooth.fdi % 10;
  // Quadrants 'UR' and 'LR' are the patient's right side; 'UL' and 'LL' are the patient's left side
  const isRightQuadrant = tooth.quadrant === 'UR' || tooth.quadrant === 'LR';
  const archSpecs = isUpper ? UPPER_ARCH_SPECS : LOWER_ARCH_SPECS;
  const specs = archSpecs[tooth.fdi];

  switch (tooth.toothClass) {
    case 'INCISOR':
      geometry = createIncisorCrown(isUpper, posInQuad === 1, isRightQuadrant, specs?.width, specs?.height, specs?.thick);
      break;
    case 'CANINE':
      geometry = createCanineCrown(isUpper, isRightQuadrant, specs?.width, specs?.height, specs?.thick);
      break;
    case 'PREMOLAR':
      geometry = createPremolarCrown(isUpper, posInQuad, isRightQuadrant, specs?.width, specs?.height, specs?.thick);
      break;
    case 'MOLAR':
      geometry = createMolarCrown(isUpper, posInQuad, isRightQuadrant, specs?.width, specs?.height, specs?.thick);
      break;
    default:
      geometry = createIncisorCrown(isUpper, true, isRightQuadrant, specs?.width, specs?.height, specs?.thick);
      break;
  }

  // Reduce visible crown height by an additional 10% (0.88 * 0.90 = 0.792); Width (X) and Depth (Z) are 100% unchanged
  geometry.scale(1.0, 0.792, 1.0);

  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = createEnamelMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = `tooth_${tooth.fdi}`;

  mesh.userData = {
    fdi: tooth.fdi,
    universal: tooth.universal,
    name: tooth.name,
    arch: tooth.arch,
    quadrant: tooth.quadrant,
    toothClass: tooth.toothClass,
    isAnterior: tooth.isAnterior,
  };

  return mesh;
}

// =========================================================================
// =========================================================================
// 4. REALISTIC CONTINUOUS SCALLOPED GINGIVA (GUMS SURROUNDING TEETH)
// =========================================================================

const GINGIVA_MARGIN = new THREE.Color('#EAA0AB');     // Free (marginal) gingiva & papillae tips (delicate coral-pink, smooth)
const GINGIVA_ATTACHED = new THREE.Color('#D46274');   // Attached gingiva (firm keratinized coral-pink)
const GINGIVA_JUGA = new THREE.Color('#DC7686');       // Highlight over root jugae prominences
const GINGIVA_VESTIBULAR = new THREE.Color('#9E283A'); // Alveolar mucosa (vascular deep crimson/red above mucogingival line)
const GINGIVA_PALATAL = new THREE.Color('#C95D6E');    // Warm palatal/lingual masticatory mucosal transition

/**
 * Creates anatomically realistic human gingiva (coral-pink gum tissue) with:
 * 1. Individual scalloped gingival margins following each tooth's actual orientation, position, and dimensions.
 * 2. Natural triangular interdental papillae extending into every interproximal embrasure.
 * 3. Individual tooth emergence with delicate knife-edge marginal collars (0 gap, 0 overlapping shelves).
 * 4. Anatomical attached gingiva with vertical root jugae (alveolar eminences) and interradicular depressions.
 * 5. Reduced compact vertical height and slim mandibular bulk, removing plate-like aprons.
 */
export function createScallopedGingiva(isUpper: boolean): THREE.Mesh {
  const steps = 300;
  const crossSections = 28;
  const vertices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const archSpecs = isUpper ? UPPER_ARCH_SPECS : LOWER_ARCH_SPECS;
  const fdiList = isUpper
    ? [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
    : [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const numTeeth = fdiList.length; // 16 teeth
  const toothCurvePts = fdiList.map((fdi) => new THREE.Vector3(archSpecs[fdi].x, 0, archSpecs[fdi].z));
  const archCurve = new THREE.CatmullRomCurve3(toothCurvePts);

  // Precompute tooth frames for exact cervical collar attachment
  const toothFrames = fdiList.map((fdi) => {
    const s = archSpecs[fdi];
    const center = new THREE.Vector3(s.x, 0, s.z);
    const cosR = Math.cos(s.rotY);
    const sinR = Math.sin(s.rotY);
    const facial = new THREE.Vector3(sinR, 0, cosR).normalize();
    const proximal = new THREE.Vector3(cosR, 0, -sinR).normalize();
    const rx = (s.width / 2) * (isUpper ? 0.86 : 0.90);
    const rz = (s.thick / 2) * (isUpper ? 0.86 : 0.95);
    return { fdi, center, facial, proximal, rx, rz, s };
  });

  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 to 1 across entire arch
    const pt = archCurve.getPoint(t);

    // Parametric tooth coordinate: 0 at first tooth (18/48), 15 at last tooth (28/38)
    const fTooth = t * (numTeeth - 1);
    const k0 = Math.floor(fTooth);
    const k = Math.min(numTeeth - 2, Math.max(0, k0));
    const tau = fTooth - k; // 0 to 1 between tooth k and tooth k+1

    const tf0 = toothFrames[k];
    const tf1 = toothFrames[k + 1];

    // Smooth, anatomical harmonic scallop: 1 at tooth centers (zenith), 0 at embrasure/papillae
    const u = 0.5 * (1 + Math.cos(2 * Math.PI * tau));
    // Soft rounded apex for papillae without needle spikes or sharp V-notches
    const scallop = isUpper
      ? (u * u * (3 - 2 * u))
      : Math.pow(Math.sin(u * Math.PI * 0.5), 1.8);

    // Tooth-specific facial normal: smoothly blends the actual tooth facial orientations
    const blendedFacial = new THREE.Vector3()
      .lerpVectors(tf0.facial, tf1.facial, tau)
      .normalize();

    // Spline tangent and arch normal
    const tan = archCurve.getTangent(t).normalize();
    const archBuccal = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

    // Effective facial direction combines tooth-specific orientation (dominant near tooth centers) with arch curvature
    const facialDir = new THREE.Vector3()
      .lerpVectors(archBuccal, blendedFacial, 0.82 + 0.18 * u)
      .normalize();

    // Cervical thickness of tooth
    const halfThick = (1 - tau) * tf0.rz + tau * tf1.rz;

    // Classification of tooth region
    const isMidline = (k === 7 && tau > 0.40 && tau < 0.60);
    const isAnterior = (k >= 5 && k <= 9);
    const isCanineRegion = (k === 4 || k === 5 || k === 9 || k === 10);
    const isPremolar = (k === 3 || k === 4 || k === 11 || k === 12);

    // 1. ANATOMICALLY ACCURATE CERVICAL ZENITH & INTERDENTAL PAPILLAE:
    const yZenith = isUpper
      ? (isCanineRegion ? 0.126 : (isAnterior ? 0.122 : (isPremolar ? 0.114 : 0.106)))
      : (isCanineRegion ? -0.056 : (isAnterior ? -0.048 : (isPremolar ? -0.048 : -0.042)));

    // Interdental papilla fills embrasure naturally up to contact area (smooth col):
    const papillaApex = isUpper
      ? (isMidline ? 0.040 : (isAnterior ? 0.045 : (isPremolar ? 0.055 : 0.065)))
      : (isMidline ? -0.015 : (isAnterior ? -0.018 : (isPremolar ? -0.022 : -0.026)));

    const yMarginBuccal = THREE.MathUtils.lerp(papillaApex, yZenith, scallop);
    const yMarginLingual = isUpper
      ? THREE.MathUtils.lerp(papillaApex + 0.014, yZenith + 0.010, scallop)
      : THREE.MathUtils.lerp(papillaApex - 0.008, yZenith - 0.006, scallop);

    // 2. FREE GINGIVAL COLLAR WRAPPING NATURALLY OVER THE ENAMEL SURFACE:
    const collarOverhang = isUpper ? 0.016 : 0.042;
    const marginThickness = isUpper ? 0.007 : 0.010;
    const rMarginBuccal = halfThick + collarOverhang - marginThickness * (1 - u);
    const rMarginLingual = isUpper
      ? (-(halfThick * 0.95 + collarOverhang * 0.85) + marginThickness * (1 - u))
      : (-(halfThick + 0.040) + marginThickness * (1 - u));

    // 3. ROOT JUGAE (ALVEOLAR EMINENCES):
    const fdiNear = tau < 0.5 ? tf0.fdi : tf1.fdi;
    const isCanine = fdiNear === 13 || fdiNear === 23 || fdiNear === 33 || fdiNear === 43;

    const jugaAmp = isUpper
      ? (isCanine ? 0.050 : (isAnterior ? 0.030 : 0.018))
      : (isCanine ? 0.036 : (isAnterior ? 0.024 : 0.016));

    const rootJuga = jugaAmp * Math.pow(u, 1.8) - (isUpper ? 0.005 : 0.004) * Math.sin(Math.PI * u);
    const collarRoll = (isUpper ? 0.008 : 0.010) * Math.sin(Math.PI * scallop);

    // 4. BALANCED ATTACHED GINGIVA & ALVEOLAR PROCESS VOLUME:
    const yMucogingival = isUpper ? 0.50 : -0.44;
    const yFornixApex = isUpper ? 0.64 : -0.54;
    const alveolarRidgeFullness = isUpper ? 0.120 : 0.118;

    for (let c = 0; c <= crossSections; c++) {
      const v = c / crossSections;
      let distBuccal = 0;
      let yLocal = 0;
      const col = new THREE.Color();

      if (v < 0.25) {
        // ZONE 1: Lingual Attached Gingiva (connects to palate/floor)
        const f = v / 0.25;
        // Palatal border matches createUpperPalateMesh exactly at -0.42 and y=0.36+0.04*t
        // Reduced flat area behind upper front teeth via smooth concave curvature
        const rLingualBorder = isUpper
          ? -0.42
          : (-(halfThick + 0.32) - 0.12 * (1.0 - Math.pow(2 * t - 1, 2)));
        const yLingualBorder = isUpper
          ? (0.36 + 0.04 * Math.sin(t * Math.PI))
          : -0.12;

        distBuccal = THREE.MathUtils.lerp(rLingualBorder, rMarginLingual, Math.pow(f, isUpper ? 0.75 : 0.75));
        yLocal = THREE.MathUtils.lerp(yLingualBorder, yMarginLingual, Math.pow(f, isUpper ? 1.35 : 1.20));

        col.lerpColors(GINGIVA_PALATAL, GINGIVA_MARGIN, f);
      } else if (v < 0.42) {
        // ZONE 2: Gingival Sulcus & Interdental Papilla Crest (Softly rounded col)
        const f = (v - 0.25) / 0.17;

        distBuccal = THREE.MathUtils.lerp(rMarginLingual, rMarginBuccal + collarRoll, f);

        // Papilla dome peaks coronally between teeth; sulcus dips slightly apically around crown neck:
        const papillaDome = (1 - u) * (isUpper ? 0.012 : 0.014) * Math.sin(f * Math.PI);
        const sulcusTrough = u * 0.006 * Math.sin(f * Math.PI);

        const yBase = THREE.MathUtils.lerp(yMarginLingual, yMarginBuccal, f);
        yLocal = isUpper
          ? (yBase - papillaDome + sulcusTrough)
          : (yBase + papillaDome - sulcusTrough);

        col.copy(GINGIVA_MARGIN);
      } else if (v < 0.76) {
        // ZONE 3: Buccal Attached Gingiva & Alveolar Process (Smooth, rounded volume)
        const f = (v - 0.42) / 0.34;

        // Smooth biological convex bulge: prominent on upper, refined on lower
        const bulge = Math.sin(f * Math.PI * (isUpper ? 0.80 : 0.85)) * (isUpper ? 0.024 : 0.026);
        const rMucogingival = halfThick + alveolarRidgeFullness + rootJuga * (1.0 - 0.25 * f);

        distBuccal = THREE.MathUtils.lerp(rMarginBuccal + collarRoll, rMucogingival, Math.sqrt(f)) + bulge;
        yLocal = THREE.MathUtils.lerp(yMarginBuccal, yMucogingival, Math.pow(f, 0.85));

        if (rootJuga > 0.008 && f > 0.15) {
          col.lerpColors(GINGIVA_ATTACHED, GINGIVA_JUGA, Math.min(1.0, rootJuga / jugaAmp));
        } else {
          col.copy(GINGIVA_ATTACHED);
        }
      } else {
        // ZONE 4: Alveolar Mucosa & Vestibular Fornix (Smooth inward anatomical cul-de-sac)
        const f = (v - 0.76) / 0.24;

        const rStart = halfThick + alveolarRidgeFullness + rootJuga * 0.75 + (isUpper ? 0.024 : 0.026);
        const rApex = rStart - (isUpper ? 0.13 : 0.11);

        const curveFactor = Math.sin(f * Math.PI * 0.5);
        distBuccal = THREE.MathUtils.lerp(rStart, rApex, curveFactor);
        yLocal = THREE.MathUtils.lerp(yMucogingival, yFornixApex, Math.sin(f * Math.PI * 0.5));

        col.lerpColors(GINGIVA_ATTACHED, GINGIVA_VESTIBULAR, f);
      }

      const worldX = pt.x + facialDir.x * distBuccal;
      const worldZ = pt.z + facialDir.z * distBuccal;
      const worldY = yLocal;

      vertices.push(worldX, worldY, worldZ);
      colors.push(col.r, col.g, col.b);
      uvs.push(t, v);
    }
  }

  // Triangles
  const stride = crossSections + 1;
  for (let i = 0; i < steps; i++) {
    const r1 = i * stride;
    const r2 = (i + 1) * stride;
    for (let c = 0; c < crossSections; c++) {
      if (isUpper) {
        indices.push(r1 + c, r2 + c, r1 + c + 1);
        indices.push(r1 + c + 1, r2 + c, r2 + c + 1);
      } else {
        indices.push(r1 + c, r1 + c + 1, r2 + c);
        indices.push(r1 + c + 1, r2 + c + 1, r2 + c);
      }
    }
  }

  // Retromolar terminal caps
  const startPt = archCurve.getPoint(0);
  const capStartIdx = vertices.length / 3;
  vertices.push(startPt.x, isUpper ? 0.38 : -0.20, startPt.z);
  colors.push(GINGIVA_ATTACHED.r, GINGIVA_ATTACHED.g, GINGIVA_ATTACHED.b);
  uvs.push(0, 0.5);
  for (let c = 0; c < crossSections; c++) {
    if (isUpper) {
      indices.push(capStartIdx, c, c + 1);
    } else {
      indices.push(capStartIdx, c + 1, c);
    }
  }

  const endPt = archCurve.getPoint(1);
  const capEndIdx = vertices.length / 3;
  vertices.push(endPt.x, isUpper ? 0.38 : -0.20, endPt.z);
  colors.push(GINGIVA_ATTACHED.r, GINGIVA_ATTACHED.g, GINGIVA_ATTACHED.b);
  uvs.push(1, 0.5);
  const endRingStart = steps * stride;
  for (let c = 0; c < crossSections; c++) {
    if (isUpper) {
      indices.push(capEndIdx, endRingStart + c + 1, endRingStart + c);
    } else {
      indices.push(capEndIdx, endRingStart + c, endRingStart + c + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, createGingivaMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = isUpper ? 'maxillary_scalloped_gingiva' : 'mandibular_scalloped_gingiva';
  return mesh;
}

// =========================================================================
// 5. NATURAL UPPER PALATE & LOWER TONGUE
// =========================================================================

const PALATE_BASE = new THREE.Color('#D86E7B');
const PALATE_RUGAE = new THREE.Color('#E88B98');
const PALATE_VAULT = new THREE.Color('#BF4F5E');

/**
 * Upper Hard Palate: Vaulted ceiling continuously following the parabolic lingual dental arch
 * with natural median palatine raphe, anterior palatal rugae, and incisive papilla.
 * Lofted seamlessly to the maxillary lingual gingival collar with 0 visible seam.
 */
export function createUpperPalateMesh(): THREE.Mesh {
  const zSlices = 54;
  const xSlices = 42;
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const fdiList = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const curvePts = fdiList.map((fdi) => new THREE.Vector3(UPPER_ARCH_SPECS[fdi].x, 0, UPPER_ARCH_SPECS[fdi].z));
  const archCurve = new THREE.CatmullRomCurve3(curvePts);

  for (let j = 0; j <= zSlices; j++) {
    const v = j / zSlices; // 0 = posterior tuberosities, 1 = anterior incisive papilla
    // tR goes from 0.0 (tooth 18) to 0.468 (tooth 11)
    const tR = v * 0.468;
    // tL goes from 1.0 (tooth 28) to 0.532 (tooth 21)
    const tL = 1.0 - v * 0.468;

    const ptR = archCurve.getPoint(tR);
    const tanR = archCurve.getTangent(tR).normalize();
    const normR = new THREE.Vector3(-tanR.z, 0, tanR.x).normalize();
    const lingualR = ptR.clone().addScaledVector(normR, -0.42);

    const ptL = archCurve.getPoint(tL);
    const tanL = archCurve.getTangent(tL).normalize();
    const normL = new THREE.Vector3(-tanL.z, 0, tanL.x).normalize();
    const lingualL = ptL.clone().addScaledVector(normL, -0.42);

    for (let i = 0; i <= xSlices; i++) {
      const u = (i / xSlices) * 2 - 1; // -1 to +1
      const alpha = (u + 1) * 0.5;

      const baseX = (1 - alpha) * lingualR.x + alpha * lingualL.x;
      const baseZ = (1 - alpha) * lingualR.z + alpha * lingualL.z;

      // Anterior convex curvature
      const zBow = 0.08 * (1.0 - u * u) * Math.pow(v, 2.0);
      const x = baseX;
      const z = baseZ + zBow;

      // Vault height base matching gingival collar flush
      const yBase = 0.36 + 0.04 * v;
      // Vaulted gothic dome
      const dome = 0.58 * (1.0 - u * u) * Math.sin(v * Math.PI * 0.85 + 0.15);
      // Median palatal raphe along midline x = 0
      const raphe = 0.024 * Math.exp(-(x ** 2) * 45) * Math.sin(v * Math.PI * 0.92);

      // Transverse palatine rugae (4 distinct anatomical mucosal ridge pairs)
      let rugae = 0;
      if (v > 0.46 && v < 0.86) {
        const vNorm = (v - 0.46) / 0.40;
        const wave = Math.sin(vNorm * Math.PI * 4.0 - Math.abs(u) * 0.9);
        rugae = 0.048 * Math.max(0, wave) * (1.0 - u * u) * Math.sin(Math.abs(u) * Math.PI * 0.95);
      }

      // Incisive papilla behind central incisors (pear-shaped mucosal elevation)
      let incisivePapilla = 0;
      if (v > 0.86 && Math.abs(u) < 0.18) {
        incisivePapilla = 0.075 * Math.exp(-((v - 0.93) ** 2 * 240 + u ** 2 * 50));
      }

      const y = yBase + dome + raphe + rugae + incisivePapilla;

      vertices.push(x, y, z);
      uvs.push((u + 1) * 0.5, v);

      const col = new THREE.Color();
      if (rugae > 0.012 || incisivePapilla > 0.02) {
        col.lerpColors(PALATE_BASE, PALATE_RUGAE, Math.min(1.0, rugae / 0.04 + incisivePapilla / 0.06));
      } else if (Math.abs(u) > 0.65) {
        col.lerpColors(PALATE_BASE, PALATE_VAULT, (Math.abs(u) - 0.65) / 0.35);
      } else {
        col.copy(PALATE_BASE);
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  const rowSize = xSlices + 1;
  for (let j = 0; j < zSlices; j++) {
    const r1 = j * rowSize;
    const r2 = (j + 1) * rowSize;
    for (let i = 0; i < xSlices; i++) {
      indices.push(r1 + i, r2 + i, r1 + i + 1);
      indices.push(r1 + i + 1, r2 + i, r2 + i + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, createPalateMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'upper_hard_palate';
  return mesh;
}

const TONGUE_BASE = new THREE.Color('#CE5564');
const TONGUE_SULCUS = new THREE.Color('#B43A49');
const TONGUE_BORDER = new THREE.Color('#C8505F');

/**
 * Lower Tongue: Relaxed anatomical tongue resting inside the mandibular arch.
 * Features dorsal muscular mound, defined median longitudinal groove, sulcus terminalis, and sublingual gutter.
 */
export function createLowerTongueMesh(): THREE.Mesh {
  const zSlices = 54;
  const xSlices = 42;
  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  const zStart = -1.25;
  const zEnd = 0.98;

  for (let j = 0; j <= zSlices; j++) {
    const v = j / zSlices;
    const baseZ = zStart + v * (zEnd - zStart);
    // Smooth width leaving a comfortable sublingual gutter inside the mandibular arch
    const halfWidth = 1.76 * Math.sin(v * Math.PI * 0.70 + 0.20);

    for (let i = 0; i <= xSlices; i++) {
      const u = (i / xSlices) * 2 - 1;
      const x = u * halfWidth;

      // Parabolic tongue outline with smooth rounded apex
      const z = baseZ - 0.16 * (x ** 2) * (0.35 + 0.65 * v);

      // Relaxed muscular dorsal mound
      const mound = 0.42 * (1.0 - u * u) * Math.sin(v * Math.PI * 0.88 + 0.12);

      // Deep continuous median sulcus running down midline
      const medianSulcus = -0.075 * Math.exp(-(x ** 2) * 28) * Math.sin(v * Math.PI);

      // V-shaped sulcus terminalis in posterior dorsal third
      const vSulcus = 0.32 + 0.12 * Math.abs(u);
      const dSulcus = Math.abs(v - vSulcus);
      const sulcusTerm = dSulcus < 0.08 ? -0.045 * Math.pow(Math.cos((dSulcus / 0.08) * Math.PI * 0.5), 2) * (1.0 - u * u * 0.4) : 0;

      // Circumvallate papillae along anterior rim of sulcus terminalis
      const circumvallate = (v > vSulcus && v < vSulcus + 0.05 && Math.abs(u) > 0.12 && Math.abs(u) < 0.70)
        ? 0.024 * Math.sin(((v - vSulcus) / 0.05) * Math.PI) * Math.sin(Math.abs(u) * Math.PI * 4)
        : 0;

      // Posterior slope rolling down into the pharynx
      const postSlope = -0.16 * Math.pow(Math.max(0, 1.0 - v * 2.8), 2);

      const y = -0.04 + mound + medianSulcus + sulcusTerm + circumvallate + postSlope;

      vertices.push(x, y, z);
      uvs.push((u + 1) * 0.5, v);

      const col = new THREE.Color();
      if (medianSulcus < -0.015 || sulcusTerm < -0.015) {
        col.lerpColors(TONGUE_BASE, TONGUE_SULCUS, Math.min(1.0, (-medianSulcus - sulcusTerm) / 0.06));
      } else if (Math.abs(u) > 0.70) {
        col.lerpColors(TONGUE_BASE, TONGUE_BORDER, (Math.abs(u) - 0.70) / 0.30);
      } else {
        col.copy(TONGUE_BASE);
      }
      colors.push(col.r, col.g, col.b);
    }
  }

  const rowSize = xSlices + 1;
  for (let j = 0; j < zSlices; j++) {
    const r1 = j * rowSize;
    const r2 = (j + 1) * rowSize;
    for (let i = 0; i < xSlices; i++) {
      indices.push(r1 + i, r1 + i + 1, r2 + i);
      indices.push(r1 + i + 1, r2 + i + 1, r2 + i);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, createTongueMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'lower_tongue';
  return mesh;
}

// =========================================================================
// 6. ASSEMBLE COMPLETE FULL MOUTH 3D SCENE (TMJ JAW ARTICULATION)
// =========================================================================

export interface FullMouthSceneResult {
  rootGroup: THREE.Group;
  teethMap: Map<number, THREE.Mesh>;
  upperArchGroup: THREE.Group;
  lowerArchGroup: THREE.Group;
  setJawOpening: (angleRad: number) => void;
}

export const TMJ_PIVOT = new THREE.Vector3(0, 0.40, -2.60);

export function buildFullMouthScene(): FullMouthSceneResult {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'mouth_root';

  const teethMap = new Map<number, THREE.Mesh>();
  const transforms = calculateArchTransforms();

  // 1. Upper Arch Group (Maxilla) - Fixed & Stationary
  const upperArchGroup = new THREE.Group();
  upperArchGroup.name = 'upper_arch_group';
  upperArchGroup.position.set(0, 1.40, -0.12);
  upperArchGroup.rotation.x = -0.42;

  const upperGingiva = createScallopedGingiva(true);
  upperArchGroup.add(upperGingiva);

  const upperPalate = createUpperPalateMesh();
  upperArchGroup.add(upperPalate);

  // 2. Mandible TMJ Hinge Articulation Group
  const lowerArchGroup = new THREE.Group();
  lowerArchGroup.name = 'lower_arch_group';

  const mandibleContents = new THREE.Group();
  mandibleContents.name = 'mandible_contents';
  mandibleContents.position.set(0, -1.40, -0.12);

  const lowerGingiva = createScallopedGingiva(false);
  mandibleContents.add(lowerGingiva);

  const lowerTongue = createLowerTongueMesh();
  mandibleContents.add(lowerTongue);

  // 3. Mount all 32 Teeth
  ADULT_TEETH.forEach((tooth) => {
    const transform = transforms.get(tooth.fdi);
    if (!transform) return;

    const toothMesh = createAnatomicalToothMesh(tooth);
    toothMesh.position.copy(transform.position);
    toothMesh.rotation.copy(transform.rotation);
    toothMesh.scale.copy(transform.scale);

    teethMap.set(tooth.fdi, toothMesh);

    if (tooth.arch === 'UPPER') {
      upperArchGroup.add(toothMesh);
    } else {
      mandibleContents.add(toothMesh);
    }
  });

  lowerArchGroup.add(mandibleContents);

  rootGroup.add(upperArchGroup);
  rootGroup.add(lowerArchGroup);

  const setJawOpening = (angleRad: number) => {
    lowerArchGroup.rotation.x = angleRad;
  };

  setJawOpening(0.38);

  return { rootGroup, teethMap, upperArchGroup, lowerArchGroup, setJawOpening };
}

// =========================================================================
// 7. ISOLATED TOOTH INSPECTION MODEL (HD SURFACE SEGMENTATION & MULTI-ROOTS)
// =========================================================================

/**
 * Creates a smooth, closed, organically tapering anatomical root with rounded apex dome.
 */
function createLoftedRootGeometry(
  centerline: (t: number) => THREE.Vector3,
  radiusX: (t: number) => number,
  radiusZ: (t: number) => number,
  rings: number = 20,
  segments: number = 24
): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings; // 0 = cervical neck, 1 = apex tip
    const pt = centerline(t);
    const rx = radiusX(t);
    const rz = radiusZ(t);

    for (let s = 0; s <= segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const x = pt.x + Math.sin(angle) * rx;
      const z = pt.z + Math.cos(angle) * rz;
      const y = pt.y;

      vertices.push(x, y, z);
      uvs.push(s / segments, t);
    }
  }

  const row = segments + 1;
  for (let r = 0; r < rings; r++) {
    const r1 = r * row;
    const r2 = (r + 1) * row;
    for (let s = 0; s < segments; s++) {
      indices.push(r1 + s, r2 + s, r1 + s + 1);
      indices.push(r1 + s + 1, r2 + s, r2 + s + 1);
    }
  }

  // Rounded apex dome cap at the tip
  const apexPt = centerline(1.0);
  const apexIdx = vertices.length / 3;
  vertices.push(apexPt.x, apexPt.y - 0.02, apexPt.z);
  uvs.push(0.5, 1.0);
  const lastRing = rings * row;
  for (let s = 0; s < segments; s++) {
    indices.push(lastRing + s, apexIdx, lastRing + s + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function buildIsolatedToothModel(
  tooth: ToothDefinition
): {
  group: THREE.Group;
  surfaceMeshes: Map<ToothSurface, THREE.Object3D>;
} {
  if (tooth.fdi === 11) {
    return buildRealisticCentralIncisorModel(tooth);
  }

  const group = new THREE.Group();
  group.name = `isolated_tooth_${tooth.fdi}`;

  const surfaceMeshes = new Map<ToothSurface, THREE.Object3D>();

  const baseEnamel = createIsolatedEnamelMaterial('#FAF8F3');
  const rootDentin = createRootMaterial();

  const isAnterior = tooth.isAnterior;
  const primarySurface: ToothSurface = isAnterior ? 'Incisal' : 'Occlusal';
  const facialSurface: ToothSurface = isAnterior ? 'Labial' : 'Buccal';

  const isUpper = tooth.arch === 'UPPER';
  const posInQuad = tooth.fdi % 10;
  const isRightQuadrant = tooth.quadrant === 'UR' || tooth.quadrant === 'LR';
  const mesialDir = isRightQuadrant ? 1 : -1;

  const archSpecs = isUpper ? UPPER_ARCH_SPECS : LOWER_ARCH_SPECS;
  const specs = archSpecs[tooth.fdi];
  const crownWidth = specs?.width || 0.60;
  const crownThick = specs?.thick || 0.60;
  const crownHeight = specs?.height || 0.85;

  // Vertex calculator for the exact anatomical crown wall
  const getCrownVertex = (lambda: number, angle: number): THREE.Vector3 => {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);
    const baseY = -0.15 + lambda * crownHeight;

    if (tooth.toothClass === 'INCISOR') {
      const isCentral = posInQuad === 1;
      const wx = (crownWidth / 2) * (0.74 + 0.32 * Math.sin(lambda * Math.PI * 0.60));
      const tz = (crownThick / 2) * Math.max(0.25, 0.96 - 0.70 * Math.pow(lambda, 1.15));

      let cornerFactor = 1.0;
      const isDistal = isRightQuadrant ? sinA < -0.1 : sinA > 0.1;
      if (isDistal && lambda > 0.55) {
        const roundIntensity = isCentral ? 0.16 : 0.26;
        cornerFactor = 1.0 - roundIntensity * ((lambda - 0.55) / 0.45) * Math.abs(sinA);
      }

      const lingualConvergence = cosA < 0 ? (0.86 + 0.14 * (1.0 - Math.abs(cosA))) : 1.0;

      let labialCurve = 0;
      let lobes = 0;
      if (cosA > 0) {
        labialCurve = 0.042 * Math.sin(lambda * Math.PI * 0.72) * Math.cos(angle * 0.85) + 0.012 * Math.pow(cosA, 2.0);
        lobes = 0.012 * Math.sin(angle * 3) * Math.sin(lambda * Math.PI);
      }

      let lingualFeature = 0;
      if (cosA < 0) {
        if (lambda < 0.40) {
          lingualFeature = -0.042 * Math.pow(1.0 - lambda / 0.40, 1.8) * Math.abs(cosA);
        } else {
          const fossaDepth = 0.026 * Math.sin(((lambda - 0.40) / 0.60) * Math.PI) * (1.0 - sinA * sinA);
          lingualFeature = fossaDepth * Math.abs(cosA);
        }
      }

      const x = sinA * wx * cornerFactor * lingualConvergence;
      const z = cosA * tz + labialCurve + lobes + lingualFeature;
      return new THREE.Vector3(x, baseY, z);
    } else if (tooth.toothClass === 'CANINE') {
      const bulge = 0.86 + 0.28 * Math.sin(lambda * Math.PI * 0.65) - 0.40 * Math.pow(lambda, 2.0);
      let labialRidge = 0;
      if (cosA > 0.15) {
        labialRidge = 0.045 * Math.sin(lambda * Math.PI * 0.80) * Math.cos(angle * 0.85);
      }
      let slopeAsymmetry = 1.0;
      const isDistal = isRightQuadrant ? sinA < -0.1 : sinA > 0.1;
      if (isDistal && lambda > 0.65) {
        slopeAsymmetry = 0.93;
      }
      const x = sinA * (crownWidth / 2) * bulge * slopeAsymmetry;
      const z = cosA * (crownThick / 2) * bulge + labialRidge;
      return new THREE.Vector3(x, baseY, z);
    } else if (tooth.toothClass === 'PREMOLAR') {
      const isFirst = posInQuad === 4;
      const bulge = 0.86 + 0.26 * Math.sin(lambda * Math.PI * 0.70) - 0.10 * Math.pow(lambda, 2);
      const rx = (crownWidth / 2) * bulge;
      const rz = (crownThick / 2) * bulge;

      let x = sinA * rx;
      let z = cosA * rz;

      if (isUpper && isFirst) {
        const isMesial = isRightQuadrant ? (sinA > 0.3) : (sinA < -0.3);
        if (isMesial && lambda > 0.25 && lambda < 0.80) {
          x -= mesialDir * 0.025 * Math.sin((lambda - 0.25) / 0.55 * Math.PI);
        }
      } else if (!isUpper && isFirst && cosA < -0.2) {
        z *= 0.88;
      }

      return new THREE.Vector3(x, baseY, z);
    } else {
      // MOLAR
      const bulge = 0.88 + 0.26 * Math.sin(lambda * Math.PI * 0.65) - 0.12 * Math.pow(lambda, 2);
      const rx = (crownWidth / 2) * bulge;
      const rz = (crownThick / 2) * bulge;
      let x = sinA * rx;
      let z = cosA * rz;

      if (isUpper) {
        x += cosA * 0.06 * mesialDir;
      } else if (posInQuad === 6) {
        if (sinA < -0.2 && cosA > 0) {
          x -= mesialDir * 0.04;
        }
      }
      return new THREE.Vector3(x, baseY, z);
    }
  };

  // Helper to build an axial lateral surface
  const buildLateralSurfaceMesh = (startAngle: number, arcAngle: number, surfName: ToothSurface): THREE.Mesh => {
    const rings = 16;
    const segs = 16;
    const verts: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r <= rings; r++) {
      const lambda = r / rings;
      for (let s = 0; s <= segs; s++) {
        const angle = startAngle + (s / segs) * arcAngle;
        const pt = getCrownVertex(lambda, angle);
        verts.push(pt.x, pt.y, pt.z);
        uvs.push(s / segs, lambda);
      }
    }

    const row = segs + 1;
    for (let r = 0; r < rings; r++) {
      const r1 = r * row;
      const r2 = (r + 1) * row;
      for (let s = 0; s < segs; s++) {
        indices.push(r1 + s, r2 + s, r1 + s + 1);
        indices.push(r1 + s + 1, r2 + s, r2 + s + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, baseEnamel.clone());
    mesh.userData = { surface: surfName };
    mesh.name = `surface_${surfName}`;
    surfaceMeshes.set(surfName, mesh);
    group.add(mesh);
    return mesh;
  };

  // 1. Build the 4 axial crown surfaces
  // Facial (Labial / Buccal): centered at angle 0 (+Z)
  buildLateralSurfaceMesh(-Math.PI * 0.25, Math.PI * 0.50, facialSurface);

  // Lingual: centered at angle Math.PI (-Z)
  buildLateralSurfaceMesh(Math.PI * 0.75, Math.PI * 0.50, 'Lingual');

  // Mesial & Distal
  if (isRightQuadrant) {
    buildLateralSurfaceMesh(Math.PI * 0.25, Math.PI * 0.50, 'Mesial');
    buildLateralSurfaceMesh(Math.PI * 1.25, Math.PI * 0.50, 'Distal');
  } else {
    buildLateralSurfaceMesh(Math.PI * 1.25, Math.PI * 0.50, 'Mesial');
    buildLateralSurfaceMesh(Math.PI * 0.25, Math.PI * 0.50, 'Distal');
  }

  // 2. Build the top surface (Incisal edge dome or Occlusal table)
  let occMesh: THREE.Mesh;

  if (tooth.toothClass === 'INCISOR') {
    // Sculpted Incisal Edge Dome
    const occVerts: number[] = [];
    const occIndices: number[] = [];
    const occUvs: number[] = [];
    const topY = -0.15 + crownHeight;
    const w = crownWidth / 2;
    const t = (crownThick / 2) * 0.32;
    const xSteps = 20;
    const zSteps = 10;

    for (let j = 0; j <= zSteps; j++) {
      const vz = (j / zSteps) * 2 - 1;
      const z = vz * t;
      for (let i = 0; i <= xSteps; i++) {
        const ux = (i / xSteps) * 2 - 1;
        const x = ux * w * (1 - 0.15 * Math.abs(vz));
        const bevel = -0.02 * vz;
        const dome = 0.035 * (1 - ux * ux) * (1 - vz * vz);
        occVerts.push(x, topY + bevel + dome, z);
        occUvs.push((ux + 1) * 0.5, (vz + 1) * 0.5);
      }
    }

    const xRow = xSteps + 1;
    for (let j = 0; j < zSteps; j++) {
      const r1 = j * xRow;
      const r2 = (j + 1) * xRow;
      for (let i = 0; i < xSteps; i++) {
        occIndices.push(r1 + i, r2 + i, r1 + i + 1);
        occIndices.push(r1 + i + 1, r2 + i, r2 + i + 1);
      }
    }

    const occGeo = new THREE.BufferGeometry();
    occGeo.setAttribute('position', new THREE.Float32BufferAttribute(occVerts, 3));
    occGeo.setAttribute('uv', new THREE.Float32BufferAttribute(occUvs, 2));
    occGeo.setIndex(occIndices);
    occGeo.computeVertexNormals();
    occMesh = new THREE.Mesh(occGeo, baseEnamel.clone());
  } else if (tooth.toothClass === 'CANINE') {
    // Sculpted pointed Canine Cusp Apex
    const occVerts: number[] = [];
    const occIndices: number[] = [];
    const occUvs: number[] = [];
    const topY = -0.15 + crownHeight;
    const apexY = topY + 0.14;
    const apexX = isRightQuadrant ? 0.02 : -0.02;
    const apexZ = 0.02;
    const rings = 8;
    const segs = 32;

    for (let r = 0; r <= rings; r++) {
      const lambda = r / rings;
      const y = THREE.MathUtils.lerp(topY, apexY, Math.pow(lambda, 0.75));
      const radScale = 1.0 - lambda;

      for (let s = 0; s <= segs; s++) {
        const angle = (s / segs) * Math.PI * 2;
        const rimPt = getCrownVertex(1.0, angle);
        const x = THREE.MathUtils.lerp(rimPt.x, apexX, lambda);
        const z = THREE.MathUtils.lerp(rimPt.z, apexZ, lambda);
        occVerts.push(x, y, z);
        occUvs.push(s / segs, lambda);
      }
    }

    const row = segs + 1;
    for (let r = 0; r < rings; r++) {
      const r1 = r * row;
      const r2 = (r + 1) * row;
      for (let s = 0; s < segs; s++) {
        occIndices.push(r1 + s, r2 + s, r1 + s + 1);
        occIndices.push(r1 + s + 1, r2 + s, r2 + s + 1);
      }
    }

    const occGeo = new THREE.BufferGeometry();
    occGeo.setAttribute('position', new THREE.Float32BufferAttribute(occVerts, 3));
    occGeo.setAttribute('uv', new THREE.Float32BufferAttribute(occUvs, 2));
    occGeo.setIndex(occIndices);
    occGeo.computeVertexNormals();
    occMesh = new THREE.Mesh(occGeo, baseEnamel.clone());
  } else {
    // Sculpted Premolar or Molar Occlusal Table with distinct cusps, pits & fissures
    const occRings = 16;
    const occSegs = 36;
    const occVerts: number[] = [];
    const occIndices: number[] = [];
    const occUvs: number[] = [];
    const occTopY = -0.15 + crownHeight;
    const isMolar = tooth.toothClass === 'MOLAR';

    for (let r = 0; r <= occRings; r++) {
      const rRatio = r / occRings;
      for (let s = 0; s <= occSegs; s++) {
        const angle = (s / occSegs) * Math.PI * 2;
        const rimPt = getCrownVertex(1.0, angle);
        const x = rimPt.x * rRatio;
        const z = rimPt.z * rRatio;

        const u = x / (crownWidth / 2);
        const v = z / (crownThick / 2);

        let sculpt = 0;
        if (isMolar) {
          if (isUpper) {
            // Maxillary Molar: 4 Cusps (ML largest, MB, DB, DL + Oblique Ridge)
            const mb = Math.hypot(u - mesialDir * 0.36, v - 0.34) < 0.40 ? 0.17 * Math.pow(Math.cos((Math.hypot(u - mesialDir * 0.36, v - 0.34) / 0.40) * Math.PI * 0.5), 2) : 0;
            const db = Math.hypot(u + mesialDir * 0.36, v - 0.34) < 0.36 ? 0.14 * Math.pow(Math.cos((Math.hypot(u + mesialDir * 0.36, v - 0.34) / 0.36) * Math.PI * 0.5), 2) : 0;
            const ml = Math.hypot(u - mesialDir * 0.32, v + 0.32) < 0.44 ? 0.19 * Math.pow(Math.cos((Math.hypot(u - mesialDir * 0.32, v + 0.32) / 0.44) * Math.PI * 0.5), 2) : 0;
            const dl = Math.hypot(u + mesialDir * 0.36, v + 0.36) < 0.34 ? 0.12 * Math.pow(Math.cos((Math.hypot(u + mesialDir * 0.36, v + 0.36) / 0.34) * Math.PI * 0.5), 2) : 0;
            const oblique = Math.abs((u - mesialDir * 0.32) + (v - 0.34) * mesialDir) < 0.28 ? 0.05 * Math.pow(Math.cos((Math.abs((u - mesialDir * 0.32) + (v - 0.34) * mesialDir) / 0.28) * Math.PI * 0.5), 2) : 0;
            const pit = Math.hypot(u, v) < 0.22 ? -0.09 * Math.pow(Math.cos((Math.hypot(u, v) / 0.22) * Math.PI * 0.5), 2) : 0;
            sculpt = mb + db + ml + dl + oblique + pit;
          } else {
            // Mandibular Molar: 5 Cusps on 1st molar, 4 on others
            if (posInQuad === 6) {
              const mb = Math.hypot(u - mesialDir * 0.40, v - 0.34) < 0.38 ? 0.17 * Math.pow(Math.cos((Math.hypot(u - mesialDir * 0.40, v - 0.34) / 0.38) * Math.PI * 0.5), 2) : 0;
              const db = Math.hypot(u, v - 0.36) < 0.36 ? 0.15 * Math.pow(Math.cos((Math.hypot(u, v - 0.36) / 0.36) * Math.PI * 0.5), 2) : 0;
              const d = Math.hypot(u + mesialDir * 0.42, v - 0.28) < 0.30 ? 0.11 * Math.pow(Math.cos((Math.hypot(u + mesialDir * 0.42, v - 0.28) / 0.30) * Math.PI * 0.5), 2) : 0;
              const ml = Math.hypot(u - mesialDir * 0.30, v + 0.34) < 0.40 ? 0.18 * Math.pow(Math.cos((Math.hypot(u - mesialDir * 0.30, v + 0.34) / 0.40) * Math.PI * 0.5), 2) : 0;
              const dl = Math.hypot(u + mesialDir * 0.28, v + 0.34) < 0.38 ? 0.16 * Math.pow(Math.cos((Math.hypot(u + mesialDir * 0.28, v + 0.34) / 0.38) * Math.PI * 0.5), 2) : 0;
              const pit = Math.hypot(u, v) < 0.22 ? -0.09 * Math.pow(Math.cos((Math.hypot(u, v) / 0.22) * Math.PI * 0.5), 2) : 0;
              sculpt = mb + db + d + ml + dl + pit;
            } else {
              const mb = Math.hypot(u - mesialDir * 0.36, v - 0.34) < 0.38 ? 0.16 * Math.pow(Math.cos((Math.hypot(u - mesialDir * 0.36, v - 0.34) / 0.38) * Math.PI * 0.5), 2) : 0;
              const db = Math.hypot(u + mesialDir * 0.36, v - 0.34) < 0.36 ? 0.14 * Math.pow(Math.cos((Math.hypot(u + mesialDir * 0.36, v - 0.34) / 0.36) * Math.PI * 0.5), 2) : 0;
              const ml = Math.hypot(u - mesialDir * 0.34, v + 0.34) < 0.40 ? 0.18 * Math.pow(Math.cos((Math.hypot(u - mesialDir * 0.34, v + 0.34) / 0.40) * Math.PI * 0.5), 2) : 0;
              const dl = Math.hypot(u + mesialDir * 0.34, v + 0.34) < 0.38 ? 0.16 * Math.pow(Math.cos((Math.hypot(u + mesialDir * 0.34, v + 0.34) / 0.38) * Math.PI * 0.5), 2) : 0;
              const pit = Math.hypot(u, v) < 0.22 ? -0.09 * Math.pow(Math.cos((Math.hypot(u, v) / 0.22) * Math.PI * 0.5), 2) : 0;
              sculpt = mb + db + ml + dl + pit;
            }
          }
        } else {
          // Premolar cusps
          const bCusp = Math.hypot(u, v - 0.38) < 0.44 ? 0.16 * Math.pow(Math.cos((Math.hypot(u, v - 0.38) / 0.44) * Math.PI * 0.5), 2) : 0;
          const lCusp = Math.hypot(u, v + 0.38) < 0.42 ? 0.12 * Math.pow(Math.cos((Math.hypot(u, v + 0.38) / 0.42) * Math.PI * 0.5), 2) : 0;
          const groove = Math.abs(v) < 0.20 ? -0.07 * Math.pow(Math.cos((Math.abs(v) / 0.20) * Math.PI * 0.5), 2) : 0;
          sculpt = bCusp + lCusp + groove;
        }

        const y = occTopY + sculpt * (1.0 - Math.pow(rRatio, 2.5));
        occVerts.push(x, y, z);
        occUvs.push(s / occSegs, rRatio);
      }
    }

    const row = occSegs + 1;
    for (let r = 0; r < occRings; r++) {
      const r1 = r * row;
      const r2 = (r + 1) * row;
      for (let s = 0; s < occSegs; s++) {
        occIndices.push(r1 + s, r1 + s + 1, r2 + s);
        occIndices.push(r1 + s + 1, r2 + s + 1, r2 + s);
      }
    }

    const occGeo = new THREE.BufferGeometry();
    occGeo.setAttribute('position', new THREE.Float32BufferAttribute(occVerts, 3));
    occGeo.setAttribute('uv', new THREE.Float32BufferAttribute(occUvs, 2));
    occGeo.setIndex(occIndices);
    occGeo.computeVertexNormals();
    occMesh = new THREE.Mesh(occGeo, baseEnamel.clone());
  }

  occMesh.userData = { surface: primarySurface };
  occMesh.name = `surface_${primarySurface}`;
  surfaceMeshes.set(primarySurface, occMesh);
  group.add(occMesh);

  // 3. ANATOMICAL MULTI-ROOT SYSTEM
  const rootGroup = new THREE.Group();
  rootGroup.name = 'roots';
  const rootMat = rootDentin.clone();
  rootMat.side = THREE.DoubleSide;

  if (tooth.toothClass === 'INCISOR') {
    // Single flattened anatomical root, curving distally
    const len = isUpper ? (posInQuad === 1 ? 1.45 : 1.35) : 1.30;
    const geo = createLoftedRootGeometry(
      (t) => new THREE.Vector3(-mesialDir * 0.07 * t * t, -0.15 - t * len, -0.04 * t),
      (t) => (posInQuad === 1 ? 0.20 : 0.16) * (1.0 - 0.72 * Math.pow(t, 0.85)),
      (t) => (posInQuad === 1 ? 0.28 : 0.23) * (1.0 - 0.70 * Math.pow(t, 0.85)),
      20, 24
    );
    const m = new THREE.Mesh(geo, rootMat);
    m.userData = { surface: 'Root' };
    rootGroup.add(m);
  } else if (tooth.toothClass === 'CANINE') {
    // Single long, robust conical root
    const len = isUpper ? 1.70 : 1.60;
    const geo = createLoftedRootGeometry(
      (t) => new THREE.Vector3(-mesialDir * 0.06 * t * t, -0.15 - t * len, -0.05 * t),
      (t) => 0.26 * (1.0 - 0.72 * Math.pow(t, 0.85)),
      (t) => 0.32 * (1.0 - 0.70 * Math.pow(t, 0.85)),
      22, 24
    );
    const m = new THREE.Mesh(geo, rootMat);
    m.userData = { surface: 'Root' };
    rootGroup.add(m);
  } else if (tooth.toothClass === 'PREMOLAR') {
    if (isUpper && posInQuad === 4) {
      // Maxillary 1st Premolar: Bifurcated roots (Buccal + Palatal)
      const trunkLen = 0.35;
      const rootLen = 1.05;
      // Root Trunk
      const trunkGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(0, -0.15 - t * trunkLen, 0),
        (t) => THREE.MathUtils.lerp(0.24, 0.22, t),
        (t) => THREE.MathUtils.lerp(0.30, 0.26, t),
        8, 20
      );
      const trunkMesh = new THREE.Mesh(trunkGeo, rootMat);
      trunkMesh.userData = { surface: 'Root' };
      rootGroup.add(trunkMesh);

      // Buccal root
      const bGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(0, -0.15 - trunkLen - t * rootLen, 0.12 * Math.sin(t * Math.PI * 0.5)),
        (t) => 0.14 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.15 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const bMesh = new THREE.Mesh(bGeo, rootMat);
      bMesh.userData = { surface: 'Root' };
      rootGroup.add(bMesh);

      // Palatal root
      const pGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(0, -0.15 - trunkLen - t * rootLen, -0.12 * Math.sin(t * Math.PI * 0.5)),
        (t) => 0.14 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.15 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const pMesh = new THREE.Mesh(pGeo, rootMat);
      pMesh.userData = { surface: 'Root' };
      rootGroup.add(pMesh);
    } else {
      // Single flattened premolar root
      const len = 1.40;
      const geo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(-mesialDir * 0.04 * t * t, -0.15 - t * len, 0),
        (t) => 0.20 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.26 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        20, 24
      );
      const m = new THREE.Mesh(geo, rootMat);
      m.userData = { surface: 'Root' };
      rootGroup.add(m);
    }
  } else {
    // MOLAR
    if (isUpper) {
      // Maxillary Molar: 3 distinct divergent roots (MB, DB, Palatal)
      const trunkLen = 0.35;
      const trunkGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(0, -0.15 - t * trunkLen, 0),
        (t) => THREE.MathUtils.lerp(0.36, 0.32, t),
        (t) => THREE.MathUtils.lerp(0.38, 0.34, t),
        8, 22
      );
      const trunkMesh = new THREE.Mesh(trunkGeo, rootMat);
      trunkMesh.userData = { surface: 'Root' };
      rootGroup.add(trunkMesh);

      // Palatal root (longest, round, diverges palatally)
      const palLen = 1.15;
      const palGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(0, -0.15 - trunkLen - t * palLen, -0.22 * Math.sin(t * Math.PI * 0.65)),
        (t) => 0.18 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        (t) => 0.18 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const palMesh = new THREE.Mesh(palGeo, rootMat);
      palMesh.userData = { surface: 'Root' };
      rootGroup.add(palMesh);

      // Mesiobuccal root (broad bucco-lingually, curved distally)
      const mbLen = 1.05;
      const mbGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(mesialDir * (0.18 - 0.08 * t * t), -0.15 - trunkLen - t * mbLen, 0.16 * Math.sin(t * Math.PI * 0.60)),
        (t) => 0.14 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.17 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const mbMesh = new THREE.Mesh(mbGeo, rootMat);
      mbMesh.userData = { surface: 'Root' };
      rootGroup.add(mbMesh);

      // Distobuccal root (smaller, conical)
      const dbLen = 1.00;
      const dbGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(-mesialDir * (0.18 + 0.06 * t), -0.15 - trunkLen - t * dbLen, 0.16 * Math.sin(t * Math.PI * 0.60)),
        (t) => 0.13 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.14 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const dbMesh = new THREE.Mesh(dbGeo, rootMat);
      dbMesh.userData = { surface: 'Root' };
      rootGroup.add(dbMesh);
    } else {
      // Mandibular Molar: 2 distinct divergent roots (Mesial with longitudinal groove, Distal)
      const trunkLen = 0.35;
      const trunkGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(0, -0.15 - t * trunkLen, 0),
        (t) => THREE.MathUtils.lerp(0.38, 0.34, t),
        (t) => THREE.MathUtils.lerp(0.34, 0.30, t),
        8, 22
      );
      const trunkMesh = new THREE.Mesh(trunkGeo, rootMat);
      trunkMesh.userData = { surface: 'Root' };
      rootGroup.add(trunkMesh);

      // Mesial root (broad bucco-lingually, flattened mesiodistally, longitudinal groove)
      const mLen = 1.10;
      const mGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(mesialDir * (0.18 - 0.06 * t * t), -0.15 - trunkLen - t * mLen, 0),
        (t) => 0.15 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.24 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const mMesh = new THREE.Mesh(mGeo, rootMat);
      mMesh.userData = { surface: 'Root' };
      rootGroup.add(mMesh);

      // Distal root (conical, curved distally)
      const dLen = 1.05;
      const dGeo = createLoftedRootGeometry(
        (t) => new THREE.Vector3(-mesialDir * (0.18 + 0.08 * t), -0.15 - trunkLen - t * dLen, 0),
        (t) => 0.16 * (1.0 - 0.72 * Math.pow(t, 0.85)),
        (t) => 0.20 * (1.0 - 0.70 * Math.pow(t, 0.85)),
        16, 20
      );
      const dMesh = new THREE.Mesh(dGeo, rootMat);
      dMesh.userData = { surface: 'Root' };
      rootGroup.add(dMesh);
    }
  }

  rootGroup.children.forEach((c) => {
    c.userData = { surface: 'Root' };
    c.name = 'surface_Root';
  });
  surfaceMeshes.set('Root', rootGroup);
  group.add(rootGroup);

  // Apply consistent additional 10% vertical crown height reduction to ToothPreview3D model (0.88 * 0.90 = 0.792)
  group.scale.set(1.0, 0.792, 1.0);

  return { group, surfaceMeshes };
}
