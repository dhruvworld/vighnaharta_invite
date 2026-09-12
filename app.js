(() => {
  const INVITE_SRC = "public/invite.jpg";
  const SHARE_TEXT =
    "🙏 વિઘ્નહર્તા યુવક મંડળ આયોજિત ભવ્ય આગમનનું આમંત્રણ\nગણપતિ બાપ્પા મોર્યા!";

  // Preview stays lighter; export uses maximum resolution + lossless PNG
  const PREVIEW_SCALE = 2;
  const EXPORT_SCALE = 4; // 723×1024 → 2892×4096

  // Only cover the dotted blank AFTER original "સ્નેહી શ્રી,"
  const LAYOUT = {
    coverX0: 365 / 723,
    coverY0: 502 / 1024,
    coverX1: 638 / 723,
    coverY1: 534 / 1024,
    textColor: "#5a1216",
    bgColor: "#fdf6eb",
    maxFont: 19,
    minFont: 11,
    fontFamily: '"Noto Serif Gujarati", "Noto Sans Gujarati", serif',
  };

  const canvas = document.getElementById("inviteCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const nameInput = document.getElementById("guestName");
  const shareBtn = document.getElementById("shareWhatsApp");
  const downloadBtn = document.getElementById("downloadInvite");
  const statusHint = document.getElementById("statusHint");

  let inviteImage = null;
  let baseW = 723;
  let baseH = 1024;
  let drawToken = 0;

  function setStatus(message) {
    statusHint.textContent = message;
  }

  function fitFontSize(measureCtx, text, maxWidth, scale) {
    let size = LAYOUT.maxFont * scale;
    const min = LAYOUT.minFont * scale;
    while (size > min) {
      measureCtx.font = `700 ${size}px ${LAYOUT.fontFamily}`;
      if (measureCtx.measureText(text).width <= maxWidth) break;
      size -= 0.5;
    }
    return size;
  }

  function paintInvite(targetCtx, width, height, name) {
    const scale = width / baseW;

    targetCtx.imageSmoothingEnabled = true;
    targetCtx.imageSmoothingQuality = "high";
    targetCtx.fillStyle = "#000";
    targetCtx.fillRect(0, 0, width, height);
    targetCtx.drawImage(inviteImage, 0, 0, width, height);

    const trimmed = (name || "").trim();
    if (!trimmed) return;

    const x0 = LAYOUT.coverX0 * width;
    const y0 = LAYOUT.coverY0 * height;
    const x1 = LAYOUT.coverX1 * width;
    const y1 = LAYOUT.coverY1 * height;

    targetCtx.fillStyle = LAYOUT.bgColor;
    targetCtx.fillRect(x0, y0, x1 - x0, y1 - y0);

    const pad = 6 * scale;
    const maxTextWidth = x1 - x0 - pad * 2;
    const fontSize = fitFontSize(targetCtx, trimmed, maxTextWidth, scale);

    targetCtx.font = `700 ${fontSize}px ${LAYOUT.fontFamily}`;
    targetCtx.fillStyle = LAYOUT.textColor;
    targetCtx.textBaseline = "middle";
    targetCtx.textAlign = "left";
    // Do NOT pass maxWidth to fillText — that horizontally squashes glyphs and blurs them
    targetCtx.fillText(trimmed, x0 + pad, (y0 + y1) / 2 + fontSize * 0.03);
  }

  function renderPreview(name) {
    if (!inviteImage) return;
    paintInvite(ctx, canvas.width, canvas.height, name);
  }

  function createExportCanvas(name) {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = Math.round(baseW * EXPORT_SCALE);
    exportCanvas.height = Math.round(baseH * EXPORT_SCALE);
    const exportCtx = exportCanvas.getContext("2d", { alpha: false });
    paintInvite(exportCtx, exportCanvas.width, exportCanvas.height, name);
    return exportCanvas;
  }

  async function waitForFonts() {
    if (!document.fonts?.load) return;
    await Promise.all([
      document.fonts.load('700 80px "Noto Serif Gujarati"'),
      document.fonts.load('600 80px "Noto Sans Gujarati"'),
      document.fonts.load('700 48px "Cormorant Garamond"'),
    ]);
    await document.fonts.ready;
  }

  function canvasToBlob(sourceCanvas, type, quality) {
    return new Promise((resolve, reject) => {
      sourceCanvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))),
        type,
        quality
      );
    });
  }

  /** Lossless PNG at max resolution — highest quality the browser can produce */
  async function buildMaxQualityBlob(name) {
    const exportCanvas = createExportCanvas(name);
    return canvasToBlob(exportCanvas, "image/png");
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function shareOnWhatsApp() {
    const name = nameInput.value.trim();
    if (!name) {
      setStatus("પહેલા નામ લખો.");
      nameInput.focus();
      return;
    }

    shareBtn.disabled = true;
    setStatus("મહત્તમ ક્વોલિટી PNG તૈયાર થઈ રહ્યું છે…");

    try {
      const blob = await buildMaxQualityBlob(name);
      const file = new File([blob], `vighnaharta-${Date.now()}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "વિઘ્નહર્તા આમંત્રણ",
          text: SHARE_TEXT,
        });
        setStatus(
          "WhatsAppમાં Document/ફાઇલ તરીકે મોકલો — Photo તરીકે મોકલતા ક્વોલિટી ઘટે છે."
        );
        return;
      }

      downloadBlob(blob, file.name);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`,
        "_blank",
        "noopener,noreferrer"
      );
      setStatus(
        "PNG ડાઉનલોડ થયું. WhatsApp → Document/File તરીકે અટેચ કરો (સૌથી ઊંચી ક્વોલિટી)."
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("શેર રદ થયું.");
      } else {
        console.error(err);
        setStatus("શેર ન થઈ શક્યું. ડાઉનલોડ વાપરો.");
      }
    } finally {
      shareBtn.disabled = false;
    }
  }

  async function downloadInvite() {
    const name = nameInput.value.trim();
    if (!name) {
      setStatus("પહેલા નામ લખો.");
      nameInput.focus();
      return;
    }

    downloadBtn.disabled = true;
    setStatus("મહત્તમ ક્વોલિટી PNG તૈયાર થઈ રહ્યું છે…");

    try {
      const blob = await buildMaxQualityBlob(name);
      downloadBlob(blob, "vighnaharta-invite.png");
      const mb = (blob.size / (1024 * 1024)).toFixed(1);
      setStatus(`મહત્તમ ક્વોલિટી PNG ડાઉનલોડ થયું (${mb} MB · 2892×4096).`);
    } catch (err) {
      console.error(err);
      setStatus("ડાઉનલોડ ન થઈ શક્યું.");
    } finally {
      downloadBtn.disabled = false;
    }
  }

  function scheduleRender() {
    const token = ++drawToken;
    requestAnimationFrame(() => {
      if (token !== drawToken) return;
      renderPreview(nameInput.value);
    });
  }

  async function init() {
    setStatus("આમંત્રણ લોડ થઈ રહ્યું છે…");
    shareBtn.disabled = true;
    downloadBtn.disabled = true;

    try {
      await waitForFonts();
      inviteImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = "high";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Invite image failed to load"));
        img.src = INVITE_SRC;
      });

      baseW = inviteImage.naturalWidth;
      baseH = inviteImage.naturalHeight;
      canvas.width = Math.round(baseW * PREVIEW_SCALE);
      canvas.height = Math.round(baseH * PREVIEW_SCALE);
      renderPreview("");
      setStatus(
        "નામ લખો. શેર/ડાઉનલોડ = મહત્તમ PNG. WhatsAppમાં Document તરીકે મોકલો."
      );
      shareBtn.disabled = false;
      downloadBtn.disabled = false;
    } catch (err) {
      console.error(err);
      setStatus("આમંત્રણ લોડ ન થયું. પેજ રિફ્રેશ કરો.");
    }
  }

  nameInput.addEventListener("input", scheduleRender);
  shareBtn.addEventListener("click", shareOnWhatsApp);
  downloadBtn.addEventListener("click", downloadInvite);

  init();
})();
