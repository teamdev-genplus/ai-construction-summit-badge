(() => {
  const $ = (id) => document.getElementById(id);

  const inputName = $('inputName');
  const inputRole = $('inputRole');
  const inputCompany = $('inputCompany');
  const inputPhoto = $('inputPhoto');
  const uploadBox = $('uploadBox');

  // v2 design: single name element (uppercase), role + company stacked right
  const badgeName = $('badgeName');
  const badgeRole = $('badgeRole');
  const badgeCompany = $('badgeCompany');
  const badgePhoto = $('badgePhoto');

  const downloadBtn = $('downloadBtn');
  const badge = $('badge');

  // ---------- LIVE BINDINGS ----------
  function bindText(input, target, transform) {
    const apply = () => {
      const v = (input.value || '').trim();
      target.textContent = transform ? transform(v) : v;
    };
    input.addEventListener('input', apply);
    apply();
  }

  bindText(inputName, badgeName, (v) => v.toUpperCase());
  bindText(inputRole, badgeRole);
  bindText(inputCompany, badgeCompany);

  // ---------- PHOTO UPLOAD + CROP ----------
  // Original uploaded image (so user can re-edit / re-crop without losing the source).
  let originalImageDataUrl = null;
  let cropperInstance = null;

  const editPhotoBtn = $('editPhotoBtn');
  const cropModal = $('cropModal');
  const cropperImg = $('cropperImg');
  const cropZoomSlider = $('cropZoomSlider');
  const cropApplyBtn = $('cropApplyBtn');

  // Explicit click handler on the upload-box div → triggers file picker.
  // Avoid re-triggering when the click came from the hidden input itself bubbling up.
  console.log('[badge] upload click handler attached, uploadBox=', uploadBox, 'inputPhoto=', inputPhoto);
  uploadBox.addEventListener('click', (e) => {
    console.log('[badge] upload box clicked, target=', e.target.tagName, e.target.id);
    if (e.target.id === 'inputPhoto') return;
    inputPhoto.click();
  });
  uploadBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputPhoto.click(); }
  });
  uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); uploadBox.classList.add('is-dragging'); });
  uploadBox.addEventListener('dragleave', () => uploadBox.classList.remove('is-dragging'));
  uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('is-dragging');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handlePhotoFile(file);
  });
  inputPhoto.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handlePhotoFile(file);
    // reset so selecting the same file again still fires change
    e.target.value = '';
  });

  function handlePhotoFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Sube una imagen válida (JPG o PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe pesar menos de 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      originalImageDataUrl = ev.target.result;
      openCropper(originalImageDataUrl);
    };
    reader.readAsDataURL(file);
  }

  // ----- CROPPER MODAL -----
  function currentPhotoAspect() {
    // v3 design: photo slot 545x535 measured from actual photo frame in reference.
    return 545 / 535;
  }

  function openCropper(srcDataUrl) {
    cropperImg.src = srcDataUrl;
    cropModal.hidden = false;
    cropModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Destroy any previous instance
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }

    // Wait for img to load to know natural size, then init Cropper
    const init = () => {
      cropperInstance = new Cropper(cropperImg, {
        aspectRatio: currentPhotoAspect(),
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        background: false,
        guides: false,
        center: false,
        zoomOnWheel: true,
        wheelZoomRatio: 0.1,
        cropBoxResizable: false,
        cropBoxMovable: false,
        toggleDragModeOnDblclick: false,
        ready() {
          cropZoomSlider.value = 0;
        },
        zoom(event) {
          // Sync slider with programmatic/wheel zoom
          const data = cropperInstance.getImageData();
          if (data.naturalWidth) {
            const ratio = data.width / data.naturalWidth;
            const min = 0.1, max = 4;
            const pct = Math.max(0, Math.min(100, ((ratio - min) / (max - min)) * 100));
            cropZoomSlider.value = pct;
          }
        }
      });
    };
    if (cropperImg.complete) init(); else cropperImg.onload = init;
  }

  function closeCropper() {
    if (cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    cropModal.hidden = true;
    cropModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // close on overlay / cancel
  cropModal.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]')) closeCropper();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !cropModal.hidden) closeCropper();
  });

  // zoom slider → relative zoom on cropper
  cropZoomSlider.addEventListener('input', () => {
    if (!cropperInstance) return;
    const data = cropperInstance.getImageData();
    const min = 0.1, max = 4;
    const targetRatio = min + (max - min) * (cropZoomSlider.value / 100);
    cropperInstance.zoomTo(targetRatio);
  });
  $('cropZoomIn').addEventListener('click', () => { if (cropperInstance) cropperInstance.zoom(0.1); });
  $('cropZoomOut').addEventListener('click', () => { if (cropperInstance) cropperInstance.zoom(-0.1); });
  $('cropReset').addEventListener('click', () => { if (cropperInstance) cropperInstance.reset(); });

  // apply → render canvas, drop into badge, close modal
  cropApplyBtn.addEventListener('click', () => {
    if (!cropperInstance) return;
    const canvas = cropperInstance.getCroppedCanvas({
      width: 900,
      height: Math.round(900 / currentPhotoAspect()),
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    placePhotoInBadge(dataUrl);
    closeCropper();
  });

  function placePhotoInBadge(dataUrl) {
    badgePhoto.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Foto del asistente';
    badgePhoto.appendChild(img);
    uploadBox.classList.add('has-file');
    const label = uploadBox.querySelector('.upload-box__inner strong');
    if (label) label.textContent = '✓ Foto cargada · click para cambiar';
    editPhotoBtn.hidden = false;
  }

  // Edit button on badge → reopen cropper with the original image
  editPhotoBtn.addEventListener('click', () => {
    if (originalImageDataUrl) openCropper(originalImageDataUrl);
  });

  // Wait for modern-screenshot ESM module to be ready before rendering.
  function waitForModernScreenshot() {
    if (window.modernScreenshot) return Promise.resolve();
    return new Promise((res) => {
      const onReady = () => { window.removeEventListener('modernScreenshotReady', onReady); res(); };
      window.addEventListener('modernScreenshotReady', onReady);
      // Safety timeout
      setTimeout(res, 5000);
    });
  }

  // ---------- OFFSCREEN BADGE RENDER ----------
  async function renderBadgeOffscreen() {
    await waitForModernScreenshot();
    if (!window.modernScreenshot) {
      throw new Error('La librería de exportación no cargó. Revisa tu conexión y reintenta.');
    }
    const w = badge.offsetWidth;   // authored layout width (600), unaffected by transform
    const h = badge.offsetHeight;  // authored layout height (600 or 750)

    // Build an offscreen stage at the authored size, parked far off the visible viewport.
    const stage = document.createElement('div');
    stage.setAttribute('data-export-stage', '');
    stage.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: -20000px',     // off-screen but still part of the layout/render tree
      `width: ${w}px`,
      `height: ${h}px`,
      'pointer-events: none',
      'background: transparent',
      'z-index: -1',
    ].join(';');

    // Deep-clone the badge and strip the responsive transform.
    const clone = badge.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.position = 'static';
    clone.style.top = 'auto';
    clone.style.left = 'auto';
    clone.style.margin = '0';
    clone.style.width = w + 'px';
    clone.style.height = h + 'px';

    // Remove the "Editar foto" UI button from the clone (don't want it in the PNG).
    clone.querySelectorAll('.edit-photo-btn').forEach((el) => el.remove());

    stage.appendChild(clone);
    document.body.appendChild(stage);

    try {
      // Wait for every <img> in the clone to be fully decoded via the Image Decode API.
      // This is more reliable than just onload — it guarantees the pixels are ready.
      const imgs = Array.from(clone.querySelectorAll('img'));
      await Promise.all(imgs.map(async (img) => {
        try {
          // Force load if not started
          if (!img.complete) {
            await new Promise((res) => { img.onload = res; img.onerror = res; });
          }
          // decode() returns a promise that resolves when the image is fully decoded
          if (typeof img.decode === 'function') {
            await img.decode().catch(() => {}); // ignore decode errors, fallback to whatever loaded
          }
        } catch (_) {}
      }));
      // Extra paint cycle so layout/styles fully settled.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // modern-screenshot has Safari-specific fixes baked in (fixSvgXmlDecode, drawImageInterval).
      // v3 uses scale 1 because background_v3.png is already native 1080x1350. Scaling up
      // would upscale the PNG (lossy). Slots are crisp at any scale (text + photo render fresh).
      const opts = {
        scale: 1,
        width: w,
        height: h,
        backgroundColor: 'transparent',
        // Safari fixes — kept default unless we need to tune
        fixSvgXmlDecode: true,
        // skip CORS @font-face inlining to avoid CSP / CORS noise
        font: false,
      };

      // KNOWN ISSUE: on iOS Safari the first render call sometimes returns an image with
      // missing photos (foreignObject + <img> data URI quirk). Render once, throw the
      // result away, then render again. Second call is reliable.
      // https://github.com/bubkoo/html-to-image/issues/361
      // https://github.com/bubkoo/html-to-image/issues/461
      const warmup = await modernScreenshot.domToPng(clone, opts);
      void warmup; // discard
      const dataUrl = await modernScreenshot.domToPng(clone, opts);
      return dataUrl;
    } finally {
      stage.remove();
    }
  }

  // ---------- DOWNLOAD ----------
  downloadBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    const original = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = 'Generando…';

    try {
      // We render an OFFSCREEN CLONE of the badge instead of the live one.
      // Why: on mobile the live badge has transform: scale() + position: absolute (responsive
      // preview). html-to-image picked up that transformed layout and the photo failed to render
      // even with style overrides because the container query + scale combo confused the layout.
      // The clone lives in an isolated offscreen container at the authored 600x{600|750} dims,
      // with all transforms reset, so html-to-image captures it cleanly.
      const dataUrl = await renderBadgeOffscreen();
      const link = document.createElement('a');
      const safe = (inputName.value || 'asistente').trim().replace(/\s+/g, '_');
      link.download = `Badge_AISummit2026_${safe}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('[badge] export error:', err);
      alert('No se pudo generar el badge. Intenta de nuevo.');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = original;
    }
  });

  function validateForm() {
    if (!inputName.value.trim()) {
      alert('Completa al menos tu nombre antes de descargar.');
      return false;
    }
    return true;
  }

  // ---------- SHARE BUTTONS ----------
  const SHARE_URL = 'https://aecode.ai/summit';
  const SHARE_TEXT = '¡Voy al AI Construction Summit 2026! 17 y 18 de Julio · Auditorio CIP Lima. #AIConstructionSummit2026';

  document.querySelectorAll('.share__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!validateForm()) return;
      const kind = btn.dataset.share;
      const url = encodeURIComponent(SHARE_URL);
      const text = encodeURIComponent(SHARE_TEXT);
      let target = '';
      if (kind === 'linkedin') target = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      if (kind === 'whatsapp') target = `https://api.whatsapp.com/send?text=${text}%20${url}`;
      if (kind === 'twitter') target = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      if (target) window.open(target, '_blank', 'noopener,width=620,height=600');
    });
  });
})();
