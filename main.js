import { decode } from '/content/077fbf9e2d8c405e5f276220ed83c029eb86ecc1bd22a60a63a43eb925f28636i0';

const metadata = {
  title: 'Triumph of Bitcoin',
  inkStatus: 0,
  radius: 2.2,
  noiseAmp: 0.0001,
  cOffset: [-0.00333, -0.00333],
  mOffset: [0.0003, -0.0003],
  yOffset: [-0.006, -0.006],
  kOffset: [20000, 20000],
  source: '/content/ff08f64a29c957c1f376ca1d35c2ccb5851379da3df9618b8108f55ed65dfb39i0.jpg' // bitcoin
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
    uniform float     u_inkStatus;
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
    int mode = int(u_inkStatus);
    if (mode == 0) dotMask = vec3(C, M, Y) * (1.0 - K);
    else if (mode == 1) dotMask = vec3(C, K, K) * (1.0 - K);
    else if (mode == 2) dotMask = vec3(K, C, C) * (1.0 - K);
    else if (mode == 3) dotMask = vec3(C, M, Y) * (1.0 - Y);
    else if (mode == 4) dotMask = vec3(C, M, C) * (1.0 - K);
    else if (mode == 5) dotMask = vec3(C, C, C) * (1.0 - Y);
    else if (mode == 6) dotMask = vec3(C, C, C) * (1.0 - M);
    else dotMask = vec3(C, M, Y) * (1.0 - K);

    vec3 cmykLin = dotMask + vec3(K);
    vec3 rgbLin  = 1.0 - cmykLin;
    vec3 rgb_srgb = toSRGB(rgbLin);
    gl_FragColor = vec4(rgb_srgb, 1.0);
}`

const THUMBNAIL_GL_STAGGER_KEY = 'top:grid-thumb-gl-last-start';
const PREVIEW_THUMBNAIL_MAX_PX = 108;

const THUMBNAIL_STAGGER_PROFILES = {
  sparse: {
    fastSlots: 6,
    totalSlots: 20,
    fastStepMs: 8,
    slowStepMs: 12,
    jitterMs: 6,
    minGapMs: 16,
    minGapJitterMs: 7,
    fallbackBaseMs: 16,
    fallbackJitterMs: 28
  },
  balanced: {
    fastSlots: 8,
    totalSlots: 52,
    fastStepMs: 12,
    slowStepMs: 20,
    jitterMs: 9,
    minGapMs: 34,
    minGapJitterMs: 12,
    fallbackBaseMs: 30,
    fallbackJitterMs: 44
  },
  dense: {
    fastSlots: 12,
    totalSlots: 110,
    fastStepMs: 16,
    slowStepMs: 30,
    jitterMs: 12,
    minGapMs: 62,
    minGapJitterMs: 18,
    fallbackBaseMs: 50,
    fallbackJitterMs: 72
  }
};

function isOnePixelThumbnailMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('thumbpx') === '1' || params.get('thumb') === '1x1';
}

function getThumbnailPixelOverride() {
  const params = new URLSearchParams(window.location.search);
  const v = Number(params.get('thumbpx'));
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}

function isOrdPreviewRoute() {
  return window.location.pathname.startsWith('/preview/');
}

function getInscriptionIndexFromPath() {
  const match = window.location.pathname.match(/i(\d+)$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getInscriptionIdFromPath() {
  const match = window.location.pathname.match(/([0-9a-f]{64}i\d+)$/i);
  return match ? match[1].toLowerCase() : null;
}

function hashStringFNV1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function getThumbnailStaggerProfile(tileWidth, isPreview) {
  if (!isPreview) return THUMBNAIL_STAGGER_PROFILES.sparse;
  const pageMatch = document.referrer.match(/\/children\/[0-9a-f]{64}i\d+\/(\d+)$/i);
  if (pageMatch && Number(pageMatch[1]) >= 1) {
    // Paged children routes are often the smaller/final pages; bias faster starts.
    return THUMBNAIL_STAGGER_PROFILES.balanced;
  }
  if (tileWidth >= 250) return THUMBNAIL_STAGGER_PROFILES.sparse;
  if (tileWidth >= 175) return THUMBNAIL_STAGGER_PROFILES.balanced;
  return THUMBNAIL_STAGGER_PROFILES.dense;
}

function getDeterministicThumbnailDelayMs(staggerProfile) {
  const { fastSlots, totalSlots, fastStepMs, slowStepMs, jitterMs } = staggerProfile;
  const inscriptionId = getInscriptionIdFromPath();
  if (inscriptionId) {
    const hash = hashStringFNV1a(inscriptionId);
    const slot = hash % totalSlots;
    const waveJitter = (hash >>> 16) % jitterMs;
    if (slot < fastSlots) {
      return (slot * fastStepMs) + waveJitter;
    }

    const fastSectionMs = fastSlots * fastStepMs;
    const slowSlot = slot - fastSlots;
    return fastSectionMs + (slowSlot * slowStepMs) + waveJitter;
  }

  const inscriptionIndex = getInscriptionIndexFromPath();
  if (inscriptionIndex !== null) {
    const slot = inscriptionIndex % totalSlots;
    if (slot < fastSlots) {
      return slot * fastStepMs;
    }
    const fastSectionMs = fastSlots * fastStepMs;
    return fastSectionMs + ((slot - fastSlots) * slowStepMs);
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadImageBitmap(src) {
  const resp = await fetch(src, { mode: 'cors', cache: 'force-cache' });
  if (!resp.ok) throw new Error('Image load error');
  const blob = await resp.blob();
  return createImageBitmap(blob);
}

async function staggerThumbnailRenderStart(staggerProfile) {
  // In ord preview iframes, storage APIs are often blocked by sandbox origin rules.
  // Use deterministic, bounded slotting from inscription ID/index to avoid bursty starts.
  const deterministicDelay = getDeterministicThumbnailDelayMs(staggerProfile);
  if (deterministicDelay !== null) {
    await sleep(deterministicDelay);
    return;
  }

  const minGapMs = staggerProfile.minGapMs;

  try {
    while (true) {
      const now = Date.now();
      const last = Number(localStorage.getItem(THUMBNAIL_GL_STAGGER_KEY) || '0');
      const delta = now - last;

      if (delta >= minGapMs) {
        localStorage.setItem(THUMBNAIL_GL_STAGGER_KEY, String(now));
        return;
      }

      await sleep(minGapMs - delta + Math.floor(Math.random() * staggerProfile.minGapJitterMs));
    }
  } catch {
    // Some embedded contexts may not allow storage access.
    await sleep(staggerProfile.fallbackBaseMs + Math.floor(Math.random() * staggerProfile.fallbackJitterMs));
  }
}

async function main(metadata) {
  const isPreview = isOrdPreviewRoute();
  const retryHash = hashStringFNV1a(getInscriptionIdFromPath() ?? window.location.pathname);
  const thumbnailRetryDelayMs = 900 + (retryHash % 1100);
  const hasThumbnailRetryAttempt = new URLSearchParams(window.location.search).get('glretry') === '1';
  let thumbnailFailureHandled = false;

  const { canvas, stopResizeTracking } = setupDOM({
    width: 900,
    height: 860,
    margin: isPreview ? 0 : 10,
    fill: isPreview
  });
  const rect = canvas.getBoundingClientRect();
  const DPR  = window.devicePixelRatio || 1;
  const isThumbnail = rect.width <= (isPreview ? 700 : 320);
  const thumbnailStaggerProfile = isThumbnail ? getThumbnailStaggerProfile(rect.width, isPreview) : null;
  const thumbPxOverride = getThumbnailPixelOverride();
  const forceOnePixel = isThumbnail && isOnePixelThumbnailMode();
  const imageBitmapPromise = isThumbnail ? loadImageBitmap(metadata.source) : null;

  // Ord preview thumbnails use a fixed, fill-the-frame layout. Avoid retaining
  // a resize listener and observer (and their canvas closure) in every iframe.
  if (isThumbnail && isPreview) stopResizeTracking();

  const swapCanvasWithImage = (src, forceImgTag = false) => {
    if (!canvas.parentNode) return;
    if (!forceImgTag) {
      canvas.style.backgroundImage = `url("${src}")`;
      canvas.style.backgroundPosition = 'center';
      canvas.style.backgroundSize = 'cover';
      canvas.style.backgroundRepeat = 'no-repeat';
      canvas.style.backgroundColor = '#000';
      return;
    }
    const fallbackImage = new Image();
    fallbackImage.src = src;
    fallbackImage.style.cssText = canvas.style.cssText;
    canvas.parentNode.replaceChild(fallbackImage, canvas);
  };

  const freezeCanvasTo2D = async () => {
    if (!canvas.parentNode) return;

    const frozenCanvas = document.createElement('canvas');
    frozenCanvas.width = canvas.width;
    frozenCanvas.height = canvas.height;
    frozenCanvas.style.cssText = canvas.style.cssText;

    const ctx = frozenCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas not supported');

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(canvas);
        ctx.drawImage(bitmap, 0, 0, frozenCanvas.width, frozenCanvas.height);
        if (typeof bitmap.close === 'function') bitmap.close();
      } catch {
        ctx.drawImage(canvas, 0, 0, frozenCanvas.width, frozenCanvas.height);
      }
    } else {
      ctx.drawImage(canvas, 0, 0, frozenCanvas.width, frozenCanvas.height);
    }

    canvas.parentNode.replaceChild(frozenCanvas, canvas);
  };

  const releaseThumbnailContext = (gl) => {
    if (!gl) return;
    const loseExt = gl.getExtension('WEBGL_lose_context');
    if (loseExt) loseExt.loseContext();
  };

  const scheduleThumbnailRetry = () => {
    if (!isThumbnail || hasThumbnailRetryAttempt) return false;
    const params = new URLSearchParams(window.location.search);
    params.set('glretry', '1');
    const retryUrl = `${window.location.pathname}?${params.toString()}`;
    window.setTimeout(() => {
      window.location.replace(retryUrl);
    }, thumbnailRetryDelayMs);
    return true;
  };

  const handleThumbnailFailure = (gl) => {
    if (thumbnailFailureHandled) return;
    thumbnailFailureHandled = true;
    releaseThumbnailContext(gl);
    if (scheduleThumbnailRetry()) {
      swapCanvasWithImage(metadata.source);
      return;
    }
    swapCanvasWithImage(metadata.source, true);
  };

  if (isThumbnail) {
    canvas.style.backgroundImage = `url("${metadata.source}")`;
    canvas.style.backgroundPosition = 'center';
    canvas.style.backgroundSize = 'cover';
    canvas.style.backgroundRepeat = 'no-repeat';
    canvas.style.backgroundColor = '#000';
  }

  if (forceOnePixel) {
    canvas.width = 1;
    canvas.height = 1;
  } else if (isThumbnail) {
    const renderedThumbMax = thumbPxOverride ?? (isPreview ? PREVIEW_THUMBNAIL_MAX_PX : Infinity);
    canvas.width = Math.max(1, Math.min(Math.round(rect.width * DPR), renderedThumbMax));
    canvas.height = Math.max(1, Math.min(Math.round(rect.height * DPR), renderedThumbMax));
  } else {
    canvas.width  = 900 * DPR;
    canvas.height = 860 * DPR;
  }

  if (isThumbnail && thumbnailStaggerProfile) {
    await staggerThumbnailRenderStart(thumbnailStaggerProfile);
  }

  let gl = null;
  let contextLost = false;
  try {
    gl = canvas.getContext('webgl', {
      alpha: false,
      preserveDrawingBuffer: true,
      antialias: !isThumbnail,
      powerPreference: 'low-power'
    });
  } catch {
    gl = null;
  }

  if (!gl) {
    if (isThumbnail) {
      handleThumbnailFailure(gl);
      return;
    }
    throw new Error('WebGL not supported');
  }

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    contextLost = true;
  }, { once: true });

  try {
    gl.viewport(0, 0, canvas.width, canvas.height);

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error('Vertex shader failed');
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error('Fragment shader failed');
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link failed');
    }
    gl.useProgram(program);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const texLoc = gl.getAttribLocation(program, 'a_texcoord');
    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,  1, 0,  0, 1,
      0, 1,  1, 0,  1, 1
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    const uImage = gl.getUniformLocation(program, 'u_image');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uRad = gl.getUniformLocation(program, 'u_radius');
    const uCOff = gl.getUniformLocation(program, 'u_cOffset');
    const uMOff = gl.getUniformLocation(program, 'u_mOffset');
    const uYOff = gl.getUniformLocation(program, 'u_yOffset');
    const uKOff = gl.getUniformLocation(program, 'u_kOffset');
    const uNoise = gl.getUniformLocation(program, 'u_noiseAmp');
    const uInkStatus = gl.getUniformLocation(program, 'u_inkStatus');

    gl.uniform1i(uImage, 0);

    const imgBitmap = imageBitmapPromise
      ? await imageBitmapPromise
      : await loadImageBitmap(metadata.source);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try {
      gl.texImage2D(
        gl.TEXTURE_2D, 0,
        gl.RGBA, gl.RGBA,
        gl.UNSIGNED_BYTE,
        imgBitmap
      );
    } finally {
      // texImage2D copies the pixels synchronously, so the decoded source no
      // longer needs to remain resident while the grid iframe stays alive.
      if (typeof imgBitmap.close === 'function') imgBitmap.close();
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uRad, metadata.radius);
    gl.uniform2f(uCOff, ...metadata.cOffset);
    gl.uniform2f(uMOff, ...metadata.mOffset);
    gl.uniform2f(uYOff, ...metadata.yOffset);
    gl.uniform2f(uKOff, ...metadata.kOffset);
    gl.uniform1f(uNoise, metadata.noiseAmp);
    gl.uniform1f(uInkStatus, metadata.inkStatus);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const err = gl.getError();
    if (err !== gl.NO_ERROR || contextLost) {
      if (isThumbnail) {
        handleThumbnailFailure(gl);
        return;
      }
      throw new Error(`WebGL error code: ${err}`);
    }

    if (isThumbnail) {
      try {
        await freezeCanvasTo2D();
      } catch {
        handleThumbnailFailure(gl);
        return;
      }
      releaseThumbnailContext(gl);
      return;
    }
  } catch (error) {
    if (isThumbnail) {
      handleThumbnailFailure(gl);
      return;
    }
    throw error;
  }
}


async function getMetadata() {

  let currentId = window.location.pathname.split("/").pop();

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

    // Ensure source path has the correct format
    let source = decoded.source || 'ff08f64a29c957c1f376ca1d35c2ccb5851379da3df9618b8108f55ed65dfb39i0'; // use default if not provided
    
    // Add '/content/' prefix if it's not already there
    if (!source.startsWith('/content/')) {
      source = '/content/' + source;
    }

    return {
      radius: decoded.radius,
      cOffset: decoded.cOffset,
      mOffset: decoded.mOffset,
      yOffset: decoded.yOffset,
      kOffset: decoded.kOffset,
      noiseAmp: decoded.noiseAmp,
      inkStatus: decoded.inkStatus,
      title: decoded.title,
      source: source
    };
  } catch {
    return metadata;
  }
}

function setupDOM({ width = 512, height = 512, margin = 20, fill = false } = {}) {
  const body = document.body;
  body.style.margin = '0';
  body.style.display = 'flex';
  body.style.justifyContent = 'center';
  body.style.alignItems = 'center';
  body.style.height = '100vh';

  const container = document.createElement('div');
  container.id = 'container';
  container.style.width = `calc(min(100vw, 100vh))`;
  container.style.height = 'min(100vw, 100vh)';
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

  container.appendChild(canvas);

  function resizeCanvas() {
    if (fill) {
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      return;
    }

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

  const resizeObserver = new ResizeObserver(resizeCanvas);
  window.addEventListener('resize', resizeCanvas);
  resizeObserver.observe(container);
  resizeCanvas();
  return {
    canvas,
    stopResizeTracking() {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
    }
  };
}

getMetadata().then((metadata) => {
  main(metadata);
});
