// Theme engine — fetches /api/theme and applies to the page
(function () {
  // --- Loading overlay (injected before body renders) ---
  var _overlay = document.createElement('div');
  _overlay.id = '__theme-loader';
  _overlay.innerHTML = '<div class="__tl-box"><div class="__tl-spinner"></div><p class="__tl-text">Loading...</p></div>';
  var _style = document.createElement('style');
  _style.textContent = [
    '#__theme-loader{position:fixed;inset:0;z-index:99999;background:#fff;display:flex;align-items:center;justify-content:center;transition:opacity .35s ease}',
    '#__theme-loader.hide{opacity:0;pointer-events:none}',
    '.__tl-box{display:flex;flex-direction:column;align-items:center;gap:14px}',
    '.__tl-spinner{width:44px;height:44px;border:4px solid #e2e8f0;border-top-color:#0284C7;border-radius:50%;animation:__tl-spin .75s linear infinite}',
    '@keyframes __tl-spin{to{transform:rotate(360deg)}}',
    '.__tl-text{font-family:sans-serif;font-size:15px;color:#64748b;letter-spacing:.5px}',
  ].join('');
  document.head.appendChild(_style);
  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(_overlay);
  });
  function _hideOverlay() {
    if (!_overlay.parentNode) { document.body && document.body.appendChild(_overlay); }
    _overlay.classList.add('hide');
    setTimeout(function () { _overlay.parentNode && _overlay.parentNode.removeChild(_overlay); }, 400);
  }
  // ---
  function hexToHsl(hex) {
    let r = parseInt(hex.slice(1,3),16)/255;
    let g = parseInt(hex.slice(3,5),16)/255;
    let b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h, s, l = (max+min)/2;
    if (max === min) { h = s = 0; }
    else {
      const d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d+(g<b?6:0); break;
        case g: h=(b-r)/d+2; break;
        case b: h=(r-g)/d+4; break;
      }
      h /= 6;
    }
    return [h*360, s*100, l*100];
  }
  function hslToHex(h,s,l) {
    h/=360; s/=100; l/=100;
    let r,g,b;
    if(s===0){r=g=b=l;}
    else{
      const hue2=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
      const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
      r=hue2(p,q,h+1/3); g=hue2(p,q,h); b=hue2(p,q,h-1/3);
    }
    return '#'+[r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');
  }
  function scale(hex) {
    const [h,s,l] = hexToHsl(hex);
    return {
      '50':  hslToHex(h, Math.min(s*0.18,25), 97),
      '100': hslToHex(h, Math.min(s*0.3,35),  93),
      '200': hslToHex(h, Math.min(s*0.5,55),  87),
      '400': hslToHex(h, s*0.88, Math.min(l+26,72)),
      '500': hslToHex(h, s*0.94, Math.min(l+12,62)),
      '600': hex,
      '700': hslToHex(h, s, Math.max(l-10,10)),
      '800': hslToHex(h, s, Math.max(l-22,6)),
    };
  }
  function applyTheme(t) {
    const root = document.documentElement;
    const p = scale(t.color_primary || '#0284C7');
    const a = scale(t.color_accent  || '#DB2777');
    const vars = {
      '--blue-50':p['50'],'--blue-100':p['100'],'--blue-200':p['200'],
      '--blue-400':p['400'],'--blue-500':p['500'],'--blue-600':p['600'],
      '--blue-700':p['700'],'--blue-800':p['800'],
      '--brown-100':a['50'],'--brown-200':a['100'],
      '--brown-400':a['400'],'--brown-500':a['500'],
      '--brown-600':a['600'],'--brown-700':a['700'],
      '--bg': t.color_bg || '#F5F8FF',
    };
    for (const [k,v] of Object.entries(vars)) root.style.setProperty(k,v);

    // Font
    if (t.font_family) {
      const fname = t.font_family.replace(/ /g,'+');
      if (!document.querySelector('[data-theme-font]')) {
        const lk = document.createElement('link');
        lk.rel = 'stylesheet';
        lk.setAttribute('data-theme-font','1');
        lk.href = 'https://fonts.googleapis.com/css2?family='+fname+':wght@300;400;500;600;700;800;900&display=swap';
        document.head.appendChild(lk);
      }
      root.style.setProperty('--font', "'"+t.font_family+"', sans-serif");
      document.body.style.fontFamily = "'"+t.font_family+"', sans-serif";
    }

    // Product page
    if (t.color_product_name)       root.style.setProperty('--product-name-color',  t.color_product_name);
    if (t.color_product_price)      root.style.setProperty('--product-price-color', t.color_product_price);
    if (t.color_product_gallery_bg) root.style.setProperty('--product-gallery-bg',  t.color_product_gallery_bg);
    if (t.color_product_desc_bg)    root.style.setProperty('--product-desc-bg',     t.color_product_desc_bg);
    if (t.color_product_desc_text)  root.style.setProperty('--product-desc-text',   t.color_product_desc_text);

    // Payment page
    if (t.color_payment_title)        root.style.setProperty('--payment-title-color',    t.color_payment_title);
    if (t.color_payment_sub)          root.style.setProperty('--payment-sub-color',       t.color_payment_sub);
    if (t.color_payment_upload_bg)    root.style.setProperty('--payment-upload-bg',       t.color_payment_upload_bg);
    if (t.color_payment_upload_border)root.style.setProperty('--payment-upload-border',   t.color_payment_upload_border);

    // Bank info (checkout + success pages)
    const bName = t.bank_name || 'ธนาคารกสิกรไทย (KBank)';
    const bAcc  = t.bank_account || 'xxx-x-xxxxx-x';
    const bAccN = t.bank_account_name || 'EasyCart Store';
    document.querySelectorAll('[data-theme="bank-name"]').forEach(el => el.textContent = bName);
    document.querySelectorAll('[data-theme="bank-account"]').forEach(el => el.textContent = bAcc);
    document.querySelectorAll('[data-theme="bank-account-name"]').forEach(el => el.textContent = 'ชื่อบัญชี: ' + bAccN);
    const bankStepEl = document.getElementById('bankStep');
    if (bankStepEl) bankStepEl.innerHTML = `โอนเงินมาที่ <strong style="color:var(--gray-800)">${bName} ${bAcc}</strong>`;

    // Checkout page
    if (t.color_checkout_heading) root.style.setProperty('--checkout-heading', t.color_checkout_heading);
    if (t.color_bank_bg)          root.style.setProperty('--bank-bg',          t.color_bank_bg);
    if (t.color_bank_text)        root.style.setProperty('--bank-text',         t.color_bank_text);

    // Logo/nav color
    if (t.color_logo) root.style.setProperty('--logo-color', t.color_logo);

    // Track page colors
    if (t.color_track_title) root.style.setProperty('--track-title-color', t.color_track_title);
    if (t.color_track_sub)   root.style.setProperty('--track-sub-color',   t.color_track_sub);
    if (t.color_track_id)      root.style.setProperty('--track-id-color', t.color_track_id);
    if (t.color_track_total)   root.style.setProperty('--track-total',    t.color_track_total);
    if (t.color_track_step_bg) root.style.setProperty('--track-step-bg',  t.color_track_step_bg);
    if (t.color_status_pending_bg)   root.style.setProperty('--status-pending-bg',   t.color_status_pending_bg);
    if (t.color_status_pending_txt)  root.style.setProperty('--status-pending-txt',  t.color_status_pending_txt);
    if (t.color_status_shipped_bg)   root.style.setProperty('--status-shipped-bg',   t.color_status_shipped_bg);
    if (t.color_status_shipped_txt)  root.style.setProperty('--status-shipped-txt',  t.color_status_shipped_txt);
    if (t.color_status_delivered_bg) root.style.setProperty('--status-delivered-bg', t.color_status_delivered_bg);
    if (t.color_status_delivered_txt)root.style.setProperty('--status-delivered-txt',t.color_status_delivered_txt);

    // Footer colors
    if (t.color_footer_bg)   root.style.setProperty('--footer-bg',   t.color_footer_bg);
    if (t.color_footer_text) root.style.setProperty('--footer-text', t.color_footer_text);

    // Badge colors
    if (t.badge_color)  root.style.setProperty('--badge-color',  t.badge_color);
    if (t.badge_bg)     root.style.setProperty('--badge-bg',     t.badge_bg);
    if (t.badge_border) root.style.setProperty('--badge-border', t.badge_border);
    // Badge texts
    const badgeEl = document.getElementById('heroBadges');
    if (badgeEl) {
      const texts = [1,2,3,4]
        .filter(n => t['badge_'+n+'_enabled'] !== '0')
        .map(n => t['badge_'+n]).filter(Boolean);
      badgeEl.innerHTML = texts.map(b => `<span class="badge">${b}</span>`).join('');
    }

    // Button text colors
    if (t.color_btn_primary_text) root.style.setProperty('--btn-primary-text', t.color_btn_primary_text);
    if (t.color_btn_accent_text)  root.style.setProperty('--btn-accent-text',  t.color_btn_accent_text);

    // Hero text colors
    if (t.color_hero_text) root.style.setProperty('--hero-text', t.color_hero_text);
    if (t.color_hero_sub)  root.style.setProperty('--hero-sub',  t.color_hero_sub);

    // Text colors
    if (t.color_text_dark)  root.style.setProperty('--gray-800', t.color_text_dark);
    if (t.color_text_body)  root.style.setProperty('--gray-600', t.color_text_body);
    if (t.color_text_light) root.style.setProperty('--gray-400', t.color_text_light);

    // Logo
    const storeName = t.store_name || 'EasyCart';
    document.querySelectorAll('a.logo').forEach(el => {
      if (t.logo_image) {
        el.innerHTML = `<img src="${t.logo_image}" style="height:36px;width:auto;object-fit:contain;vertical-align:middle"> <span>${storeName}</span>`;
      } else {
        el.textContent = (t.logo_icon||'🛒') + ' ' + storeName;
      }
    });

    // Hero (index.html only)
    const heroTitle = document.getElementById('heroTitle');
    const heroSub   = document.getElementById('heroSubtitle');
    if (heroTitle && t.hero_title)    heroTitle.textContent  = t.hero_title;
    if (heroSub   && t.hero_subtitle) heroSub.textContent    = t.hero_subtitle;

    // Footer
    const footerDesc = document.getElementById('footerDesc');
    const footerCopy = document.getElementById('footerCopy');
    if (footerDesc && t.footer_desc) footerDesc.textContent = t.footer_desc;
    if (footerCopy && t.footer_copy) footerCopy.textContent = t.footer_copy;
    if (t.footer_line)  document.querySelectorAll('[data-theme="line"]').forEach(el=>{ el.textContent='Line: '+t.footer_line; });
    if (t.footer_fb)    document.querySelectorAll('[data-theme="fb"]').forEach(el=>{ el.textContent='Facebook: '+t.footer_fb; });
    if (t.footer_email) document.querySelectorAll('[data-theme="email"]').forEach(el=>{ el.textContent='Email: '+t.footer_email; });
  }

  fetch('/api/theme').then(r=>r.json()).then(function(t){ applyTheme(t); _hideOverlay(); }).catch(function(){ _hideOverlay(); });
})();
