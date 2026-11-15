/* Vita Med — перехват клика по WhatsApp: модалка с номером → заявка боту (если
   настроен Telegram в config.js) → переход в WhatsApp. Конфиг: window.VITAMED. */
(function () {
  'use strict';
  var C = window.VITAMED || {};
  var TG = C.telegram || {};
  var SITE = C.site || 'Vita Med';
  /* Корень сайта (работает и на vita-med.kz, и на превью в подпапке) */
  var BASE = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/lead-capture\.js.*$/, '') : '/';
  })();

  /* ---- Проверка номера: только реальные номера +7 (Казахстан / РФ) ---- */
  function normPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '8') d = '7' + d.slice(1);
    return d;
  }
  window.vitamedValidPhone = function (v) {
    var d = normPhone(v);
    if (!/^7[3-9]\d{9}$/.test(d)) return false;            /* +7 и 10 цифр, код 3xx–9xx */
    var local = d.slice(1);
    if (/^(\d)\1+$/.test(local)) return false;              /* 7777777777 */
    if (/(\d)\1{6,}/.test(local)) return false;             /* 7 одинаковых подряд */
    if (/0123456|1234567|2345678|3456789|9876543|8765432/.test(local)) return false;
    return true;
  };
  window.vitamedFormatPhone = function (v) {
    var d = normPhone(v);
    if (d.length !== 11) return v;
    return '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7, 9) + ' ' + d.slice(9, 11);
  };

  /* Маска ввода телефона для всех полей type=tel */
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (!el || el.type !== 'tel') return;
    var raw = el.value;
    var d = raw.replace(/\D/g, '');
    if (!d) { el.value = ''; return; }
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    else if (raw.indexOf('+') === -1 && d.length === 10) d = '7' + d;   /* вставили 701 555 44 33 */
    else if (d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var out = '+7';
    if (d.length > 1) out += ' ' + d.slice(1, 4);
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += ' ' + d.slice(7, 9);
    if (d.length > 9) out += ' ' + d.slice(9, 11);
    el.value = out;
  }, true);
  /* Поле телефона сразу начинается с «+7 » */
  document.addEventListener('focusin', function (e) {
    var el = e.target;
    if (el && el.type === 'tel' && !el.value) el.value = '+7 ';
  });
  document.addEventListener('focusout', function (e) {
    var el = e.target;
    if (el && el.type === 'tel' && /^\+?7?\s*$/.test(el.value)) el.value = '';
  });

  /* ---- Единая обработка реальной заявки ----
     1) копия в Telegram, 2) WhatsApp в новой вкладке,
     3) текущая вкладка → /spasibo (там GTM засчитывает конверсию Google Ads).
     Повторная заявка с тем же номером в этой сессии конверсию не дублирует. */
  window.vitamedLead = function (f, waUrl) {
    var phone = window.vitamedFormatPhone(f.phone);
    f.phone = phone;
    var key = 'vm_lead_' + normPhone(phone);
    var dup = false;
    try { dup = sessionStorage.getItem(key) === '1'; } catch (e) {}
    if (!dup) window.vitamedSendLead(f);
    try { sessionStorage.setItem(key, '1'); sessionStorage.setItem('vm_last_wa', waUrl); } catch (e) {}
    window.open(waUrl, '_blank', 'noopener');
    if (!dup) {
      setTimeout(function () { location.href = BASE + 'spasibo/'; }, 150);
    }
    return !dup;
  };

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
      '<p class="vm-err" hidden>Проверьте номер: нужен действующий номер в формате +7 7XX XXX XX XX</p>' +
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

  function buildWa(href, phone, name) {
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
    return out;
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
      if (!window.vitamedValidPhone(phone)) { ph.classList.add('invalid'); ov.querySelector('.vm-err').hidden = false; ph.focus(); return; }
      ph.classList.remove('invalid'); ov.querySelector('.vm-err').hidden = true;
      phone = window.vitamedFormatPhone(phone);
      closeModal();
      window.vitamedLead({ phone: phone, name: name, source: 'WhatsApp-кнопка' },
        buildWa(pendingHref || ('https://wa.me/' + (C.wa || '')), phone, name));
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
