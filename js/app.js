// Blossom. No framework: the page is static HTML, this file fills in the lists from
// js/data.js (tour dates, discography) and moves things with the scroll position.
(() => {
  'use strict';
  const DATA = window.BLOSSOM || { releases: [], shows: { upcoming: [], past: [], stats: {} } };
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

  const root = document.documentElement;
  const burger = $('#burger');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // the pinned stage needs a wide window; phones and upright tablets get the stacked page
  const wide = matchMedia('(min-width: 821px) and (min-height: 540px) and (min-aspect-ratio: 1/1), (min-width: 1101px) and (min-height: 540px)');
  const phone = /iPhone|iPod|iPad|Android/i.test(navigator.userAgent);

  // ---------- dates ----------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const two = (n) => String(n).padStart(2, '0');
  // A show stays listed until the day after it (the last day of a festival) is over.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = DATA.shows.upcoming.filter((s) => day(s.end || s.date) >= today);

  // ---------- tour passes ----------
  const passes = $('#passes');
  const floor = $('#floor');
  const dots = $('#pass-dots');
  function whenLine(s) {
    const a = day(s.date);
    if (!s.end) return `${DAYS[a.getDay()]} ${a.getDate()} ${MONTHS[a.getMonth()]}`;
    const b = day(s.end);
    return `${a.getDate()} to ${b.getDate()} ${MONTHS[b.getMonth()]}`;
  }
  function buildPasses() {
    const list = upcoming.length ? upcoming : [{ none: true }];
    list.forEach((s, i) => {
      const card = el('article', 'pass');
      if (s.none) {
        card.innerHTML = `<a class="pass-card" href="https://www.bandsintown.com/a/15392928-blossom-dj" target="_blank" rel="noopener"><img src="img/pass-7.webp" alt="" width="720" height="960"><span class="pass-hole"></span><span class="pass-date"><span>New dates</span>Soon</span></a>
          <div class="pass-cap"><h3>New dates soon</h3><p>Follow on Bandsintown to hear first</p><a href="https://www.bandsintown.com/a/15392928-blossom-dj" target="_blank" rel="noopener">Follow ${icon('out')}</a></div>`;
      } else {
        const a = day(s.date);
        const where = [s.city, s.country === 'USA' ? '' : s.country].filter(Boolean).join(', ');
        const label = `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
        card.innerHTML = `<a class="pass-card" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(`${s.event}, ${where}, ${whenLine(s)} ${a.getFullYear()}. ${s.cta}`)}">
            <img src="img/${esc(s.photo)}.webp" alt="" width="720" height="960" ${i > 1 ? 'loading="lazy"' : ''}>
            <span class="pass-hole"></span>
            <span class="pass-date"><span>${label}</span>${two(a.getDate())}${s.end ? '<small>+</small>' : ''}</span>
            ${s.tag ? `<span class="pass-tag">${esc(s.tag)}</span>` : ''}
          </a>
          <div class="pass-cap">
            <h3>${esc(s.event)}</h3>
            <p>${esc(where)}<br>${esc(s.venue)} · ${whenLine(s)}</p>
            ${s.note ? `<p class="pass-note">${esc(s.note)}</p>` : ''}
            <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.cta)} ${icon('out')}</a>
          </div>`;
        const num = el('span', '', `<small>${MONTHS[a.getMonth()].toUpperCase()}</small>${two(a.getDate())}`);
        floor.appendChild(num);
      }
      passes.appendChild(card);
      dots.appendChild(el('i', i === 0 ? 'on' : ''));
    });
    const next = upcoming[0];
    $('#next-line').textContent = next
      ? `${next.event}, ${next.city.split(',')[0]}. ${whenLine(next)}.`
      : 'New dates soon.';
  }
  buildPasses();
  const cards = $$('.pass', passes);
  const nums = $$('span', floor).filter((n) => n.parentNode === floor);

  // phones: the dots follow the swipe
  passes.addEventListener('scroll', () => {
    if (root.classList.contains('pin')) return;
    const mid = passes.scrollLeft + passes.clientWidth / 2;
    let best = 0, dist = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
    $$('i', dots).forEach((d, i) => d.classList.toggle('on', i === best));
  }, { passive: true });

  // ---------- the pinned stage: landing screen, diagonal wipe, sideways tour ----------
  const intro = $('.intro');
  const stage = $('.stage');
  const hero = $('#hero');
  const tourLayer = $('#tour-layer');
  const tourTitle = $('#tour-title');
  const tourLines = $('.tour-lines');
  const slot = $('#hero-slot');
  const portrait = $('.hero-portrait img');
  const G = {}; // geometry of the stage, measured on resize
  function measure() {
    const pin = wide.matches && !reduced;
    root.classList.toggle('pin', pin);
    if (!pin) {
      intro.style.removeProperty('--intro-len');
      cards.forEach((c) => { c.style.transform = ''; c.style.opacity = ''; });
      tourLayer.style.clipPath = '';
      hero.style.transform = hero.style.visibility = '';
      G.last = null;
      return;
    }
    const vw = stage.clientWidth, vh = window.innerHeight;
    G.vw = vw; G.vh = vh;
    G.w = cards[0].offsetWidth;
    G.h = cards[0].offsetHeight;
    const imgH = G.w * 4 / 3;
    G.gap = Math.max(vw * .33, G.w * 1.45);
    G.x0 = vw * .40;
    G.yEven = Math.max(vh * .15, 86);
    G.yOdd = Math.min(vh * .30, vh - Math.max(...cards.map((c) => c.offsetHeight)) - 16);
    G.yOdd = Math.max(G.yOdd, G.yEven);
    G.track = Math.max(0, G.x0 + (cards.length - 1) * G.gap - vw * .5);
    G.wipe = vh;
    G.len = G.wipe + G.track + vh * .3;
    intro.style.setProperty('--intro-len', G.len + 'px');
    // where the first pass sits on the landing screen
    const s = slot.getBoundingClientRect(), st = stage.getBoundingClientRect();
    G.sx = s.left - st.left; G.sy = s.top - st.top; G.ss = s.width / G.w;
    G.imgH = imgH;
    frame();
  }
  function frame() {
    queued = false;
    const y = window.scrollY;
    root.classList.toggle('scrolled', y > 40);
    if (root.classList.contains('pin')) stageFrame(y);
    if (root.classList.contains('pinq')) quoteFrame(y);
    tones();
  }
  function stageFrame(scrollY) {
    const y = clamp(scrollY - intro.offsetTop, 0, G.len);
    if (y === G.last) return;
    G.last = y;
    const w = clamp(y / G.wipe);
    const e = easeInOut(clamp((w - .04) / .92));
    const t = clamp((y - G.wipe * .82) / Math.max(1, G.track)) * G.track;
    // the dark layer rises with a slanted edge, right side first
    const a = lerp(130, -34, w);
    tourLayer.style.clipPath = `polygon(0 ${a.toFixed(2)}%, 100% ${(a - 22).toFixed(2)}%, 100% 101%, 0 101%)`;
    hero.style.transform = `translate3d(0, ${(-w * G.vh * .07).toFixed(1)}px, 0)`;
    hero.style.visibility = w >= 1 ? 'hidden' : '';
    cards.forEach((c, i) => {
      const bx = G.x0 + i * G.gap - G.w / 2 - t;
      const by = i % 2 ? G.yOdd : G.yEven;
      const rot = i % 2 ? 1.6 : -1.6;
      if (i === 0) {
        const x = lerp(G.sx, bx, e), yy = lerp(G.sy, by, e), s = lerp(G.ss, 1, e);
        c.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0) scale(${s.toFixed(4)}) rotate(${lerp(-5, rot, e).toFixed(2)}deg)`;
        $('.pass-cap', c).style.opacity = smooth(.72, .98, w).toFixed(3);
      } else {
        const x = bx + (1 - e) * G.vw * .7;
        c.style.transform = `translate3d(${x.toFixed(1)}px, ${by.toFixed(1)}px, 0) rotate(${rot}deg)`;
        c.style.opacity = smooth(.3, .7, w).toFixed(3);
      }
      c.style.visibility = (bx > G.vw + 40 && w >= 1) || bx < -G.w * 1.3 ? 'hidden' : '';
    });
    nums.forEach((n, i) => {
      const x = G.x0 + i * G.gap - G.w * 1.02 - t * .9;
      n.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    });
    tourLines.style.transform = `translate3d(${(-(t * .9) % (G.vw * .125)).toFixed(1)}px, 0, 0)`;
    tourTitle.style.transform = `translate3d(${(-t * .03).toFixed(1)}px, 0, 0)`;
  }
  // the star and the menu bars take a colour that reads on whatever is under them
  const mark = $('.mark'), topBar = $('#top');
  function tones() {
    [mark, burger].forEach((n) => {
      const r = n.getBoundingClientRect();
      const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => !topBar.contains(e) && e.closest('[data-tone]'));
      n.classList.toggle('on-light', !under || under.closest('[data-tone]').dataset.tone === 'light');
    });
  }
  let queued = false;
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });

  // ---------- landing screen: the portrait leans a little with the pointer ----------
  if (fine && !reduced) {
    let px = 0, py = 0, raf = 0;
    const shapes = $('.hero-shapes');
    hero.addEventListener('pointermove', (ev) => {
      const r = hero.getBoundingClientRect();
      px = (ev.clientX - r.left) / r.width - .5; py = (ev.clientY - r.top) / r.height - .5;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        portrait.style.transform = `translate3d(calc(-50% + ${(-px * 16).toFixed(1)}px), ${(-py * 8).toFixed(1)}px, 0)`;
        shapes.style.transform = `translate3d(${(px * 26).toFixed(1)}px, ${(py * 16).toFixed(1)}px, 0)`;
      });
    });
  }

  // ---------- giant headlines: sized so the words span the screen ----------
  function fitGiants() {
    $$('.giant').forEach((g) => {
      g.style.fontSize = '';
      if (!wide.matches) return;
      const base = parseFloat(getComputedStyle(g).fontSize);
      const range = document.createRange(); range.selectNodeContents(g);
      const w = range.getBoundingClientRect().width;
      if (w > 0) g.style.fontSize = (base * (g.parentNode.clientWidth * .975) / w).toFixed(1) + 'px';
    });
  }

  // ---------- bookings ----------
  const STAGES = ['Coachella', 'Lost Lands', 'EDC Las Vegas', 'Liquicity', 'Shambhala', 'HARD Summer', 'Bass Canyon', 'Beyond Wonderland', 'Rhythm & Vines', 'Lollapalooza', 'Bonnaroo', 'Big Dub', 'Das Energi', 'EDC Mexico', 'Groove Cruise', 'Griztronics'];
  const LABELS = ['UKF', 'Bassrush Records', 'Helix Records', 'Monstercat', 'Deadbeats', 'Drum&BassArena', 'Thrive Music', 'Night Bass', 'IN / ROTATION', 'Dim Mak', 'Bite This!', 'Pink Planet'];
  const ticker = (node, words) => { const html = words.map((w) => `<span>${esc(w)}</span>`).join(''); node.innerHTML = html + html.replace(/<span>/g, '<span aria-hidden="true">'); };
  ticker($('#stages'), STAGES);
  ticker($('#labels'), LABELS);
  const st = DATA.shows.stats || {};
  if (st.shows) $('#stats').innerHTML = `<span><b>${st.shows}</b> shows</span><span><b>${st.cities}</b> cities</span><span><b>${st.countries}</b> countries</span><span>since <b>${st.since}</b></span>`;
  $('#past-list').innerHTML = (DATA.shows.past || []).map((s) => {
    const a = day(s.date);
    return `<li><time datetime="${s.date}">${a.getDate()} ${MONTHS[a.getMonth()]}</time><div><b>${esc(s.event)}</b><span>${esc(s.where)}</span></div></li>`;
  }).join('');

  // ---------- music ----------
  const releases = DATA.releases;
  const crate = $('#crate'), crateRow = $('#crate-row'), feature = $('#feature');
  const music = { kind: 'all', id: null };
  const byId = (id) => releases.find((r) => r.id === id);
  const kindWord = (r) => {
    if (r.kind === 'remix') return /bootleg/i.test(r.title) ? 'Bootleg' : 'Remix';
    if (r.kind === 'mix') return r.links.youtube ? 'Filmed set' : /live/i.test(r.title) ? 'Live set' : 'Mix';
    return /\bEP$/.test(r.title) ? 'EP' : 'Single';
  };
  const lengthWord = (r) => (r.kind === 'mix' && r.seconds ? `${Math.round(r.seconds / 60)} min` : '');
  function renderCrate() {
    const list = releases.filter((r) => music.kind === 'all' || r.kind === music.kind);
    let year = null;
    crateRow.innerHTML = list.map((r) => {
      const first = r.year !== year; year = r.year;
      return `<li${first ? ` data-year="${r.year}"` : ''}><button class="crate-item" type="button" data-id="${r.id}" aria-current="${r.id === music.id}" title="${esc(r.title)}"><img src="${r.art}" alt="" width="480" height="480" loading="lazy" draggable="false"><span>${esc(r.title)}</span></button></li>`;
    }).join('');
    if (!list.some((r) => r.id === music.id) && list[0]) select(list[0].id, false);
    crate.scrollLeft = 0;
    navState();
  }
  function select(id, reveal = true) {
    const r = byId(id);
    if (!r) return;
    music.id = id;
    $$('.crate-item', crateRow).forEach((b) => {
      const on = b.dataset.id === id;
      b.setAttribute('aria-current', on);
      if (on && reveal) {
        const li = b.parentNode;
        crate.scrollTo({ left: li.offsetLeft - crate.clientWidth / 2 + li.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
      }
    });
    const fill = () => {
      $('#feature-art').src = r.art; $('#disc-art').src = r.art;
      $('#feature-glow').style.setProperty('--tone', r.tone || '#c2157a');
      const a = day(r.date);
      $('#feature-meta').textContent = [kindWord(r), `${MONTHS[a.getMonth()]} ${r.year}`, r.label, lengthWord(r)].filter(Boolean).join(' · ');
      $('#feature-title').textContent = r.title;
      $('#feature-by').textContent = r.by;
      const L = r.links, acts = [];
      if (L.soundcloud) acts.push(`<button class="btn" type="button" data-act="play">${icon('play')} ${phone ? 'Play on SoundCloud' : 'Play'}</button>`);
      else if (L.youtube) acts.push(`<a class="btn" href="${L.youtube}" target="_blank" rel="noopener">${icon('play')} Watch on YouTube</a>`);
      if (L.spotify) acts.push(`<a class="chip" href="${L.spotify}" target="_blank" rel="noopener">${icon('spotify')} Spotify</a>`);
      if (L.soundcloud) acts.push(`<a class="chip" href="${L.soundcloud}" target="_blank" rel="noopener">${icon('soundcloud')} SoundCloud</a>`);
      if (L.youtube && L.soundcloud) acts.push(`<a class="chip" href="${L.youtube}" target="_blank" rel="noopener">${icon('youtube')} YouTube</a>`);
      if (L.more) acts.push(`<a class="chip" href="${L.more}" target="_blank" rel="noopener">Everywhere ${icon('out')}</a>`);
      $('#feature-actions').innerHTML = acts.join('');
      $('#sleeve').setAttribute('aria-label', (L.soundcloud ? 'Play ' : 'Watch ') + r.title);
      feature.classList.remove('swap');
      playingState();
    };
    if (feature.dataset.ready && !reduced) { feature.classList.add('swap'); setTimeout(fill, 220); } else { fill(); feature.dataset.ready = 1; }
  }
  crateRow.addEventListener('click', (ev) => { const b = ev.target.closest('.crate-item'); if (b) select(b.dataset.id); });
  $('#filters').addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    music.kind = b.dataset.kind;
    $$('button', $('#filters')).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderCrate();
  });
  $('#feature-actions').addEventListener('click', (ev) => { if (ev.target.closest('[data-act="play"]')) play(byId(music.id)); });
  $('#sleeve').addEventListener('click', () => {
    const r = byId(music.id);
    if (dock.rel && dock.rel.id === r.id && dock.widget && !dock.el.hidden) { dock.widget.toggle(); return; }
    play(r);
  });
  // sideways only: arrows, drag, trackpad, arrow keys. The page scroll passes over it.
  const navState = () => {
    $('#crate-prev').disabled = crate.scrollLeft < 8;
    $('#crate-next').disabled = crate.scrollLeft > crate.scrollWidth - crate.clientWidth - 8;
  };
  crate.addEventListener('scroll', navState, { passive: true });
  $('#crate-prev').addEventListener('click', () => crate.scrollBy({ left: -crate.clientWidth * .75, behavior: reduced ? 'auto' : 'smooth' }));
  $('#crate-next').addEventListener('click', () => crate.scrollBy({ left: crate.clientWidth * .75, behavior: reduced ? 'auto' : 'smooth' }));
  crate.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const items = $$('.crate-item', crateRow), i = items.findIndex((b) => b.dataset.id === music.id);
    const n = items[clamp(i + (ev.key === 'ArrowRight' ? 1 : -1), 0, items.length - 1)];
    if (n) { ev.preventDefault(); select(n.dataset.id); }
  });
  {
    let down = false, moved = false, x0 = 0, s0 = 0, lastX = 0, lastT = 0, v = 0, glide = 0;
    crate.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
      down = true; moved = false; x0 = lastX = ev.clientX; s0 = crate.scrollLeft; lastT = ev.timeStamp; v = 0;
      cancelAnimationFrame(glide);
    });
    addEventListener('pointermove', (ev) => {
      if (!down) return;
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; crate.classList.add('dragging'); }
      if (!moved) return;
      crate.scrollLeft = s0 - dx;
      const dt = ev.timeStamp - lastT;
      if (dt > 0) v = .7 * v + .3 * ((lastX - ev.clientX) / dt);
      lastX = ev.clientX; lastT = ev.timeStamp;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (!moved) return;
      // let go: the row keeps sliding and slows down
      let vel = v * 16;
      const step = () => { crate.scrollLeft += vel; vel *= .94; if (Math.abs(vel) > .4) glide = requestAnimationFrame(step); };
      if (!reduced) step();
      setTimeout(() => crate.classList.remove('dragging'), 0);
    });
    crate.addEventListener('click', (ev) => { if (moved) { ev.preventDefault(); ev.stopPropagation(); moved = false; } }, true);
  }

  // ---------- player (SoundCloud's own widget, our controls) ----------
  const dock = { el: $('#dock'), widget: null, frame: null, dur: 0, rel: null, started: false, on: false };
  const clock = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${two(s % 60)}`; };
  function loadWidgetApi() {
    if (window.SC && window.SC.Widget) return Promise.resolve();
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = 'https://w.soundcloud.com/player/api.js';
      s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  function playingState() {
    feature.classList.toggle('playing', !!(dock.on && dock.rel && dock.rel.id === music.id));
  }
  async function play(rel) {
    if (!rel) return;
    const url = rel.links.soundcloud;
    if (!url) { window.open(rel.links.youtube || rel.links.spotify, '_blank', 'noopener'); return; }
    // Phones: Play opens the song on SoundCloud. The embedded player cannot work there: a phone
    // only starts sound from a tap inside SoundCloud's own frame, and SoundCloud covers that
    // frame with a "Play on SoundCloud" banner.
    if (phone) { window.open(url, '_blank', 'noopener'); return; }
    $('#dock-title').textContent = rel.kind === 'mix' || rel.by === 'Blossom' ? rel.title : `${rel.title} · ${rel.by}`;
    $('#dock-art').src = rel.art || '';
    $('#dock-out').href = url;
    $('#dock-time').textContent = 'Loading';
    $('#dock-fill').style.width = '0';
    dock.el.hidden = false;
    try { await loadWidgetApi(); } catch (e) { window.open(url, '_blank', 'noopener'); return; }
    dock.rel = rel; dock.started = false; dock.on = false; dock.dur = 0;
    $('#dock-play').classList.add('paused');
    needTap(false);
    const opts = { auto_play: true, show_artwork: false, show_comments: false, visual: false };
    if (!dock.frame) {
      const src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&auto_play=true&show_artwork=false&show_comments=false&visual=false';
      dock.frame = Object.assign(document.createElement('iframe'), { className: 'sc-frame', allow: 'autoplay; encrypted-media', title: 'SoundCloud player', src });
      dock.tap.appendChild(dock.frame);
      dock.widget = window.SC.Widget(dock.frame);
      const E = window.SC.Widget.Events;
      dock.widget.bind(E.READY, () => { dock.widget.getDuration((ms) => { dock.dur = ms; }); expectSound(); });
      dock.widget.bind(E.PLAY_PROGRESS, (e) => {
        if (!dock.started && e.currentPosition > 0) { dock.started = true; needTap(false); }
        if (!dock.dur) dock.widget.getDuration((ms) => { dock.dur = ms; });
        $('#dock-fill').style.width = (e.relativePosition * 100).toFixed(2) + '%';
        $('#dock-bar').setAttribute('aria-valuenow', Math.round(e.relativePosition * 100));
        $('#dock-time').textContent = `${clock(e.currentPosition)} / ${clock(dock.dur || dock.rel.seconds * 1000)}`;
      });
      dock.widget.bind(E.PLAY, () => { dock.on = true; $('#dock-play').classList.remove('paused'); playingState(); });
      dock.widget.bind(E.PAUSE, () => { dock.on = false; $('#dock-play').classList.add('paused'); playingState(); });
      dock.widget.bind(E.FINISH, () => { dock.on = false; $('#dock-play').classList.add('paused'); playingState(); });
    } else {
      dock.widget.load(url, Object.assign({ callback: () => { dock.widget.getDuration((ms) => { dock.dur = ms; }); expectSound(); } }, opts));
    }
  }
  // A browser that refuses to start sound by itself: SoundCloud's own player slides up above
  // the dock for one click on its play button, and goes away once sound runs.
  dock.tap = el('div', 'sc-tap', '<p>Press play once to start the sound</p>');
  document.body.appendChild(dock.tap);
  function needTap(on) {
    clearTimeout(dock.wait);
    if (on) $('#dock-time').textContent = 'Press play';
    dock.tap.classList.toggle('on', on);
  }
  function expectSound() {
    clearTimeout(dock.wait);
    dock.wait = setTimeout(() => { if (!dock.started && !dock.el.hidden) needTap(true); }, 2500);
  }
  $('#dock-play').addEventListener('click', () => { if (dock.widget) { dock.widget.toggle(); if (!dock.started) expectSound(); } });
  $('#dock-close').addEventListener('click', () => {
    if (dock.widget) dock.widget.pause();
    needTap(false); dock.on = false; dock.el.hidden = true; playingState();
  });
  const seek = (frac) => { if (dock.widget && dock.dur) dock.widget.seekTo(dock.dur * clamp(frac)); };
  $('#dock-bar').addEventListener('click', (ev) => { const b = ev.currentTarget.getBoundingClientRect(); seek((ev.clientX - b.left) / b.width); });
  $('#dock-bar').addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const now = +ev.currentTarget.getAttribute('aria-valuenow') / 100;
    seek(now + (ev.key === 'ArrowRight' ? .05 : -.05));
  });
  $('#spin').addEventListener('click', () => { const r = byId('loosen-up') || releases[0]; select(r.id, true); play(r); });

  // ---------- moments: the quote, then photos stack on top of it ----------
  const quote = $('.quote');
  const STACK = [
    ['m-coachella-1', 'Do LaB stage, Coachella 2026', -5, -2.2, -1.5],
    ['m-coachella-2', 'b2b ÆON:MODE', 3.5, 2.6, 1.8],
    ['m-coachella-3', 'Coachella, weekend two', -2.2, -1, 1.2],
    ['m-coachella-4', 'Indio, April 2026', 4, 1.4, -1.2],
  ];
  const stack = $('#stack');
  STACK.forEach(([img, cap]) => stack.appendChild(el('figure', 'polaroid', `<img src="img/${img}.webp" alt="" width="720" height="900" loading="lazy"><figcaption>${esc(cap)}</figcaption>`)));
  const pols = $$('.polaroid', stack);
  $('#quote-big').innerHTML = 'Goin even<br>bigger next time<br>I promise';
  root.classList.toggle('pinq', !reduced);
  function quoteFrame(scrollY) {
    const vh = window.innerHeight;
    const p = clamp((scrollY - quote.offsetTop) / Math.max(1, quote.offsetHeight - vh));
    if (p === quote._p) return;
    quote._p = p;
    const big = $('#quote-big'), main = $('#quote-main');
    big.style.transform = `translate3d(0, calc(-50% + ${lerp(46, -46, clamp(p / .26)).toFixed(2)}vh), 0)`;
    big.style.opacity = (1 - smooth(.19, .27, p)).toFixed(3);
    main.style.opacity = smooth(.22, .31, p).toFixed(3);
    main.style.transform = `scale(${lerp(1.14, 1, smooth(.2, .34, p)).toFixed(4)})`;
    pols.forEach((n, k) => {
      const e = easeOut(clamp((p - (.37 + k * .135)) / .13));
      const [, , rot, ox, oy] = STACK[k];
      n.style.transform = `translate3d(calc(-50% + ${ox}vw), calc(-50% + ${lerp(118, oy, e).toFixed(2)}vh), 0) rotate(${lerp(rot * 3, rot, e).toFixed(2)}deg)`;
    });
    $('#quote-press').style.opacity = smooth(.9, .97, p).toFixed(3);
  }

  // ---------- about: the roll of photos ----------
  const ROLL = [
    ['m-edmonton-1', 'Scream, Edmonton'], ['m-aus-1', 'Australia, Nov 2026'], ['m-shoot-2', 'Loosen Up shoot'],
    ['m-edmonton-3', 'Edmonton, Oct 2026'], ['m-melbourne', 'Day off in Melbourne'], ['m-edmonton-4', 'Best in show'],
    ['m-shoot-1', 'Behind the scenes'], ['m-edmonton-2', 'Thank you Edmonton'], ['m-back', 'Press day'],
    ['m-aus-2', 'Some moments from AUS'], ['m-edmonton-6', 'Scream, Oct 2026'], ['m-shoot-3', 'A new workout plan'], ['m-edmonton-5', 'Edmonton'],
  ];
  const rollHtml = ROLL.map(([img, cap], i) => `<figure class="polaroid" style="--r:${[-4, 3, -2, 5, -3, 2][i % 6]}deg;--y:${[0, 18, -8, 10, -14, 6][i % 6]}px"><img src="img/${img}.webp" alt="" width="720" height="900" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`).join('');
  $('#roll').innerHTML = rollHtml + rollHtml.replace(/<figure /g, '<figure aria-hidden="true" ');

  // ---------- menu ----------
  const menu = $('#menu'), veil = $('#menu-veil');
  function setMenu(open) {
    menu.hidden = veil.hidden = !open;
    burger.setAttribute('aria-expanded', open);
    if (open) $('a', menu).focus({ preventScroll: true }); else burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => setMenu(menu.hidden));
  $('#menu-close').addEventListener('click', () => setMenu(false));
  veil.addEventListener('click', () => setMenu(false));
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !menu.hidden) setMenu(false); });

  // in-page links: "Tour" is a scroll position inside the pinned stage, not an element's top
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    ev.preventDefault();
    if (!menu.hidden) setMenu(false);
    let top;
    if (id === 'home') top = 0;
    else if (id === 'tour' && root.classList.contains('pin')) top = intro.offsetTop + G.wipe + 4;
    else {
      // sections that start with a slanted edge: land just past the slant
      const slant = /^(bookings|music|pink-planet)$/.test(id) ? parseFloat(getComputedStyle(root).getPropertyValue('--slant')) / 100 * window.innerWidth * .8 : 0;
      top = target.getBoundingClientRect().top + window.scrollY + slant - (target.classList.contains('eyebrow') ? 90 : 0);
    }
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    history.replaceState(null, '', id === 'home' ? location.pathname + location.search : '#' + id);
  });

  // ---------- things rise into place the first time they are seen ----------
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((list) => list.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
    ['.book-copy > *', '.contact', '.past', '.planet-copy > *', '.about-headline', '.bio > *', '.facts', '.press', '.outro-copy > *'].forEach((sel) => {
      $$(sel).forEach((n, i) => { n.classList.add('rise'); n.style.setProperty('--d', (i % 6) * .07 + 's'); io.observe(n); });
    });
  }

  // ---------- start ----------
  renderCrate();
  select((byId('loosen-up') || releases[0] || {}).id, false);
  const relayout = () => { fitGiants(); measure(); frame(); };
  let rz = 0;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(relayout, 120); });
  wide.addEventListener('change', relayout);
  relayout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  addEventListener('load', () => {
    relayout();
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)) setTimeout(() => { const a = $(`a[href="#${id}"]`); if (a) a.click(); }, 60);
  });
})();
