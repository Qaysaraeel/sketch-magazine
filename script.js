$(function () {

  // ── Constants ──
  // Total 44 halaman Turn.js:
  // 1 = blank dummy kiri
  // 2 = Cover (1.png)
  // 3–42 = isi (2.png–41.png)
  // 43 = Back Cover (42.png)
  // 44 = blank dummy kanan
  const FIRST      = 2;   // cover
  const LAST       = 43;  // back cover
  const TOTAL_REAL = 42;  // jumlah konten nyata (cover s/d back cover inklusif)
  const book       = $('#book');
  const container  = $('#bookContainer');
  const spine      = $('#spine');

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
  book.turn({
    width:        sz.w / 2,
    height:       sz.h,
    autoCenter:   true,
    duration:     900,
    gradients:    true,
    elevation:    60,
    acceleration: true,
    display:      'single',
    page:         FIRST,
  });

  // Set container awal ke half width (cover = single)
  container.css('width', (sz.w / 2) + 'px');
  spine.css('display', 'none');

  document.querySelector('.scene').style.visibility = 'visible';

  // ── Single vs Double mode ──
  let currentDisplay = 'single';

  function isCoverPage(page) {
    return page === FIRST || page === LAST;
  }

  function applyDisplay(page, animate) {
    const wantSingle = isCoverPage(page);
    const wantMode   = wantSingle ? 'single' : 'double';
    if (wantMode === currentDisplay) return;
    currentDisplay = wantMode;

    const halfW = Math.round(sz.w / 2);
    const fullW = sz.w;
    const h     = sz.h;
    const targetW = wantSingle ? halfW : fullW;

    if (animate) {
      // Animasi width container dulu (CSS transition), lalu resize Turn.js
      container.css({
        transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        width: targetW + 'px'
      });

      // Spine: sembunyikan segera saat ke single, tampilkan saat selesai animasi ke double
      if (wantSingle) {
        spine.css('display', 'none');
      }

      setTimeout(() => {
        book.turn('display', wantMode);
        book.turn('size', targetW, h);
        container.css('transition', '');
        if (!wantSingle) {
          spine.css('display', '');
        }
      }, 350);
    } else {
      container.css('width', targetW + 'px');
      spine.css('display', wantSingle ? 'none' : '');
      book.turn('display', wantMode);
      book.turn('size', targetW, h);
    }
  }

  // ── Progress bar ──
  function updateProgress(page) {
    const current = page - 1;
    const pct     = ((current - 1) / (TOTAL_REAL - 1)) * 100;
    $('#progressThumb').css('width', Math.max(2, pct) + '%');
    $('#progressLabel').text(current + ' / ' + TOTAL_REAL);
  }

  // ── Nav buttons & Spotify ──
  function updateUI(page) {
    $('#btnPrev').toggleClass('hidden', page <= FIRST);
    $('#btnNext').toggleClass('hidden', page >= LAST);
    const onSpread = (page === 14 || page === 15);
    $('#spotifyPopup').toggleClass('show', onSpread);
    updateProgress(page);
  }

  updateUI(FIRST);

  // ── Turned event ──
  book.bind('turned', function (e, page) {
    updateUI(page);
    applyDisplay(page, true);
  });

  // ── Tombol navigasi ──
  $('#btnPrev').on('click', () => book.turn('previous'));
  $('#btnNext').on('click', () => book.turn('next'));

  // ── Swipe (mobile) ──
  let tx = 0, ty = 0;
  document.addEventListener('touchstart', e => {
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    dx > 0 ? book.turn('previous') : book.turn('next');
  }, { passive: true });

  // ── Keyboard ──
  $(document).on('keydown', e => {
    if (e.key === 'ArrowRight') book.turn('next');
    if (e.key === 'ArrowLeft')  book.turn('previous');
  });

  // ── Resize ──
  let resizeTimer;
  $(window).on('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const s      = bookSize();
      const page   = book.turn('page');
      const single = isCoverPage(page);
      const tw     = single ? Math.round(s.w / 2) : s.w;
      container.css('width', tw + 'px');
      book.turn('size', tw, s.h);
    }, 200);
  });

  // ── Spotify close ──
  document.getElementById('spotifyClose').addEventListener('click', () => {
    document.getElementById('spotifyPopup').classList.remove('show');
  });

});