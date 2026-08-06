import type { Box3, Texture } from 'three';
import {
  CanvasTexture,
  CapsuleGeometry,
  ClampToEdgeWrapping,
  DoubleSide,
  Euler,
  Group,
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  MathUtils,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Ray,
  Raycaster,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';

/**
 * 完全复刻参考（Codrops xylophone，xylophone-main）磨砂玻璃螺旋，仅色系换品牌：
 *
 * 本次重写对齐参考源码（src/js/configs/XylophoneConfig.ts + helix.ts + 两个 shader）：
 * - 柱 = 长条胶囊玻璃片，bbox 比例 0.2:0.4:2.5（GLB xylophone-09 实测，非 RoundedBox）→ 修复「长度/边缘形态」
 * - 柱高 = 视口高/20.7（参考可见高 4.14 ÷ pitch 0.2），半径 = 2.5×柱高，θStep 0.175 → 切向重叠 14.3×（修复「密度」）
 * - 柱数按带高自适应（≥64，封顶 128），整条带密实铺满 → 「AI→FAQ 连续贯通」
 * - 相机 fov 45 + 组 rotX 25°/rotZ 30°（参考原值）
 * - 全参考 shader：spin + strike 摆锤（SWING_AMP .58 / FREQ 16 / DECAY 4.5）+ 磨砂透射 + fresnel sheen + 虹彩
 * - 交互动效：hover 拾取→strike 摆锤 + 128² 流体尾迹揭示品牌色（参考 FluidSim 全移植）
 * - 不透明柱（alpha 1，重叠不累加白斑）；带顶/底边缘渐隐改用 CSS mask（style.module.less）
 *
 * 可调项集中在顶部 PARAMS（观感微调改这里）。
 */

/** 参考 XylophoneConfig + xylophone shader 内常量（原值） */
const PARAMS = {
  count: 64, // 最小螺旋长度；resize 时按带高自适应增长
  barsPerViewport: 20.7, // 参考：可见高 4.14 / 柱 pitch 0.2 ≈ 20.7 根/视口高
  maxCount: 128, // 封顶，避免极端超长带
  wrapMargin: 12, // 带高铺满后再多加的根数（回绕缓冲，藏在 frustum 外）
  horizonFit: 0.08, // 柱高 ≤ 带宽 × 0.08，螺旋横向永不出血（移动端收窄）
  thetaStep: 0.175, // 参考 angular step（≈1.78 圈/64 根）
  thetaOffset: Math.PI,
  tiltFalloff: 2,
  rotXDeg: 22, // 参考 group.rotXDeg 25 —— 带区极高（长高比≈0.45），按竖带收一点让丝带留在带内
  rotZDeg: 18, // 参考 group.rotZDeg 30 —— 同上：30° 会把丝带甩出带侧，18° 斜穿带宽更稳
  fov: 45, // 参考 PerspectiveCamera fov
  spinSpeed: 0.3,
  swingAmp: 0.58, // SWING_AMP (rad)
  swingFreq: 16, // SWING_FREQ (rad/s)
  swingDecay: 4.5, // SWING_DECAY (1/s)
  transmission: 0.84,
  refractStrength: 0.2,
  fresnelPower: 3,
  iridStrength: 0.6,
  iridCycles: 3,
  iridShift: 0,
  iridPower: 2.5,
  iridBody: 0.12,
  fluidStrength: 1,
  tintStrength: 1, // 静止近白，hover 揭示品牌色（参考 u_tintStrength 1.0）
  tintGlow: 0.15,
  tintWrap: 10, // 梯度沿螺旋循环 10 次
} as const;

/** 流体模拟（参考 FLUID + FluidSim 常量） */
const FLUID = {
  simRes: 128,
  curlStrength: 0.2,
  splatRadius: 0.6,
  splatForce: 20,
  pressureIterations: 1,
  velocityDissipation: 0.93,
  pressureDissipation: 0.97,
} as const;

/** 指针静止多久后跳过流体求解（省 GPU/电量，参考 IDLE_SLEEP_AFTER） */
const IDLE_SLEEP_AFTER = 2.5;

/** 磨砂底：0.25× 低清渲染 + 大核高斯（H→V 两遍 × 2 迭代）→ 参考 GaussianBlurPass 的宽磨砂 */
const BACKDROP_SCALE = 0.25;
const BLUR_ITERATIONS = 2;
const KERNEL_RADIUS = 11; // 23-tap，σ=radius/3

const SCROLL_TRAVEL_TURNS = 1.2; // 带完全滚过视口时相位推进的圈数
const SCROLL_LERP = 5;

/** 品牌梯度（仅色系换品牌：参考是霓虹粉→青，换成 WisePen 薄荷/青/墨绿）。
 * 调亮为清新浅薄荷——hover 揭示的是玻璃体上的品牌色，太深会显得沉；
 * 最暗端 #4ab98d（柔青绿）不再落向墨黑，整体保持「清新自然」。 */
const GRADIENT_STOPS: Array<[number, string]> = [
  [0.0, '#eefcf5'],
  [0.3, '#bcf2db'],
  [0.5, '#86e4be'],
  [0.8, '#5fcea3'],
  [1.0, '#4ab98d'],
];

type HelixCfg = {
  count: number;
  radius: number;
  thetaStep: number;
  thetaOffset: number;
  tiltFalloff: number;
};

function wrap(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/**
 * 写入螺旋姿态（移植参考 helix.writeHelixTransforms，逐行一致）。
 * 柱随相位沿螺旋推进并用 wrap 回绕 → 有限柱数读作无限长列。
 * 原地写实例缓冲，借用调用方 Euler/Quaternion，不分配内存。
 */
function writeHelixTransforms(
  phase: number,
  geometryHeight: number,
  cfg: HelixCfg,
  positions: Float32Array,
  rotations: Float32Array,
  e: Euler,
  q: Quaternion
): void {
  const tiltX = Math.atan2(geometryHeight, cfg.radius * cfg.tiltFalloff);
  const halfHeight = ((cfg.count - 1) * geometryHeight) / 2;

  for (let i = 0; i < cfg.count; i++) {
    const s = wrap(i + phase, cfg.count);
    const theta = s * cfg.thetaStep + cfg.thetaOffset;

    positions[i * 3] = cfg.radius * Math.cos(theta);
    positions[i * 3 + 1] = s * geometryHeight - halfHeight;
    positions[i * 3 + 2] = cfg.radius * Math.sin(theta);

    e.set(tiltX, -theta, 0);
    q.setFromEuler(e);
    rotations[i * 4] = q.x;
    rotations[i * 4 + 1] = q.y;
    rotations[i * 4 + 2] = q.z;
    rotations[i * 4 + 3] = q.w;
  }
}

/**
 * 长条胶囊玻璃片（复刻 GLB bbox 0.2:0.4:2.5）。
 * three CapsuleGeometry 默认沿 Y，旋转到 Z 做长轴，再在 X 上压扁成 0.5:1 椭圆截面。
 */
function makeBarGeometry(barW: number, barH: number, barD: number): CapsuleGeometry {
  const g = new CapsuleGeometry(Math.max(barH / 2, 0.01), Math.max(barD - barH, 0), 6, 20);
  g.rotateX(Math.PI / 2); // 长轴 Y → Z
  g.scale(barW / barH, 1, 1); // 椭圆截面：X=0.5×barH，Y=barH
  g.computeVertexNormals();
  return g;
}

/** 1px 高的品牌色梯度纹理（hover 揭示时按槽位采样） */
function buildGradientTexture(): Texture {
  const width = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  for (const [pos, color] of GRADIENT_STOPS) grad.addColorStop(pos, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, 1);

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  return tex;
}

/** 向上找第一个可滚动的祖先（首页实测为 main.middleContent），找不到回退到 html。 */
function findScrollRoot(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node) {
    if (node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

/* -------------------------------------------------------------------------- */
/*                                    shaders                                  */
/* -------------------------------------------------------------------------- */

/** 全屏 quad 顶点：直接写 clip-space，相机无关（渐变/模糊/流体共用）。 */
const FULLSCREEN_VERT = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * 品牌渐变底（磨砂透射采样的对象）：对角薄荷/青 ramp + 光斑。
 * 跨度加大（底端深薄荷→顶白）让折射/磨砂在浅色页面上读得出来，贴近参考的 vivid 底。
 */
const BG_FRAG = `
varying vec2 vUv;
uniform vec2 u_aspect;

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y);
  float d = smoothstep(0.0, 1.0, p.x * 0.5 + p.y * 0.5);
  vec3 top = vec3(0.80, 0.93, 0.87); // 顶部也保薄荷，避免浅色页面吞掉磨砂柱
  // 中段与深底一起降饱和：底部行 d∈[0,0.5] 主要由 mid 主导，mid 不调会继续偏艳
  vec3 mid = vec3(0.50, 0.80, 0.67);
  // 深绿降饱和（0.16→0.22 抬 R / 0.66→0.60 降 G，饱和度 ≈0.63），避免荧光感
  vec3 deep = vec3(0.22, 0.60, 0.44);
  vec3 color = mix(top, mid, d);
  color = mix(color, deep, smoothstep(0.35, 0.95, d));

  vec2 c = (p - vec2(0.28, 0.58)) * vec2(u_aspect.x, 1.0);
  color += vec3(0.12, 0.58, 0.41) * exp(-dot(c, c) * 4.0) * 0.28;

  c = (p - vec2(0.76, 0.42)) * vec2(u_aspect.x, 1.0);
  color += vec3(0.44, 0.86, 0.63) * exp(-dot(c, c) * 4.0) * 0.32;

  gl_FragColor = vec4(color, 1.0);
}
`;

/** 高斯权重（σ=radius/3），运行时生成 BLUR_FRAG。 */
function gaussianWeights(radius: number): number[] {
  const sigma = radius / 3;
  const ws: number[] = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    ws.push(v);
    sum += v;
  }
  return ws.map((w) => w / sum);
}
const BLUR_TAPS = gaussianWeights(KERNEL_RADIUS);

/** 可分离高斯 (2×KERNEL_RADIUS+1)-tap，u_dir 换向 → H/V 两遍。 */
function buildBlurFrag(): string {
  let taps = '';
  for (let i = -KERNEL_RADIUS; i <= KERNEL_RADIUS; i++) {
    const w = BLUR_TAPS[i + KERNEL_RADIUS].toFixed(8);
    const sign = i < 0 ? '-' : '+';
    const mag = Math.abs(i);
    taps +=
      mag === 0
        ? `  sum += texture2D(u_tex, vUv) * ${w};\n`
        : `  sum += texture2D(u_tex, vUv ${sign} u_dir * u_texel * ${mag}.0) * ${w};\n`;
  }
  return `
varying vec2 vUv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform vec2 u_dir;

void main() {
  vec4 sum = vec4(0.0);
${taps}
  gl_FragColor = sum;
}
`;
}
const BLUR_FRAG = buildBlurFrag();

/**
 * 柱顶点：aPos+aRot 重建实例矩阵；idle spin + strike 摆锤均在 shader 内 qmul
 * （完全移植参考 xylophoneVert.glsl：spin→aRot，再乘摆锤 swing）。
 */
const BARS_VERT = `
uniform float u_time;
uniform float u_spinSpeed;
uniform float u_swingScale;
uniform vec3 u_swingAxis;

attribute vec3 aPos;
attribute vec4 aRot;
attribute float aTintOffset;
attribute float aStrikeTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vScreenUv;
varying float vTintOffset;

const float SWING_AMP = 0.58;
const float SWING_FREQ = 16.0;
const float SWING_DECAY = 4.5;

vec3 rotateByQuat(vec3 v, vec4 q) {
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec4 qmul(vec4 a, vec4 b) {
  return vec4(
    a.w * b.xyz + b.w * a.xyz + cross(a.xyz, b.xyz),
    a.w * b.w - dot(a.xyz, b.xyz)
  );
}

void main() {
  // idle spin（参考：half-angle = u_time * u_spinSpeed * 0.5）
  float a = u_time * u_spinSpeed * 0.5;
  vec4 spin = vec4(0.0, sin(a), 0.0, cos(a));
  vec4 rot = qmul(spin, aRot);

  // strike 摆锤——阻尼摆，自 aStrikeTime 起衰减；未敲过（-1e9）dt 巨大 → env→0 姿态不变
  float dt = u_time - aStrikeTime;
  float env = step(0.0, dt) * exp(-dt * SWING_DECAY);
  float ang = env * SWING_AMP * sin(dt * SWING_FREQ) * u_swingScale;
  float halfAng = ang * 0.5;
  vec4 swing = vec4(normalize(u_swingAxis) * sin(halfAng), cos(halfAng));
  rot = qmul(rot, swing);

  vec3 transformedPos = aPos + rotateByQuat(position, rot);
  vec4 worldPos = modelMatrix * vec4(transformedPos, 1.0);

  vec3 rotatedNormal = rotateByQuat(normal, rot);

  gl_Position = projectionMatrix * viewMatrix * worldPos;

  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * rotatedNormal);
  vScreenUv = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
  vTintOffset = aTintOffset;
}
`;

/**
 * 柱片元：完全移植参考 xylophoneFrag.glsl —— 白色玻璃体 + 磨砂透射（强折射）+ fresnel sheen
 * + 薄膜虹彩 + 流体尾迹揭示品牌色（不透明，alpha 恒 1）。
 */
const BARS_FRAG = `
uniform sampler2D u_tFluid;
uniform sampler2D u_tGradient;

uniform float u_fluidStrength;
uniform float u_tintStrength;
uniform float u_tintGlow;
uniform float u_tintWrap;

uniform sampler2D u_tBackdrop;
uniform float u_transmission;
uniform float u_refractStrength;
uniform float u_fresnelPower;

uniform float u_iridStrength;
uniform float u_iridCycles;
uniform float u_iridShift;
uniform float u_iridPower;
uniform float u_iridBody;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vScreenUv;
varying float vTintOffset;

const float PI = 3.141592653589793;

const vec3 LIGHT_DIR = vec3(0.4, 1.0, 0.35);
const float AMBIENT_MIX = 0.6;

const float FLUID_GATE_MAX = 0.2;
const float TINT_OPACITY_DROP = 0.6;

const float SHEEN_MIX = 0.35;
const float RIM_LIFT = 0.06;

vec3 iridescence(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.0, 0.33, 0.67)));
}

vec3 proceduralEnv(vec3 dir) {
  float t = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 ground = vec3(0.12, 0.12, 0.14);
  vec3 horizon = vec3(0.60, 0.62, 0.68);
  vec3 sky = vec3(0.95, 0.97, 1.0);
  return t < 0.5 ? mix(ground, horizon, t * 2.0) : mix(horizon, sky, (t - 0.5) * 2.0);
}

void main() {
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;

  vec3 V = normalize(cameraPosition - vWorldPos);

  float diffuse = max(dot(N, normalize(LIGHT_DIR)), 0.0);
  vec3 ambLo = vec3(0.45, 0.46, 0.5);
  vec3 ambient = mix(ambLo, vec3(1.0), N.y * 0.5 + 0.5);
  vec3 lighting = ambient * AMBIENT_MIX + diffuse * (1.0 - AMBIENT_MIX);

  // 流体尾迹揭示品牌色（静止时 velocity=0 → reveal=0 → 近白玻璃体）
  float velocity = smoothstep(0.0, FLUID_GATE_MAX, length(texture2D(u_tFluid, vScreenUv).xy));
  float reveal = clamp(velocity * u_fluidStrength, 0.0, 1.0);
  vec3 tint = texture2D(u_tGradient, vec2(fract(vTintOffset * u_tintWrap), 0.5)).rgb;

  vec3 albedo = mix(vec3(1.0), tint, reveal * u_tintStrength);
  vec3 body = lighting * albedo;

  // 磨砂透射：强折射采样模糊渐变底
  vec2 buv = vScreenUv + N.xy * u_refractStrength;
  vec3 trans = texture2D(u_tBackdrop, buv).rgb;
  trans = mix(trans, tint, reveal);
  vec3 frosted = mix(body, trans, u_transmission * (1.0 - TINT_OPACITY_DROP * reveal));

  float edge = clamp(1.0 - max(dot(N, V), 0.0), 0.0, 1.0);
  float fres = pow(edge, u_fresnelPower);

  vec3 sheen = proceduralEnv(reflect(-V, N));
  vec3 color = mix(frosted, sheen, fres * SHEEN_MIX);
  color += fres * RIM_LIFT;

  color += tint * reveal * u_tintGlow;

  float phase = edge * u_iridCycles + N.y * 0.5 + u_iridShift;
  vec3 irid = iridescence(phase);
  color += irid * (pow(edge, u_iridPower) * u_iridStrength + u_iridBody * edge);

  gl_FragColor = vec4(color, 1.0);
}
`;

/* -------------------------------------------------------------------------- */
/*                        fluid (port of reference FluidSim)                   */
/* -------------------------------------------------------------------------- */

const FLUID_VERT = `
uniform vec2 u_texelSize;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  vUv = uv;
  vL = vUv - vec2(u_texelSize.x, 0.0);
  vR = vUv + vec2(u_texelSize.x, 0.0);
  vT = vUv + vec2(0.0, u_texelSize.y);
  vB = vUv - vec2(0.0, u_texelSize.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FLUID_SPLAT_FRAG = `
uniform sampler2D u_tTarget;
uniform float u_aspectRatio;
uniform vec3 u_splatColor;
uniform vec2 u_splatPosition;
uniform vec2 u_prevPoint;
uniform float u_splatRadius;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 a = u_prevPoint;
  vec2 b = u_splatPosition;

  uv.x *= u_aspectRatio;
  a.x *= u_aspectRatio;
  b.x *= u_aspectRatio;

  vec2 ab = b - a;
  float t = clamp(dot(uv - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 p = uv - (a + t * ab);

  vec3 splat = exp(-dot(p, p) / (u_splatRadius / 50.0)) * u_splatColor;
  vec3 base = texture2D(u_tTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`;

const FLUID_CURL_FRAG = `
uniform sampler2D u_tVelocity;

varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;

void main() {
  float L = texture2D(u_tVelocity, vL).y;
  float R = texture2D(u_tVelocity, vR).y;
  float T = texture2D(u_tVelocity, vT).x;
  float B = texture2D(u_tVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}
`;

const FLUID_VORTICITY_FRAG = `
uniform sampler2D u_tVelocity;
uniform sampler2D u_tCurl;
uniform float u_curl;
uniform float u_dt;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float L = texture2D(u_tCurl, vL).x;
  float R = texture2D(u_tCurl, vR).x;
  float T = texture2D(u_tCurl, vT).x;
  float B = texture2D(u_tCurl, vB).x;
  float C = texture2D(u_tCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= u_curl * C;
  force.y *= -1.0;

  vec2 vel = texture2D(u_tVelocity, vUv).xy;
  vel += force * u_dt;
  vel = clamp(vel, -1000.0, 1000.0);

  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`;

const FLUID_DIVERGENCE_FRAG = `
uniform sampler2D u_tVelocity;

varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;

void main() {
  float L = texture2D(u_tVelocity, vL).x;
  float R = texture2D(u_tVelocity, vR).x;
  float T = texture2D(u_tVelocity, vT).y;
  float B = texture2D(u_tVelocity, vB).y;

  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`;

const FLUID_PRESSURE_FRAG = `
uniform sampler2D u_tPressure;
uniform sampler2D u_tDivergence;

varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;

void main() {
  float L = texture2D(u_tPressure, vL).x;
  float R = texture2D(u_tPressure, vR).x;
  float T = texture2D(u_tPressure, vT).x;
  float B = texture2D(u_tPressure, vB).x;
  float divergence = texture2D(u_tDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`;

const FLUID_GRADIENT_SUBTRACT_FRAG = `
uniform sampler2D u_tPressure;
uniform sampler2D u_tVelocity;

varying highp vec2 vUv;
varying highp vec2 vL;
varying highp vec2 vR;
varying highp vec2 vT;
varying highp vec2 vB;

void main() {
  float L = texture2D(u_tPressure, vL).x;
  float R = texture2D(u_tPressure, vR).x;
  float T = texture2D(u_tPressure, vT).x;
  float B = texture2D(u_tPressure, vB).x;
  vec2 velocity = texture2D(u_tVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

const FLUID_ADVECTION_FRAG = `
varying vec2 vUv;
uniform sampler2D u_tVelocity;
uniform sampler2D u_tSource;
uniform vec2 u_texelSize;
uniform float u_dt;
uniform float u_dissipation;

vec4 bilerp(sampler2D sam, vec2 uv, vec2 tsize) {
  vec2 st = uv / tsize - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
  vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
  vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
  vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
  return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
}

void main() {
  vec4 result;
  #ifdef MANUAL_FILTERING
    vec2 coord = vUv - u_dt * bilerp(u_tVelocity, vUv, u_texelSize).xy * u_texelSize;
    result = bilerp(u_tSource, coord, u_texelSize);
  #else
    vec2 coord = vUv - u_dt * texture2D(u_tVelocity, vUv).xy * u_texelSize;
    result = texture2D(u_tSource, coord);
  #endif
  gl_FragColor.rgb = result.rgb * pow(u_dissipation, u_dt * 60.0);
  gl_FragColor.a = 1.0;
}
`;

const FLUID_CLEAR_FRAG = `
varying vec2 vUv;
uniform sampler2D u_tTexture;
uniform float u_value;
uniform float u_dt;

void main() {
  gl_FragColor.rgb = pow(u_value, u_dt * 60.0) * texture2D(u_tTexture, vUv).rgb;
  gl_FragColor.a = 1.0;
}
`;

type PingPongRT = {
  read: WebGLRenderTarget;
  write: WebGLRenderTarget;
  swap: () => void;
  dispose: () => void;
};

function makePingPong(
  width: number,
  height: number,
  options: ConstructorParameters<typeof WebGLRenderTarget>[2]
): PingPongRT {
  let a = new WebGLRenderTarget(width, height, options);
  let b = new WebGLRenderTarget(width, height, options);
  return {
    get read() {
      return a;
    },
    get write() {
      return b;
    },
    swap() {
      const t = a;
      a = b;
      b = t;
    },
    dispose() {
      a.dispose();
      b.dispose();
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                        picking (port of reference picking)                 */
/* -------------------------------------------------------------------------- */

type HitWorkspace = {
  spin: Quaternion;
  aRotQ: Quaternion;
  rotQ: Quaternion;
  pos: Vector3;
  scale: Vector3;
  mat: Matrix4;
  inv: Matrix4;
  ray: Ray;
  hit: Vector3;
};

function createHitWorkspace(): HitWorkspace {
  return {
    spin: new Quaternion(),
    aRotQ: new Quaternion(),
    rotQ: new Quaternion(),
    pos: new Vector3(),
    scale: new Vector3(1, 1, 1),
    mat: new Matrix4(),
    inv: new Matrix4(),
    ray: new Ray(),
    hit: new Vector3(),
  };
}

/**
 * 最近被射线命中的柱下标（或 -1）。柱只存在于 GPU 上，改为在 CPU 重建每实例世界矩阵，
 * 把射线压进实例局部空间测共享 bbox —— 每柱一次 box 测试。
 * idle spin 与 shader 同式重建；strike 摆锤刻意不建模（几百 ms 即衰减，按静止位拾取）。
 */
function hitBarIndex(
  worldRay: Ray,
  aPos: Float32Array,
  aRot: Float32Array,
  count: number,
  localBox: Box3,
  groupMatrixWorld: Matrix4,
  time: number,
  spinSpeed: number,
  work: HitWorkspace
): number {
  const half = time * spinSpeed * 0.5;
  work.spin.set(0, Math.sin(half), 0, Math.cos(half));

  let hitIndex = -1;
  let hitDist = Infinity;

  for (let i = 0; i < count; i++) {
    work.aRotQ.set(aRot[i * 4], aRot[i * 4 + 1], aRot[i * 4 + 2], aRot[i * 4 + 3]);
    work.rotQ.multiplyQuaternions(work.spin, work.aRotQ);
    work.pos.set(aPos[i * 3], aPos[i * 3 + 1], aPos[i * 3 + 2]);

    work.mat.compose(work.pos, work.rotQ, work.scale);
    work.mat.premultiply(groupMatrixWorld);
    work.inv.copy(work.mat).invert();

    work.ray.copy(worldRay).applyMatrix4(work.inv);
    const pt = work.ray.intersectBox(localBox, work.hit);
    if (pt) {
      const dist = work.ray.origin.distanceTo(pt);
      if (dist < hitDist) {
        hitDist = dist;
        hitIndex = i;
      }
    }
  }

  return hitIndex;
}

/* -------------------------------------------------------------------------- */
/*                                    main                                     */
/* -------------------------------------------------------------------------- */

/**
 * 用 three.js 装配「无尽滚动磨砂玻璃螺旋」背景带（完全复刻参考观感 + hover 交互）。
 * 世界单位 = 带区 CSS 像素；柱按视口高定标（≈20.7 根/视口），半径=2.5×柱高 → 密度对齐参考。
 * 每帧：流体尾迹(可选) → 渐变底 → 高斯模糊(H→V×2) → 柱渲染（透射采样模糊底）。
 * 返回 dispose()。降级路径不抛错（console.warn 后返回 noop）。
 */
export default function createGlassHelix(
  canvas: HTMLCanvasElement,
  fromEl: HTMLElement,
  toEl: HTMLElement
): () => void {
  const parent = canvas.parentElement;
  if (!parent) return () => {};
  // 显式非空别名：让嵌套闭包直接使用非空类型，避免 null 收窄不穿透
  const page: HTMLElement = parent;

  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let running = false;
  let rafId = 0;
  let disposed = false;
  const startTime = performance.now();
  let lastNow = performance.now();

  let phase = 0;
  let writtenPhase = -Infinity;

  // ── renderer / camera / scenes ──────────────────────────────────────────────
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);

  const camera = new PerspectiveCamera(PARAMS.fov, 1, 1, 1e5);
  camera.position.set(0, 0, 0);

  const fullscreenCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const passScene = new Scene();
  const quadGeometry = new PlaneGeometry(2, 2);
  const quad = new Mesh(quadGeometry, null as unknown as ShaderMaterial);
  quad.frustumCulled = false;
  passScene.add(quad);

  // ── 背景渐变 + 模糊 render targets（BACKDROP_SCALE× 低清）────────────────────
  const rtOptions = {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  };
  const bgTarget = new WebGLRenderTarget(2, 2, rtOptions);
  const blurXTarget = new WebGLRenderTarget(2, 2, rtOptions);
  const blurYTarget = new WebGLRenderTarget(2, 2, rtOptions);

  const bgMaterial = new ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BG_FRAG,
    uniforms: {
      u_aspect: { value: new Vector2(1, 1) },
    },
    depthTest: false,
    depthWrite: false,
  });

  const blurUniforms: {
    u_tex: { value: Texture | null };
    u_texel: { value: Vector2 };
    u_dir: { value: Vector2 };
  } = {
    u_tex: { value: null },
    u_texel: { value: new Vector2(1, 1) },
    u_dir: { value: new Vector2(1, 0) },
  };
  const blurMaterial = new ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: blurUniforms,
    depthTest: false,
    depthWrite: false,
  });

  // ── 螺旋柱（实例化胶囊长条切线玻璃片）──────────────────────────────────────────
  const maxCount = PARAMS.maxCount;
  const positions = new Float32Array(maxCount * 3);
  const rotations = new Float32Array(maxCount * 4);
  const tintOffsets = new Float32Array(maxCount);
  const strikeTimes = new Float32Array(maxCount).fill(-1e9);
  for (let i = 0; i < maxCount; i++) tintOffsets[i] = i / maxCount;

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('aPos', new InstancedBufferAttribute(positions, 3));
  geometry.setAttribute('aRot', new InstancedBufferAttribute(rotations, 4));
  geometry.setAttribute('aTintOffset', new InstancedBufferAttribute(tintOffsets, 1));
  const strikeAttr = new InstancedBufferAttribute(strikeTimes, 1);
  geometry.setAttribute('aStrikeTime', strikeAttr);

  let barGeo = makeBarGeometry(50, 96, 600); // 初始占位，resize 按需重建
  barGeo.computeBoundingBox();
  const localBox = barGeo.boundingBox!.clone();

  const barUniforms: {
    u_time: { value: number };
    u_spinSpeed: { value: number };
    u_swingScale: { value: number };
    u_swingAxis: { value: Vector3 };
    u_tFluid: { value: Texture | null };
    u_tGradient: { value: Texture | null };
    u_fluidStrength: { value: number };
    u_tintStrength: { value: number };
    u_tintGlow: { value: number };
    u_tintWrap: { value: number };
    u_tBackdrop: { value: Texture | null };
    u_transmission: { value: number };
    u_refractStrength: { value: number };
    u_fresnelPower: { value: number };
    u_iridStrength: { value: number };
    u_iridCycles: { value: number };
    u_iridShift: { value: number };
    u_iridPower: { value: number };
    u_iridBody: { value: number };
  } = {
    u_time: { value: 0 },
    u_spinSpeed: { value: PARAMS.spinSpeed },
    u_swingScale: { value: 1 },
    u_swingAxis: { value: new Vector3(0, 1, 0) },
    u_tFluid: { value: null as Texture | null },
    u_tGradient: { value: null as Texture | null },
    u_fluidStrength: { value: PARAMS.fluidStrength },
    u_tintStrength: { value: PARAMS.tintStrength },
    u_tintGlow: { value: PARAMS.tintGlow },
    u_tintWrap: { value: PARAMS.tintWrap },
    u_tBackdrop: { value: null as Texture | null },
    u_transmission: { value: PARAMS.transmission },
    u_refractStrength: { value: PARAMS.refractStrength },
    u_fresnelPower: { value: PARAMS.fresnelPower },
    u_iridStrength: { value: PARAMS.iridStrength },
    u_iridCycles: { value: PARAMS.iridCycles },
    u_iridShift: { value: PARAMS.iridShift },
    u_iridPower: { value: PARAMS.iridPower },
    u_iridBody: { value: PARAMS.iridBody },
  };

  const barMaterial = new ShaderMaterial({
    vertexShader: BARS_VERT,
    fragmentShader: BARS_FRAG,
    uniforms: barUniforms,
    depthTest: true,
    depthWrite: true,
    side: DoubleSide,
  });

  const helix = new Group();
  helix.rotation.set(MathUtils.degToRad(PARAMS.rotXDeg), 0, MathUtils.degToRad(PARAMS.rotZDeg));
  const bars = new Mesh(geometry, barMaterial);
  bars.frustumCulled = false;
  helix.add(bars);

  const scene = new Scene();
  scene.add(helix);

  // ── 品牌梯度纹理 ────────────────────────────────────────────────────────────
  const gradientTexture = buildGradientTexture();
  barUniforms.u_tGradient.value = gradientTexture;

  // ── 滚动 / 布局量测 ──────────────────────────────────────────────────────────
  const scrollRoot = findScrollRoot(canvas);
  let bandW = 1;
  let bandH = 1;
  let bandTopInContent = 0;
  let viewportH = 1;
  let barH = 96;
  let barW = 48;
  let barD = 600;
  let radius = 240;
  let count: number = PARAMS.count;
  let lastSizedBarH = 0;
  let helixCfg: HelixCfg = {
    count,
    radius,
    thetaStep: PARAMS.thetaStep,
    thetaOffset: PARAMS.thetaOffset,
    tiltFalloff: PARAMS.tiltFalloff,
  };
  const e = new Euler(0, 0, 0, 'YXZ');
  const q = new Quaternion();

  /** 按带/视口重算柱尺寸 + 柱数（参考比例：barH=视口/20.7，barD=6.25×barH，radius=2.5×barH）。 */
  function computeSizing() {
    viewportH = scrollRoot.clientHeight || window.innerHeight || 1;
    barH = Math.min(viewportH / PARAMS.barsPerViewport, bandW * PARAMS.horizonFit);
    barW = barH * 0.5;
    barD = barH * 6.25;
    radius = barH * 2.5;
    count = Math.max(
      PARAMS.count,
      Math.min(PARAMS.maxCount, Math.ceil(bandH / barH) + PARAMS.wrapMargin)
    );
    helixCfg = {
      count,
      radius,
      thetaStep: PARAMS.thetaStep,
      thetaOffset: PARAMS.thetaOffset,
      tiltFalloff: PARAMS.tiltFalloff,
    };
  }

  /** 柱尺寸变化时重建基底几何（bbox 比例 0.5:1:6.25 不变，统一放大到 barH）。 */
  function applyBarGeometry() {
    barGeo = makeBarGeometry(barW, barH, barD);
    barGeo.computeBoundingBox();
    localBox.copy(barGeo.boundingBox!);
    geometry.setIndex(barGeo.getIndex());
    geometry.setAttribute('position', barGeo.getAttribute('position')!);
    geometry.setAttribute('normal', barGeo.getAttribute('normal')!);
  }

  function resizeBuffers() {
    const w = Math.max(1, Math.round(bandW));
    const h = Math.max(1, Math.round(bandH));

    renderer.setSize(w, h, false); // 不更新 canvas CSS 尺寸（top/height 由 measure 写 inline）

    // 透视相机：视锥高 = 带区高，位于 z=D 望原点
    camera.aspect = w / h;
    const dist = h / 2 / Math.tan(MathUtils.degToRad(PARAMS.fov) / 2);
    camera.position.set(0, 0, dist);
    camera.near = 1;
    camera.far = dist * 2;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    computeSizing();
    if (Math.abs(barH - lastSizedBarH) > 0.5 || count !== geometry.instanceCount) {
      applyBarGeometry();
      lastSizedBarH = barH;
      geometry.instanceCount = count;
      for (let i = 0; i < maxCount; i++) tintOffsets[i] = i / maxCount;
      strikeTimes.fill(-1e9);
      (geometry.attributes.aTintOffset as InstancedBufferAttribute).needsUpdate = true;
      strikeAttr.needsUpdate = true;
      lastHitIndex = -1;
    }

    // 每根柱按槽位定品牌色偏移（i/count → 梯度沿螺旋循环）
    for (let i = 0; i < count; i++) tintOffsets[i] = i / count;

    writeHelixTransforms(phase, barH, helixCfg, positions, rotations, e, q);
    writtenPhase = phase;
    (geometry.attributes.aPos as InstancedBufferAttribute).needsUpdate = true;
    (geometry.attributes.aRot as InstancedBufferAttribute).needsUpdate = true;

    const rw = Math.max(2, Math.round(w * BACKDROP_SCALE));
    const rh = Math.max(2, Math.round(h * BACKDROP_SCALE));
    bgTarget.setSize(rw, rh);
    blurXTarget.setSize(rw, rh);
    blurYTarget.setSize(rw, rh);
    blurUniforms.u_texel.value.set(1 / rw, 1 / rh);
    bgMaterial.uniforms.u_aspect.value.set(w / h, 1);
  }

  function measure() {
    const pageTop = page.getBoundingClientRect().top;
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const fromTop = fromRect.top;
    const toBottom = toRect.bottom;

    canvas.style.top = `${fromTop - pageTop}px`;
    canvas.style.height = `${toBottom - fromTop}px`;

    bandW = canvas.offsetWidth;
    bandH = toBottom - fromTop;

    // 带顶在滚动内容坐标系中的静态位置：每帧只读 scrollTop，不触发布局
    const rootRect = scrollRoot.getBoundingClientRect();
    bandTopInContent = fromTop - rootRect.top + scrollRoot.scrollTop;
    viewportH = scrollRoot.clientHeight;

    resizeBuffers();
  }

  /* ------------------------------- fluid ----------------------------------- */

  // 全部 HalfFloat：velocity 线性采样（尾迹平滑），其余 Nearest（Jacobi/差分）
  const velocityRT = makePingPong(FLUID.simRes, FLUID.simRes, {
    format: RGBAFormat,
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  const pressureRT = makePingPong(FLUID.simRes, FLUID.simRes, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  const divergenceRT = new WebGLRenderTarget(FLUID.simRes, FLUID.simRes, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  const curlRT = new WebGLRenderTarget(FLUID.simRes, FLUID.simRes, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  barUniforms.u_tFluid.value = velocityRT.read.texture;

  const fluidUniforms = (texel: Vector2) => ({ u_texelSize: { value: texel } });

  const mk = (
    frag: string,
    uniforms: Record<string, { value: unknown }>,
    defines?: Record<string, boolean>
  ) =>
    new ShaderMaterial({
      vertexShader: FLUID_VERT,
      fragmentShader: frag,
      uniforms,
      ...(defines ? { defines } : {}), // 显式 undefined 会触发 three 警告
      depthTest: false,
      depthWrite: false,
    });

  const fluidTexel = new Vector2(1 / FLUID.simRes, 1 / FLUID.simRes);
  const splat = mk(FLUID_SPLAT_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tTarget: { value: null },
    u_aspectRatio: { value: 1 },
    u_splatColor: { value: new Vector3() },
    u_splatPosition: { value: new Vector2() },
    u_prevPoint: { value: new Vector2() },
    u_splatRadius: { value: 1 },
  });
  const curl = mk(FLUID_CURL_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tVelocity: { value: null },
  });
  const vorticity = mk(FLUID_VORTICITY_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tVelocity: { value: null },
    u_tCurl: { value: null },
    u_curl: { value: FLUID.curlStrength },
    u_dt: { value: 1 / 60 },
  });
  const divergence = mk(FLUID_DIVERGENCE_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tVelocity: { value: null },
  });
  const clearP = mk(FLUID_CLEAR_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tTexture: { value: null },
    u_value: { value: FLUID.pressureDissipation },
    u_dt: { value: 1 / 60 },
  });
  const pressure = mk(FLUID_PRESSURE_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tPressure: { value: null },
    u_tDivergence: { value: null },
  });
  const gradSub = mk(FLUID_GRADIENT_SUBTRACT_FRAG, {
    ...fluidUniforms(fluidTexel),
    u_tPressure: { value: null },
    u_tVelocity: { value: null },
  });
  const advection = mk(
    FLUID_ADVECTION_FRAG,
    {
      ...fluidUniforms(fluidTexel),
      u_tVelocity: { value: null },
      u_tSource: { value: null },
      u_dt: { value: 1 / 60 },
      u_dissipation: { value: FLUID.velocityDissipation },
    },
    { MANUAL_FILTERING: true }
  );

  const fluidEnabled = true;
  let lastPointerTime = -Infinity;
  let fluidAspect = 1;

  const pointer = {
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    lastUpdate: -1,
    lastSplat: -1,
    vel: 0,
    has: false,
  };
  let pointerClientX = 0;
  let pointerClientY = 0;
  let pointerClientHas = false;
  let pointerOverBand = false;
  let pointerNdcX = 0;
  let pointerNdcY = 0;

  function updatePointerOverBand() {
    if (!pointerClientHas) {
      pointerOverBand = false;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const pad = 30; // 边缘微出血，略宽松
    pointerOverBand =
      pointerClientX >= rect.left - pad &&
      pointerClientX <= rect.right + pad &&
      pointerClientY >= rect.top - pad &&
      pointerClientY <= rect.bottom + pad;
    if (pointerOverBand) {
      const ux = (pointerClientX - rect.left) / rect.width;
      const uy = 1 - (pointerClientY - rect.top) / rect.height;
      pointerNdcX = ux * 2 - 1;
      pointerNdcY = uy * 2 - 1;
      pointer.x = ux;
      pointer.y = uy;
      pointer.has = true; // 首次进入带区后，指针坐标对流体/strike 有效
    }
  }

  function renderFull(mat: ShaderMaterial, target: WebGLRenderTarget | null) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(passScene, fullscreenCam);
  }

  function updateFluidPoint(time: number) {
    if (!pointerOverBand || !pointer.has) return;
    if (time - pointer.lastUpdate < 0.016) return;

    const dx = pointer.x - pointer.px;
    const dy = pointer.y - pointer.py;
    const dist = Math.hypot(dx, dy);
    pointer.vel += dist * 2;

    if (dist > 0) {
      if (dist > 0.001) lastPointerTime = time;
      const newLine = time - pointer.lastSplat > 0.15;

      splat.uniforms.u_tTarget.value = velocityRT.read.texture;
      splat.uniforms.u_aspectRatio.value = fluidAspect;
      splat.uniforms.u_splatPosition.value.set(pointer.x, pointer.y);
      splat.uniforms.u_prevPoint.value.set(
        newLine ? pointer.x : pointer.px,
        newLine ? pointer.y : pointer.py
      );
      splat.uniforms.u_splatColor.value
        .set(dx * fluidAspect, dy, 0)
        .multiplyScalar(FLUID.splatForce)
        .multiplyScalar(newLine ? 0 : 1);
      splat.uniforms.u_splatRadius.value = FLUID.splatRadius * pointer.vel;

      renderFull(splat, velocityRT.write);
      velocityRT.swap();

      pointer.lastSplat = time;
    }

    pointer.lastUpdate = time;
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.vel *= 0.9;
    pointer.vel = Math.min(1, pointer.vel);
  }

  function fluidSolve(delta: number, time: number) {
    fluidAspect = bandW / bandH;
    updateFluidPoint(time);

    // 静止超过 IDLE_SLEEP_AFTER 后整体跳过求解（省 GPU/电量）
    if (time - lastPointerTime > IDLE_SLEEP_AFTER) return;

    const texel = 1 / FLUID.simRes;
    const setTexel = (m: ShaderMaterial) =>
      (m.uniforms.u_texelSize as { value: Vector2 }).value.setScalar(texel);

    // curl → vorticity confinement
    setTexel(curl);
    curl.uniforms.u_tVelocity.value = velocityRT.read.texture;
    renderFull(curl, curlRT);

    setTexel(vorticity);
    vorticity.uniforms.u_tVelocity.value = velocityRT.read.texture;
    vorticity.uniforms.u_tCurl.value = curlRT.texture;
    vorticity.uniforms.u_dt.value = delta;
    renderFull(vorticity, velocityRT.write);
    velocityRT.swap();

    // divergence → pressure (Jacobi ×1) → gradient subtract
    setTexel(divergence);
    divergence.uniforms.u_tVelocity.value = velocityRT.read.texture;
    renderFull(divergence, divergenceRT);

    setTexel(clearP);
    clearP.uniforms.u_tTexture.value = pressureRT.read.texture;
    clearP.uniforms.u_value.value = FLUID.pressureDissipation;
    clearP.uniforms.u_dt.value = delta;
    renderFull(clearP, pressureRT.write);
    pressureRT.swap();

    for (let i = 0; i < FLUID.pressureIterations; i++) {
      setTexel(pressure);
      pressure.uniforms.u_tPressure.value = pressureRT.read.texture;
      pressure.uniforms.u_tDivergence.value = divergenceRT.texture;
      renderFull(pressure, pressureRT.write);
      pressureRT.swap();
    }

    setTexel(gradSub);
    gradSub.uniforms.u_tPressure.value = pressureRT.read.texture;
    gradSub.uniforms.u_tVelocity.value = velocityRT.read.texture;
    renderFull(gradSub, velocityRT.write);
    velocityRT.swap();

    // advection + 耗散
    setTexel(advection);
    advection.uniforms.u_tVelocity.value = velocityRT.read.texture;
    advection.uniforms.u_tSource.value = velocityRT.read.texture;
    advection.uniforms.u_dt.value = delta;
    advection.uniforms.u_dissipation.value = FLUID.velocityDissipation;
    renderFull(advection, velocityRT.write);
    velocityRT.swap();

    barUniforms.u_tFluid.value = velocityRT.read.texture;
  }

  /* ------------------------------- strike ---------------------------------- */

  const raycast = new Raycaster();
  const hitWork = createHitWorkspace();
  let lastHitIndex = -1;

  function updateStrike(time: number) {
    if (!pointerOverBand || !pointerClientHas) return;

    raycast.setFromCamera(new Vector2(pointerNdcX, pointerNdcY), camera);
    const index = hitBarIndex(
      raycast.ray,
      positions,
      rotations,
      count,
      localBox,
      helix.matrixWorld,
      time,
      PARAMS.spinSpeed,
      hitWork
    );

    if (index !== -1 && index !== lastHitIndex) {
      strikeTimes[index] = time;
      strikeAttr.needsUpdate = true;
    }
    lastHitIndex = index;
  }

  /* ------------------------------ frame loop ------------------------------- */

  function updateScroll(delta: number) {
    const progress = MathUtils.clamp(
      (scrollRoot.scrollTop + viewportH - bandTopInContent) / (bandH + viewportH),
      0,
      1
    );
    const targetPhase = progress * SCROLL_TRAVEL_TURNS * count;
    phase = MathUtils.damp(phase, targetPhase, SCROLL_LERP, delta);
    if (Math.abs(phase - writtenPhase) > 1e-3) {
      writeHelixTransforms(phase, barH, helixCfg, positions, rotations, e, q);
      (geometry.attributes.aPos as InstancedBufferAttribute).needsUpdate = true;
      (geometry.attributes.aRot as InstancedBufferAttribute).needsUpdate = true;
      writtenPhase = phase;
    }
  }

  function step(delta: number, elapsed: number) {
    updatePointerOverBand();
    updateScroll(delta);
    updateStrike(elapsed);
    if (fluidEnabled) fluidSolve(delta, elapsed);

    barUniforms.u_time.value = elapsed;

    // 渐变底 → 高斯模糊(H→V × BLUR_ITERATIONS) → 柱透射采样
    renderFull(bgMaterial, bgTarget);
    let src = bgTarget;
    for (let i = 0; i < BLUR_ITERATIONS; i++) {
      blurUniforms.u_tex.value = src.texture;
      blurUniforms.u_dir.value.set(1, 0);
      renderFull(blurMaterial, blurXTarget);

      blurUniforms.u_tex.value = blurXTarget.texture;
      blurUniforms.u_dir.value.set(0, 1);
      renderFull(blurMaterial, blurYTarget);
      src = blurYTarget;
    }
    barUniforms.u_tBackdrop.value = blurYTarget.texture;

    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  function startRaf() {
    if (running || reducedMotion || disposed) return;
    running = true;
    const frame = (now: number) => {
      if (!running || disposed) return;
      const delta = Math.min((now - lastNow) / 1000, 1 / 20);
      lastNow = now;
      step(delta, (now - startTime) / 1000);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
  }

  function stopRaf() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function remeasure() {
    measure();
    if (running || reducedMotion) step(0, 0);
  }

  // ── 输入（窗口级 pointer，canvas 是 pointer-events:none 背景）───────────────
  const onPointerMove = (event: PointerEvent) => {
    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    pointerClientHas = true;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // ── 生命周期 ────────────────────────────────────────────────────────────────
  measure();
  helix.updateMatrixWorld(true);
  if (reducedMotion) {
    step(0, 0); // 静态单帧
  } else {
    lastNow = performance.now();
    startRaf();
  }

  let isVisible = true;
  const io = new IntersectionObserver(
    (entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting);
      if (isVisible) startRaf();
      else stopRaf();
    },
    { threshold: 0 }
  );
  io.observe(canvas);

  const ro = new ResizeObserver(remeasure);
  ro.observe(page);
  ro.observe(fromEl);
  ro.observe(toEl);

  window.addEventListener('resize', remeasure);

  if (document.fonts?.ready) {
    document.fonts.ready.then(remeasure).catch(() => {});
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    stopRaf();
  };
  const onRestored = () => {
    if (reducedMotion) step(0, 0);
    else if (isVisible) startRaf();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return () => {
    disposed = true;
    stopRaf();
    io.disconnect();
    ro.disconnect();
    window.removeEventListener('resize', remeasure);
    window.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    geometry.dispose();
    barGeo.dispose();
    barMaterial.dispose();
    bgMaterial.dispose();
    blurMaterial.dispose();
    quadGeometry.dispose();
    bgTarget.dispose();
    blurXTarget.dispose();
    blurYTarget.dispose();
    gradientTexture.dispose();
    velocityRT.dispose();
    pressureRT.dispose();
    divergenceRT.dispose();
    curlRT.dispose();
    for (const m of [splat, curl, vorticity, divergence, clearP, pressure, gradSub, advection]) {
      m.dispose();
    }
    renderer.dispose();
    // 不调用 loseContext()：避免破坏 dev HMR 的上下文缓存
  };
}
