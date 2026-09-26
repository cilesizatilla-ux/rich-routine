// Ölçüm. Oyunun kendisine hiçbir şey yapmıyor, yalnızca sayıyor.
//
// NEDEN VAR: iş modelinin iki girdisi tahmindi — kullanıcı başına kaç
// oyun oynanıyor ve nerede bırakılıyor. Bu projede tahmin üstüne plan
// kurmak defalarca yanlış çıktı; para planı da ölçülmeden kurulmamalı.
//
// ÜÇ KURAL:
//
// 1. PARA VE SERBEST METİN ASLA GİRMEZ. "Kendi hayatım" formunda
//    oyuncunun GERÇEK maaşı ve borçları var. Bir ölçüm katmanının en
//    kolay hatası "her şeyi gönder"dir; burada beyaz liste dışındaki
//    her alan düşüyor ve olcum_denetimi.mjs bunu doğruluyor.
//
// 2. TOPLAM TUTULUYOR, GÜNLÜK DEĞİL. Kim ne yaptı diye bir kayıt yok;
//    sayaçlar ve histogramlar var. Gönderilecek şey zaten anonim.
//
// 3. AĞA HİÇBİR ŞEY GİTMİYOR. Hedef adresi ayarlanana kadar veri
//    yalnızca cihazda duruyor. Nereye gideceği ürün sahibinin kararı.
const ANAHTAR = 'rr-olcum';

// Tanınan olaylar. Listede olmayan olay sessizce düşmüyor — sayaca
// 'bilinmeyen' olarak giriyor ki eklemeyi unutan biri görsün.
export const OLAYLAR = [
  'acilis',
  'adim:meslek', 'adim:sehir', 'adim:hayal',
  'kendiForm:acildi', 'kendiForm:hesaplandi', 'kendiForm:oynandi',
  'oyun:basladi', 'oyun:ilerleme', 'oyun:bitti',
  'dilDegisti',
];

// Olayın yanında taşınabilecek alanlar. Hepsi sayı ya da kısa kimlik;
// hiçbiri para, ad, serbest metin değil.
const ALANLAR = {
  dil:     (v) => (v === 'tr' || v === 'en' ? v : null),
  ulke:    (v) => (/^ULK_[A-Z]{2}$/.test(v) ? v : null),
  sehir:   (v) => (/^SHR_[A-Z]+$/.test(v) ? v : null),
  meslek:  (v) => (/^MSL_[A-Z]+$/.test(v) || v === 'KENDIM' ? v : null),
  hayal:   (v) => (/^HY_[A-Z_]+$/.test(v) ? v : null),
  tur:     (v) => (Number.isInteger(v) && v >= 0 && v < 10000 ? v : null),
  sonuc:   (v) => (['hayal', 'pasif', 'iflas', 'birakildi'].includes(v) ? v : null),
};

/// Olayı ve verisini beyaz listeye göre süzer. Dışarıdan test edilebilsin
/// diye ayrı: asıl kural bu fonksiyon.
export function suz(olay, veri) {
  const ad = OLAYLAR.includes(olay) ? olay : 'bilinmeyen';
  const temiz = {};
  for (const [k, v] of Object.entries(veri || {})) {
    const kural = ALANLAR[k];
    if (!kural) continue;
    const gecen = kural(v);
    if (gecen !== null && gecen !== undefined) temiz[k] = gecen;
  }
  return { olay: ad, veri: temiz };
}

// Turu kovaya koyuyor: tam tur sayısı bir oyuncuyu ayırt edebilir,
// kova edemez. "Nerede bırakılıyor" sorusuna kova zaten yetiyor.
export function turKovasi(tur) {
  if (tur < 1) return '0';
  if (tur < 10) return '1-9';
  if (tur < 25) return '10-24';
  if (tur < 50) return '25-49';
  if (tur < 100) return '50-99';
  if (tur < 200) return '100-199';
  return '200+';
}

function bos() {
  return {
    surum: 1,
    ilk: new Date().toISOString().slice(0, 10),
    son: new Date().toISOString().slice(0, 10),
    sayac: {},
    tur: {},
    ulke: {},
    meslek: {},
    sonuc: {},
    enUzakTur: 0,
  };
}

function oku() {
  try {
    const ham = localStorage.getItem(ANAHTAR);
    if (!ham) return bos();
    const d = JSON.parse(ham);
    return d && d.surum === 1 ? d : bos();
  } catch (e) {
    // Gizli sekmede localStorage atabiliyor. Ölçüm yapılamaması oyunu
    // durdurmamalı — sayılmayan bir oyun, açılmayan bir oyundan iyi.
    return bos();
  }
}

function yaz(d) {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(d)); } catch (e) { /* yok say */ }
}

const artir = (kap, k) => { if (k) kap[k] = (kap[k] || 0) + 1; };

/// Süzülmüş olayı kurulu olan ölçüm servisine yollar.
///
/// SERVİS ADI BURADA GEÇMİYOR, SADECE ARAYÜZÜ. İlk hâlinde doğrudan
/// Plausible'ı çağırıyordu ve bu bir hataydı: servis seçimi bir fiyat
/// kararı, kod kararı değil. Ücretsiz bir seçenek aranınca kodun da
/// değişmesi gerekiyordu.
///
/// Şimdi hangisi yüklüyse o kullanılıyor; index.html'de betik
/// satırını değiştirmek yetiyor. Hiçbiri yoksa sessizce düşüyor ve
/// oyun etkilenmiyor — çevrimdışı ya da reklam engelleyicili tarayıcı
/// da bu durumda.
///
/// DIŞARI ÇIKAN ŞEY suz()'ün ÇIKTISI, ham veri değil. Tek geçiş
/// noktası burası: beyaz liste bu yüzden gerçekten bir sınır.
export function yolla(ad, temiz) {
  try {
    if (typeof window === 'undefined') return false;
    const dolu = Object.keys(temiz).length > 0;

    // Plausible: plausible(ad, { props })
    if (window.plausible) {
      if (dolu) window.plausible(ad, { props: temiz });
      else window.plausible(ad);
      return true;
    }
    // Umami: umami.track(ad, veri)
    if (window.umami && typeof window.umami.track === 'function') {
      if (dolu) window.umami.track(ad, temiz);
      else window.umami.track(ad);
      return true;
    }
    // PostHog: posthog.capture(ad, veri)
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(ad, dolu ? temiz : undefined);
      return true;
    }

    // KENDİ ADRESİMİZ. Yukarıdaki üçü de bir şirketin fiyat listesine
    // bağlı; bu değil. __olcumHedef bir adrese ayarlanırsa süzülmüş
    // olay oraya gidiyor — Cloudflare Worker, Apps Script, kendi
    // sunucun, fark etmiyor. Arada ölçüm şirketi yok.
    //
    // VARSAYILANI YOK ve https zorunlu: ayarlanmadıkça ağa hiçbir şey
    // çıkmıyor, ayarlandığında da düz metin olarak çıkmıyor.
    const hedef = window.__olcumHedef;
    if (typeof hedef === 'string' && hedef.startsWith('https://')) {
      const govde = JSON.stringify({ olay: ad, ...temiz });
      // sendBeacon sayfa kapanırken bile gidiyor. 'oyun:bitti' çoğu
      // zaman tam o anda oluşuyor; normal fetch orada yarıda kalırdı.
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(hedef, govde);
      } else if (typeof fetch === 'function') {
        fetch(hedef, { method: 'POST', body: govde, keepalive: true, mode: 'no-cors' });
      }
      return true;
    }
    return false;
  } catch (e) {
    // Ölçüm hiçbir koşulda oyunu durdurmamalı.
    return false;
  }
}

export function olc(olay, veri) {
  const { olay: ad, veri: t } = suz(olay, veri);
  yolla(ad, t);
  const d = oku();
  d.son = new Date().toISOString().slice(0, 10);
  artir(d.sayac, ad);
  if (t.ulke) artir(d.ulke, t.ulke);
  if (t.meslek) artir(d.meslek, t.meslek);
  if (t.sonuc) artir(d.sonuc, t.sonuc);
  if (typeof t.tur === 'number') {
    artir(d.tur, turKovasi(t.tur));
    if (t.tur > d.enUzakTur) d.enUzakTur = t.tur;
  }
  yaz(d);
  return d;
}

export const ozet = () => oku();
export const sil = () => { try { localStorage.removeItem(ANAHTAR); } catch (e) { /* yok say */ } };

// ---------------------------------------------------------------
// GELİŞTİRİCİ EKRANI. Veri yalnızca cihazda duruyor; görmenin tek
// yolu bu. Buradaki metinler OYUNCUYA BAKMIYOR, o yüzden dil
// tablosuna girmiyorlar ve dil_cikar.py bu dosyayı bilerek atlıyor
// (atlamanın koşulu: burada hiçbir gösterim yardımcısı çağrılmaması,
// ki bunu da o araç denetliyor).
export function ekranaBas() {
  const p = new URLSearchParams(location.search);
  if (p.get('olcum') === 'sil') sil();
  const d = ozet();
  const satir = (k, v, g = 16) => `  ${String(k).padEnd(g)} ${v}`;
  const blok = (bas, ciftler, g) =>
    `\n\n${bas}\n` + (ciftler.length
      ? ciftler.map(([k, v]) => satir(k, v, g)).join('\n')
      : '  (yok)');

  const kutu = document.createElement('pre');
  kutu.style.cssText = 'position:fixed;inset:0;z-index:9999;margin:0;'
    // Ust bosluk KOPYALA dugmesini asiyor: dar ekranda baslik satiri
    // dugmenin altinda kaliyordu.
    + 'padding:56px 16px 16px;overflow:auto;background:#12100d;color:#e8e2d6;'
    + 'font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap';
  // SERVİS DURUMU GÖRÜNÜR OLMALI. Hiçbiri kurulu değilken ölçümün
  // sessizce yalnızca cihazda kalması doğru ama GÖRÜNMEZ olması
  // değil: "neden panoda veri yok" sorusunun cevabı burada yazsın.
  const servis = (typeof window === 'undefined') ? 'yok'
    : window.plausible ? 'Plausible'
    : (window.umami ? 'Umami'
    : (window.posthog ? 'PostHog'
    : (typeof window.__olcumHedef === 'string' && window.__olcumHedef.startsWith('https://')
      ? 'kendi adresimiz'
      : 'YOK — veri yalnizca bu cihazda')));

  kutu.textContent = 'RICH ROUTINE — OLCUM (yalnizca bu cihaz)\n'
    + `ilk ${d.ilk} · son ${d.son}\n`
    + `servis: ${servis}\n`
    + blok('HUNI', ['acilis', 'adim:meslek', 'adim:sehir', 'adim:hayal',
        'oyun:basladi', 'oyun:bitti'].map((k) => [k, d.sayac[k] || 0]))
    + blok('KENDI HAYATIM', ['kendiForm:acildi', 'kendiForm:hesaplandi',
        'kendiForm:oynandi'].map((k) => [k, d.sayac[k] || 0]), 22)
    + blok('NEREDE BIRAKILDI (tur kovasi)', Object.entries(d.tur), 10)
    + blok('SONUC', Object.entries(d.sonuc), 10)
    + blok('ULKE', Object.entries(d.ulke), 10)
    + blok('MESLEK', Object.entries(d.meslek), 18)
    + `\n\nen uzak tur ${d.enUzakTur}`
    + '\n\n(kapatmak icin ?olcum kaldir · sifirlamak icin ?olcum=sil)';
  document.body.appendChild(kutu);

  // KOPYALA DUGMESI: servis olmadan da veri toplanabilsin diye.
  //
  // Hicbir olcum servisi kurulu degilken bu ekran tek basina yetiyor
  // ama YALNIZCA O CIHAZDA. Denemeye veren birinin ekran goruntusu
  // gondermesi gerekiyordu; goruntuden sayi toplamak ise elle is.
  // Dugme ozeti JSON olarak panoya koyuyor: deneyici mesajla
  // yapistiriyor, ben birlestiriyorum. Sunucu yok, hesap yok, ucret
  // yok — ve veri cihazdan yalnizca SAHIBI isterse cikiyor.
  const dugme = document.createElement('button');
  dugme.textContent = 'KOPYALA';
  dugme.style.cssText = 'position:fixed;top:12px;right:12px;z-index:10000;'
    + 'padding:10px 16px;border:1px solid #6b6252;border-radius:8px;'
    + 'background:#26221b;color:#e8e2d6;font:12px/1 ui-monospace,monospace;'
    + 'cursor:pointer';
  dugme.onclick = async () => {
    const metin = JSON.stringify(d);
    try {
      await navigator.clipboard.writeText(metin);
      dugme.textContent = 'KOPYALANDI';
    } catch (e) {
      // Pano izni yoksa (eski tarayici, http) secip gosteriyorum:
      // oyuncu elle kopyalayabilsin. Sessizce basarisiz olmak,
      // "kopyaladim" deyip bos pano birakmaktan iyi degil.
      kutu.textContent = metin;
      const aralik = document.createRange();
      aralik.selectNodeContents(kutu);
      const secim = getSelection();
      secim.removeAllRanges();
      secim.addRange(aralik);
      dugme.textContent = 'ELLE KOPYALA';
    }
  };
  document.body.appendChild(dugme);
}
