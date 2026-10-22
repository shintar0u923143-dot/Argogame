/* ARGOPOWER Tool Blaster: offline cache. Online = always the newest files; offline = last saved copy. */
const C = 'argopower-v15';
const A = ['sk_water','sk_saw','sk_blade','sk_hammer','skb_water','skb_saw','skb_hammer','pu_aid','shock','fx_shock','ui_pause','ui_panel','ui_btn_red','ui_btn_dark','ui_row','ui_medal1','ui_medal2','ui_medal3','ui_pod1','ui_pod2','ui_pod3','ui_crown','m','f','m_eye','m_glove','m_helm','f_eye','f_glove','f_helm','bee1','bee2','ant1','ant2','drone1','drone2','boss1','boss2','boss3','ob1a','ob1b','ob2a','ob2b','ob3a','ob3b','heat','nail','disc','glove','helm','eye','pdisc','sting','spit','dlaser','bolt','logo','bomb','missile','aura1','aura2','aura3','aura4','orb','pu_heat','pu_nail','pu_disc','pu_eye','pu_glove','pu_helm','fx_boom1','fx_boom2','fx_boom3','fx_boom4','icon-192','icon-512'].map(n => 'assets/' + n + '.png')
  .concat(['bg1','bg2','bg3'].map(n => 'assets/' + n + '.jpg'),['assets/oswald-latin-500-normal.woff2','assets/oswald-latin-600-normal.woff2']);
// Missing art files are skipped instead of breaking the install.
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(['./', 'index.html', 'config.js', 'manifest.webmanifest', ...A].map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // leaderboard calls always go to the network
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
