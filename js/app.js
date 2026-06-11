/* ==========================================================
   CARTAS PARA AGUSTINA
   - Configuracion centralizada en js/cartas.js.
   - Progreso persistente en localStorage.
   - Sobres SVG con sellos configurables.
   - Visor con zoom real y cierre final con video sorpresa.
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "cartas-agustina-estado-v3";
  const LEGACY_READ_KEY = "cartas-agustina-leidas-v2";
  const MIN_ZOOM = 0.78;
  const MAX_ZOOM = 2.9;
  const ZOOM_STEP = 0.17;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const introScreen = document.querySelector("#introScreen");
  const collectionScreen = document.querySelector("#collectionScreen");
  const startButton = document.querySelector("#startButton");
  const homeButton = document.querySelector("#homeButton");
  const soundButton = document.querySelector("#soundButton");
  const randomButton = document.querySelector("#randomButton");
  const openActiveButton = document.querySelector("#openActiveButton");
  const replayVideoButton = document.querySelector("#replayVideoButton");
  const envelopeWrapper = document.querySelector("#envelopeWrapper");
  const activeEnvelopeName = document.querySelector("#activeEnvelopeName");
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

  const videoModal = document.querySelector("#videoModal");
  const surpriseVideo = document.querySelector("#surpriseVideo");
  const videoPendingState = document.querySelector("#videoPendingState");
  const videoControls = document.querySelector("#videoControls");
  const videoPlayButton = document.querySelector("#videoPlayButton");
  const videoVolumeControl = document.querySelector("#videoVolumeControl");
  const videoFullscreenButton = document.querySelector("#videoFullscreenButton");

  let swiper;
  resetStoredStateOnReload();
  let state = loadState();
  let activeIndex = normalizeIndex(state.activeIndex);
  let readIds = normalizeReadIds(state.readIds);
  let zoom = 1;
  let soundEnabled = state.soundEnabled !== false;
  let audioContext = null;
  let audioUnlocked = false;
  let pendingFinalCelebration = false;
  let isOpening = false;
  let lastFocusedElement = null;

  state.readIds = readIds;
  state.activeIndex = activeIndex;
  state.soundEnabled = soundEnabled;
  saveState();

  renderFloatingPapers();
  renderSlides();
  initSwiper();
  syncSoundButton();
  updateActiveMeta(false);
  updateProgress();
  updateVideoReplayVisibility();

  /* ========================================================
     EVENTOS
  ======================================================== */

  startButton.addEventListener("click", () => {
    unlockAudio();
    playSfx("enter");
    enterCollection();
  });
  homeButton.addEventListener("click", () => {
    unlockAudio();
    playSfx("close");
    returnHome();
  });
  openActiveButton.addEventListener("click", () => {
    unlockAudio();
    openLetter(activeIndex);
  });
  randomButton.addEventListener("click", () => {
    unlockAudio();
    openRandomUnreadLetter();
  });
  replayVideoButton.addEventListener("click", () => {
    unlockAudio();
    showVideoSurprise();
  });
  closeFinalButton.addEventListener("click", () => {
    unlockAudio();
    closeFinalModal({ showVideo: true });
  });

  soundButton.addEventListener("click", () => {
    unlockAudio();
    soundEnabled = !soundEnabled;
    state.soundEnabled = soundEnabled;
    saveState();
    syncSoundButton();

    if (soundEnabled) playSfx("toggle");
  });

  previousLetterButton.addEventListener("click", () => {
    unlockAudio();
    openAdjacentLetter(-1);
  });
  nextLetterButton.addEventListener("click", () => {
    unlockAudio();
    openAdjacentLetter(1);
  });

  zoomOutButton.addEventListener("click", () => {
    playSfx("tick");
    changeZoom(-ZOOM_STEP);
  });
  zoomInButton.addEventListener("click", () => {
    playSfx("tick");
    changeZoom(ZOOM_STEP);
  });
  resetZoomButton.addEventListener("click", () => {
    playSfx("tick");
    setZoom(1);
  });

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

  document.querySelectorAll("[data-close-video]").forEach((button) => {
    button.addEventListener("click", closeVideoModal);
  });

  surpriseVideo.addEventListener("error", showVideoPendingState);
  surpriseVideo.addEventListener("loadedmetadata", showVideoReadyState);
  surpriseVideo.addEventListener("play", updateVideoPlayButton);
  surpriseVideo.addEventListener("pause", updateVideoPlayButton);
  surpriseVideo.addEventListener("volumechange", syncVideoVolumeControl);
  videoPlayButton.addEventListener("click", toggleVideoPlayback);
  videoVolumeControl.addEventListener("input", updateVideoVolume);
  videoFullscreenButton.addEventListener("click", enterVideoFullscreen);

  document.addEventListener("keydown", (event) => {
    if (!videoModal.hidden && event.key === "Escape") {
      closeVideoModal();
      return;
    }

    if (!finalModal.hidden && event.key === "Escape") {
      closeFinalModal({ showVideo: false });
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
      const isRead = readIds.includes(letterKey(carta));
      const label = displayLetterName(carta);

      return `
        <div class="swiper-slide">
          <article class="envelope-card ${isRead ? "is-read" : ""}" data-card-id="${escapeHtml(letterKey(carta))}">
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
        unlockAudio();
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
    const shineId = `shine-${index}`;

    return `
      <svg class="envelope-svg" viewBox="0 0 700 476" aria-hidden="true">
        <defs>
          <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fff7df"/>
            <stop offset=".38" stop-color="#f4d6a4"/>
            <stop offset=".72" stop-color="#e1b979"/>
            <stop offset="1" stop-color="#c9955e"/>
          </linearGradient>

          <linearGradient id="${flapGradientId}" x1=".24" y1="0" x2=".76" y2="1">
            <stop offset="0" stop-color="#fffbe8"/>
            <stop offset=".6" stop-color="#edca91"/>
            <stop offset="1" stop-color="#d09b5e"/>
          </linearGradient>

          <linearGradient id="${sideLeftGradientId}" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#f9e2b4"/>
            <stop offset="1" stop-color="#d6a762"/>
          </linearGradient>

          <linearGradient id="${sideRightGradientId}" x1="1" y1="0" x2="0" y2="1">
            <stop stop-color="#f5d8a6"/>
            <stop offset="1" stop-color="#cf9a58"/>
          </linearGradient>

          <linearGradient id="${bottomGradientId}" x1=".5" y1=".1" x2=".5" y2="1">
            <stop stop-color="#f9dfa9"/>
            <stop offset="1" stop-color="#dba966"/>
          </linearGradient>

          <radialGradient id="${sealGradientId}" cx=".33" cy=".24" r=".86">
            <stop offset="0" stop-color="#e6816d"/>
            <stop offset=".53" stop-color="#a84237"/>
            <stop offset="1" stop-color="#64201b"/>
          </radialGradient>

          <radialGradient id="${shineId}" cx=".28" cy=".18" r=".55">
            <stop stop-color="#fff1de" stop-opacity=".48"/>
            <stop offset=".42" stop-color="#f1ab94" stop-opacity=".16"/>
            <stop offset="1" stop-color="#8b2e27" stop-opacity="0"/>
          </radialGradient>

          <filter id="${shadowId}" x="-30%" y="-35%" width="170%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="13" flood-color="#60402d" flood-opacity=".24"/>
          </filter>

          <filter id="${grainId}">
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 .12"/>
            </feComponentTransfer>
          </filter>
        </defs>

        <g filter="url(#${shadowId})">
          <rect x="24" y="27" width="652" height="407" rx="22" fill="url(#${gradientId})" stroke="#bd874d" stroke-width="4"/>
          <rect x="24" y="27" width="652" height="407" rx="22" filter="url(#${grainId})" opacity=".72"/>

          <rect x="39" y="42" width="622" height="377" rx="16" fill="none" stroke="#fff3ce" stroke-width="4" opacity=".86"/>
          <rect x="50" y="53" width="600" height="355" rx="12" fill="none" stroke="#a86d35" stroke-width="2" opacity=".45"/>

          <path d="M25 35 L351 250 L25 432 Z" fill="url(#${sideLeftGradientId})" stroke="#c18d52" stroke-width="2.4"/>
          <path d="M675 35 L349 250 L675 432 Z" fill="url(#${sideRightGradientId})" stroke="#b57b3e" stroke-width="2.4"/>
          <path d="M26 431 L350 222 L674 431 Z" fill="url(#${bottomGradientId})" stroke="#bd874b" stroke-width="2.5"/>

          <path d="M25 35 L350 262 L675 35 Z" fill="url(#${flapGradientId})" stroke="#bd874b" stroke-width="3.2"/>
          <path d="M46 47 L350 239 L654 47" fill="none" stroke="#fff4cd" stroke-width="4" opacity=".46"/>
          <path d="M50 409 L350 235 L650 409" fill="none" stroke="#9f6d37" stroke-width="2" opacity=".25"/>

          <path d="M61 76 C92 54 111 56 140 72 M560 72 C591 54 613 56 641 73"
                fill="none" stroke="#a96d35" stroke-width="5" stroke-linecap="round" opacity=".68"/>
          <path d="M70 391 C104 376 130 379 162 393 M538 393 C573 376 601 379 632 394"
                fill="none" stroke="#a96d35" stroke-width="5" stroke-linecap="round" opacity=".56"/>

          <path d="M83 87 c18 17 28 15 36 0 c8 16 18 16 34 0
                   M548 87 c18 17 28 15 36 0 c8 16 18 16 34 0"
                fill="none" stroke="#b98142" stroke-width="4" stroke-linecap="round" opacity=".68"/>

          <path d="M33 31 L349 254 L667 31" fill="none" stroke="#80562d" stroke-width="2" opacity=".15"/>
          <path d="M32 427 L350 225 L668 427" fill="none" stroke="#fff0be" stroke-width="3" opacity=".3"/>

          <g transform="translate(350 246)" class="seal-group">
            <circle r="75" fill="#6e221d" opacity=".2" transform="translate(5 7)"/>
            <circle r="73" fill="url(#${sealGradientId})"/>
            <circle r="73" fill="url(#${shineId})"/>
            <circle r="73" fill="none" stroke="#5d1f1a" stroke-width="2" opacity=".28"/>
            <circle r="58" fill="none" stroke="#f1ad96" stroke-width="4" opacity=".48"/>
            <circle r="46" fill="none" stroke="#5f201b" stroke-width="5" opacity=".48"/>
            <circle r="34" fill="none" stroke="#f4b7a2" stroke-width="3" opacity=".34"/>
            <path d="M-48 -45 C-30 -58 18 -61 47 -42" fill="none" stroke="#f6b59d" stroke-width="5" stroke-linecap="round" opacity=".25"/>
            ${sealSvg(carta.sello)}
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
    if (!window.Swiper) {
      swiper = null;
      document.querySelector(".envelope-swiper")?.classList.add("is-fallback");
      activeIndex = normalizeIndex(activeIndex);
      persistActiveIndex();
      updateActiveMeta(false);
      return;
    }

    swiper = new Swiper(".envelope-swiper", {
      effect: "coverflow",
      centeredSlides: true,
      slidesPerView: "auto",
      initialSlide: activeIndex,
      grabCursor: true,
      loop: false,
      speed: 620,
      spaceBetween: 8,
      threshold: 6,
      resistanceRatio: 0.74,
      slideToClickedSlide: true,
      watchSlidesProgress: true,
      coverflowEffect: {
        rotate: 6,
        stretch: 0,
        depth: 122,
        modifier: 1,
        scale: 0.92,
        slideShadows: false
      },
      on: {
        init() {
          activeIndex = this.activeIndex;
          persistActiveIndex();
          updateActiveMeta(false);
        },

        slideChange() {
          activeIndex = this.activeIndex;
          persistActiveIndex();
          updateActiveMeta(true);
          playSfx("swipe");
        }
      }
    });
  }

  function updateActiveMeta(animate = true) {
    const carta = CARTAS[activeIndex];
    if (!carta) return;

    activeEnvelopeName.textContent = displayLetterName(carta);
    openActiveButton.setAttribute("aria-label", `Abrir ${displayLetterName(carta)}`);

    if (animate && window.gsap && !REDUCED_MOTION && document.querySelector(".swiper-slide-active .envelope-card__name")) {
      gsap.fromTo(
        ".swiper-slide-active .envelope-card__name",
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.34, ease: "power2.out" }
      );
    }
  }

  /* ========================================================
     PANTALLAS
  ======================================================== */

  function enterCollection() {
    if (!window.gsap || REDUCED_MOTION) {
      introScreen.classList.remove("is-active");
      collectionScreen.classList.add("is-active");
      return;
    }

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
            visibleCollectionActions(),
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, delay: 0.18, stagger: 0.05, ease: "power2.out" }
          );

          gsap.set(".intro-panel", { y: 0, opacity: 1 });
        }
      });
  }

  function returnHome() {
    if (!window.gsap || REDUCED_MOTION) {
      collectionScreen.classList.remove("is-active");
      introScreen.classList.add("is-active");
      return;
    }

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
    if (isOpening) return;

    isOpening = true;
    setModalLock(true);
    activeIndex = normalizeIndex(index);
    const carta = CARTAS[activeIndex];

    if (swiper) swiper.slideTo(activeIndex);
    persistActiveIndex();
    openingSealIcon.innerHTML = openingSealSvg(carta.sello);

    openingOverlay.classList.add("is-active");
    openingOverlay.setAttribute("aria-hidden", "false");

    playOpeningSound(carta.sello);

    if (!window.gsap || REDUCED_MOTION) {
      finishOpening(carta);
      return;
    }

    gsap.set(".opening-envelope", { opacity: 1, scale: 0.78, y: 28, rotate: -1 });
    gsap.set(".opening-envelope__flap", { rotateX: 0, zIndex: 6 });
    gsap.set(".opening-envelope__paper", { yPercent: 5, opacity: 1, scale: 0.96, rotate: 0, zIndex: 3 });
    gsap.set(".opening-envelope__paper span", {
      opacity: 0.56,
      scaleX: 0.86,
      transformOrigin: "left center"
    });
    gsap.set(".opening-envelope__seal", { scale: 1, opacity: 1, y: 0 });
    gsap.set(".opening-light", { scale: 0.7, opacity: 0 });
    gsap.set(".opening-overlay p", { y: 8, opacity: 0 });

    gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => finishOpening(carta)
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
        rotateX: 188,
        duration: 0.68,
        ease: "power2.inOut"
      }, "-=0.06")
      .set(".opening-envelope__flap", { zIndex: 2 })
      .set(".opening-envelope__paper", { zIndex: 7 })
      .to(".opening-envelope__paper", {
        yPercent: -74,
        scale: 1,
        duration: 0.82,
        ease: "power3.out"
      }, "+=0.02")
      .to(".opening-envelope__paper span", {
        opacity: 0.28,
        scaleX: 1,
        duration: 0.32,
        stagger: 0.04,
        ease: "power2.out"
      }, "-=0.68")
      .to(".opening-light", {
        scale: 1.65,
        opacity: 1,
        duration: 0.42,
        ease: "power2.out"
      }, "-=0.52")
      .to(".opening-overlay p", {
        y: -4,
        opacity: 0.88,
        duration: 0.22
      }, "-=0.34")
      .to(".opening-envelope", {
        opacity: 0,
        scale: 1.05,
        y: -8,
        duration: 0.24
      }, "+=0.06");
  }

  function finishOpening(carta) {
    isOpening = false;
    openingOverlay.classList.remove("is-active");
    openingOverlay.setAttribute("aria-hidden", "true");
    playSfx("letter");

    const wasNewRead = markAsRead(carta.id);
    if (wasNewRead && readIds.length === CARTAS.length && !state.finalShown) {
      pendingFinalCelebration = true;
    }

    showLetterReader(carta);
  }

  function showLetterReader(carta) {
    lastFocusedElement = document.activeElement;
    letterTitle.textContent = displayLetterName(carta);
    letterImage.alt = carta.disponible
      ? `Imagen escaneada de ${displayLetterName(carta)}`
      : `Carta pendiente de ${displayLetterName(carta)}`;

    letterModal.hidden = false;
    setModalLock(true);

    let prepared = false;
    const prepareImage = () => {
      if (prepared) return;
      prepared = true;
      setZoom(1, { preserveScroll: false });
      letterStage.scrollTo({ top: 0, left: 0 });
    };

    letterImage.onload = () => requestAnimationFrame(prepareImage);
    letterImage.onerror = () => {
      letterImage.onerror = null;
      letterImage.src = createPlaceholderDataUri(carta);
    };

    letterImage.src = getLetterSource(carta);
    if (letterImage.complete && letterImage.naturalWidth) {
      requestAnimationFrame(prepareImage);
    }

    requestAnimationFrame(() => {
      letterStage.focus({ preventScroll: true });
    });

    if (window.gsap && !REDUCED_MOTION) {
      gsap.fromTo(
        ".letter-reader",
        { y: 20, scale: 0.98, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "power2.out" }
      );
    }
  }

  function closeLetterModal() {
    if (letterModal.hidden) return;
    playSfx("close");

    const finish = () => {
      letterModal.hidden = true;
      if (window.gsap) gsap.set(".letter-reader", { y: 0, opacity: 1, scale: 1 });

      if (pendingFinalCelebration) {
        pendingFinalCelebration = false;
        showFinalCelebration();
        return;
      }

      setModalLock(false);
      restoreFocus();
    };

    if (window.gsap && !REDUCED_MOTION) {
      gsap.to(".letter-reader", {
        y: 14,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: finish
      });
      return;
    }

    finish();
  }

  function openAdjacentLetter(step) {
    if (isOpening) return;

    if (!letterModal.hidden) {
      letterModal.hidden = true;
      if (window.gsap) gsap.set(".letter-reader", { y: 0, opacity: 1, scale: 1 });
    }

    openLetter(activeIndex + step);
  }

  function openRandomUnreadLetter() {
    if (isOpening) return;

    const unreadIndexes = CARTAS
      .map((carta, index) => ({ carta, index }))
      .filter(({ carta }) => !readIds.includes(letterKey(carta)))
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
    const key = String(id);
    if (readIds.includes(key)) return false;

    readIds.push(key);
    state.readIds = readIds;
    saveState();
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

  function persistActiveIndex() {
    state.activeIndex = activeIndex;
    saveState();
  }

  function loadState() {
    const fallback = {
      readIds: loadLegacyReadIds(),
      activeIndex: 0,
      finalShown: false,
      videoDiscovered: false,
      soundEnabled: true
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return fallback;

      return {
        ...fallback,
        ...saved,
        readIds: normalizeReadIds(saved.readIds)
      };
    } catch {
      return fallback;
    }
  }

  function resetStoredStateOnReload() {
    const navigation = performance.getEntriesByType?.("navigation")?.[0];
    const isReload = navigation
      ? navigation.type === "reload"
      : performance.navigation?.type === performance.navigation?.TYPE_RELOAD;

    if (!isReload) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_READ_KEY);
      sessionStorage.removeItem(LEGACY_READ_KEY);
    } catch {
      // Si storage esta bloqueado, no hay nada que resetear.
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        readIds,
        activeIndex,
        finalShown: Boolean(state.finalShown),
        videoDiscovered: Boolean(state.videoDiscovered),
        soundEnabled
      }));
    } catch {
      // Si el navegador bloquea storage, la experiencia sigue funcionando en memoria.
    }
  }

  function loadLegacyReadIds() {
    try {
      const raw = localStorage.getItem(LEGACY_READ_KEY) || sessionStorage.getItem(LEGACY_READ_KEY);
      const saved = JSON.parse(raw);
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function normalizeReadIds(ids) {
    const validIds = new Set(CARTAS.map((carta) => letterKey(carta)));

    return Array.isArray(ids)
      ? [...new Set(ids.map(String).filter((id) => validIds.has(id)))]
      : [];
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
        letterStage.scrollTo({
          top: 0,
          left: Math.max(0, (letterStage.scrollWidth - letterStage.clientWidth) / 2)
        });
        return;
      }

      letterStage.scrollLeft = Math.max(0, letterStage.scrollWidth * scrollRatioX - letterStage.clientWidth / 2);
      letterStage.scrollTop = Math.max(0, letterStage.scrollHeight * scrollRatioY - letterStage.clientHeight / 2);
    });
  }

  function getBaseLetterWidth() {
    const naturalWidth = letterImage.naturalWidth || 1240;
    const naturalHeight = letterImage.naturalHeight || 1754;
    const ratio = naturalWidth / Math.max(1, naturalHeight);
    const availableWidth = Math.max(260, letterStage.clientWidth - 18);
    const availableHeight = Math.max(260, letterStage.clientHeight - 18);
    const widthByHeight = availableHeight * ratio;

    return Math.min(1040, availableWidth, widthByHeight || availableWidth);
  }

  /* ========================================================
     FINAL + VIDEO
  ======================================================== */

  function showFinalCelebration() {
    state.finalShown = true;
    saveState();
    playSfx("success");

    finalModal.hidden = false;
    setModalLock(true);

    requestAnimationFrame(() => closeFinalButton.focus({ preventScroll: true }));

    if (window.gsap && !REDUCED_MOTION) {
      gsap.fromTo(
        ".final-modal__card",
        { y: 24, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.52, ease: "power2.out" }
      );
    }
  }

  function closeFinalModal(options = {}) {
    const { showVideo = false } = options;
    if (finalModal.hidden) return;

    const finish = () => {
      finalModal.hidden = true;
      if (window.gsap) gsap.set(".final-modal__card", { y: 0, opacity: 1, scale: 1 });

      if (showVideo) {
        showVideoSurprise({ rememberFocus: false, fromFinal: true });
        return;
      }

      setModalLock(false);
      restoreFocus();
    };

    if (window.gsap && !REDUCED_MOTION) {
      gsap.to(".final-modal__card", {
        y: 12,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: finish
      });
      return;
    }

    finish();
  }

  function showVideoSurprise(options = {}) {
    const { rememberFocus = true, fromFinal = false } = options;
    if (rememberFocus) lastFocusedElement = document.activeElement;
    playSfx("video");
    state.videoDiscovered = true;
    saveState();
    updateVideoReplayVisibility();

    videoModal.hidden = false;
    videoModal.classList.toggle("is-final-transition", fromFinal);
    setModalLock(true);
    prepareVideo();

    requestAnimationFrame(() => {
      const closeButton = videoModal.querySelector("[data-close-video]");
      closeButton?.focus({ preventScroll: true });
    });

    if (window.gsap && !REDUCED_MOTION) {
      const introDelay = fromFinal ? 0.28 : 0;

      gsap.fromTo(
        videoModal,
        { opacity: 0 },
        { opacity: 1, duration: 0.68, ease: "power2.out" }
      );

      gsap.fromTo(
        ".video-card",
        { y: fromFinal ? 34 : 24, opacity: 0, scale: fromFinal ? 0.94 : 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.72, delay: introDelay, ease: "power2.out" }
      );

      gsap.fromTo(
        ".video-card__halo",
        { scale: 0.78, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.05, delay: introDelay + 0.08, ease: "power2.out" }
      );
    }
  }

  function closeVideoModal() {
    if (videoModal.hidden) return;
    playSfx("close");

    const finish = () => {
      videoModal.hidden = true;
      videoModal.classList.remove("is-final-transition");
      if (window.gsap) {
        gsap.set(videoModal, { opacity: 1 });
        gsap.set(".video-card", { y: 0, opacity: 1, scale: 1 });
      }
      resetVideo();
      setModalLock(false);
      restoreFocus();
    };

    if (window.gsap && !REDUCED_MOTION) {
      gsap.to(".video-card", {
        y: 12,
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
        onComplete: finish
      });
      return;
    }

    finish();
  }

  function prepareVideo() {
    videoPendingState.hidden = true;
    surpriseVideo.hidden = false;
    videoControls.hidden = false;
    surpriseVideo.removeAttribute("src");
    surpriseVideo.load();

    surpriseVideo.src = VIDEO_SORPRESA;
    surpriseVideo.volume = Math.min(1, Math.max(0, Number(videoVolumeControl.value)));
    surpriseVideo.load();
    updateVideoPlayButton();
    syncVideoVolumeControl();
  }

  function showVideoReadyState() {
    videoPendingState.hidden = true;
    surpriseVideo.hidden = false;
    videoControls.hidden = false;
    updateVideoPlayButton();
    syncVideoVolumeControl();
  }

  function showVideoPendingState() {
    resetVideo();
    surpriseVideo.hidden = true;
    videoControls.hidden = true;
    videoPendingState.hidden = false;
  }

  function resetVideo() {
    surpriseVideo.pause();
    surpriseVideo.removeAttribute("src");
    surpriseVideo.load();
    updateVideoPlayButton();
  }

  async function toggleVideoPlayback() {
    unlockAudio();
    playSfx("tap");

    try {
      if (surpriseVideo.paused) {
        await surpriseVideo.play();
        return;
      }

      surpriseVideo.pause();
    } catch {
      // iOS puede bloquear play si el gesto no llega al video; los controles nativos siguen disponibles.
    } finally {
      updateVideoPlayButton();
    }
  }

  function updateVideoPlayButton() {
    const icon = videoPlayButton.querySelector("i");
    const label = videoPlayButton.querySelector("span");
    const isPlaying = !surpriseVideo.paused && !surpriseVideo.ended;

    icon.className = isPlaying ? "ph ph-pause" : "ph ph-play";
    label.textContent = isPlaying ? "Pausar" : "Reproducir";
  }

  function updateVideoVolume() {
    unlockAudio();
    const volume = Math.min(1, Math.max(0, Number(videoVolumeControl.value)));

    try {
      surpriseVideo.volume = volume;
      surpriseVideo.muted = volume === 0;
    } catch {
      // En iPhone el volumen del video lo gobierna iOS; dejamos el control nativo como respaldo.
    }
  }

  function syncVideoVolumeControl() {
    const value = surpriseVideo.muted ? 0 : surpriseVideo.volume;
    videoVolumeControl.value = String(Number.isFinite(value) ? value : 1);
  }

  function enterVideoFullscreen() {
    unlockAudio();
    playSfx("tap");

    try {
      if (surpriseVideo.webkitEnterFullscreen) {
        surpriseVideo.webkitEnterFullscreen();
        return;
      }

      if (surpriseVideo.requestFullscreen) {
        surpriseVideo.requestFullscreen();
        return;
      }

      if (videoModal.requestFullscreen) {
        videoModal.requestFullscreen();
      }
    } catch {
      // Si el navegador no permite fullscreen por API, quedan los controles nativos del video.
    }
  }

  function updateVideoReplayVisibility() {
    replayVideoButton.hidden = !state.videoDiscovered;
  }

  /* ========================================================
     AUDIO LIVIANO
  ======================================================== */

  function syncSoundButton() {
    const icon = soundButton.querySelector("i");

    icon.className = soundEnabled
      ? "ph ph-speaker-high"
      : "ph ph-speaker-slash";

    soundButton.setAttribute(
      "aria-label",
      soundEnabled ? "Desactivar sonidos" : "Activar sonidos"
    );
  }

  function getAudioContext() {
    const AudioConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioConstructor) return null;

    audioContext ??= new AudioConstructor();
    return audioContext;
  }

  function unlockAudio() {
    audioUnlocked = true;

    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === "suspended") context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      gain.gain.setValueAtTime(0.0001, context.currentTime);
      oscillator.frequency.setValueAtTime(24, context.currentTime);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.015);
    } catch {
      // El audio es decorativo; si el navegador lo bloquea, no afecta la experiencia.
    }
  }

  function playTone(frequency = 440, duration = 0.08, options = {}) {
    if (!soundEnabled || !audioUnlocked) return;

    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === "suspended") context.resume();

      const {
        delay = 0,
        volume = 0.02,
        type = "sine",
        slideTo = null
      } = options;
      const startAt = context.currentTime + delay;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      if (slideTo) {
        oscillator.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
      }

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.035);
    } catch {
      // La experiencia continua aunque el navegador bloquee el audio.
    }
  }

  function playNoise(duration = 0.12, options = {}) {
    if (!soundEnabled || !audioUnlocked) return;

    try {
      const context = getAudioContext();
      if (!context) return;
      if (context.state === "suspended") context.resume();

      const {
        delay = 0,
        volume = 0.016,
        frequency = 1200,
        filterType = "bandpass",
        q = 0.8
      } = options;
      const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i += 1) {
        const fade = 1 - (i / frameCount);
        data[i] = (Math.random() * 2 - 1) * fade;
      }

      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const startAt = context.currentTime + delay;

      source.buffer = buffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(frequency, startAt);
      filter.Q.setValueAtTime(q, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(startAt);
      source.stop(startAt + duration + 0.025);
    } catch {
      // La experiencia continua aunque el navegador bloquee el audio.
    }
  }

  function playArpeggio(notes, step = 0.065, duration = 0.085, options = {}) {
    const baseDelay = options.delay || 0;

    notes.forEach((frequency, index) => {
      playTone(frequency, duration, {
        ...options,
        delay: baseDelay + index * step
      });
    });
  }

  function playSfx(name, details = {}) {
    if (!soundEnabled || !audioUnlocked) return;

    const motifs = {
      cookie: [330, 415, 523],
      "doble-corazon": [392, 523, 659],
      "nota-musical": [392, 494, 659],
      flor: [349, 392, 523],
      sol: [440, 554, 740],
      playa: [294, 392, 587],
      "copa-vino": [330, 440, 587],
      gimnasio: [247, 330, 494],
      neutro: [349, 440, 587]
    };

    switch (name) {
      case "enter":
        playNoise(0.08, { volume: 0.009, frequency: 2300, filterType: "highpass" });
        playArpeggio([523, 659, 784, 1046], 0.046, 0.12, { volume: 0.017, type: "triangle" });
        break;
      case "swipe":
        playNoise(0.08, { volume: 0.01, frequency: 1800, filterType: "highpass", q: 0.55 });
        playTone(330, 0.04, { volume: 0.008, type: "triangle", slideTo: 370 });
        break;
      case "tap":
        playTone(620, 0.055, { volume: 0.012, type: "triangle" });
        break;
      case "tick":
        playTone(740, 0.035, { volume: 0.009, type: "triangle" });
        break;
      case "close":
        playArpeggio([392, 311], 0.04, 0.075, { volume: 0.012, type: "sine" });
        break;
      case "letter":
        playNoise(0.11, { delay: 0.01, volume: 0.011, frequency: 1500, filterType: "highpass" });
        playArpeggio([523, 659, 880], 0.055, 0.11, { delay: 0.03, volume: 0.014, type: "triangle" });
        break;
      case "open": {
        const notes = motifs[details.type] ?? motifs.neutro;
        playNoise(0.18, { volume: 0.022, frequency: 950, filterType: "bandpass", q: 0.75 });
        playTone(180, 0.08, { delay: 0.02, volume: 0.014, type: "sine", slideTo: 126 });
        playArpeggio(notes, 0.078, 0.105, { delay: 0.12, volume: 0.017, type: "triangle" });
        break;
      }
      case "success":
        playNoise(0.12, { volume: 0.012, frequency: 2800, filterType: "highpass" });
        playArpeggio([523, 659, 784, 988, 1175], 0.055, 0.12, { volume: 0.016, type: "triangle" });
        break;
      case "video":
        playTone(196, 0.14, { volume: 0.013, type: "sine", slideTo: 247 });
        playArpeggio([392, 494, 659], 0.07, 0.12, { delay: 0.04, volume: 0.013, type: "triangle" });
        break;
      case "toggle":
        playArpeggio([520, 700], 0.045, 0.08, { volume: 0.013, type: "triangle" });
        break;
      default:
        playTone(520, 0.06, { volume: 0.012, type: "triangle" });
    }
  }

  function playOpeningSound(type) {
    playSfx("open", { type });
  }

  /* ========================================================
     HELPERS
  ======================================================== */

  function normalizeIndex(index) {
    const total = CARTAS.length;
    const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
    return ((safeIndex % total) + total) % total;
  }

  function letterKey(carta) {
    return String(carta.id);
  }

  function displayLetterName(carta) {
    return carta.nombre;
  }

  function getLetterSource(carta) {
    return carta.disponible
      ? carta.archivo
      : createPlaceholderDataUri(carta);
  }

  function createPlaceholderDataUri(carta) {
    const name = escapeSvg(carta.nombre);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 1754">
        <defs>
          <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
            <stop stop-color="#fffdf8"/>
            <stop offset="1" stop-color="#f4ead7"/>
          </linearGradient>
          <radialGradient id="glow" cx=".5" cy=".15" r=".65">
            <stop stop-color="#fff8e8" stop-opacity=".95"/>
            <stop offset=".55" stop-color="#f6e3c8" stop-opacity=".35"/>
            <stop offset="1" stop-color="#f6e3c8" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1240" height="1754" fill="url(#paper)"/>
        <rect width="1240" height="1754" fill="url(#glow)"/>
        <rect x="52" y="52" width="1136" height="1650" rx="22" fill="none" stroke="#cfad72" stroke-width="4"/>
        <rect x="76" y="76" width="1088" height="1602" rx="18" fill="none" stroke="#fff3d5" stroke-width="5" opacity=".7"/>
        <text x="620" y="250" text-anchor="middle" font-family="Georgia, serif" font-size="86" fill="#6b3b35">${name}</text>
        <text x="620" y="365" text-anchor="middle" font-family="Arial, sans-serif" font-size="31" fill="#7c6b5e">Esta carta todavía está esperando su momento.</text>
        <path d="M145 585 C340 535 520 635 780 580 M145 715 C390 655 590 760 1010 680 M145 845 C340 800 575 860 900 830 M145 975 C380 935 670 1010 1050 960 M145 1105 C390 1060 610 1128 940 1100"
              fill="none" stroke="#897563" stroke-width="13" stroke-linecap="round" opacity=".22"/>
        <path d="M483 1342 C520 1300 576 1296 620 1348 C664 1296 720 1300 757 1342 C704 1394 661 1428 620 1456 C579 1428 536 1394 483 1342Z"
              fill="none" stroke="#b86a5d" stroke-width="9" stroke-linejoin="round" opacity=".52"/>
        <text x="620" y="1530" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#8a7a6a">Guardada con cariño para Agustina.</text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
      <path d="${d}" fill="none" stroke="#ffd6c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".34"/>
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
      "doble-corazon": `
        <g transform="translate(0 1)">
          <path d="M-34-8C-34-22-18-28-8-14C2-28 18-22 18-8C18 7 2 18-8 27C-18 18-34 7-34-8Z"
                fill="#ffd3c3" opacity=".16"/>
          <path d="M-13-11C-13-25 3-31 13-17C23-31 39-25 39-11C39 4 23 15 13 24C6 18-4 11-10 2"
                fill="#ffd3c3" opacity=".12"/>
          <path d="M-34-8C-34-22-18-28-8-14C2-28 18-22 18-8C18 7 2 18-8 27C-18 18-34 7-34-8Z
                   M-13-11C-13-25 3-31 13-17C23-31 39-25 39-11C39 4 23 15 13 24C6 18-4 11-10 2"
                fill="none" stroke="#5f201b" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" opacity=".34"/>
          <path d="M-34-8C-34-22-18-28-8-14C2-28 18-22 18-8C18 7 2 18-8 27C-18 18-34 7-34-8Z
                   M-13-11C-13-25 3-31 13-17C23-31 39-25 39-11C39 4 23 15 13 24C6 18-4 11-10 2"
                fill="none" stroke="#f4b29f" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round" opacity=".82"/>
          <path d="M-24-15C-20-19-15-20-11-17M3-18C7-22 13-23 17-19"
                fill="none" stroke="#ffd9ca" stroke-width="3" stroke-linecap="round" opacity=".44"/>
          <path d="M-28 25C-14 35 9 35 25 25"
                fill="none" stroke="#f4b29f" stroke-width="3.2" stroke-linecap="round" opacity=".44"/>
        </g>
      `,
      flor: symbolPath("M0-24C13-24 15-9 6-2C18-10 29-2 23 10C17 20 4 13 1 5C4 18-6 28-16 22C-26 16-17 3-8 0C-21 3-28-9-20-18C-13-27-3-16 0-7C-2-18 0-24 0-24Z"),
      sol: `${circleSymbol()}${symbolPath("M0-32v9M0 23v9M-32 0h9M23 0h9M-22-22l7 7M15 15l7 7M22-22l-7 7M-15 15l-7 7")}`,
      "nota-musical": symbolPath("M-16-25V12C-16 21-32 24-35 15C-38 6-23 0-16 8M16-31V6C16 15 0 18-3 9C-6 0 9-5 16 2M-16-25C-4-19 5-23 16-31M-16-16C-4-10 5-14 16-22"),
      playa: `
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="-19" cy="-19" r="10" stroke="#5f201b" stroke-width="9" opacity=".34"/>
          <path d="M-19-34v6M-34-19h6M-30-30l5 5M-8-30l-5 5" stroke="#5f201b" stroke-width="9" opacity=".34"/>
          <path d="M-31 9C-20 0-10 18 2 9C14 0 23 17 32 8M-31 24C-20 15-10 33 2 24C14 15 23 32 32 23" stroke="#5f201b" stroke-width="10" opacity=".34"/>

          <circle cx="-19" cy="-19" r="10" stroke="#f4b29f" stroke-width="5.5" opacity=".78"/>
          <path d="M-19-34v6M-34-19h6M-30-30l5 5M-8-30l-5 5" stroke="#f4b29f" stroke-width="5" opacity=".78"/>
          <path d="M-31 9C-20 0-10 18 2 9C14 0 23 17 32 8M-31 24C-20 15-10 33 2 24C14 15 23 32 32 23" stroke="#f4b29f" stroke-width="6" opacity=".78"/>

          <path d="M-31 9C-20 0-10 18 2 9C14 0 23 17 32 8M-31 24C-20 15-10 33 2 24C14 15 23 32 32 23" stroke="#ffd6c7" stroke-width="2" opacity=".34"/>
        </g>
      `,
      "copa-vino": symbolPath("M-18-27H18C17-10 10 2 0 2C-10 2-17-10-18-27ZM-10-14C-4-10 5-10 11-14M0 2V24M-14 25H14"),
      gimnasio: symbolPath("M-30 0H30M-37-13V13M-28-20V20M28-20V20M37-13V13M-20-8V8M20-8V8"),
      neutro: symbolPath("M0-28C5-11 11-5 28 0C11 5 5 11 0 28C-5 11-11 5-28 0C-11-5-5-11 0-28Z")
    };

    return icons[type] ?? icons.neutro;
  }

  function setModalLock(locked) {
    document.body.classList.toggle("is-modal-open", locked);
  }

  function visibleCollectionActions() {
    return [".active-envelope-meta", ".ghost-button", ".replay-video-button:not([hidden])"]
      .flatMap((selector) => Array.from(document.querySelectorAll(selector)));
  }

  function restoreFocus() {
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus({ preventScroll: true });
    }
    lastFocusedElement = null;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeSvg(value) {
    return escapeHtml(value);
  }
});
