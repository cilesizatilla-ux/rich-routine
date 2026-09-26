// Rich Routine — çevrimdışı katmanı.
//
// AĞ ÖNCE, ÖNBELLEK YEDEK. Tersi (önbellek önce) daha hızlı olurdu ama
// bu projede bir kez başımıza geldi: Blazor'un _framework dosyaları
// FINGERPRINT TAŞIMIYOR (WasmFingerprintAssets=false), yani adı sabit
// içeriği değişiyor. Bir dosyanın eskisi, diğerinin yenisi servis
// edilince bütünlük (integrity) kontrolü patlıyor ve oyun hiç açılmıyor.
// Tarayıcı önbelleğiyle tam olarak bu yaşandı ve portu değiştirerek
// kaçmak zorunda kaldık.
//
// Ağ önce olunca çevrimiçi oyuncu her zaman tutarlı bir sürüm alıyor;
// önbellek yalnızca uçak modunda devreye giriyor ve orada da tek bir
// sürümün tamamı duruyor.
const SURUM = 'rr-v45';

self.addEventListener('install', (e) => {
  // Hemen devral: eski sürüm sekmede beklerken yeni sürüm kurulmasın.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const adlar = await caches.keys();
    await Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const istek = e.request;
  if (istek.method !== 'GET') return;

  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return;

  // AĞ ÖNCE YETMİYORMUŞ: fetch() varsayılan olarak TARAYICI ÖNBELLEĞİNE
  // de bakıyor. GitHub Pages html ve css için 'max-age=600' gönderiyor,
  // yani yayınladığım değişiklik on dakika boyunca gelmiyordu.
  //
  // İLK ÇÖZÜMÜM SİTEYİ KIRDI. Yalnızca kabuk dosyalarını (html, css,
  // js) taze isteyip _framework'ü tarayıcı önbelleğine bırakmıştım;
  // yeni sürüm yayınlanınca kabuk yeni, _framework eski geldi ve
  // Blazor'un bütünlük kontrolü patladı — oyun hiç açılmadı. Bu dosyanın
  // en üstündeki not zaten bunu anlatıyordu: _framework dosyaları
  // fingerprint taşımıyor, adı sabit içeriği değişiyor, KARIŞIK YAŞ
  // ölümcül.
  //
  // Doğru ölçüt "hangi dosya" değil, "bu SÜRÜMDE daha önce indirildi
  // mi". Sürüm her yayında değişiyor ve activate eskisini siliyor:
  //   · yeni sürümün ilk isteği  -> tarayıcı önbelleği atlanıyor
  //   · sonraki istekler         -> normal yol, veri yakılmıyor
  // Yani yayın başına bir kez taze, sonra ucuz. Ve dosyaların hepsi
  // aynı sürümden geliyor.
  e.respondWith((async () => {
    const kutu = await caches.open(SURUM);
    const buSurumdeVar = await kutu.match(istek);

    try {
      const yanit = await fetch(
        buSurumdeVar ? istek : new Request(istek, { cache: 'reload' }));
      // Yalnızca sağlam yanıtlar saklanıyor: 404'ü önbelleğe almak,
      // çevrimdışı oyuncuya kalıcı bir 404 vermek olurdu.
      if (yanit && yanit.status === 200 && yanit.type === 'basic') {
        kutu.put(istek, yanit.clone());
      }
      return yanit;
    } catch (hata) {
      // Ağ yoksa bu sürümün kutusundan ver. Yukarıda zaten baktık.
      if (buSurumdeVar) return buSurumdeVar;
      // Gezinme isteğiyse ana sayfayı ver: uygulama açılsın.
      if (istek.mode === 'navigate') {
        const ana = await kutu.match('./');
        if (ana) return ana;
      }
      throw hata;
    }
  })());
});
