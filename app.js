(() => {
  const INVITE_SRC = "public/invite.jpg";
  const GREETING = "સ્નેહી શ્રી, ";
  const SHARE_TEXT =
    "🙏 વિઘ્નહર્તા યુવક મંડળ આયોજિત ભવ્ય આગમનનું આમંત્રણ\nગણપતિ બાપ્પા મોર્યા!";

  // Full name-line rewrite on 723×1024 invite (covers dotted blank)
  const LAYOUT = {
    coverX0: 285 / 723,
    coverY0: 501 / 1024,
    coverX1: 638 / 723,
    coverY1: 534 / 1024,
    textX: 288 / 723,
    textColor: "#66161c",
    bgColor: "#fcf4e8",
    maxFont: 20,
    minFont: 12,
    fontFamily: '"Noto Serif Gujarati", "Noto Sans Gujarati", serif',
  };

  const canvas = document.getElementById("inviteCanvas");
  const ctx = canvas.getContext("2d");
  const nameInput = document.getElementById("guestName");
  const shareBtn = document.getElementById("shareWhatsApp");
  const downloadBtn = document.getElementById("downloadInvite");
  const statusHint = document.getElementById("statusHint");

  let inviteImage = null;
  let drawToken = 0;

  function setStatus(message) {
    statusHint.textContent = message;
  }

  function fitFontSize(text, maxWidth) {
    let size = LAYOUT.maxFont;
    while (size > LAYOUT.minFont) {
      ctx.font = `700 ${size}px ${LAYOUT.fontFamily}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return size;
  }

  function renderInvite(name) {
    if (!inviteImage) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(inviteImage, 0, 0, w, h);

    const trimmed = (name || "").trim();
    if (!trimmed) return;

    const x0 = LAYOUT.coverX0 * w;
    const y0 = LAYOUT.coverY0 * h;
    const x1 = LAYOUT.coverX1 * w;
    const y1 = LAYOUT.coverY1 * h;
    const textX = LAYOUT.textX * w;

    ctx.fillStyle = LAYOUT.bgColor;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    const line = GREETING + trimmed;
    const maxTextWidth = x1 - textX - 8;
    const fontSize = fitFontSize(line, maxTextWidth);
    ctx.font = `700 ${fontSize}px ${LAYOUT.fontFamily}`;
    ctx.fillStyle = LAYOUT.textColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(line, textX, (y0 + y1) / 2 + fontSize * 0.05, maxTextWidth);
  }

  async function waitForFonts() {
    if (!document.fonts?.load) return;
    await Promise.all([
      document.fonts.load('700 20px "Noto Serif Gujarati"'),
      document.fonts.load('600 20px "Noto Sans Gujarati"'),
      document.fonts.load('700 48px "Cormorant Garamond"'),
    ]);
  }

  function canvasBlob(type = "image/jpeg", quality = 0.92) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))),
        type,
        quality
      );
    });
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
    setStatus("આમંત્રણ તૈયાર થઈ રહ્યું છે…");

    try {
      renderInvite(name);
      const blob = await canvasBlob();
      const file = new File([blob], `vighnaharta-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "વિઘ્નહર્તા આમંત્રણ",
          text: SHARE_TEXT,
        });
        setStatus("શેર મેનૂમાંથી WhatsApp પસંદ કરો.");
        return;
      }

      downloadBlob(blob, file.name);
      window.open(
        `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT)}`,
        "_blank",
        "noopener,noreferrer"
      );
      setStatus("ફોટો ડાઉનલોડ થયો — WhatsAppમાં અટેચ કરો.");
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

    try {
      renderInvite(name);
      const blob = await canvasBlob();
      downloadBlob(blob, "vighnaharta-invite.jpg");
      setStatus("આમંત્રણ ડાઉનલોડ થયું.");
    } catch (err) {
      console.error(err);
      setStatus("ડાઉનલોડ ન થઈ શક્યું.");
    }
  }

  function scheduleRender() {
    const token = ++drawToken;
    requestAnimationFrame(() => {
      if (token !== drawToken) return;
      renderInvite(nameInput.value);
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
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Invite image failed to load"));
        img.src = INVITE_SRC;
      });

      canvas.width = inviteImage.naturalWidth;
      canvas.height = inviteImage.naturalHeight;
      renderInvite("");
      setStatus("નામ લખો, પછી WhatsApp પર સીધું શેર કરો.");
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
