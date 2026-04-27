$(function () {

  // ── Sound Effect (Web Audio API for page flip sound) ──
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
  }

  function playFlipSound() {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Create a short "whoosh" sound using noise and filter
      const duration = 0.15;
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate noise with fade out
      for (let i = 0; i < bufferSize; i++) {
        const fadeOut = 1 - (i / bufferSize);
        data[i] = (Math.random() * 2 - 1) * fadeOut * 0.3;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      // Add a lowpass filter for paper-like sound
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      // Add gain envelope
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      source.start();
      source.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Silently fail if audio is not supported
    }
  }

  // ── Constants ──
  // Page count is dynamically calculated from the number of .page elements
  // This allows easy addition of new pages in the future
  const book       = $('#book');
  const container  = $('#bookContainer');
  const spine      = $('#spine');

  // Calculate total pages from DOM
  function getTotalPages() {
    return book.find('.page').length;
  }

  const FIRST = 1;
  let LAST = getTotalPages();
  let TOTAL_PAGES = getTotalPages();

  // ── Book sizing ──
  function bookSize() {
    const vw   = window.innerWidth;
    const vh   = window.innerHeight;
    const maxW = Math.round(vw * 0.92);
    const maxH = Math.round(vh * 0.86);
    const byH  = Math.round(maxH / 1.414) * 2;
    const w    = Math.min(maxW, byH);
    const even = w % 2 === 0 ? w : w - 1;
    return { w: even, h: Math.round((even / 2) * 1.414) };
  }

  const sz = bookSize();

  // ── Init Turn.js ──
  // Selalu double (2 sisi), tidak ada mode single
  book.turn({
    width:        sz.w,
    height:       sz.h,
    autoCenter:   true,
    duration:     1000,
    gradients:    true,
    elevation:    80,
    acceleration: true,
    display:      'double',
    page:         FIRST,
    when: {
      turning: function(e, page, view) {
        // Add flipping class during page turn
        container.addClass('flipping');
      },
      turned: function(e, page, view) {
        // Remove flipping class after page turn
        setTimeout(function() {
          container.removeClass('flipping');
        }, 300);
      }
    }
  });

  // Set container width - double width for spread
  container.css('width', sz.w + 'px');
  spine.css('display', 'block');

  // Hide loader after book is ready
  setTimeout(() => {
    document.querySelector('.loader').classList.add('hidden');
    document.querySelector('.scene').style.visibility = 'visible';
  }, 800);

  // ── Progress bar ──
  function updateProgress(page) {
    // Calculate progress based on current spread
    const currentSpread = Math.ceil(page / 2);
    const totalSpreads = Math.ceil(TOTAL_PAGES / 2);
    const pct = ((currentSpread - 1) / (totalSpreads - 1)) * 100;
    $('#progressThumb').css('width', Math.max(2, Math.min(100, pct)) + '%');
  }

  // ── Nav buttons ──
  function updateUI(page) {
    // Hide prev button if at first page
    $('#btnPrev').toggleClass('hidden', page <= FIRST);
    // Hide next button if at last page
    $('#btnNext').toggleClass('hidden', page >= LAST);
    updateProgress(page);
  }

  updateUI(FIRST);

  // ── Turned event ──
  book.bind('turned', function (e, page, view) {
    updateUI(page);
  });

  // ── Start turning event ──
  book.bind('start', function(e, pageOpts, corner) {
    container.addClass('flipping');
    playFlipSound();
  });

  // ── End turning event ──
  book.bind('end', function(e, pageOpts, turned) {
    setTimeout(function() {
      container.removeClass('flipping');
    }, 200);
  });

  // ── Navigation ──
  $('#btnPrev').click(function () {
    const current = book.turn('page');
    if (current > FIRST) {
      book.turn('previous');
    }
  });

  $('#btnNext').click(function () {
    const current = book.turn('page');
    if (current < LAST) {
      book.turn('next');
    }
  });

  // ── Keyboard navigation ──
  $(document).keydown(function (e) {
    // Prevent scrolling with arrow keys
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const current = book.turn('page');
      if (current > FIRST) book.turn('previous');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const current = book.turn('page');
      if (current < LAST) book.turn('next');
    }
  });

  // ── Window resize ──
  let resizeTimeout;
  $(window).resize(function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      const newSz = bookSize();
      book.turn('size', newSz.w, newSz.h);
      container.css('width', newSz.w + 'px');
    }, 250);
  });

  // ── Touch/Swipe support for mobile ──
  let touchStartX = 0;
  let touchEndX = 0;

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    const current = book.turn('page');

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && current < LAST) {
        book.turn('next');
      } else if (diff < 0 && current > FIRST) {
        book.turn('previous');
      }
    }
  }

  // ── WhatsApp Popup ──
  const waPopup = document.getElementById('waPopup');
  const waClose = document.getElementById('waClose');

  // Show popup after 3 seconds
  setTimeout(function() {
    if (waPopup) {
      waPopup.classList.add('show');
    }
  }, 3000);

  // Close popup on button click
  if (waClose) {
    waClose.addEventListener('click', function() {
      if (waPopup) {
        waPopup.classList.remove('show');
      }
    });
  }

  // Close popup on click outside
  document.addEventListener('click', function(e) {
    if (waPopup && waPopup.classList.contains('show') && 
        !waPopup.contains(e.target) && 
        e.target.id !== 'waPopup') {
      // Don't close if clicking on the popup itself
    }
  });

});
