/* Vita Med — перехват клика по WhatsApp: модалка с номером → заявка боту (если
   настроен Telegram в config.js) → переход в WhatsApp. Конфиг: window.VITAMED. */
(function () {
  'use strict';
  var C = window.VITAMED || {};
  var TG = C.telegram || {};
  var SITE = C.site || 'Vita Med';

  /* ---- Отправка заявки боту (Cloudflare Worker → Telegram) ---- */
  window.vitamedSendLead = function (f) {
    f = f || {};
    if (!TG.worker || !TG.secret) return;
    var lines = ['🟢 Заявка с сайта: ' + SITE];
    if (f.phone)   lines.push('Телефон: ' + f.phone);
    if (f.name)    lines.push('Имя: ' + f.name);
    if (f.service) lines.push('Услуга: ' + f.service);
    if (f.address) lines.push('Адрес: ' + f.address);
    if (f.comment) lines.push('Комментарий: ' + f.comment);
    if (f.source)  lines.push('Источник: ' + f.source);
    lines.push('Страница: ' + location.href);
    try {
      fetch(TG.worker.replace(/\/$/, '') + '/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret: TG.secret, text: lines.join('\n') }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  };

  /* ---- Разметка модалки ---- */
  var WA_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35M12.05 21.79h-.01a9.8 9.8 0 0 1-4.98-1.36l-.36-.21-3.7.97.99-3.61-.24-.37a9.77 9.77 0 0 1-1.5-5.22c0-5.4 4.4-9.79 9.81-9.79a9.75 9.75 0 0 1 9.79 9.8c0 5.4-4.4 9.79-9.8 9.79m8.33-18.11A11.7 11.7 0 0 0 12.04 0C5.5 0 .16 5.33.16 11.88c0 2.1.55 4.14 1.59 5.94L.06 24l6.33-1.66a11.85 11.85 0 0 0 5.65 1.44h.01c6.54 0 11.87-5.33 11.87-11.88 0-3.18-1.24-6.16-3.49-8.4"/></svg>';
  var ov = document.createElement('div');
  ov.className = 'vm-ov';
  ov.innerHTML =
    '<div class="vm-card" role="dialog" aria-modal="true" aria-label="Оставить заявку">' +
      '<button class="vm-x" type="button" aria-label="Закрыть">&times;</button>' +
      '<div class="vm-ico">' + WA_SVG + '</div>' +
      '<h3 class="vm-h">Оставьте номер телефона</h3>' +
      '<p class="vm-p">Администратор перезвонит в течение 2 минут. После отправки откроется WhatsApp.</p>' +
      '<label class="field"><input type="text" name="vm-name" autocomplete="name" placeholder=" "><span>Ваше имя</span></label>' +
      '<label class="field"><input type="tel" name="vm-phone" inputmode="tel" autocomplete="tel" placeholder=" "><span>Телефон *</span></label>' +
      '<button class="btn btn-wa btn-lg btn-block vm-go" type="button">' + WA_SVG + '<span>Написать в WhatsApp</span></button>' +
      '<p class="vm-note">Нажимая кнопку, вы соглашаетесь на обработку контактных данных. Обращения конфиденциальны.</p>' +
    '</div>';
  function mount() { document.body.appendChild(ov); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  var pendingHref = '';
  var phoneInput = function () { return ov.querySelector('input[name="vm-phone"]'); };
  var nameInput  = function () { return ov.querySelector('input[name="vm-name"]'); };

  function openModal() { ov.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(function () { phoneInput().focus(); }, 120); }
  function closeModal() { ov.classList.remove('open'); document.body.style.overflow = ''; }

  function openWhatsApp(href, phone, name) {
    var out = href;
    try {
      var u = new URL(href, location.href);
      var t = u.searchParams.get('text') || ('Здравствуйте! Заявка с сайта ' + SITE + '.');
      t += '\nМой телефон: ' + phone + (name ? '\nИмя: ' + name : '');
      u.searchParams.set('text', t);
      out = u.toString();
    } catch (e) {
      out = href + (href.indexOf('?') > -1 ? '&' : '?') + 'text=' + encodeURIComponent('Заявка. Телефон: ' + phone);
    }
    window.open(out, '_blank', 'noopener');
  }

  /* ---- Перехват кликов по WhatsApp ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp"]');
    if (!a) return;
    if (a.hasAttribute('data-no-gate') || a.closest('.vm-ov')) return;
    e.preventDefault();
    e.stopPropagation();
    pendingHref = a.getAttribute('href');
    openModal();
  }, true);

  ov.addEventListener('click', function (e) {
    if (e.target.classList.contains('vm-x') || e.target === ov) { closeModal(); return; }
    if (e.target.closest('.vm-go')) {
      var ph = phoneInput(), nm = nameInput();
      var phone = ph.value.trim(), name = nm.value.trim();
      if (phone.replace(/\D/g, '').length < 10) { ph.classList.add('invalid'); ph.focus(); return; }
      ph.classList.remove('invalid');
      window.vitamedSendLead({ phone: phone, name: name, source: 'WhatsApp-кнопка' });
      openWhatsApp(pendingHref || ('https://wa.me/' + (C.wa || '')), phone, name);
      closeModal();
      ph.value = ''; nm.value = '';
    }
  });
  ov.addEventListener('input', function (e) {
    if (e.target.classList.contains('invalid') && e.target.value.trim()) e.target.classList.remove('invalid');
  });
  ov.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); ov.querySelector('.vm-go').click(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
})();
