(() => {
  const $ = (id) => document.getElementById(id);

  const inputName = $('inputName');
  const inputRole = $('inputRole');
  const inputCompany = $('inputCompany');
  const inputPhoto = $('inputPhoto');
  const uploadBox = $('uploadBox');

  const badgeFirstName = $('badgeFirstName');
  const badgeLastName = $('badgeLastName');
  const badgeRole = $('badgeRole');
  const badgeCompany = $('badgeCompany');
  const badgePhoto = $('badgePhoto');

  const downloadBtn = $('downloadBtn');
  const badge = $('badge');

  // ---------- LIVE BINDINGS ----------
  function splitName(full) {
    // Convención LatAm:
    // 2 palabras → 1 nombre + 1 apellido
    // 3 palabras → 1 nombre + 2 apellidos    (ej: "Fabrizio Villafuerte Diaz")
    // 4+ palabras → 2 nombres + resto apellidos (ej: "José Luis Espinoza Reyes")
    const parts = (full || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { first: '', rest: '' };
    if (parts.length === 1) return { first: parts[0], rest: '' };
    const nombresCount = parts.length >= 4 ? 2 : 1;
    return {
      first: parts.slice(0, nombresCount).join(' '),
      rest: parts.slice(nombresCount).join(' ')
    };
  }

  function bindText(input, target, fallback) {
    const apply = () => {
      const v = input.value.trim();
      target.textContent = v || fallback;
    };
    input.addEventListener('input', apply);
    apply();
  }

  // Name has split rendering
  function applyName() {
    const v = inputName.value.trim() || 'Fabrizio Villafuerte Diaz';
    const { first, rest } = splitName(v);
    badgeFirstName.textContent = first;
    badgeLastName.textContent = rest;
  }
  inputName.addEventListener('input', applyName);
  applyName();

  // Role and company mirror the input EXACTLY — empty when empty (no demo fallback).
  bindText(inputRole, badgeRole, '');
  bindText(inputCompany, badgeCompany, '');

  // ---------- RATIO TOGGLE ----------
  const ratioInputs = document.querySelectorAll('input[name="ratio"]');
  ratioInputs.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      badge.classList.remove('badge--1-1', 'badge--4-5');
      badge.classList.add(`badge--${input.value}`);
    });
  });

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
    // The badge photo area aspect ratio depends on the current badge mode.
    // 4:5 mode: 450 wide x 465 tall ≈ 0.968
    // 1:1 mode: 450 wide x 372 tall ≈ 1.21
    return badge.classList.contains('badge--4-5') ? (450 / 465) : (450 / 372);
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

  // ---------- DOWNLOAD ----------
  downloadBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    const original = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = 'Generando…';

    try {
      // html-to-image: pixelRatio 2 → exports at 2x device pixels (sharp on retina).
      // Uses SVG foreignObject under the hood so background-clip:text and writing-mode render correctly.
      const dataUrl = await htmlToImage.toPng(badge, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        // Filter out UI-only controls (the "Editar foto" button) so they don't appear in the exported PNG.
        filter: (node) => {
          if (node.classList && node.classList.contains('edit-photo-btn')) return false;
          return true;
        },
      });
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
