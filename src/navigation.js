const button = document.querySelector('#menu-toggle');
const nav = document.querySelector('#main-navigation');
const compact = matchMedia('(max-width: 50rem)');
function closeMenu(){ nav.classList.remove('open'); button.setAttribute('aria-expanded','false'); }
function syncMenu(){ button.hidden = !compact.matches; closeMenu(); }
button.addEventListener('click',()=>{ const open=nav.classList.toggle('open'); button.setAttribute('aria-expanded',String(open)); });
nav.addEventListener('click',event=>{ if(event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown',event=>{ if(event.key==='Escape' && nav.classList.contains('open')){closeMenu();button.focus();} });
compact.addEventListener('change',syncMenu);
syncMenu();
