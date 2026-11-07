// Shaders GLSL do núcleo holográfico.

// Simplex noise 3D — Ashima Arts / Stefan Gustavson (licença MIT).
export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

export const coreVertex = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform float uLevel;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;
varying vec3 vPos;
void main(){
  float n  = snoise(normal * uFreq + vec3(uTime * 0.35));
  float n2 = snoise(normal * uFreq * 2.3 - vec3(uTime * 0.6));
  float d = (n * 0.7 + n2 * 0.3) * (uAmp + uLevel * 0.22);
  vec3 p = position + normal * d;
  vNoise = d;
  vPos = p;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

export const coreFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uTime;
uniform float uIntensity;
uniform float uAccentMix;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;
varying vec3 vPos;
void main(){
  float fres = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.4);
  float bands = smoothstep(0.93, 1.0, sin(vPos.y * 38.0 - uTime * 3.0) * 0.5 + 0.5);
  float lat = smoothstep(0.96, 1.0, sin(atan(vPos.z, vPos.x) * 24.0 + uTime * 0.4) * 0.5 + 0.5);
  float t = clamp(vNoise * 5.0 + 0.5, 0.0, 1.0);
  vec3 col = mix(uColor, uAccent, t * uAccentMix);
  col = mix(col, vec3(1.0), smoothstep(0.55, 1.0, fres) * 0.35);
  float a = fres * 0.95 + (bands + lat * 0.6) * (0.12 + fres * 0.5) + 0.025;
  gl_FragColor = vec4(col * a * uIntensity * 0.68, 1.0);
}
`;

export const ringVertex = /* glsl */ `
varying vec2 vPos;
void main(){
  vPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uRot;
uniform float uSegments;
uniform float uFill;
uniform float uArc;
uniform float uOpacity;
uniform float uInner;
uniform float uOuter;
varying vec2 vPos;
void main(){
  float ang = atan(vPos.y, vPos.x) / 6.28318530718 + 0.5;
  float a = fract(ang + uRot);
  float seg = fract(a * uSegments);
  float on = step(seg, uFill);
  float arc = step(a, uArc);
  float r = length(vPos);
  float t = clamp((r - uInner) / max(uOuter - uInner, 1e-4), 0.0, 1.0);
  float glow = 1.0 - abs(t * 2.0 - 1.0) * 0.55;
  float alpha = on * arc * glow * uOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(uColor * alpha, 1.0);
}
`;

export const particleVertex = /* glsl */ `
attribute float aSpeed;
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uSpin;
uniform float uSwirl;
uniform float uLevel;
uniform float uScale;
uniform float uPixelRatio;
varying float vAlpha;
varying float vSeed;
void main(){
  float ang = uTime * aSpeed * uSpin + aSeed * 6.2831;
  float c = cos(ang), s = sin(ang);
  vec3 p = vec3(position.x * c - position.z * s, position.y, position.x * s + position.z * c);
  float phase = fract(aSeed * 7.13 + uTime * 0.12 * (0.6 + aSpeed * 3.0));
  float inflow = mix(1.0, 1.0 - phase * 0.72, uSwirl);
  float pulse = 1.0 + uLevel * 0.16 * sin(aSeed * 40.0 + uTime * 9.0);
  p *= inflow * pulse * uScale;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z);
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 30.0);
  vAlpha = twinkle * mix(1.0, sin(phase * 3.14159), uSwirl);
  vSeed = aSeed;
}
`;

export const particleFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uAccentMix;
varying float vAlpha;
varying float vSeed;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  vec3 col = mix(uColor, vec3(0.85, 0.97, 1.0), step(0.82, vSeed));
  col = mix(col, uAccent, step(0.7, fract(vSeed * 13.0)) * uAccentMix);
  gl_FragColor = vec4(col * a * vAlpha, 1.0);
}
`;
