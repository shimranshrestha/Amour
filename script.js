(function () {
  'use strict';
  const M = window.Motion || null;
  const state = {
    frame: null,
    clicks: null,
    finalDesign: null,
    stream: null,
    photos: [],
    shotIndex: 0,
    sessionToken: 0
  };
  const FRAMES = [
    {
      id: 'classic',
      name: 'Classic Strip',
      desc: 'The iconic vertical strip — timeless, a little nostalgic.',
      previewClass: 'frame-preview--classic',
      blockCount: 3
    },
    {
      id: 'polaroid',
      name: 'Polaroid',
      desc: 'Individually framed prints with a caption-ready border.',
      previewClass: 'frame-preview--polaroid',
      blockCount: 2
    },
    {
      id: 'mini',
      name: 'Mini Strip',
      desc: 'A compact strip made for pocket-sized keepsakes.',
      previewClass: 'frame-preview--mini',
      blockCount: 4
    },
    {
      id: 'editorial',
      name: 'Editorial',
      desc: 'Generous whitespace, gallery-clean composition.',
      previewClass: 'frame-preview--editorial',
      blockCount: 3
    },
    {
      id: 'love',
      name: 'Love Note',
      desc: "Finished with AMOUR's signature heart motif.",
      previewClass: 'frame-preview--love',
      blockCount: 3
    }
  ];
  const CLICK_OPTIONS = [1, 2, 3, 4];
  const SCREEN_ORDER = ['screen-home', 'screen-frame', 'screen-clicks', 'screen-camera', 'screen-design'];
  const screens = Array.from(document.querySelectorAll('[data-screen]'));
  const frameGrid = document.getElementById('frameGrid');
  const designGrid = document.getElementById('designGrid');
  const clicksGrid = document.getElementById('clicksGrid');
  const toClicksBtn = document.getElementById('toClicksBtn');
  const startShootingBtn = document.getElementById('startShootingBtn');
  const cameraStage = document.getElementById('cameraStage');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraIdle = document.getElementById('cameraIdle');
  const cameraError = document.getElementById('cameraError');
  const cameraRetryBtn = document.getElementById('cameraRetryBtn');
  const cameraHint = document.getElementById('cameraHint');
  const cameraFrameLabel = document.getElementById('cameraFrameLabel');
  const cameraShotLabel = document.getElementById('cameraShotLabel');
  const countdownLayer = document.getElementById('countdownLayer');
  const countdownNumber = document.getElementById('countdownNumber');
  const flashOverlay = document.getElementById('flashOverlay');
  const resultImage = document.getElementById('resultImage');
  const resultLoading = document.getElementById('resultLoading');
  const resultSuccess = document.getElementById('resultSuccess');
  const retakeBtn = document.getElementById('retakeBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const startAgainBtn = document.getElementById('startAgainBtn');
  const captureCanvas = document.getElementById('captureCanvas');
  const compositionCanvas = document.getElementById('compositionCanvas');
  const navProgressSteps = Array.from(document.querySelectorAll('.nav-progress-step'));

  function getScreen(id) {
    return document.getElementById(id);
  }
  function updateNavProgress(activeId) {
    const activeIndex = SCREEN_ORDER.indexOf(activeId);
    navProgressSteps.forEach((el) => {
      const stepIndex = SCREEN_ORDER.indexOf(el.dataset.step);
      el.classList.toggle('is-active', stepIndex === activeIndex);
      el.classList.toggle('is-done', stepIndex > -1 && stepIndex < activeIndex);
    });
  }
  function goToScreen(id) {
    const next = getScreen(id);
    const current = screens.find((s) => s.classList.contains('is-active'));
    if (!next || next === current) return;
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('is-active', link.dataset.navTarget === id);
    });
    updateNavProgress(id);
    if (current && M) {
      M.animate(current, { opacity: [1, 0], transform: ['translateY(0px)', 'translateY(-14px)'] }, { duration: 0.28, easing: 'ease-in' })
        .finished.then(() => {
          current.classList.remove('is-active');
          showNext();
        });
    } else {
      if (current) current.classList.remove('is-active');
      showNext();
    }
    function showNext() {
      next.classList.add('is-active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (M) {
        M.animate(next, { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] }, { duration: 0.45, easing: [0.22, 1, 0.36, 1] });
        animateRevealChildren(next);
      }
    }
  }
  function animateRevealChildren(screenEl) {
    if (!M) return;
    const items = screenEl.querySelectorAll('[data-reveal], [data-hero-el]');
    if (!items.length) return;
    M.animate(
      items,
      { opacity: [0, 1], transform: ['translateY(16px)', 'translateY(0px)'] },
      { duration: 0.5, delay: M.stagger(0.08), easing: [0.22, 1, 0.36, 1] }
    );
  }
  document.querySelectorAll('[data-nav-target]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.dataset.navTarget;
      if (el.disabled) return;
      if (target === 'screen-camera') {
        if (!state.frame || !state.clicks) return;
        goToScreen('screen-camera');
        startPhotoSession();
      } else {
        goToScreen(target);
      }
    });
  });

  function renderFrameOptions(container, getSelectedId, onSelect) {
    container.innerHTML = '';
    FRAMES.forEach((frame) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'frame-card';
      card.dataset.frameId = frame.id;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', String(getSelectedId() === frame.id));
      card.setAttribute('aria-label', frame.name + ' — ' + frame.desc);
      if (getSelectedId() === frame.id) card.classList.add('is-selected');
      const blocks = Array.from({ length: frame.blockCount })
        .map(() => '<span class="fp-block"></span>')
        .join('');
      card.innerHTML =
        '<div class="frame-preview ' + frame.previewClass + '">' + blocks + '</div>' +
        '<div class="frame-name">' + frame.name + '<span class="frame-check" aria-hidden="true">✓</span></div>' +
        '<p class="frame-desc">' + frame.desc + '</p>';
      card.addEventListener('click', () => {
        onSelect(frame.id, card, container);
      });
      container.appendChild(card);
    });
  }
  function highlightSelectedCard(container, cardEl) {
  Array.from(container.querySelectorAll('.frame-card')).forEach((c) => {
    const isSelected = c === cardEl;
    c.classList.toggle('is-selected', isSelected);
    c.setAttribute('aria-checked', String(isSelected));
    const check = c.querySelector('.frame-check');
    if (check && !isSelected) {
      check.style.removeProperty('opacity');
      check.style.removeProperty('transform');
    }
  });
  if (M) {
    M.animate(cardEl, { scale: [0.96, 1] }, { duration: 0.35, easing: [0.34, 1.56, 0.64, 1] });
    const check = cardEl.querySelector('.frame-check');
    if (check) {
      M.animate(check, { scale: [0, 1], opacity: [0, 1] }, { duration: 0.3 }).finished.then(() => {
        check.style.removeProperty('opacity');
        check.style.removeProperty('transform');
      });
    }
  }
}
  function deselectCard(cardEl) {
  cardEl.classList.remove('is-selected');
  cardEl.setAttribute('aria-checked', 'false');
  const check = cardEl.querySelector('.frame-check');
  if (check) {
    check.style.removeProperty('opacity');
    check.style.removeProperty('transform');
  }
  if (M) {
    M.animate(cardEl, { scale: [1, 0.96, 1] }, { duration: 0.3 });
  }
}

function selectFrame(frameId, cardEl) {
  if (state.frame === frameId) {
    deselectCard(cardEl);
    state.frame = null;
    toClicksBtn.disabled = true;
    return;
  }
  state.frame = frameId;
  highlightSelectedCard(frameGrid, cardEl);
  toClicksBtn.disabled = false;
}

  function selectDesign(frameId, cardEl) {
    if (state.finalDesign === frameId) return;
    state.finalDesign = frameId;
    highlightSelectedCard(designGrid, cardEl);
    regenerateFinalImage();
  }

  function renderClicksGrid() {
    clicksGrid.innerHTML = '';
    CLICK_OPTIONS.forEach((count) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'click-card';
      card.dataset.clickCount = String(count);
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('aria-label', count + (count === 1 ? ' click' : ' clicks'));
      card.innerHTML =
        '<span class="click-number">' + count + '</span>' +
        '<span class="click-label">' + (count === 1 ? 'Click' : 'Clicks') + '</span>';
      card.addEventListener('click', () => selectClickCount(count, card));
      clicksGrid.appendChild(card);
    });
  }
  function selectClickCount(count, cardEl) {
  if (state.clicks === count) {
    cardEl.classList.remove('is-selected');
    cardEl.setAttribute('aria-checked', 'false');
    state.clicks = null;
    startShootingBtn.disabled = true;
    if (M) M.animate(cardEl, { scale: [1, 0.95, 1] }, { duration: 0.28 });
    return;
  }
  state.clicks = count;
  document.querySelectorAll('.click-card').forEach((c) => {
    const isSelected = c === cardEl;
    c.classList.toggle('is-selected', isSelected);
    c.setAttribute('aria-checked', String(isSelected));
  });
  if (M) {
    M.animate(cardEl, { scale: [0.9, 1] }, { duration: 0.32, easing: [0.34, 1.56, 0.64, 1] });
  }
  startShootingBtn.disabled = false;
}

  function initCamera() {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        reject(new Error('Camera API unsupported'));
        return;
      }
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1600 } },
          audio: false
        })
        .then((stream) => {
          state.stream = stream;
          cameraVideo.srcObject = stream;
          cameraIdle.style.display = 'none';
          cameraError.hidden = true;
          cameraStage.style.display = 'block';
          resolve(stream);
        })
        .catch((err) => reject(err));
    });
  }
  function stopCamera() {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
      state.stream = null;
    }
  }
  function showCameraError() {
    cameraStage.style.display = 'none';
    cameraError.hidden = false;
    cameraHint.style.display = 'none';
    if (M) {
      M.animate(cameraError, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] }, { duration: 0.4 });
    }
  }
  cameraRetryBtn.addEventListener('click', () => {
    cameraError.hidden = true;
    cameraHint.style.display = 'block';
    cameraStage.style.display = 'block';
    cameraIdle.style.display = 'flex';
    startPhotoSession();
  });

  async function startPhotoSession() {
    const myToken = ++state.sessionToken;
    state.photos = [];
    state.shotIndex = 0;
    cameraFrameLabel.textContent = 'Frame: ' + frameNameById(state.frame);
    cameraShotLabel.textContent = 'Shot 0 / ' + state.clicks;
    cameraStage.dataset.frameStyle = state.frame;
    try {
      await initCamera();
    } catch (err) {
      showCameraError();
      return;
    }
    await wait(600);
    if (myToken !== state.sessionToken) return;
    for (let i = 0; i < state.clicks; i++) {
      if (myToken !== state.sessionToken) return;
      state.shotIndex = i + 1;
      cameraShotLabel.textContent = 'Shot ' + state.shotIndex + ' / ' + state.clicks;
      await runCountdown();
      if (myToken !== state.sessionToken) return;
      capturePhoto();
      await wait(500);
    }
    stopCamera();
    cameraHint.textContent = 'Developing your AMOUR original…';
    state.finalDesign = state.frame;
    const finalDataUrl = await composeFinalImage(state.finalDesign, state.photos);
    if (myToken !== state.sessionToken) return;
    showDesignScreen(finalDataUrl);
  }
  function frameNameById(id) {
    const f = FRAMES.find((fr) => fr.id === id);
    return f ? f.name : '—';
  }
  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runCountdown() {
    const steps = ['3', '2', '1', 'FLASH'];
    for (const step of steps) {
      countdownNumber.textContent = step;
      if (step === 'FLASH') {
        triggerFlash();
      }
      if (M) {
        await M.animate(
          countdownNumber,
          { opacity: [0, 1, 1, 0], transform: ['scale(0.5)', 'scale(1.15)', 'scale(1)', 'scale(1.3)'] },
          { duration: 0.72, easing: [0.22, 1, 0.36, 1] }
        ).finished;
      } else {
        countdownNumber.style.opacity = '1';
        await wait(700);
        countdownNumber.style.opacity = '0';
      }
    }
  }
  function triggerFlash() {
    if (M) {
      M.animate(flashOverlay, { opacity: [0, 0.9, 0] }, { duration: 0.45, easing: 'ease-out' });
    } else {
      flashOverlay.style.opacity = '0.9';
      setTimeout(() => (flashOverlay.style.opacity = '0'), 200);
    }
  }

  function capturePhoto() {
    const CAPTURE_W = 800;
    const CAPTURE_H = 1000;
    const ctx = captureCanvas.getContext('2d');
    captureCanvas.width = CAPTURE_W;
    captureCanvas.height = CAPTURE_H;
    const vw = cameraVideo.videoWidth;
    const vh = cameraVideo.videoHeight;
    if (!vw || !vh) return;
    const targetRatio = CAPTURE_W / CAPTURE_H;
    const sourceRatio = vw / vh;
    let sx, sy, sw, sh;
    if (sourceRatio > targetRatio) {
      sh = vh;
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = vw / targetRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }
    ctx.save();
    ctx.translate(CAPTURE_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cameraVideo, sx, sy, sw, sh, 0, 0, CAPTURE_W, CAPTURE_H);
    ctx.restore();
    state.photos.push(captureCanvas.toDataURL('image/jpeg', 0.95));
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }
  function drawCoverImage(ctx, img, x, y, w, h, radius) {
    ctx.save();
    roundedRectPath(ctx, x, y, w, h, radius);
    ctx.clip();
    const ratio = Math.max(w / img.width, h / img.height);
    const nw = img.width * ratio;
    const nh = img.height * ratio;
    ctx.drawImage(img, x + (w - nw) / 2, y + (h - nh) / 2, nw, nh);
    ctx.restore();
  }
  function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawHeart(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(cx, cy + topCurveHeight);
    ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + topCurveHeight);
    ctx.bezierCurveTo(cx - size / 2, cy + (size + topCurveHeight) / 2, cx, cy + (size + topCurveHeight) / 1.3, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + (size + topCurveHeight) / 1.3, cx + size / 2, cy + (size + topCurveHeight) / 2, cx + size / 2, cy + topCurveHeight);
    ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + topCurveHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function drawPerforation(ctx, x, y, width, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.restore();
  }
  const TOKENS = {
    cream: '#FBF3EE',
    creamDeep: '#F5E7E0',
    blush: '#F3D9DE',
    babyPink: '#EFC1CB',
    rose: '#DD8FA0',
    roseDeep: '#C3697F',
    mauve: '#7C4A55',
    ink: '#2C1B20'
  };
  async function composeFinalImage(frameId, photoDataUrls) {
    await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve());
    const images = await Promise.all(photoDataUrls.map(loadImage));
    const ctx = compositionCanvas.getContext('2d');
    switch (frameId) {
      case 'classic':
        drawStripLayout(ctx, images, { width: 560, photoW: 480, gap: 22, margin: 40, accent: TOKENS.roseDeep, bg: [TOKENS.cream, TOKENS.creamDeep], love: false });
        break;
      case 'mini':
        drawStripLayout(ctx, images, { width: 320, photoW: 256, gap: 14, margin: 32, accent: TOKENS.roseDeep, bg: [TOKENS.cream, TOKENS.blush], love: false });
        break;
      case 'love':
        drawStripLayout(ctx, images, { width: 560, photoW: 480, gap: 26, margin: 44, accent: TOKENS.mauve, bg: [TOKENS.blush, TOKENS.babyPink], love: true });
        break;
      case 'polaroid':
        drawPolaroidLayout(ctx, images);
        break;
      case 'editorial':
        drawEditorialLayout(ctx, images);
        break;
      default:
        drawStripLayout(ctx, images, { width: 560, photoW: 480, gap: 22, margin: 40, accent: TOKENS.roseDeep, bg: [TOKENS.cream, TOKENS.creamDeep], love: false });
    }
    return compositionCanvas.toDataURL('image/jpeg', 0.94);
  }
  function drawStripLayout(ctx, images, opts) {
    const { width, photoW, gap, margin, accent, bg, love } = opts;
    const photoH = Math.round(photoW * 1.25);
    const headerH = 46;
    const footerH = love ? 130 : 92;
    const height = margin * 2 + headerH + images.length * photoH + (images.length - 1) * gap + footerH;
    compositionCanvas.width = width;
    compositionCanvas.height = height;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(1, bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    const cardMargin = 14;
    roundedRectPath(ctx, cardMargin, cardMargin, width - cardMargin * 2, height - cardMargin * 2, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = 'rgba(124,74,85,0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    drawPerforation(ctx, margin, headerH - 8, width - margin * 2, 'rgba(124,74,85,0.35)');
    ctx.fillStyle = accent;
    ctx.font = '700 15px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A M O U R   P H O T O B O O T H', width / 2, headerH - 22);
    let cursorY = margin + headerH;
    const photoX = (width - photoW) / 2;
    images.forEach((img, i) => {
      drawCoverImage(ctx, img, photoX, cursorY, photoW, photoH, 10);
      ctx.save();
      roundedRectPath(ctx, photoX, cursorY, photoW, photoH, 10);
      ctx.strokeStyle = 'rgba(124,74,85,0.18)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      if (love && i < images.length - 1) {
        drawHeart(ctx, width / 2, cursorY + photoH + gap / 2 - 6, 14, TOKENS.roseDeep);
      }
      cursorY += photoH + gap;
    });
    const footerCenterY = height - footerH / 2 - 10;
    ctx.fillStyle = TOKENS.mauve;
    ctx.font = (love ? 'italic 700 32px' : 'italic 700 28px') + ' "Cormorant Garamond", serif';
    ctx.fillText('AMOUR', width / 2, footerCenterY - (love ? 18 : 10));
    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(44,27,32,0.55)';
    const tagline = love ? 'bad decisions, beautifully framed ♡' : 'bad decisions, beautifully framed';
    ctx.fillText(tagline, width / 2, footerCenterY + 14);
    if (love) {
      drawHeart(ctx, width / 2 - 60, footerCenterY - 42, 12, TOKENS.roseDeep);
      drawHeart(ctx, width / 2 + 60, footerCenterY - 42, 12, TOKENS.roseDeep);
    }
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.font = '600 10px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(44,27,32,0.4)';
    ctx.fillText(dateStr.toUpperCase(), width / 2, height - 20);
  }
  function drawPolaroidLayout(ctx, images) {
    const n = images.length;
    const cols = n <= 2 ? n : n === 3 ? 3 : 2;
    const rows = Math.ceil(n / cols);
    const photoW = 300;
    const photoH = 375;
    const border = 20;
    const bottomBorder = 76;
    const cardW = photoW + border * 2;
    const cardH = photoH + border + bottomBorder;
    const gap = 46;
    const margin = 70;
    const width = margin * 2 + cols * cardW + (cols - 1) * gap;
    const height = margin * 2 + rows * cardH + (rows - 1) * gap + 40;
    compositionCanvas.width = width;
    compositionCanvas.height = height;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, TOKENS.blush);
    grad.addColorStop(1, TOKENS.babyPink);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = TOKENS.mauve;
    ctx.font = 'italic 700 26px "Cormorant Garamond", serif';
    ctx.fillText('AMOUR', width / 2, 46);
    const tilts = [-6, 5, -3, 7, -8, 4];
    images.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (cardW + gap) + cardW / 2;
      const y = margin + 40 + row * (cardH + gap) + cardH / 2;
      const angle = (tilts[i % tilts.length] * Math.PI) / 180;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.translate(-cardW / 2, -cardH / 2);
      ctx.save();
      ctx.shadowColor = 'rgba(124,74,85,0.35)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 10;
      roundedRectPath(ctx, 0, 0, cardW, cardH, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
      drawCoverImage(ctx, img, border, border, photoW, photoH, 3);
      ctx.fillStyle = '#6B535A';
      ctx.font = 'italic 600 18px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.fillText('say cheese ♡', cardW / 2, photoH + border + 44);
      ctx.restore();
    });
    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(44,27,32,0.55)';
    ctx.fillText('bad decisions, beautifully framed', width / 2, height - 16);
  }
  function drawEditorialLayout(ctx, images) {
    const n = images.length;
    const cols = n <= 2 ? n : 2;
    const rows = Math.ceil(n / cols);
    const cellW = 420;
    const cellH = 500;
    const gap = 36;
    const margin = 70;
    const headerH = 110;
    const footerH = 70;
    const width = margin * 2 + cols * cellW + (cols - 1) * gap;
    const height = margin * 2 + headerH + rows * cellH + (rows - 1) * gap + footerH;
    compositionCanvas.width = width;
    compositionCanvas.height = height;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'left';
    ctx.fillStyle = TOKENS.ink;
    ctx.font = 'italic 700 38px "Cormorant Garamond", serif';
    ctx.fillText('AMOUR', margin, margin + 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = TOKENS.roseDeep;
    ctx.font = '700 12px "Inter", sans-serif';
    ctx.fillText('NO. 001 — PHOTOBOOTH EDITION', width - margin, margin + 20);
    ctx.fillStyle = 'rgba(44,27,32,0.5)';
    ctx.font = 'italic 500 16px "Cormorant Garamond", serif';
    ctx.fillText('bad decisions, beautifully framed', width - margin, margin + 42);
    ctx.strokeStyle = 'rgba(124,74,85,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, margin + 62);
    ctx.lineTo(width - margin, margin + 62);
    ctx.stroke();
    const gridTop = margin + headerH;
    images.forEach((img, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (cellW + gap);
      const y = gridTop + row * (cellH + gap);
      drawCoverImage(ctx, img, x, y, cellW, cellH, 4);
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(44,27,32,0.45)';
    ctx.font = '600 11px "Inter", sans-serif';
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillText(dateStr.toUpperCase() + '   ·   AMOUR PHOTOBOOTH', width / 2, height - 30);
  }

  function showDesignScreen(dataUrl) {
    resultImage.src = dataUrl;
    resultSuccess.classList.remove('is-visible');
    renderFrameOptions(designGrid, () => state.finalDesign, selectDesign);
    goToScreen('screen-design');
  }
  async function regenerateFinalImage() {
    if (!state.photos.length) return;
    resultLoading.hidden = false;
    const dataUrl = await composeFinalImage(state.finalDesign, state.photos);
    resultImage.src = dataUrl;
    resultLoading.hidden = true;
    resultSuccess.classList.remove('is-visible');
  }

  downloadBtn.addEventListener('click', async () => {
    if (!resultImage.src) return;
    const label = downloadBtn.querySelector('.btn-label');
    const originalText = label.textContent;
    downloadBtn.disabled = true;
    label.textContent = 'Preparing…';
    if (M) M.animate(downloadBtn, { scale: [1, 0.97, 1] }, { duration: 0.4 });
    await wait(500);
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'amour-photobooth.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    label.textContent = originalText;
    downloadBtn.disabled = false;
    resultSuccess.classList.add('is-visible');
    if (M) {
      M.animate(resultSuccess, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0px)'] }, { duration: 0.45 });
    }
  });

  function resetExperience() {
    state.sessionToken++;
    stopCamera();
    state.frame = null;
    state.clicks = null;
    state.finalDesign = null;
    state.photos = [];
    state.shotIndex = 0;
    renderFrameOptions(frameGrid, () => state.frame, selectFrame);
    renderClicksGrid();
    toClicksBtn.disabled = true;
    startShootingBtn.disabled = true;
    resultSuccess.classList.remove('is-visible');
    resultImage.src = '';
    cameraError.hidden = true;
    cameraHint.style.display = 'block';
    cameraHint.textContent = 'Get ready — your first countdown starts automatically.';
    cameraIdle.style.display = 'flex';
    cameraStage.style.display = 'block';
    goToScreen('screen-frame');
  }
  retakeBtn.addEventListener('click', () => {
    state.photos = [];
    state.shotIndex = 0;
    resultSuccess.classList.remove('is-visible');
    cameraError.hidden = true;
    cameraHint.style.display = 'block';
    cameraIdle.style.display = 'flex';
    cameraStage.style.display = 'block';
    goToScreen('screen-camera');
    startPhotoSession();
  });
  startAgainBtn.addEventListener('click', resetExperience);

  function animateAmbientDecor() {
    if (!M) return;
    document.querySelectorAll('.deco').forEach((el, i) => {
      const drift = 14 + (i % 3) * 6;
      M.animate(
        el,
        { transform: ['translateY(0px)', 'translateY(-' + drift + 'px)', 'translateY(0px)'] },
        { duration: 6 + i, easing: 'ease-in-out', repeat: Infinity }
      );
    });
    ['.poster-strip', '.polaroid--a', '.polaroid--b'].forEach((sel, i) => {
      const el = document.querySelector(sel);
      if (!el) return;
      M.animate(
        el,
        { transform: ['translateY(0px)', 'translateY(-' + (10 + i * 4) + 'px)', 'translateY(0px)'] },
        { duration: 5 + i * 1.4, easing: 'ease-in-out', repeat: Infinity }
      );
    });
    const flash = document.querySelector('.flash-burst');
    if (flash) {
      M.animate(flash, { opacity: [0.25, 0.7, 0.25], scale: [1, 1.08, 1] }, { duration: 3.2, easing: 'ease-in-out', repeat: Infinity });
    }
  }
  function animateHeroIn() {
    if (!M) return;
    const items = document.querySelectorAll('[data-hero-el]');
    M.animate(
      items,
      { opacity: [0, 1], transform: ['translateY(22px)', 'translateY(0px)'] },
      { duration: 0.7, delay: M.stagger(0.12), easing: [0.22, 1, 0.36, 1] }
    );
    const header = document.querySelector('[data-animate="header"]');
    if (header) {
      M.animate(header, { opacity: [0, 1], transform: ['translateY(-12px)', 'translateY(0px)'] }, { duration: 0.6 });
    }
  }

  function init() {
    renderFrameOptions(frameGrid, () => state.frame, selectFrame);
    renderClicksGrid();
    updateNavProgress('screen-home');
    animateHeroIn();
    animateAmbientDecor();
    const footerYear = document.getElementById('footerYear');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
