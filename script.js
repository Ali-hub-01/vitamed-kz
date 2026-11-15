/* Vita Med — script.js (vanilla, без библиотек) */
(function () {
  'use strict';
  var C = window.VITAMED || {};
  var WA = C.wa || '77762249750';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Scroll progress + header state ---- */
  var bar = $('.progress span');
  var header = $('.header');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + '%';
      if (header) header.classList.toggle('scrolled', y > 10);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobile drawer ---- */
  var burger = $('.burger'), drawer = $('.drawer');
  function setMenu(open) {
    if (!burger || !drawer) return;
    burger.classList.toggle('open', open);
    drawer.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && drawer) {
    burger.addEventListener('click', function () { setMenu(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) { if (e.target === drawer || e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ---- Desktop dropdown ---- */
  $$('.nav li.has-menu').forEach(function (li) {
    var btn = $('button.drop', li);
    if (!btn) return;
    var t;
    function open() { clearTimeout(t); li.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    function close() { t = setTimeout(function () { li.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }, 120); }
    li.addEventListener('mouseenter', open);
    li.addEventListener('mouseleave', close);
    btn.addEventListener('click', function () { li.classList.contains('open') ? (clearTimeout(t), li.classList.remove('open')) : open(); });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) close(); });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav li.has-menu')) $$('.nav li.has-menu.open').forEach(function (li) { li.classList.remove('open'); });
  });

  /* ---- Reveal on scroll ---- */
  var revealSel = '.reveal,.reveal-left,.reveal-scale,.stagger,.pop-in,.checklist';
  var revealEls = $$(revealSel);
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ---- Этапы: линия и круги заполняются по мере прокрутки ---- */
  (function () {
    var tracks = $$('.timeline, .steps');
    if (!tracks.length) return;
    tracks.forEach(function (t) { t.classList.add('prog'); });
    function markerOf(item) { return item.querySelector('.dot, .n'); }
    function update() {
      var vh = window.innerHeight;
      tracks.forEach(function (t) {
        var items = Array.prototype.slice.call(t.children).filter(function (c) { return c.matches('.tl, .step'); });
        if (!items.length) return;
        var rect = t.getBoundingClientRect();
        var horiz = getComputedStyle(t).gridTemplateColumns.split(' ').length > 1;
        var centers = items.map(function (it) {
          var r = markerOf(it).getBoundingClientRect();
          return horiz ? (r.left + r.width / 2 - rect.left) : (r.top + r.height / 2 - rect.top);
        });
        var start = centers[0], len = Math.max(1, centers[centers.length - 1] - start);
        var p;
        if (reduce) p = 1;
        else if (horiz) p = (vh * 0.85 - rect.top) / (rect.height + vh * 0.35);
        else p = (vh * 0.62 - (rect.top + start)) / len;
        p = Math.max(0, Math.min(1, p));
        t.classList.toggle('horiz', horiz);
        t.style.setProperty('--ls', start + 'px');
        t.style.setProperty('--le', len + 'px');
        t.style.setProperty('--p', p.toFixed(4));
        var raw = reduce ? Infinity : (horiz ? start + ((vh * 0.85 - rect.top) / (rect.height + vh * 0.35)) * len : vh * 0.62 - rect.top);
        var pos = Math.min(start + p * len, raw), cur = -1;
        items.forEach(function (it, i) {
          var on = centers[i] <= pos + 2;
          it.classList.toggle('on', on);
          if (on) cur = i;
        });
        items.forEach(function (it, i) { it.classList.toggle('cur', i === cur && p < 1); });
        t.classList.toggle('done', p >= 1);
      });
    }
    var ticking = false;
    function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', update);
    update();
  })();

  var hero = $('.hero');
  if (hero) requestAnimationFrame(function () { setTimeout(function () { hero.classList.add('loaded'); }, 80); });

  /* ---- Count-up stats ---- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '';
    var dur = 1400, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  var counters = $$('[data-count]');
  if (!reduce && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { animateCount(en.target); co.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { co.observe(el); });
  } else {
    counters.forEach(function (el) { el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || ''); });
  }

  /* ---- Hero parallax (мышь, только desktop) ---- */
  if (hero && !reduce && window.matchMedia('(pointer:fine)').matches) {
    var layers = $$('.fcard', hero), raf = null, tx = 0, ty = 0, cx = 0, cy = 0;
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(step);
    });
    hero.addEventListener('mouseleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(step); });
    function step() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      layers.forEach(function (el, i) {
        var k = (i + 1) * 6;
        el.style.marginLeft = (cx * k) + 'px';
        el.style.marginTop = (cy * k) + 'px';
      });
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(step) : null;
    }
  }

  /* ---- FAQ accordion ---- */
  $$('.faq-item').forEach(function (item) {
    var q = $('.faq-q', item);
    if (!q) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      $$('.faq-item.open').forEach(function (o) { if (o !== item) { o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); } });
      item.classList.toggle('open', !open);
      q.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  /* ---- Doctors: filters + «Показать всех» ---- */
  var grid = $('.doctors');
  if (grid) {
    var cards = $$('.doc', grid), chips = $$('.filters .chip'), moreBtn = $('.doctors-more button');
    var LIMIT = parseInt(grid.getAttribute('data-limit') || '8', 10);
    var expanded = false, filter = 'all';
    function apply() {
      var shown = 0, total = 0;
      cards.forEach(function (card) {
        var tags = ' ' + (card.getAttribute('data-tags') || '') + ' ';
        var match = filter === 'all' || tags.indexOf(' ' + filter + ' ') > -1;
        if (match) total++;
        var visible = match && (expanded || filter !== 'all' || shown < LIMIT);
        if (visible) shown++;
        var was = !card.classList.contains('is-hidden');
        card.classList.toggle('is-hidden', !visible);
        if (visible && !was && !reduce) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); }
      });
      if (moreBtn) {
        var hiddenCount = total - shown;
        moreBtn.parentNode.style.display = (filter === 'all' && cards.length > LIMIT) ? '' : 'none';
        moreBtn.innerHTML = expanded ? 'Свернуть' : 'Показать всех врачей <span class="cnt">(' + hiddenCount + ')</span>';
      }
    }
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); c.setAttribute('aria-pressed', 'false'); });
        chip.classList.add('is-active'); chip.setAttribute('aria-pressed', 'true');
        filter = chip.getAttribute('data-filter') || 'all';
        apply();
      });
    });
    if (moreBtn) moreBtn.addEventListener('click', function () {
      expanded = !expanded; apply();
      if (!expanded) { var top = grid.getBoundingClientRect().top + window.scrollY - 120; window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' }); }
    });
    apply();
  }

  /* ---- Lightbox ---- */
  var lbLinks = $$('a[data-lightbox]');
  if (lbLinks.length) {
    var lb = document.createElement('div');
    lb.className = 'lb';
    lb.innerHTML = '<button class="lb-x" aria-label="Закрыть"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '<button class="lb-prev" aria-label="Назад"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
      '<img alt="">' +
      '<button class="lb-next" aria-label="Вперёд"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<div class="lb-count"></div>';
    document.body.appendChild(lb);
    var lbImg = $('img', lb), lbCount = $('.lb-count', lb), group = [], idx = 0;
    function show(i) {
      idx = (i + group.length) % group.length;
      lbImg.src = group[idx].getAttribute('href');
      lbImg.alt = group[idx].getAttribute('data-alt') || ($('img', group[idx]) || {}).alt || '';
      lbCount.textContent = (idx + 1) + ' / ' + group.length;
      lbCount.style.display = group.length > 1 ? '' : 'none';
      $('.lb-prev', lb).style.display = $('.lb-next', lb).style.display = group.length > 1 ? '' : 'none';
    }
    function openLb(a) {
      var g = a.getAttribute('data-lightbox');
      group = lbLinks.filter(function (l) { return l.getAttribute('data-lightbox') === g; });
      show(group.indexOf(a));
      lb.classList.add('open'); document.body.style.overflow = 'hidden';
    }
    function closeLb() { lb.classList.remove('open'); document.body.style.overflow = ''; }
    lbLinks.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openLb(a); }); });
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-x') || e.target === lb) closeLb();
      else if (e.target.closest('.lb-prev')) show(idx - 1);
      else if (e.target.closest('.lb-next')) show(idx + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(dx < 0 ? idx + 1 : idx - 1); });
  }

  /* ---- Lead form → WhatsApp (+ Telegram, если настроен) ---- */
  var form = $('#lead-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.trim();
      var service = form.elements.service.value;
      var comment = form.elements.comment.value.trim();
      var ph = form.elements.phone;
      if (form.elements.website && form.elements.website.value) { form.closest('.form-card').classList.add('sent'); return; } /* бот */
      var valid = window.vitamedValidPhone ? window.vitamedValidPhone(phone) : phone.replace(/\D/g, '').length >= 10;
      var err = form.querySelector('.form-err');
      if (!valid) { ph.classList.add('invalid'); if (err) err.hidden = false; ph.focus(); return; }
      ph.classList.remove('invalid'); if (err) err.hidden = true;
      if (window.vitamedFormatPhone) phone = window.vitamedFormatPhone(phone);
      var lines = ['Здравствуйте! Заявка с сайта Vita Med.'];
      if (name) lines.push('Имя: ' + name);
      lines.push('Телефон: ' + phone);
      if (service) lines.push('Услуга: ' + service);
      if (comment) lines.push('Комментарий: ' + comment);
      var waUrl = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(lines.join('\n'));
      form.closest('.form-card').classList.add('sent');
      if (window.vitamedLead) window.vitamedLead({ name: name, phone: phone, service: service, comment: comment, source: 'Форма на сайте' }, waUrl);
      else window.open(waUrl, '_blank', 'noopener');
    });
    form.addEventListener('input', function (e) { if (e.target.classList.contains('invalid') && e.target.value.trim()) e.target.classList.remove('invalid'); });
    $$('.form-ok button', form.closest('.form-card')).forEach(function (b) { b.addEventListener('click', function () { form.closest('.form-card').classList.remove('sent'); form.reset(); }); });
  }

  /* ---- Preselect service in form from data-service links ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-service]');
    if (!a || !form) return;
    var sel = form.elements.service;
    var v = a.getAttribute('data-service');
    for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].value === v) { sel.selectedIndex = i; break; } }
  });

  /* ---- Fill in phone/wa from config where marked ---- */
  $$('[data-phone-display]').forEach(function (el) { if (C.phoneDisplay) el.textContent = C.phoneDisplay; });
})();
