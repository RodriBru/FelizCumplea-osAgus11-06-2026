/* ==========================================================
   CARTAS PARA AGUSTINA - V2
   - 10 lugares reservados.
   - Sobres SVG con sellos configurables.
   - Zoom real con desplazamiento dentro de la carta.
   - Final emotivo solo al completar la lectura.
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "cartas-agustina-leidas-v2";
  const readStorage = window.sessionStorage;
  const MIN_ZOOM = 0.72;
  const MAX_ZOOM = 2.65;
  const ZOOM_STEP = 0.17;

  const introScreen = document.querySelector("#introScreen");
  const collectionScreen = document.querySelector("#collectionScreen");
  const startButton = document.querySelector("#startButton");
  const homeButton = document.querySelector("#homeButton");
  const soundButton = document.querySelector("#soundButton");
  const randomButton = document.querySelector("#randomButton");
  const openActiveButton = document.querySelector("#openActiveButton");
  const envelopeWrapper = document.querySelector("#envelopeWrapper");
  const activeEnvelopeName = document.querySelector("#activeEnvelopeName");
  const activeEnvelopeHint = document.querySelector("#activeEnvelopeHint");
  const progressText = document.querySelector("#progressText");
  const progressBar = document.querySelector("#progressBar");
  const floatingPaperLayer = document.querySelector("#floatingPaperLayer");

  const openingOverlay = document.querySelector("#openingOverlay");
  const openingSealIcon = document.querySelector("#openingSealIcon");

  const letterModal = document.querySelector("#letterModal");
  const letterTitle = document.querySelector("#letterTitle");
  const letterImage = document.querySelector("#letterImage");
  const letterStage = document.querySelector("#letterStage");
  const previousLetterButton = document.querySelector("#previousLetterButton");
  const nextLetterButton = document.querySelector("#nextLetterButton");
  const zoomOutButton = document.querySelector("#zoomOutButton");
  const zoomInButton = document.querySelector("#zoomInButton");
  const resetZoomButton = document.querySelector("#resetZoomButton");

  const finalModal = document.querySelector("#finalModal");
  const closeFinalButton = document.querySelector("#closeFinalButton");

  let swiper;
  let activeIndex = 0;
  let zoom = 1;
  let soundEnabled = true;
  let audioContext = null;
  let pendingFinalCelebration = false;

  clearLegacyReadState();
  let readIds = loadReadIds();

  renderFloatingPapers();
  renderSlides();
  initSwiper();
  updateActiveMeta(false);
  updateProgress();

  /* ========================================================
     EVENTOS
  ======================================================== */

  startButton.addEventListener("click", enterCollection);
  homeButton.addEventListener("click", returnHome);
  openActiveButton.addEventListener("click", () => openLetter(activeIndex));
  randomButton.addEventListener("click", openRandomUnreadLetter);

  soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    const icon = soundButton.querySelector("i");

    icon.className = soundEnabled
      ? "ph ph-speaker-high"
      : "ph ph-speaker-slash";

    soundButton.setAttribute(
      "aria-label",
      soundEnabled ? "Desactivar sonidos" : "Activar sonidos"
    );

    if (soundEnabled) playTone(520, 0.08);
  });

  previousLetterButton.addEventListener("click", () => openAdjacentLetter(-1));
  nextLetterButton.addEventListener("click", () => openAdjacentLetter(1));

  zoomOutButton.addEventListener("click", () => changeZoom(-ZOOM_STEP));
  zoomInButton.addEventListener("click", () => changeZoom(ZOOM_STEP));
  resetZoomButton.addEventListener("click", () => setZoom(1));

  letterStage.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    changeZoom(event.deltaY > 0 ? -0.12 : 0.12);
  }, { passive: false });

  window.addEventListener("resize", () => {
    if (!letterModal.hidden) setZoom(zoom, { preserveScroll: true });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeLetterModal);
  });

  closeFinalButton.addEventListener("click", closeFinalModal);

  document.addEventListener("keydown", (event) => {
    if (finalModal.hidden && letterModal.hidden) return;

    if (!finalModal.hidden && event.key === "Escape") {
      closeFinalModal();
      return;
    }

    if (letterModal.hidden) return;

    if (event.key === "Escape") closeLetterModal();
    if (event.key === "ArrowRight") openAdjacentLetter(1);
    if (event.key === "ArrowLeft") openAdjacentLetter(-1);
    if (event.key === "+" || event.key === "=") changeZoom(ZOOM_STEP);
    if (event.key === "-") changeZoom(-ZOOM_STEP);
    if (event.key === "0") setZoom(1);
  });

  /* ========================================================
     RENDER
  ======================================================== */

  function renderSlides() {
    envelopeWrapper.innerHTML = CARTAS.map((carta, index) => {
      const isRead = readIds.includes(carta.id);
      const label = displayLetterName(carta);

      return `
        <div class="swiper-slide">
          <article class="envelope-card ${isRead ? "is-read" : ""}" data-card-id="${escapeHtml(carta.id)}">
            <button
              class="envelope-card__button"
              type="button"
              data-open-index="${index}"
              aria-label="Abrir ${escapeHtml(label)}"
            >
              <span class="envelope-card__status">
                <i class="ph-fill ph-check-circle" aria-hidden="true"></i>
                Leída
              </span>

              ${createEnvelopeSvg(carta, index)}
            </button>

            <p class="envelope-card__name">${escapeHtml(label)}</p>
          </article>
        </div>
      `;
    }).join("");

    document.querySelectorAll("[data-open-index]").forEach((button) => {
      button.addEventListener("click", () => {
        openLetter(Number(button.dataset.openIndex));
      });
    });
  }

  function createEnvelopeSvg(carta, index) {
    const gradientId = `paperGradient-${index}`;
    const flapGradientId = `flapGradient-${index}`;
    const sideLeftGradientId = `sideLeftGradient-${index}`;
    const sideRightGradientId = `sideRightGradient-${index}`;
    const bottomGradientId = `bottomGradient-${index}`;
    const sealGradientId = `sealGradient-${index}`;
    const shadowId = `shadow-${index}`;
    const grainId = `grain-${index}`;

    return `
      <svg class="envelope-svg" viewBox="0 0 700 476" aria-hidden="true">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fff5d8"/>
            <stop offset=".38" stop-color="#f4d7a5"/>
            <stop offset=".72" stop-color="#e3bb7d"/>
            <stop offset="1" stop-color="#cfa069"/>
          </linearGradient>

          <linearGradient id="${flapGradientId}" x1=".24" y1="0" x2=".76" y2="1">
            <stop offset="0" stop-color="#fff9e3"/>
            <stop offset=".62" stop-color="#edca91"/>
            <stop offset="1" stop-color="#d4a264"/>
          </linearGradient>

          <linearGradient id="${sideLeftGradientId}" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#f6dcaa"/>
            <stop offset="1" stop-color="#d9ad69"/>
          </linearGradient>

          <linearGradient id="${sideRightGradientId}" x1="1" y1="0" x2="0" y2="1">
            <stop stop-color="#f2d49e"/>
            <stop offset="1" stop-color="#d4a25f"/>
          </linearGradient>

          <linearGradient id="${bottomGradientId}" x1=".5" y1=".1" x2=".5" y2="1">
            <stop stop-color="#f8dda9"/>
            <stop offset="1" stop-color="#dfb06d"/>
          </linearGradient>

          <radialGradient id="${sealGradientId}" cx=".34" cy=".25" r=".82">
            <stop offset="0" stop-color="#dc7663"/>
            <stop offset=".56" stop-color="#a54136"/>
            <stop offset="1" stop-color="#68231d"/>
          </radialGradient>

          <filter id="${shadowId}" x="-30%" y="-35%" width="170%" height="180%">
            <feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#6f4c34" flood-opacity=".22"/>
          </filter>

          <filter id="${grainId}">
            <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 .13"/>
            </feComponentTransfer>
          </filter>
        </defs>

        <g filter="url(#${shadowId})">
          <rect x="24" y="27" width="652" height="407" rx="22" fill="url(#${gradientId})" stroke="#bd874d" stroke-width="4"/>
          <rect x="24" y="27" width="652" height="407" rx="22" filter="url(#${grainId})" opacity=".72"/>

          <rect x="39" y="42" width="622" height="377" rx="16" fill="none" stroke="#fff1c8" stroke-width="4" opacity=".88"/>
          <rect x="50" y="53" width="600" height="355" rx="12" fill="none" stroke="#b77a3b" stroke-width="2" opacity=".52"/>

          <path d="M25 35 L351 250 L25 432 Z" fill="url(#${sideLeftGradientId})" stroke="#c18d52" stroke-width="2.4"/>
          <path d="M675 35 L349 250 L675 432 Z" fill="url(#${sideRightGradientId})" stroke="#b57b3e" stroke-width="2.4"/>
          <path d="M26 431 L350 222 L674 431 Z" fill="url(#${bottomGradientId})" stroke="#bd874b" stroke-width="2.5"/>

          <path d="M25 35 L350 262 L675 35 Z" fill="url(#${flapGradientId})" stroke="#bd874b" stroke-width="3.2"/>
          <path d="M46 47 L350 239 L654 47" fill="none" stroke="#fff3c8" stroke-width="4" opacity=".42"/>
          <path d="M50 409 L350 235 L650 409" fill="none" stroke="#9f6d37" stroke-width="2" opacity=".26"/>

          <path d="M61 76 C92 54 111 56 140 72 M560 72 C591 54 613 56 641 73"
                fill="none" stroke="#ad7136" stroke-width="5" stroke-linecap="round" opacity=".7"/>
          <path d="M70 391 C104 376 130 379 162 393 M538 393 C573 376 601 379 632 394"
                fill="none" stroke="#ad7136" stroke-width="5" stroke-linecap="round" opacity=".58"/>

          <path d="M83 87 c18 17 28 15 36 0 c8 16 18 16 34 0
                   M548 87 c18 17 28 15 36 0 c8 16 18 16 34 0"
                fill="none" stroke="#b98142" stroke-width="4" stroke-linecap="round" opacity=".68"/>

          <path d="M33 31 L349 254 L667 31" fill="none" stroke="#8b6037" stroke-width="2" opacity=".16"/>
          <path d="M32 427 L350 225 L668 427" fill="none" stroke="#fff0be" stroke-width="3" opacity=".28"/>

          <g transform="translate(350 246)">
            <circle r="73" fill="url(#${sealGradientId})"/>
            <circle r="73" fill="none" stroke="#5d1f1a" stroke-width="2" opacity=".26"/>
            <circle r="58" fill="none" stroke="#f1ad96" stroke-width="4" opacity=".48"/>
            <circle r="46" fill="none" stroke="#5f201b" stroke-width="5" opacity=".54"/>
            <circle r="34" fill="none" stroke="#f4b7a2" stroke-width="3" opacity=".36"/>
            <path d="M-48 -45 C-30 -58 18 -61 47 -42" fill="none" stroke="#f6b59d" stroke-width="5" stroke-linecap="round" opacity=".24"/>
            ${sealSvg(carta.tipoSello)}
          </g>
        </g>
      </svg>
    `;
  }

  function renderFloatingPapers() {
    const pieces = [
      { left: "7%", top: "12%", rotate: "-12deg", duration: "11s" },
      { left: "76%", top: "10%", rotate: "12deg", duration: "15s" },
      { left: "10%", top: "70%", rotate: "7deg", duration: "13s" },
      { left: "78%", top: "66%", rotate: "-8deg", duration: "12s" },
      { left: "44%", top: "80%", rotate: "4deg", duration: "16s" },
      { left: "47%", top: "7%", rotate: "-5deg", duration: "14s" }
    ];

    floatingPaperLayer.innerHTML = pieces.map((piece) => `
      <span
        class="floating-paper"
        style="left:${piece.left};top:${piece.top};--rot:${piece.rotate};--duration:${piece.duration}"
      ></span>
    `).join("");
  }

  /* ========================================================
     SWIPER
  ======================================================== */

  function initSwiper() {
    swiper = new Swiper(".envelope-swiper", {
      effect: "coverflow",
      centeredSlides: true,
      slidesPerView: "auto",
      grabCursor: true,
      loop: false,
      speed: 640,
      spaceBetween: 10,
      threshold: 6,
      resistanceRatio: 0.72,
      slideToClickedSlide: true,
      watchSlidesProgress: true,
      coverflowEffect: {
        rotate: 7,
        stretch: 0,
        depth: 116,
        modifier: 1,
        scale: 0.93,
        slideShadows: false
      },
      on: {
        init() {
          activeIndex = this.activeIndex;
          updateActiveMeta(false);
        },

        slideChange() {
          activeIndex = this.activeIndex;
          updateActiveMeta(true);
          playTone(370, 0.035);
        }
      }
    });
  }

  function updateActiveMeta(animate = true) {
    const carta = CARTAS[activeIndex];
    if (!carta) return;

    activeEnvelopeName.textContent = displayLetterName(carta);
    activeEnvelopeHint.textContent = carta.subtitulo;

    if (animate && window.gsap) {
      gsap.fromTo(
        [activeEnvelopeHint, activeEnvelopeName],
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.34, stagger: 0.05, ease: "power2.out" }
      );
    }
  }

  /* ========================================================
     PANTALLAS
  ======================================================== */

  function enterCollection() {
    playTone(630, 0.09);

    gsap.timeline()
      .to(".intro-panel", {
        y: -16,
        opacity: 0,
        duration: 0.46,
        ease: "power2.in"
      })
      .to(introScreen, {
        opacity: 0,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          introScreen.classList.remove("is-active");
          collectionScreen.classList.add("is-active");

          gsap.fromTo(
            collectionScreen,
            { opacity: 0 },
            { opacity: 1, duration: 0.62, ease: "power2.out" }
          );

          gsap.fromTo(
            [".topbar", ".collection-copy", ".progress-track"],
            { y: 14, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.56, stagger: 0.07, ease: "power2.out" }
          );

          gsap.fromTo(
            ".envelope-swiper",
            { y: 26, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.74, delay: 0.06, ease: "power2.out" }
          );

          gsap.fromTo(
            ".active-envelope-meta, .ghost-button",
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, delay: 0.18, stagger: 0.05, ease: "power2.out" }
          );

          gsap.set(".intro-panel", { y: 0, opacity: 1 });
        }
      });
  }

  function returnHome() {
    gsap.to(collectionScreen, {
      opacity: 0,
      duration: 0.4,
      ease: "power2.in",
      onComplete: () => {
        collectionScreen.classList.remove("is-active");
        introScreen.classList.add("is-active");
        gsap.fromTo(introScreen, { opacity: 0 }, { opacity: 1, duration: 0.58, ease: "power2.out" });
      }
    });
  }

  /* ========================================================
     APERTURA + LECTOR
  ======================================================== */

  function openLetter(index) {
    activeIndex = normalizeIndex(index);
    const carta = CARTAS[activeIndex];

    swiper.slideTo(activeIndex);
    openingSealIcon.innerHTML = openingSealSvg(carta.tipoSello);

    openingOverlay.classList.add("is-active");
    openingOverlay.setAttribute("aria-hidden", "false");

    playOpeningSound(carta.tipoSello);

    gsap.set(".opening-envelope", { opacity: 1, scale: 0.78, y: 28, rotate: -1 });
    gsap.set(".opening-envelope__flap", { rotateX: 0, zIndex: 6 });
    gsap.set(".opening-envelope__paper", { yPercent: 0, opacity: 1, zIndex: 3 });
    gsap.set(".opening-envelope__seal", { scale: 1, opacity: 1, y: 0 });
    gsap.set(".opening-light", { scale: 0.7, opacity: 0 });
    gsap.set(".opening-overlay p", { y: 8, opacity: 0 });

    gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        openingOverlay.classList.remove("is-active");
        openingOverlay.setAttribute("aria-hidden", "true");

        const wasNewRead = markAsRead(carta.id);
        if (wasNewRead && readIds.length === CARTAS.length) {
          pendingFinalCelebration = true;
        }

        showLetterReader(carta);
      }
    })
      .to(".opening-envelope", {
        scale: 1,
        y: 0,
        rotate: 0,
        duration: 0.56,
        ease: "power3.out"
      })
      .to(".opening-overlay p", {
        y: 0,
        opacity: 1,
        duration: 0.32
      }, "-=0.28")
      .to(".opening-envelope__seal", {
        scale: 0.9,
        duration: 0.16,
        ease: "power1.out"
      }, "+=0.1")
      .to(".opening-envelope__seal", {
        scale: 0.08,
        opacity: 0,
        y: -8,
        duration: 0.3,
        ease: "power2.in"
      })
      .to(".opening-envelope__flap", {
        rotateX: 184,
        duration: 0.68,
        ease: "power2.inOut"
      }, "-=0.06")
      .set(".opening-envelope__flap", { zIndex: 2 })
      .set(".opening-envelope__paper", { zIndex: 7 })
      .to(".opening-envelope__paper", {
        yPercent: -68,
        duration: 0.74,
        ease: "power3.out"
      }, "-=0.28")
      .to(".opening-light", {
        scale: 1.65,
        opacity: 1,
        duration: 0.42,
        ease: "power2.out"
      }, "-=0.34")
      .to(".opening-envelope", {
        opacity: 0,
        scale: 1.05,
        duration: 0.24
      }, "+=0.06");
  }

  function showLetterReader(carta) {
    letterTitle.textContent = displayLetterName(carta);
    letterImage.src = carta.imagen;
    letterImage.alt = `Imagen escaneada de ${displayLetterName(carta)}`;

    letterModal.hidden = false;

    const prepareImage = () => {
      setZoom(1, { preserveScroll: false });
      letterStage.scrollTo({ top: 0, left: 0 });
    };

    if (letterImage.complete) {
      requestAnimationFrame(prepareImage);
    } else {
      letterImage.addEventListener("load", prepareImage, { once: true });
    }

    gsap.fromTo(
      ".letter-reader",
      { y: 22, scale: 0.97, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.42, ease: "power2.out" }
    );
  }

  function closeLetterModal() {
    if (letterModal.hidden) return;

    gsap.to(".letter-reader", {
      y: 14,
      opacity: 0,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        letterModal.hidden = true;
        gsap.set(".letter-reader", { y: 0, opacity: 1 });

        if (pendingFinalCelebration) {
          pendingFinalCelebration = false;
          showFinalCelebration();
        }
      }
    });
  }

  function openAdjacentLetter(step) {
    if (!letterModal.hidden) {
      letterModal.hidden = true;
      gsap.set(".letter-reader", { y: 0, opacity: 1, scale: 1 });
    }

    openLetter(activeIndex + step);
  }

  function openRandomUnreadLetter() {
    const unreadIndexes = CARTAS
      .map((carta, index) => ({ carta, index }))
      .filter(({ carta }) => !readIds.includes(carta.id))
      .map(({ index }) => index);

    const options = unreadIndexes.length
      ? unreadIndexes
      : CARTAS.map((_, index) => index);

    const randomIndex = options[Math.floor(Math.random() * options.length)];
    openLetter(randomIndex);
  }

  /* ========================================================
     PROGRESO
  ======================================================== */

  function markAsRead(id) {
    if (readIds.includes(id)) return false;

    readIds.push(id);
    saveReadIds();
    refreshReadState();
    updateProgress();

    return true;
  }

  function refreshReadState() {
    document.querySelectorAll(".envelope-card").forEach((card) => {
      card.classList.toggle("is-read", readIds.includes(card.dataset.cardId));
    });
  }

  function updateProgress() {
    const opened = readIds.length;
    const total = CARTAS.length;
    const percent = total ? (opened / total) * 100 : 0;

    progressText.textContent = `${opened} de ${total} leídas`;
    progressBar.style.width = `${percent}%`;
  }

  function loadReadIds() {
    try {
      const saved = JSON.parse(readStorage.getItem(STORAGE_KEY));

      return Array.isArray(saved)
        ? saved.filter((id) => CARTAS.some((carta) => carta.id === id))
        : [];
    } catch {
      return [];
    }
  }

  function saveReadIds() {
    try {
      readStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
    } catch {
      // Si el navegador bloquea storage, el estado sigue funcionando en memoria.
    }
  }

  function clearLegacyReadState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Algunos navegadores privados pueden bloquear el acceso a localStorage.
    }
  }

  /* ========================================================
     ZOOM
  ======================================================== */

  function changeZoom(amount) {
    setZoom(zoom + amount, { preserveScroll: true });
  }

  function setZoom(value, options = {}) {
    const { preserveScroll = true } = options;
    const scrollRatioX = preserveScroll
      ? (letterStage.scrollLeft + letterStage.clientWidth / 2) / Math.max(1, letterStage.scrollWidth)
      : 0;
    const scrollRatioY = preserveScroll
      ? (letterStage.scrollTop + letterStage.clientHeight / 2) / Math.max(1, letterStage.scrollHeight)
      : 0;

    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
    letterImage.style.width = `${Math.round(getBaseLetterWidth() * zoom)}px`;
    resetZoomButton.textContent = `${Math.round(zoom * 100)}%`;

    requestAnimationFrame(() => {
      if (!preserveScroll) {
        letterStage.scrollTo({ top: 0, left: Math.max(0, (letterStage.scrollWidth - letterStage.clientWidth) / 2) });
        return;
      }

      letterStage.scrollLeft = Math.max(0, letterStage.scrollWidth * scrollRatioX - letterStage.clientWidth / 2);
      letterStage.scrollTop = Math.max(0, letterStage.scrollHeight * scrollRatioY - letterStage.clientHeight / 2);
    });
  }

  function getBaseLetterWidth() {
    const available = Math.max(220, letterStage.clientWidth - 48);
    return Math.min(available, 820);
  }

  /* ========================================================
     FINAL
  ======================================================== */

  function showFinalCelebration() {
    finalModal.hidden = false;

    if (typeof confetti === "function") {
      const end = Date.now() + 1300;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 62,
          spread: 52,
          scalar: 0.72,
          origin: { x: 0, y: 0.72 },
          colors: ["#f4d2b6", "#ba6756", "#d7ae72", "#fff4df"]
        });

        confetti({
          particleCount: 2,
          angle: 118,
          spread: 52,
          scalar: 0.72,
          origin: { x: 1, y: 0.72 },
          colors: ["#f4d2b6", "#ba6756", "#d7ae72", "#fff4df"]
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      };

      frame();
    }

    gsap.fromTo(
      ".final-modal__card",
      { y: 26, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 0.58, ease: "power2.out" }
    );
  }

  function closeFinalModal() {
    if (finalModal.hidden) return;

    gsap.to(".final-modal__card", {
      y: 12,
      opacity: 0,
      duration: 0.22,
      ease: "power2.in",
      onComplete: () => {
        finalModal.hidden = true;
        gsap.set(".final-modal__card", { y: 0, opacity: 1 });
      }
    });
  }

  /* ========================================================
     AUDIO LIVIANO
  ======================================================== */

  function playTone(frequency = 440, duration = 0.08) {
    if (!soundEnabled) return;

    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.026, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration + 0.03);
    } catch {
      // La experiencia continúa aunque el navegador bloquee el audio.
    }
  }

  function playOpeningSound(type) {
    if (!soundEnabled) return;

    const motifs = {
      cookie: [330, 415, 523],
      music: [392, 494, 659],
      heart: [349, 440, 587]
    };
    const notes = motifs[type] ?? motifs.heart;

    notes.forEach((frequency, index) => {
      window.setTimeout(() => playTone(frequency, 0.075), index * 72);
    });
  }

  /* ========================================================
     HELPERS
  ======================================================== */

  function normalizeIndex(index) {
    const total = CARTAS.length;
    return ((index % total) + total) % total;
  }

  function displayLetterName(carta) {
    return carta.persona.toLowerCase().startsWith("carta")
      ? carta.persona
      : `Carta de ${carta.persona}`;
  }

  function openingSealSvg(type) {
    return `
      <svg viewBox="-42 -42 84 84" focusable="false" aria-hidden="true">
        ${sealSvg(type)}
      </svg>
    `;
  }

  function sealSvg(type) {
    const symbolPath = (d) => `
      <path d="${d}" fill="none" stroke="#5f201b" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".34"/>
      <path d="${d}" fill="none" stroke="#f4b29f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".76"/>
      <path d="${d}" fill="none" stroke="#ffd6c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".32"/>
    `;

    const circleSymbol = (extra = "") => `
      <circle r="23" fill="none" stroke="#5f201b" stroke-width="10" opacity=".34"/>
      <circle r="23" fill="none" stroke="#f4b29f" stroke-width="6" opacity=".74"/>
      ${extra}
    `;

    const icons = {
      cookie: `
        <g transform="translate(-1 -1)">
          <circle r="23" fill="none" stroke="#5f201b" stroke-width="10" opacity=".32"/>
          <circle r="23" fill="none" stroke="#f2ad98" stroke-width="6" opacity=".78"/>
          <circle cx="-9" cy="-8" r="4.4" fill="#5f201b" opacity=".34"/>
          <circle cx="-9" cy="-8" r="2.7" fill="#f2ad98" opacity=".82"/>
          <circle cx="8" cy="-10" r="4.1" fill="#5f201b" opacity=".34"/>
          <circle cx="8" cy="-10" r="2.5" fill="#f2ad98" opacity=".82"/>
          <circle cx="-1" cy="4" r="4.3" fill="#5f201b" opacity=".34"/>
          <circle cx="-1" cy="4" r="2.7" fill="#f2ad98" opacity=".82"/>
          <circle cx="11" cy="12" r="3.8" fill="#5f201b" opacity=".34"/>
          <circle cx="11" cy="12" r="2.3" fill="#f2ad98" opacity=".82"/>
          <circle cx="-12" cy="13" r="3.7" fill="#5f201b" opacity=".34"/>
          <circle cx="-12" cy="13" r="2.2" fill="#f2ad98" opacity=".82"/>
        </g>
      `,
      flower: symbolPath("M0-24C13-24 15-9 6-2C18-10 29-2 23 10C17 20 4 13 1 5C4 18-6 28-16 22C-26 16-17 3-8 0C-21 3-28-9-20-18C-13-27-3-16 0-7C-2-18 0-24 0-24Z"),
      star: symbolPath("M0-26 8-8 27-7 12 5 16 24 0 14-17 24-12 5-27-7-8-8Z"),
      moon: symbolPath("M11-25C-13-18-19 15 8 25C-16 28-30 7-22-14C-15-29 2-32 11-25Z"),
      sun: `${circleSymbol()}${symbolPath("M0-32v9M0 23v9M-32 0h9M23 0h9M-22-22l7 7M15 15l7 7M22-22l-7 7M-15 15l-7 7")}`,
      leaf: symbolPath("M-24 21C-19-11 4-26 25-21C21 6 8 22-24 21ZM-20 18C-4 6 8-3 22-18"),
      music: symbolPath("M5-21v30c0 8-16 12-19 3c-3-8 10-16 19-8M5-21l19-4v29c0 8-16 12-19 3"),
      sparkle: symbolPath("M0-29C4-10 10-4 29 0C10 4 4 10 0 29C-4 10-10 4-29 0C-10-4-4-10 0-29Z"),
      heart: symbolPath("M0 23S-26 8-26-8C-26-24-5-27 0-12C5-27 26-24 26-8C26 8 0 23 0 23Z"),
      rose: symbolPath("M0 22C-21 19-28 0-16-16C-5-30 18-24 24-7C30 11 15 26 0 22ZM-16-16C-3-12 4-3 0 9M24-7C10-10 2-4 0 9")
    };

    return icons[type] ?? icons.heart;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
