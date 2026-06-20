/* ===== Animations Baromètre Hit Lokal =====
   - apparition au défilement
   - chiffres qui s'incrémentent
   - lien de menu actif (scrollspy)
   (l'entrée du Hero + les survols sont gérés en CSS via .anim-ready)
   Tout est désactivé si l'utilisateur a choisi « réduire les animations ». */
(function(){
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---- 1) Apparition au défilement (déclenche aussi le compteur) ---- */
  const REVEAL = '.sec-head, .chart-card, .kpi, .tier-card, .plan, .cert-badge, '
               + '.magnet, .fem-cta, .trust > div, .cert-formula-box, .note-banner';

  const io = new IntersectionObserver(function(entries){
    for(const e of entries){
      if(!e.isIntersecting) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
      if(e.target.matches('.kpi'))            countUp(e.target.querySelector('.v'));
      else if(e.target.matches('.trust > div')) countUp(e.target.querySelector('b'));
    }
  }, {threshold:.12, rootMargin:'0px 0px -38px 0px'});

  function scan(){
    document.querySelectorAll(REVEAL).forEach(function(el){
      if(!el.classList.contains('reveal')){ el.classList.add('reveal'); io.observe(el); }
    });
  }
  scan();

  // l'appli injecte du contenu après coup (graphiques par année, recherche…) → on re-scanne
  let raf = 0;
  new MutationObserver(function(){
    cancelAnimationFrame(raf); raf = requestAnimationFrame(scan);
  }).observe(document.body, {childList:true, subtree:true});

  /* ---- 2) Chiffres qui s'incrémentent ---- */
  function countUp(el){
    if(!el || el.dataset.counted) return;
    const raw = el.textContent.trim();
    const m = raw.match(/^([+\-]?)([\d.,\s  ]*\d)(.*)$/);
    if(!m) return;                       // pas un nombre (nom de style, d'artiste…)
    const sign = m[1], numStr = m[2], suffix = m[3];
    const hasComma = numStr.indexOf(',') >= 0;
    const value = parseFloat(numStr.replace(/[\s  .]/g,'').replace(',', '.'));
    if(!isFinite(value)) return;
    const dec = hasComma ? (numStr.split(',')[1] || '').replace(/\s/g,'').length : 0;
    el.dataset.counted = '1';

    const group = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const fmt = v => { let s = dec ? v.toFixed(dec) : String(Math.round(v));
                       const p = s.split('.'); p[0] = group(p[0]); return p.join(','); };

    const dur = 1100, t0 = performance.now();
    (function tick(now){
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = sign + fmt(value * e) + suffix;
      if(p < 1) requestAnimationFrame(tick);
      else el.textContent = sign + fmt(value) + suffix;
    })(t0);
  }

  /* ---- 3) Lien de menu actif selon la section visible ---- */
  const links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  const byId = {};
  links.forEach(function(a){ const id = a.getAttribute('href').slice(1); if(id) byId[id] = a; });

  const spy = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      const a = byId[e.target.id];
      if(a && e.isIntersecting){ links.forEach(x => x.classList.remove('active')); a.classList.add('active'); }
    });
  }, {rootMargin:'-45% 0px -50% 0px', threshold:0});

  document.querySelectorAll('section[id]').forEach(function(s){ if(byId[s.id]) spy.observe(s); });
})();
