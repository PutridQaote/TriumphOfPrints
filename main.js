// TODO: When doing a test inscribe remove the .js and .jpg from these paths
import { decode } from '/content/077fbf9e2d8c405e5f276220ed83c029eb86ecc1bd22a60a63a43eb925f28636i0.js';
// const texture = window.TEXTURE_PATH_OVERRIDE || '/content/23a6b16fc26b570b1669a9a1efdbab935fe524f2bbcc32504acfc65a1b0fb31bi0.jpg'; // christian religion
const texture = window.TEXTURE_PATH_OVERRIDE || 'content/ff08f64a29c957c1f376ca1d35c2ccb5851379da3df9618b8108f55ed65dfb39i0.jpg' // bitcoin
// const texture = window.TEXTURE_PATH_OVERRIDE || 'content/6461c2a49eba6c8220bf472d9a504554a0592470f0cdddddb0969e896a1a6ca9i0.jpg' // science
// const texture = 'content/6461c2a49eba6c8220bf472d9a504554a0592470f0cdddddb0969e896a1a6ca9i0.jpg' // science

const metadata = {
  // radius: 0.02,
  radius: 2.2,
  cOffset: [-0.00333, -0.00333],
  // mOffset: [0.0011, 0.0111],
  mOffset: [0.0003, -0.0003],
  yOffset: [-0.0001, -0.0001],
  kOffset: [20000, 20000],
  noiseAmp: 0.00000,
  colorMode: 6,
  title: ''
};

const vertexShader = /* glsl */`
    attribute vec2 a_position;
    attribute vec2 a_texcoord;
    varying vec2 v_texcoord;
    
    void main(){
        gl_Position = vec4(a_position,0,1);
        v_texcoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
    }
`;

const fragmentShader = /* glsl */`
    precision mediump float;
    uniform sampler2D u_image;
    uniform vec2      u_resolution;
    uniform float     u_radius;
    uniform vec2      u_cOffset, u_mOffset, u_yOffset, u_kOffset;
    uniform float     u_noiseAmp;
    uniform float     u_colorMode;
    varying vec2      v_texcoord;

    float rand(vec2 co){
      return fract(sin(dot(co,vec2(12.9898,78.233))) * 43758.5453);
    }

    vec3 toLinear(in vec3 srgb) {
      return pow(srgb, vec3(2.2));
    }
    vec3 toSRGB(in vec3 linear) {
      return pow(linear, vec3(1.0/2.2));
    }

    float dotPattern(vec2 uv, float angle){
      float r = radians(angle);
      vec2 c = uv - .5;
      vec2 rot = vec2(
        c.x*cos(r) - c.y*sin(r),
        c.x*sin(r) + c.y*cos(r)
      );
      vec2 g = rot * u_resolution / u_radius;
      vec2 f = fract(g);
      return length(f - .5);
    }

  void main() {
    vec2 uv = v_texcoord;

    float nC = (rand(uv * 200.0) - 0.5) * u_noiseAmp;
    float nM = (rand(uv * 300.0) - 0.5) * u_noiseAmp;
    float nY = (rand(uv * 400.0) - 0.5) * u_noiseAmp;
    float nK = (rand(uv * 500.0) - 0.5) * u_noiseAmp;

    vec3 sC_srgb = texture2D(u_image, uv + u_cOffset + nC).rgb;
    vec3 sM_srgb = texture2D(u_image, uv + u_mOffset + nM).rgb;
    vec3 sY_srgb = texture2D(u_image, uv + u_yOffset + nY).rgb;
    vec3 sK_srgb = texture2D(u_image, uv + u_kOffset + nK).rgb;
    vec3 sC = toLinear(sC_srgb);
    vec3 sM = toLinear(sM_srgb);
    vec3 sY = toLinear(sY_srgb);
    vec3 sK = toLinear(sK_srgb);

    vec3 cmy0 = vec3(1.0 - sC.r, 1.0 - sM.g, 1.0 - sY.b);
    float k0  = min(min(cmy0.r,cmy0.g),cmy0.b);
    vec3 cmy  = (cmy0 - k0) / (1.0 - k0 + 1e-5);

    float Cval = cmy.r;
    float Mval = cmy.g;
    float Yval = cmy.b;
    float Kval = k0;

    float dC = dotPattern(uv + u_cOffset + nC, 15.0);
    float dM = dotPattern(uv + u_mOffset + nM, 75.0);
    float dY = dotPattern(uv + u_yOffset + nY,  0.0);
    float dK = dotPattern(uv + u_kOffset + nK, 45.0);

    float thresh = 0.5;

    float C = 1.0 - smoothstep(Cval - thresh, Cval + thresh, dC);
    float M = 1.0 - smoothstep(Mval - thresh, Mval + thresh, dM);
    float Y = 1.0 - smoothstep(Yval - thresh, Yval + thresh, dY);
    float K = 1.0 - smoothstep(Kval - thresh, Kval + thresh, dK);

    vec3 dotMask;
    int mode = int(u_colorMode);
    if (mode == 0) dotMask = vec3(C, M, Y) * (1.0 - K);
    else if (mode == 1) dotMask = vec3(C, K, K) * (1.0 - K);
    else if (mode == 2) dotMask = vec3(K, C, C) * (1.0 - K);
    else if (mode == 3) dotMask = vec3(C, M, Y) * (1.0 - Y);
    else if (mode == 4) dotMask = vec3(C, M, C) * (1.0 - K);
    else if (mode == 5) dotMask = vec3(C, C, C) * (1.0 - K);
    else if (mode == 6) dotMask = vec3(C, C, C) * (1.0 - M);
    else dotMask = vec3(C, M, Y) * (1.0 - K);

    vec3 cmykLin = dotMask + vec3(K);
    vec3 rgbLin  = 1.0 - cmykLin;
    vec3 rgb_srgb = toSRGB(rgbLin);
    gl_FragColor = vec4(rgb_srgb, 1.0);
}`

async function main(metadata) {
  // 1. Create & style canvas
  const canvas = setupDOM({ width: 1024, height: 1024, margin: 10 });
  const gl = canvas.getContext('webgl');
  if (!gl) throw new Error('WebGL not supported');

  // 2. Compile vertex shader
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vertexShader);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    throw new Error('Vertex shader failed: ' + gl.getShaderInfoLog(vs));
  }

  // 3. Compile fragment shader
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fragmentShader);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    throw new Error('Fragment shader failed: ' + gl.getShaderInfoLog(fs));
  }

  // 4. Link program
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  // 5. Set up a_position buffer (two-triangle quad)
  const posLoc = gl.getAttribLocation(program, 'a_position');
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // 6. Set up a_texcoord buffer
  const texLoc = gl.getAttribLocation(program, 'a_texcoord');
  const texBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     0, 0,  1, 0,  0, 1,
     0, 1,  1, 0,  1, 1
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texLoc);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

  // 7. Look up uniform locations
  const uImage     = gl.getUniformLocation(program, 'u_image');
  const uRes       = gl.getUniformLocation(program, 'u_resolution');
  const uRad       = gl.getUniformLocation(program, 'u_radius');
  const uCOff      = gl.getUniformLocation(program, 'u_cOffset');
  const uMOff      = gl.getUniformLocation(program, 'u_mOffset');
  const uYOff      = gl.getUniformLocation(program, 'u_yOffset');
  const uKOff      = gl.getUniformLocation(program, 'u_kOffset');
  const uNoise     = gl.getUniformLocation(program, 'u_noiseAmp');
  const uColorMode = gl.getUniformLocation(program, 'u_colorMode');

  // Tell the shader to sample from texture unit 0
  gl.uniform1i(uImage, 0);

  // 8. Fetch & upload your image as a texture
  const resp = await fetch(texture, { mode: 'cors' });
  if (!resp.ok) throw new Error('Image load error');
  const blob = await resp.blob();
  const imgBitmap = await createImageBitmap(blob);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(
    gl.TEXTURE_2D, 0,
    gl.RGBA, gl.RGBA,
    gl.UNSIGNED_BYTE,
    imgBitmap
  );

  // 9. Pass in metadata uniforms & draw
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uRad, metadata.radius);
  gl.uniform2f(uCOff, ...metadata.cOffset);
  gl.uniform2f(uMOff, ...metadata.mOffset);
  gl.uniform2f(uYOff, ...metadata.yOffset);
  gl.uniform2f(uKOff, ...metadata.kOffset);
  gl.uniform1f(uNoise, metadata.noiseAmp);
  gl.uniform1f(uColorMode, metadata.colorMode);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}


async function getMetadata() {
  // Check if we're in test mode with overridden metadata
  if (window.getMetadataOverride) {
    console.log('Using test metadata:', window.getMetadataOverride);
    return window.getMetadataOverride;
  }

  let currentId = window.location.href.split("/").pop();

  // For local development outside of test mode, use the local metadata directly
  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    console.log('Using local development metadata');
    return metadata;
  }

  function hexToUint8Array(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  try {
    const cborMetadata = await fetch(`/r/metadata/${currentId}`).then((res) => res.json());
    const uint8Metadata = hexToUint8Array(cborMetadata);
    const decoded = decode(uint8Metadata);
    return {
      radius: decoded.radius        || metadata.radius,
      cOffset: decoded.cOffset      || metadata.cOffset,
      mOffset: decoded.mOffset      || metadata.mOffset,
      yOffset: decoded.yOffset      || metadata.yOffset,
      kOffset: decoded.kOffset      || metadata.kOffset,
      noiseAmp: decoded.noiseAmp    || metadata.noiseAmp,
      colorMode: decoded.colorMode  || metadata.colorMode,
      title: decoded.title          || metadata.title
    };
  } catch {
    console.log('using default metadata');
    return metadata;
  }
}

function setupDOM({ width = 512, height = 512, margin = 20 } = {}) {
  // Create an off-white background and paper texture filter
  const body = document.body;
  body.style.margin = '0';
  body.style.display = 'flex';
  body.style.justifyContent = 'center';
  body.style.alignItems = 'center';
  body.style.height = '100vh';
  body.style.background = '#f5f3e8';  // off-white background

  // Define SVG filter for crumpled paper displacement
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('style', 'position:absolute;width:0;height:0');
  svg.innerHTML = `<defs>
  <filter id="paperFilter"
          x="-40%" y="-40%" width="180%" height="180%"
          filterUnits="objectBoundingBox">
    <!-- very broad folds -->
    <feTurbulence
      type="turbulence"
      baseFrequency="0.008 0.008"
      numOctaves="5"
      seed="6"
      result="warpNoise" />

    <feGaussianBlur
      in="warpNoise"
      stdDeviation="100"
      result="smoothNoise" />

    <feDisplacementMap
      in="SourceGraphic"
      in2="smoothNoise"
      scale="50"
      xChannelSelector="R"
      yChannelSelector="G"
      result="displaced" />

    <feDropShadow
      in="displaced"
      dx="12" dy="5"
      stdDeviation="5"
      flood-color="black"
      flood-opacity="0.1" />
  </filter>
</defs>`;

  body.appendChild(svg);

  const container = document.createElement('div');
  container.id = 'container';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.boxSizing = 'border-box';
  container.style.padding = `${margin}px`;
  container.style.display = 'flex';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  container.style.background = 'none';
  body.appendChild(container);

  const canvas = document.createElement('canvas');
  canvas.id = 'glcanvas';
  canvas.width = width;
  canvas.height = height;
  // canvas.style.filter = 'url(#paperFilter) drop-shadow(30px 15px 25px rgba(14, 14, 14, 0.87))';
  canvas.style.filter =
  'url(#paperFilter) ' +
  'drop-shadow(12px 12px 18px rgba(0, 0, 0, 0.333)) ' +
  'drop-shadow(8px 6px 4px rgba(0, 0, 0, 0.333))';
  container.appendChild(canvas);

  function resizeCanvas() {
    const cw = container.clientWidth - margin * 2;
    const ch = container.clientHeight - margin * 2;
    if (cw < ch) {
      canvas.style.width = `90%`;
      canvas.style.height = `auto`;
    } else {
      canvas.style.width = `auto`;
      canvas.style.height = `90%`;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  new ResizeObserver(resizeCanvas).observe(container);
  resizeCanvas();
  return canvas;
}

getMetadata().then((metadata) => {
  main(metadata);
});
