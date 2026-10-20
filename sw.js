/* ARGOPOWER Tool Blaster: offline cache. Online = always the newest files; offline = last saved copy. */
const C = 'argopower-v3';
const A = ['m','f','m_eye','m_glove','m_helm','f_eye','f_glove','f_helm','bee1','bee2','ant1','ant2','drone1','drone2','boss1','boss2','boss3','ob1a','ob1b','ob2a','ob2b','ob3a','ob3b','heat','nail','disc','glove','helm','eye','pdisc','sting','spit','dlaser','bolt','logo','bomb','missile','icon-192','icon-512'].map(n => 'assets/' + n + '.png')
  .concat(['bg1','bg2','bg3'].map(n => 'assets/' + n + '.jpg'));
// Missing art files are skipped instead of breaking the install.
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => Promise.all(['./', 'index.html', 'config.js', 'manifest.webmanifest', ...A].map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;   // leaderboard calls always go to the network
  e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
