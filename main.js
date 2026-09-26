// Arayüz. Hiçbir KURAL burada değil: her tıklama motora bir istek,
// dönen her cevap tam durum. Unity tarafındaki desenin aynısı —
// istemci hangi kartı istediğini söyler, kartın ne olduğunu söylemez.
import { dotnet } from './_framework/dotnet.js'
import { olc, ozet, sil, ekranaBas } from './olcum.js'

const { getAssemblyExports, getConfig, runMain } = await dotnet.create();
const config = getConfig();
const disa = await getAssemblyExports(config.mainAssemblyName);
const Kopru = disa.RichRoutine.Tarayici.Kopru;
const Hareket = disa.RichRoutine.Tarayici.Hareket;

// ---------- dil ----------
//
// ANAHTAR, TURKCE METNIN KENDISI. Dort yuz seksen alti arayuz dizgesine
// "ui.banka.baslik" gibi anahtar uydurmak yerine gettext'in yolu: metin
// kendi anahtari. Uc faydasi var — uydurulacak isim yok, cagri yeri
// okunabilir kaliyor, ve kaplama yoksa argumanin kendisi dogru cevap.
// Yani Turkce oyun tabloya hic bagimli degil.
//
// DEGERLER CEVRILIR, ANAHTARLAR ASLA. EVRE_METNI'nin anahtarlari
// ('kres', 'universite') C# tarafindaki Ekonomi.CocukEvreleri[].Ad'dan
// geliyor ve eslesme icin var. Sinif adlari ve CSS degisken adlari da
// oyle. Bunlari sarmak duzeni sessizce kirar — ilk denememde arac tam
// olarak bunu yapti ve yakalandi.
let DIL = null;

// SAYI BICIMI DE DILE BAGLI ve bunu gozden kacirmistim. Tablo Ingilizce
// gelirken rakamlar 'tr-TR' ile bicimleniyordu: "20.608 ₺". Ingilizce
// okuyan biri bunu yirmi tam alti yuz sekiz diye okur, yani ekrandaki
// sayi bin kat yaniliyor. Ondalik ve binlik ayraci degistigi icin
// cevirinin kendisi dogru olsa bile sayi yanlis.
//
// Para birimi DEGISMIYOR: oyun Turkiye'de geciyor, ₺ oyunun verisi.
// Degisen yalnizca ayrac ve simgenin yeri (Turkce sonda, Ingilizce
// basta).
let DIL_KODU = 'tr';
const YEREL = () => (DIL_KODU === 'tr' ? 'tr-TR' : 'en-US');

const metin = (tr) => (DIL && DIL[tr]) || tr;

// PARCA PARCA CEVIRI, CEVIRMEMEKTEN BETER.
//
//     el('div', 'x', 'Cikista ≈ ' + para(f))
//
// Burada el()'e giden sey 'Cikista ≈ 4.400.000 ₺' — tabloda boyle bir
// anahtar yok ve olamaz da, cunku rakam her oyunda farkli. Parcayi
// ('Cikista ≈ ') tabloya koymak da ise yaramiyor: calisma zamaninda
// hicbir zaman o parca sorulmuyor. Sonuc: tablo %100 dolu gorunuyor,
// ekran Turkce kaliyor. Oyunda 53 yerde tam olarak bu vardi.
//
// SABLON KULLANMAK AYRICA DOGRU CEVIRI DEMEK. Turkce fiil sonda,
// Ingilizce basta: "Gelir {0} ay sonra baslar" cumlesini parcalara
// bolersen Ingilizce siralama artik senin elinde degil. Sablonda
// cevirmen kelimeleri istedigi yere koyabiliyor:
//
//     bicim('Gelir {0} ay sonra baslar.', ay)   ->  'Income starts in {0} months.'
//
// COGUL KARARI CEVIRIDE, KODDA DEGIL. Turkce sayidan sonra cogul
// almiyor ("3 tur", "1 tur"); Ingilizce aliyor. Sablonu duz cevirince
// ekranda "1 turns played", "1 assets", "1 months left" cikiyordu.
//
// {0#tekil|cogul} sozdizimi bu karari CEVIRMENE birakiyor: Turkce
// tabloda hic kullanilmiyor, Ingilizce tabloda kullaniliyor. Dilin
// kurali kodda sabitlenseydi ucuncu bir dil geldiginde yine kirilirdi
// (Lehcede uc bicim var).
//
//   '{0} kez, ...'  ->  '{0} {0#time|times} you passed ...'
const bicim = (sablon, ...deger) =>
  metin(sablon)
    .replace(/\{(\d+)#([^|{}]*)\|([^{}]*)\}/g,
      (_, i, tek, cok) => (Number(deger[i]) === 1 ? tek : cok))
    .replace(/\{(\d+)\}/g, (_, i) => deger[i]);

// CIKARICI ICIN ISARET, calisma zamaninda hicbir sey yapmiyor.
// Sabit tablolarin degerleri modul yuklenirken hesaplaniyor, yani tablo
// daha gelmeden; orada metin() cagirmak Turkceyi kalici dondururdu.
// Cozum gettext'in ayrimi: T ile CIKARIM icin isaretle, metin() ile
// GOSTERIM aninda coz.
const T = (s) => s;

const DIL_ANAHTARI = 'rr-dil';

// Cihaz dili, sonra kalici tercih. Sirasi onemli: oyuncu bir kez sectiyse
// telefonun dili degisse bile onun secimi gecerli.
function dilSecimi() {
  try {
    const kayitli = localStorage.getItem(DIL_ANAHTARI);
    if (kayitli === 'tr' || kayitli === 'en') return kayitli;
  } catch (e) {
    // Gizli sekmede localStorage erisimi atabiliyor. Tercih
    // okunamamasi oyunu acilmaz yapmamali.
  }
  return (navigator.language || 'tr').slice(0, 2).toLowerCase() === 'tr'
    ? 'tr' : 'en';
}

// DEGISTIRINCE SAYFA YENILENIYOR ve bu bilincli bir tercih.
//
// Canli degistirmeyi denedim: tablo gelip tahta Turkce kaldi. Sebebi,
// kareler oyun basinda bir kez kuruluyor ve ciz() onlari yeniden
// yazmiyor. Ayni sorun meslek/hayal seceneklerinde de var — onlar modul
// yuklenirken C#'tan cekiliyor. Yarim yenilenen bir ekran, yarisi bir
// dilde yarisi otekinde kalirdi.
function dilDegistir(kod) {
  try { localStorage.setItem(DIL_ANAHTARI, kod); } catch (e) { /* gizli sekme */ }
  location.reload();
}

// index.html'deki sabit metin JS'in hic dokunmadigi yerde duruyor:
// BANKA, MALI TABLO, ZAR AT, panel basliklari. Hepsi data-dil ile
// isaretli ve anahtar ONITELIKTE tutuluyor — metni yerinde cevirip
// anahtari kaybetmek, ikinci cagrida eslesmeyi bitirirdi.
//
// Ikon yaninda duran metinler kendi span'inde: dugmenin textContent'ini
// degistirmek icindeki SVG'yi de silerdi.
function statikMetinleriCevir() {
  document.querySelectorAll('[data-dil]').forEach((e) => {
    const anahtar = e.dataset.dil;
    if (anahtar) e.textContent = metin(anahtar);
  });
  // BALON YAZILARI DA METIN. Gorunmedikleri icin gozden kacti: fare
  // ustunde bekleyince Turkce cikiyordu.
  document.querySelectorAll('[data-dil-baslik]').forEach((e) => {
    e.title = metin(e.dataset.dilBaslik);
  });
}

async function dilKur(kod) {
  try {
    const t = JSON.parse(Kopru.DilSec(kod || 'tr'));
    DIL = (t && Object.keys(t).length) ? t : null;
    DIL_KODU = kod || 'tr';
    // <html lang> SADECE BIR ETIKET DEGIL. Sayfa 'tr' kaldigi surece
    // tarayici CSS'teki text-transform:uppercase'i TURKCE kurallariyla
    // uyguluyor ve 'portfolio' ekranda 'PORTFOLİO' oluyor -- noktali
    // buyuk I. Ekranda gorup kaynakta arayana kadar anlamadim: dizge
    // hicbir yerde oyle yazmiyordu, harfi tarayici uretiyordu.
    // Ayrica ekran okuyucu butun Ingilizce sayfayi Turkce telaffuz
    // ediyordu.
    document.documentElement.lang = DIL_KODU;
    statikMetinleriCevir();
  } catch (e) {
    // Dil yuklenemezse oyun Turkce acilir. Acilmamasi, cevrilmemis
    // olmaktan cok daha kotu olurdu.
    DIL = null;
  }
}
// TEST TUTAMAĞI, süs değil. Arka plandaki bir sekmede tarayıcı
// requestAnimationFrame'i hiç ateşlemiyor (visibilityState "hidden",
// sıfır kare) ve hareketin çalıştığı başka türlü doğrulanamıyor.
// Bu tutamak döngü gövdesini elle sürüyor: hareketAdimi zamanı verir,
// adimUygula işi yapar.
window.__hareketAdimi = (dt) => adimUygula(dt);

// TEST TUTAMAĞI. Analiz ekranı henüz yok ama karar defterinin gerçek
// oyunda gerçekten dolduğunu ölçmenin başka yolu da yok. Bu projede
// sessizce hiç çalışmayan kod birkaç kez ortaya çıktı — üç çocuk
// evresi hiç tetiklenmiyordu, telefona özel kurallar ölüydü — ve
// ikisini de ancak ölçünce fark ettim.
window.__analiz = () => JSON.parse(Kopru.Analiz());

// TEST TUTAMAGI. Dil degistirmenin gercekten ekrana yansidigini olcmek
// icin. Henuz dil secme ekrani yok ama mekanizmanin olu olmadigini
// kanitlamanin baska yolu da yok.
// EKRANI OKUYAN MUHAFIZ. Statik cozumleme metnin nasil kuruldugunu
// goruyor; bu, EKRANDA NE YAZDIGINI goruyor. Ikisi ayri sey ve aradaki
// farki pahali ogrendim: tablo %100 doluyken oyun elli uc yerde Turkce
// gosteriyordu.
//
// Olcum basit ve kesin: DIL tablosunun ANAHTARLARI Turkce metinlerdir.
// Ingilizce oynarken ekranda bir anahtar gorunuyorsa o metin
// cevrilmemis demektir -- tahmin degil, tanim.
//
// Tam esleme YETMIYOR: birlestirilmis metinde Turkce parca bir
// cumlenin ICINDE kaliyor ("value grows 42% a year, geliri
// kesintisiz"). O yuzden uzun anahtarlar ayrica ALT DIZGE olarak da
// araniyor; kisa olanlarda ayni arama yanlis alarm uretirdi.
window.__turkceKalan = () => {
  if (!DIL) return { dil: DIL_KODU, uyari: 'tablo yok, oyun Türkçe' };
  // IKI DILDE AYNI YAZILANLARI ATLA. 'franchise' Turkce tabloda da
  // Ingilizce tabloda da ayni; ekranda gorunmesi cevrilmedigi anlamina
  // gelmiyor ve ilk kosuda tek yanlis alarm tam olarak buydu.
  const anahtarlar = Object.keys(DIL).filter((k) => DIL[k] !== k);
  const uzun = anahtarlar.filter((k) => k.trim().length >= 8);
  const ingilizceCikti = new Set(Object.values(DIL));
  const bulgu = [];
  const gez = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let d = gez.nextNode(); d; d = gez.nextNode()) {
    const yazi = (d.nodeValue || '').trim();
    if (!yazi) continue;
    // Gizli dallari atla: ekranda olmayan metin oyuncuyu ilgilendirmiyor.
    const e = d.parentElement;
    if (!e || !e.offsetParent && e.tagName !== 'BODY') continue;
    if (DIL[yazi] !== undefined && DIL[yazi] !== yazi) {
      bulgu.push({ tam: true, yazi, yer: e.className || e.tagName });
      continue;
    }
    const parca = uzun.find((k) => yazi.includes(k));
    if (parca) {
      bulgu.push({ tam: false, yazi, parca, yer: e.className || e.tagName });
      continue;
    }
    // IKINCI OLCUT: TABLODA HIC OLMAYAN TURKCE.
    //
    // Yukaridaki iki kontrol yalnizca tabloda ANAHTARI OLAN metni
    // gorebiliyor. Mali tablodaki gider adlari ("Ulaşım", "Diğer")
    // tabloya hic girmemisti -- kimlik dizgesi olduklari icin
    // cikarmadan disarida birakilmislardi -- ve bu yuzden denetim
    // onlari "cevrilmemis" diye bile sayamadi. Ekranda gordum.
    //
    // Turkceye ozgu harf boyle durumlari yakaliyor. Ingilizce ciktida
    // bu harfler mesru olarak gecebiliyor (sehir adlari), o yuzden
    // tablonun DEGERLERINDE bulunan metin sayilmiyor.
    //
    // 'harf' BULGULARI GOZLE OKUNUR, otomatik hata degil: DIL yalnizca
    // sozluk, icerik metinleri C# tarafinda cozuluyor ve "A Summer
    // House in Çeşme" gibi dogru bir Ingilizce cumle de bu olcute
    // takiliyor. Tam/parca bulgulari kesin, harf bulgulari ipucu.
    if (/[ışğİŞĞ]/.test(yazi) && !ingilizceCikti.has(yazi)) {
      bulgu.push({ harf: true, yazi, yer: e.className || e.tagName });
    }
  }
  return { dil: DIL_KODU, sayi: bulgu.length, bulgu: bulgu.slice(0, 20) };
};

// TEST TUTAMAGI. Cogul bicimi ({0#tekil|cogul}) ancak sayi 1 iken
// yanlis olur ve oyunda "1 tur" durumuna rastlamak icin yuzlerce tur
// oynamak gerekiyor. Tutamak o tek durumu dogrudan olcuyor.
window.__bicim = (sablon, ...deger) => bicim(sablon, ...deger);

window.__dil = async (kod) => {
  await dilKur(kod);
  // Oyun baslamadan da cagrilabilmeli: tablonun yuklendigini olcmek
  // icin cizime ihtiyac yok ve ciz() oyunsuz patliyor.
  try { ciz(); } catch (e) { /* oyun yok */ }
  return DIL ? Object.keys(DIL).length : 0;
};

// Analiz bölümünün ÇİZİLDİĞİNİ ölçmek için. Veriyi __analiz veriyor ama
// veri doğru olduğu hâlde çizim satırı patlayabilir; oyunu sonuna kadar
// oynatıp görmek tarayıcıda yüz turdan fazla sürüyor.
window.__analizEkrani = () => { const d = el('div'); analizBolumu(d); return d.textContent; };

// Geri bildirim kutusunun ÇİZİLDİĞİNİ ölçmek için — yukarıdakiyle aynı
// sebep: kutu yalnızca oyun bittiğinde görünüyor ve oraya tarayıcıda
// ulaşmak seksen turdan fazla sürüyor. Düğmenin panoya NE yazdığı da
// buradan okunuyor; "kopyaladım" deyip boş pano bırakmak bu projede
// bir kez gerçekten oldu.
window.__geriBildirimEkrani = () => {
  const d = el('div');
  geriBildirimBolumu(d);
  return d;
};

// Maaş uyarısının çizildiğini ölçmek için. Maaşa dokunan kartlar büyük
// destede ve seyrek: seksen tur oynayıp bir kez bile denk gelmedim.
// Ölçemediğim bir dalı "eklendi" diye geçmek, bu dosyada birkaç kez
// hataya dönüştü.
window.__maasKarti = (bp) => firsatKarti({
  id: 'test', baslik: 'Test', aciklama: '', etiket: '',
  fiyat: 4400000000, pesinat: 4400000000, akis: 340000000,
  getiriBp: 772, degerBp: 1200, riskBp: 2800, alinabilir: true,
  taahhutAy: 0, maasDusuruBp: bp, maasKaybi: 3260000000,
}).textContent;

// DIL, HER SEYDEN ONCE. secenekler (meslekler, hayaller) modul
// yuklenirken C#'tan cekiliyor; dil ondan sonra kurulursa o listeler
// Turkce gelir ve oyun boyunca oyle kalir.
await dilKur(dilSecimi());

// AÇILIŞ VE İLK ADIM AYNI ANDA: oyun meslek ekranıyla açılıyor, yani
// "açan" ile "meslek ekranını gören" aynı kişi. İkisini ayrı saymak
// huniye sahte bir basamak eklemek olurdu.
olc('acilis', { dil: DIL_KODU });
olc('adim:meslek', {});

// ÖLÇÜM EKRANI olcum.js'te: metinleri geliştiriciye bakıyor, oyuncuya
// değil, ve dil tablosuna girmemeleri gerekiyor.
if (new URLSearchParams(location.search).has('olcum')) ekranaBas();

// TEST TUTAMAĞI: ölçümün gerçekten saydığını tarayıcıdan doğrulamak için.
window.__olcum = { ozet, sil };

runMain();

const $ = (s) => document.querySelector(s);
// CEVIRI BURADA, CAGRI YERLERINDE DEGIL.
//
// Uc yuz on uc dizgeyi tek tek metin() ile sarmak, uc yuz on uc kirilma
// firsatiydi: ilk denememde arac 'kare ic ' (CSS sinifi) ve '--tasIc'
// (CSS degiskeni) gibi KIMLIK dizgelerini de sardi ve duzen sessizce
// kirilirdi. Metnin tamami zaten buradan gectigi icin ceviriyi buraya
// koymak hem eksiksiz hem risksiz: ikinci parametre (sinif) hic
// dokunulmuyor.
//
// dugme() de el()'i cagiriyor, yani tek degisiklik ikisini de kapsiyor.
//
// YALNIZCA DIZGELER: sayi geldiginde oldugu gibi geciyor. Tabloda
// karsiligi olmayan bir metin de oldugu gibi geciyor, yani bicimlenmis
// para ("68.000 TL") zarar gormuyor.
//
// SINIRI VAR: birlestirilmis metin ('CEK - ' + para(x)) buraya tam hali
// ile geliyor ve tabloda eslesmiyor. Onlarin parcasi cagri yerinde
// metin() ile sariliyor.
const el = (t, c, m) => {
  const e = document.createElement(t);
  if (c) e.className = c;
  if (m !== undefined) e.textContent = typeof m === 'string' ? metin(m) : m;
  return e;
};

// ---------- para biçimi ----------
// KISALTMA YOK: 68.000 ₺, "68 bin ₺" değil.
//
// Kısaltma dar alanda yer kazandırıyordu ama oyuncuya parasını
// yuvarlanmış gösteriyordu. Bir finans oyununda ekrandaki sayı gerçek
// sayı olmalı; dar alan sorunu yazı tipiyle çözülür, rakamı kırparak
// değil. Aynı karar Unity tarafında da verildi (ParaBicimi.Ozet silindi).
// PARA BIRIMI DILE BAGLI: Turkce ₺, diger diller $.
//
// Oyunun verisi kurus cinsinden ve TURKIYE'nin rakamlari. Ingilizce
// oynayana dolar gostermek bu rakamlari DEGISTIRMIYOR, yalnizca
// baska bir birimle soyluyor: butun oranlar (gider/maas, hayal/gider,
// kartlarin getirisi) aynen duruyor, yani denge hic oynamiyor. Ayri
// bir dolar icerigi tutsaydim iki ayri ekonomi olurdu ve biri
// digerinden habersiz bayatlardi.
//
// Saglamasi: asgari ucret ₺28.000 -> $574, doktor ₺290.000 -> $5.943,
// "anne babama ev" ₺3,9M -> $79.918. Ucu de gercek Turkiye rakamlari.
//
// KUR SABIT VE BILEREK: oyun agdan hicbir sey cekmiyor: canli kur
// cekseydi ayni oyun iki gun ust uste iki farkli rakam gosterirdi ve
// ekran goruntusuyle paylasilan "5 yildiz" karsilastirilamaz olurdu.
// Ayni sabit C# tarafinda da var (Ekonomi.DolarKuru) ve iki kopyanin
// ayni kalmasini ParaBirimiTests dogruluyor.
const DOLAR_KURU = 48.80;

const doviz = (lira) =>
  DIL_KODU === 'tr' ? lira : Math.round(lira / DOLAR_KURU);

function para(kurus) {
  const lira = Math.round(kurus / 100);
  const d = doviz(lira);
  const s = Math.abs(d).toLocaleString(YEREL());
  const eksi = d < 0 ? '−' : '';
  return DIL_KODU === 'tr' ? eksi + s + ' ₺' : eksi + '$' + s;
}
const isaretli = (k) => (k > 0 ? '+' : '') + para(k);
// YUZDE ISARETININ YERI DE DEGISIYOR: Turkce "%26,4", Ingilizce "26.4%".
const yuzde = (bp) => {
  const s = (bp / 100).toLocaleString(YEREL(), { maximumFractionDigits: 1 });
  return DIL_KODU === 'tr' ? '%' + s : s + '%';
};

// ---------- tahta ----------
// İKİ KULVAR TEK TAHTADA: içteki çember Kısır Döngü, dıştaki kare
// halka Zenginlik Yolu. Oyuncu neyin içinden çıkmaya çalıştığını ve
// çıkınca nereye geçeceğini aynı anda görüyor — iki ayrı tahta
// çizmek bu ilişkiyi görünmez kılıyordu.
let tahtaImzasi = '';
const pulOgeleri = new Map();

// Dış halka: kare bir çevre. Köşeleri de sayarak dört kenara eşit
// dağıtılıyor.
const DIS_KENAR = 5.5;

function disKonum(kare, uzunluk) {
  const t = ((kare % uzunluk) + uzunluk) % uzunluk / uzunluk * 4;
  const kenar = Math.floor(t);
  const f = t - kenar;
  const a = DIS_KENAR;
  const b = 100 - DIS_KENAR;
  const u = b - a;
  if (kenar === 0) return { x: a + f * u, y: a };
  if (kenar === 1) return { x: b, y: a + f * u };
  if (kenar === 2) return { x: b - f * u, y: b };
  return { x: a, y: b - f * u };
}

// İç çember: Kısır Döngü. Adı üstünde, dönüp duruyorsun.
const IC_YARICAP = 32;

function icKonum(kare, uzunluk) {
  const a = (kare / uzunluk) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(a) * IC_YARICAP, y: 50 + Math.sin(a) * IC_YARICAP };
}

function konum(kare, uzunluk, disKulvar) {
  return disKulvar ? disKonum(kare, uzunluk) : icKonum(kare, uzunluk);
}

function halkaCiz(kap, kareler, disKulvar) {
  kareler.forEach((tur, i) => {
    const k = el('div', (disKulvar ? 'kare dis ' : 'kare ic ') + tur);
    const p = konum(i, kareler.length, disKulvar);
    k.style.left = p.x + '%';
    k.style.top = p.y + '%';
    k.title = kareAdi(tur).replace('\n', ' ');

    const yuz = el('div', 'kareYuz');
    yuz.appendChild(el('div', 'kareIkon', KARE_IKONU[tur] || '•'));

    // İç çemberde de etiket var ama KISA: yirmi dört kare dar bir
    // çembere sığıyor ve iki satırlık bir ad taşın dışına taşıyor,
    // komşu taşın altında kalıyordu. Tek kelime, tek satır.
    yuz.appendChild(el('div', 'kareAd',
      disKulvar ? kareAdi(tur) : metin(KARE_KISA[tur] || kareAdi(tur))));
    k.appendChild(yuz);
    kap.appendChild(k);
  });
}

function tahtayiCiz(durum) {
  const tahta = $('#tahta');
  const imza = (durum.fareKareleri || []).join(',') + '#' + (durum.zenginlikKareleri || []).join(',');

  if (imza !== tahtaImzasi) {
    tahtaImzasi = imza;
    pulOgeleri.clear();
    tahta.innerHTML = '';

    halkaCiz(tahta, durum.zenginlikKareleri || [], true);

    // Çemberin zemini: içeride olduğun sürece durduğun yer burası.
    const zemin = el('div', 'icZemin');
    tahta.appendChild(zemin);
    halkaCiz(tahta, durum.fareKareleri || [], false);

    const katman = el('div', 'pulKatmani');
    katman.id = 'pulKatmani';
    tahta.appendChild(katman);
  }

  // Oyuncunun bulunduğu kulvar vurgulanıyor: diğeri soluk kalıyor.
  const disarida = durum.oyuncular[0].zenginlikYolunda;
  tahta.classList.toggle('disKulvarda', disarida);

  const katman = $('#pulKatmani');
  durum.oyuncular.forEach((o) => {
    let pul = pulOgeleri.get(o.no);
    if (!pul) {
      pul = el('div', 'pul p' + o.no + (o.benim ? ' benim' : ''));
      katman.appendChild(pul);
      pulOgeleri.set(o.no, pul);
    }
    pul.hidden = o.iflas;
  });
}

// Taş ölçüsü CSS'ten okunuyor: tek kaynak orası, JS yalnızca
// kullanıyor.
function tasBoyu(disKulvar) {
  const kok = getComputedStyle(document.documentElement);
  return parseFloat(kok.getPropertyValue(disKulvar ? '--tasDis' : '--tasIc')) || 10;
}

// Pulun konumu KESİRLİ kare cinsinden: 3,4 demek üçüncü kareden
// dördüncüye giden yolun %40'ı.
//
// Pul taşın MERKEZİNE değil ALT KENARINA oturuyor: merkezdeyken
// karenin ikonunu ve etiketini kapatıyordu, yani oyuncu üstünde
// durduğu karenin ne olduğunu göremiyordu. Aynı karedeki pullar da
// açısal değil YATAY dağılıyor — alt kenarda yan yana diziliyorlar.
function pulKonumu(no, kesirliKare, uzunluk, disKulvar, kacinci, toplam) {
  const pul = pulOgeleri.get(no);
  if (!pul || pul.hidden) return;

  const p = konum(kesirliKare, uzunluk, disKulvar);
  const boy = tasBoyu(disKulvar);
  const yatay = toplam > 1
    ? (kacinci - (toplam - 1) / 2) * (disKulvar ? 3.0 : 2.4)
    : 0;

  pul.style.left = (p.x + yatay) + '%';
  // 0,42: yarım taş boyu kenarın tam üstü olurdu ve pul dışarı
  // taşardı; bu kadarı alt kenara oturtuyor.
  pul.style.top = (p.y + boy * 0.42) + '%';
}

// Her karenin zemininde işini anlatan bir ikon. İç çemberde yazı
// yok, anlamı ikon taşıyor.
const KARE_IKONU = {
  MaasGunu: '💰', KucukFirsat: '📈', BuyukFirsat: '🏢',
  LuksHarcama: '🛍️', PiyasaKarti: '📰', BeklenmedikGider: '⚠️',
  Hayirseverlik: '🤝', CocukSahibiOlmak: '👶',
  NakitAkisiGunu: '💵', BuyukYatirim: '🏗️', Hayal: '⭐',
  PiyasaSoku: '📉', VergiIncelemesi: '🧾', Baglilik: '❤️',
};

// İç çember için TEK KELİME etiketler. Altı karakteri geçen bir ad
// otuz piksellik bir taşa sığmıyor.
const KARE_KISA = {
  MaasGunu: T('MAAŞ'), KucukFirsat: T('küçük'), BuyukFirsat: T('büyük'),
  LuksHarcama: T('lüks'), PiyasaKarti: T('piyasa'), BeklenmedikGider: T('gider'),
  Hayirseverlik: T('bağış'), CocukSahibiOlmak: T('çocuk'),
  NakitAkisiGunu: T('AKIŞ'), BuyukYatirim: T('yatırım'), Hayal: T('HAYAL'),
  PiyasaSoku: T('şok'), VergiIncelemesi: T('vergi'), Baglilik: T('bağlılık'),
};

const KARE_ADI = {
  MaasGunu: T('MAAŞ'), KucukFirsat: T('küçük\nfırsat'), BuyukFirsat: T('büyük\nfırsat'),
  LuksHarcama: T('lüks'), PiyasaKarti: T('piyasa'), BeklenmedikGider: T('gider'),
  Hayirseverlik: T('bağış'), CocukSahibiOlmak: T('çocuk'),
  NakitAkisiGunu: T('AKIŞ'), BuyukYatirim: T('yatırım'), Hayal: T('HAYAL'),
  PiyasaSoku: T('şok'), VergiIncelemesi: T('vergi'), Baglilik: T('bağlılık'),
};
const kareAdi = (t) => metin(KARE_ADI[t] || t);

// ---------- bilanço ----------
// Trend oku: rakam bir önceki çizime göre yükseldi mi düştü mü.
// Süs değil — sayının kendisi "iyi mi kötü mü" demiyor, yönü diyor.
const oncekiDeger = {};
function trendCiz(id, deger, yukseliIyi) {
  const e = $('#' + id);
  if (!e) return;
  const once = oncekiDeger[id];
  oncekiDeger[id] = deger;
  if (once === undefined || once === deger) { e.textContent = ''; return; }
  const yukseldi = deger > once;
  e.textContent = yukseldi ? '↗' : '↘';
  e.className = 'trend ' + (yukseldi === yukseliIyi ? 'iyiTrend' : 'kotuTrend');
}

function bilancoyuCiz(ben) {
  // Rakamlar eski değerden yenisine SAYIYOR: bir masrafın ne kadar
  // olduğunu, sayının kaç adım düştüğünden anlıyorsun.
  sayaciKur('pasif', ben.pasifGelir, false);
  sayaciKur('gider', ben.gider, false);
  sayaciKur('akis', ben.nakitAkisi, true);
  sayaciKur('nakit', ben.nakit, false);
  trendCiz('okPasif', ben.pasifGelir, true);
  trendCiz('okGider', ben.gider, false);
  trendCiz('okNakit', ben.nakit, true);
  trendCiz('okAkis', ben.nakitAkisi, true);
  // --kayip krem zemin için koyulaştırılmış bir kırmızı; oyun ekranı
  // artık mürekkep ve orada okunmuyor. Satır içi biçim CSS'i ezdiği
  // için düzeltmenin yeri burası.
  $('#akis').style.color = ben.nakitAkisi < 0 ? 'var(--t-kayip)' : '';
  $('#nakit').style.color = ben.nakit < 0 ? 'var(--kayip)' : '';

  // ÇUBUK NEYİ ÖLÇÜYOR, kulvara göre:
  //   Kısır Döngü'de  karşılama (pasif gelir / aylık gider) -> çıkış
  //   Zenginlik Yolu'nda  nakit / hayalin bedeli -> oyunun bitişi
  // Dışarıda karşılamayı ölçmeye devam etmek, oyuncuya artık oyunu
  // bitirmeyen bir hedefin yüzdesini göstermek olurdu.
  const disarida = ben.zenginlikYolunda && ben.hayalBedeli > 0;
  const ilerlemeBp = disarida
    ? Math.max(0, Math.round(ben.nakit * 10000 / ben.hayalBedeli))
    : ben.karsilamaBp;
  const hedefiBp = disarida ? 10000 : ben.hedefBp;

  const oran = Math.min(100, (ilerlemeBp / hedefiBp) * 100);
  $('#dolgu').style.width = oran + '%';
  $('#karsilamaMetni').textContent = yuzde(ilerlemeBp);
  $('#karsilamaEtiket').textContent = metin(disarida ? 'HAYALİNE' : 'KARŞILAMA');
  const vardi = ilerlemeBp >= hedefiBp;
  const renk = vardi
    ? 'linear-gradient(90deg, #d8b23a, #8a6a10)'
    : 'linear-gradient(90deg, #35a865, #1e7d47)';
  $('#dolgu').style.background = renk;
  $('#hedefDolgu').style.background = renk;

  // MESAFEYİ SAYIYLA SÖYLE. Yüzde ne kadar kaldığını söylemiyor;
  // "kaçmana 21.400 ₺ pasif gelir kaldı" doğrudan bir hedef.
  // Hedef motordan geliyor: kuralı burada yeniden hesaplamak, Zenginlik
  // Yolu'nda yanlış rakam veriyordu (hedef ÇIKIŞTAKİ dondurulmuş gidere
  // oranlı, oyuncunun o anki giderine değil).
  // ÖLÇÜ KULVARA GÖRE DEĞİŞİYOR, çünkü hedef değişiyor:
  //   Kısır Döngü'de  pasif gelir -> aylık gider  (çıkış koşulu)
  //   Zenginlik Yolu'nda  nakit   -> hayalin bedeli  (tek bitiş koşulu)
  // Dışarıda hâlâ pasif gelir ölçmek, oyuncuya artık oyunu bitirmeyen
  // bir hedefi göstermek olurdu.
  const k = $('#kalan');
  k.innerHTML = '';
  if (ben.zenginlikYolunda) {
    const eksik = ben.hayalBedeli - ben.nakit;
    if (eksik <= 0) {
      // NAKİT YETİYORSA HEMEN ALINABİLİR: kareyi beklemek, oyunun tek
      // bitiş koşulunu bir zar şansına bağlamak olurdu.
      k.appendChild(dugme(bicim('HAYALİNİ AL — {0}', para(ben.hayalBedeli)), 'altin', true,
        () => ciz(Kopru.HayaliAl())));
    } else {
      k.appendChild(el('span', null, 'Hayalini almana '));
      k.appendChild(el('b', null, para(eksik)));
      k.appendChild(el('span', null, ' nakit kaldı'));
    }
  } else if (vardi) {
    k.appendChild(el('span', null,
      'Pasif gelirin giderini karşılıyor: Kısır Döngü bitti.'));
  } else {
    k.appendChild(el('span', null, 'Kısır Döngü\'den çıkmana '));
    k.appendChild(el('b', null, para(ben.hedefPasifGelir - ben.pasifGelir)));
    k.appendChild(el('span', null, ' aylık pasif gelir kaldı'));
  }
}

// ---------- geçmiş ----------
// Günlük hiçbir yerde kalıcı DEĞİL ve geçici bildirim de yok. Kayıtların
// tek görüldüğü yer mali tablonun içindeki geçmiş listesi.
//
// Bunun bir bedeli var ve bilinçli: maaş günü, piyasa kartı ve TÜİK
// karar gerektirmiyor, yani modal açmıyor. Oyuncu onları ancak geçmişe
// girerek görüyor.
let tumGunluk = [];

function gunlugu(durum) {
  tumGunluk = durum.gunluk || [];
}

function gecmisGoster(geriDon) {
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', 'Geçmiş'));
  kok.appendChild(el('div', 'modalAlt', bicim('{0} kayıt · en yenisi üstte', tumGunluk.length)));

  const liste = el('div', 'gecmisListe');
  [...tumGunluk].reverse().forEach((x) => {
    const d = el('div', 'g' + (x.benim ? ' benim' : '') + (x.kim === 'Masa' ? ' masa' : ''));
    d.appendChild(el('span', 'tur', metin('T') + x.tur));
    d.appendChild(el('span', 'kim', x.kim));
    d.appendChild(el('span', null, x.metin));
    liste.appendChild(d);
  });
  if (!tumGunluk.length) liste.appendChild(el('div', 'bos', 'Henüz bir şey olmadı.'));
  kok.appendChild(liste);

  kok.appendChild(geriDon
    ? dugme('← MALİ TABLOYA DÖN', 'ikincil', true, geriDon)
    : dugme('KAPAT', 'ikincil', true, modalKapat));
  modalAc(kok);
}

// ---------- modal ----------
function modalKapat() {
  // İçerik de siliniyor: kapalı bir modalın eski kartı DOM'da kalırsa
  // bir sonraki açılışta bir kare boyunca eski kart görünür.
  $('#ortu').hidden = true;
  $('#modal').innerHTML = '';
}
function modalAc(icerik) {
  const m = $('#modal');
  m.innerHTML = '';
  m.appendChild(icerik);
  $('#ortu').hidden = false;
}

function kararGoster(k) {
  const kok = el('div');
  if (k.tur === 'FirsatSecimi') {
    kok.appendChild(el('div', 'modalBaslik', 'İki fırsat, tek karar'));
    kok.appendChild(el('div', 'modalAlt', 'Birini al ya da ikisini de geç.'));
    const kap = el('div', 'kartlar' + (k.kartlar.length > 1 ? ' iki' : ''));
    k.kartlar.forEach((c) => kap.appendChild(firsatKarti(c)));
    kok.appendChild(kap);

    // Kararın önündeki soru "param yeter mi" — cevabı da burada olmalı.
    // Önceden banka ayrı bir ekrandı ve oraya gitmek için kararı
    // kapatmak gerekiyordu; oyuncu geri döndüğünde kart gitmiş oluyordu.
    kok.appendChild(paraDurumu(durum.oyuncular.find((o) => o.benim)));

    // ORTAK KARARLAR YAPIŞIK AYAKTA. Telefonda bu modal 700 pikseli
    // geçiyor: oyuncu iki kartı da geçip aşağı inmeden "geç" diyemiyordu.
    // Kartların kendi AL düğmeleri yerinde; yalnızca ikisine birden ait
    // olan karar alta sabitlendi. Masaüstünde .modalAyak sıradan bir
    // kap, yapışma yalnızca dar ekranda açılıyor.
    const ayak = el('div', 'modalAyak');
    ayak.appendChild(dugme('İKİSİNİ DE GEÇ', 'ikincil', true, () => gonder('gec', '')));
    kok.appendChild(ayak);
  } else if (k.tur === 'HarcamaOnayi') {
    kok.appendChild(el('div', 'modalBaslik', k.baslik));
    kok.appendChild(el('div', 'modalAlt', k.aciklama));
    kok.appendChild(el('div', 'modalBaslik', para(k.tutar)));
    kok.appendChild(dugme(k.alinabilir ? bicim('ÖDE — {0}', para(k.tutar)) : 'paran yetmiyor',
      '', k.alinabilir, () => gonder('ode', '')));
    if (k.reddedilebilir) kok.appendChild(dugme('VAZGEÇ', 'ikincil', true, () => gonder('gec', '')));
  } else if (k.tur === 'SatisTeklifi') {
    kok.appendChild(el('div', 'modalBaslik', k.baslik));
    kok.appendChild(el('div', 'modalAlt', bicim('{0} — teklif: değerin {1}',
      k.aciklama, yuzdeIyelik(k.teklifBp))));
    satisListesi(kok, k.satilabilir, (idler) => gonder('sat', idler));
    kok.appendChild(dugme('SATMA', 'ikincil', true, () => gonder('gec', '')));
  } else if (k.tur === 'Hayirseverlik') {
    kok.appendChild(el('div', 'modalBaslik', k.baslik));
    kok.appendChild(el('div', 'modalAlt', k.aciklama));
    kok.appendChild(dugme(k.alinabilir
      ? metin('BAĞIŞLA — ') + para(k.tutar)
      : para(k.tutar) + metin(' gerekiyor'),
      '', k.alinabilir, () => gonder('bagisla', '')));
    kok.appendChild(dugme('GEÇ', 'ikincil', true, () => gonder('gec', '')));
  } else if (k.tur === 'HayalFirsati') {
    kok.appendChild(el('div', 'modalBaslik', k.baslik));
    kok.appendChild(el('div', 'modalAlt', k.aciklama));
    kok.appendChild(dugme(k.alinabilir
      ? bicim('HAYALİNİ AL — {0}', para(k.tutar))
      : bicim('{0} gerekiyor', para(k.tutar)),
      'altin', k.alinabilir, () => gonder('hayal', '')));
    kok.appendChild(dugme('ŞİMDİ DEĞİL', 'ikincil', true, () => gonder('gec', '')));
  }
  modalAc(kok);
}

function kartAcilisiniBaslat(kap) {
  const kartlar = [...kap.querySelectorAll('.kart')];
  if (!kartlar.length) return;
  let gecen = 0, sonKart = performance.now();
  const adim = (simdi) => {
    gecen += Math.min(0.05, (simdi - sonKart) / 1000);
    sonKart = simdi;
    let devam = false;
    kartlar.forEach((k, i) => {
      const olcek = Hareket.KartOlcek(i, gecen);
      const genislik = Hareket.KartGenislik(i, gecen);
      k.style.transform = `scale(${olcek * genislik}, ${olcek})`;
      k.style.opacity = olcek > 0 ? 1 : 0;
      if (gecen < Hareket.KartSuresi(i)) devam = true;
    });
    if (devam) requestAnimationFrame(adim);
    else kartlar.forEach((k) => { k.style.transform = ''; k.style.opacity = ''; });
  };
  requestAnimationFrame(adim);
}

function firsatKarti(c) {
  const k = el('div', 'kart');
  k.appendChild(el('div', 'etiket', c.etiket || 'fırsat'));
  k.appendChild(el('div', 'b', c.baslik));
  k.appendChild(el('div', 'a', c.aciklama));
  k.appendChild(kartSatir('Fiyat', para(c.fiyat)));
  k.appendChild(kartSatir('Peşinat', para(c.pesinat)));

  // TAAHHÜT: peşinat tek başına yanıltıcı, asıl para aylara yayılıyor.
  // Taksiti ve bağlanan toplamı peşinatın hemen altına koyuyorum ki
  // oyuncu "250.000 ₺'ye aylık 64.000 ₺" diye okumasın.
  if (c.taahhutAy > 0) {
    k.appendChild(kartSatir(
      'Taksit', bicim('{0} × {1} ay', para(c.aylikTaksit), c.taahhutAy)));
    k.appendChild(kartSatir('Bağlanan', para(c.baglananSermaye)));
  }

  k.appendChild(kartSatir(
    c.taahhutAy > 0 ? 'Teslimde aylık' : 'Aylık', isaretli(c.akis)));
  k.appendChild(kartSatir('Getiri', bicim('{0} / ay', yuzde(c.getiriBp))));

  // ÇAPA: kartın getirisi tek başına bir şey söylemiyor. Yalnızca
  // mevduatı yazsaydım her kart "bankadan iyi" çıkardı — destedeki
  // her kart mevduatı iki katıyla geçiyor. Ayırt eden karşılaştırma
  // destenin kendi ortası.
  if (durum && durum.kartTipikGetiriBp) {
    const fark = c.getiriBp - durum.kartTipikGetiriBp;
    const n = el('div', 'capa ' + (fark >= 0 ? 'iyi' : 'kotu'),
      bicim(fark >= 0
        ? 'Destenin ortasının üstünde — tipik {0}, mevduat {1}'
        : 'Destenin ortasının altında — tipik {0}, mevduat {1}',
        yuzde(durum.kartTipikGetiriBp), yuzde(durum.mevduatAylikBp)));
    k.appendChild(n);
  }
  // MAAŞ ETKİSİ EN ÜSTTE VE KIRMIZI. Bu kartın diğerlerinden farkı
  // parasında değil: alırsan işinden oluyorsun. Oyuncu bunu ancak
  // aldıktan sonra fark ederse, oyun ona tuzak kurmuş olur.
  if (c.maasDusuruBp > 0) {
    const u = el('div', 'maasUyari' + (c.maasDusuruBp >= 10000 ? ' tam' : ''));
    u.appendChild(el('b', null, c.maasDusuruBp >= 10000
      ? 'İşinden ayrılman gerekiyor'
      : 'Yarı zamana geçmen gerekiyor'));
    u.appendChild(el('span', null,
      bicim(c.maasDusuruBp >= 10000
        ? 'Aylık maaşından {0} gidiyor — hepsi. Geri dönüşü yok.'
        : 'Aylık maaşından {0} gidiyor. Geri dönüşü yok.',
        para(c.maasKaybi))));
    k.appendChild(u);
  }

  const risk = c.riskBp === 0 ? metin('geliri kesintisiz')
    // SEZONLUK, kayıp değil: ödemediği ay hiç gelmiyor ama ödediği ay
    // fazlası geliyor. Kartın ilan ettiği aylık rakam ortalamada aldığın
    // rakam olarak kalıyor — "ödemiyor" deyip bırakmak, oyuncuya kartın
    // getirisinin sessizce düştüğünü düşündürürdü.
    : metin('sezonluk: ') + yuzde(c.riskBp)
      + metin(' ihtimalle o ay ödemiyor, ödediği ay fazlasını ödüyor');
  const deger = c.degerBp >= 0
    ? metin('değeri yılda ') + yuzde(c.degerBp) + metin(' artıyor')
    : metin('değeri yılda ') + yuzde(-c.degerBp) + metin(' eriyor');
  k.appendChild(el('div', 'risk', deger + ', ' + risk));

  // Çökme kuralı kartın üstünde yazıyor. Yazmasaydım oyuncu kuralı
  // ancak parasını kaybederek öğrenirdi; bu zorluk değil gizli tuzak
  // olurdu.
  if (c.taahhutAy > 0) {
    k.appendChild(el('div', 'risk uyari',
      bicim('Gelir {0} ay sonra başlar. Bir taksidi ödeyemezsen '
        + 'sözleşme feshedilir ve ödediğin yanar.', c.taahhutAy)));
  }
  const etiket = c.alinabilir
    ? metin(c.taahhutAy > 0 ? 'TAAHHÜDE GİR — ' : 'AL — ') + para(c.pesinat)
    // BU İKİ DAL DEĞİŞKENDE KURULUYOR ve çıkarıcı çağrı yerine bakıyor:
    // sarılmadıkları için tabloya hiç girmemişlerdi. İngilizce oyunda
    // alınamayan her fırsat kartının düğmesi Türkçe yazıyordu.
    : c.neden === 'kopya' ? metin('bu karttan yeterince var')
    : bicim('{0} eksik', para(Number(c.neden)));
  k.appendChild(dugme(etiket, '', c.alinabilir, () => gonder('al', c.id)));

  // KREDİ KAPISI. Deste bu kartı zaten "nakde YA DA krediye sığıyor"
  // diye seçiyordu (Deste.Erisilebilir); kapı yalnızca ekranda yoktu.
  // Ölçtüm: fırsat kararlarının %61-73'ünde iki kartın ikisi de
  // nakitle alınamıyor ve geriye tek düğme kalıyordu — "İKİSİNİ DE
  // GEÇ". Yani oyunun imza ekranı çoğu zaman bir karar değil, bir
  // bildirimdi.
  //
  // TAKSİT DE YAZIYOR: "kredi çek" tek başına bir vaat, taksitiyle
  // birlikte bir karar.
  if (c.krediyleAlinabilir) {
    // GELİRİ SONRA BAŞLAYAN KART + KREDİ, OYUNUN EN PAHALI TUZAĞI.
    // Ölçtüm: krediyi bu kartlarda da kullanan oyuncu 20 oyunun
    // 17'sinde iflas ediyor; yalnızca bu kartlarda kullanmayan
    // 14'ünü kazanıyor. Taahhüt ayları boyunca İKİ taksit ödeniyor
    // ve gelir yok.
    //
    // Kart zaten "Gelir N ay sonra başlar" yazıyor ama o cümle
    // "+2.238 ₺" satırının yanında gözden kaçıyor. Çarpışma kararın
    // verildiği yere, düğmenin üstüne yazılıyor.
    const yazi = c.taahhutAy > 0
      ? bicim('{0} KREDİ ÇEK — {1} ay gelir yok, aylık {2} ödersin',
          para(c.krediTutari), c.taahhutAy,
          para(c.krediTaksiti + c.aylikTaksit))
      : bicim('{0} KREDİ ÇEK — aylık {1} taksit',
          para(c.krediTutari), para(c.krediTaksiti));
    k.appendChild(dugme(yazi, 'kredi', true, () => gonder('krediyle-al', c.id)));
  }
  return k;
}
function kartSatir(a, b) {
  const s = el('div', 'sat');
  s.appendChild(el('span', null, a));
  s.appendChild(el('b', null, b));
  return s;
}
function dugme(yazi, sinif, etkin, tik) {
  const b = el('button', 'dugme ' + (sinif || ''), yazi);
  b.disabled = !etkin;
  if (etkin) b.addEventListener('click', tik);
  return b;
}

// ---------- hareket ----------
// Tek bir requestAnimationFrame döngüsü: pul yürüyor, zar dönüyor,
// rakamlar sayıyor. Zamanlama ve eğri C# tarafında (Hareket.*), burada
// yalnızca "kaç saniye oldu" tutuluyor.
const yurumeler = new Map();   // oyuncuNo -> {baslangic, adim, uzunluk, gecen}
let zarHareketi = null;        // {birinci, ikinci, gecen}
const sayaclar = new Map();    // alan id -> {ilk, hedef, gecen}
let sonKare = 0;
let dongu = 0;

// Kullanıcı hareket istemiyorsa hiç başlatma: erişilebilirlik ayarı
// bir tercih, süsü ondan üstün tutmak doğru değil.
const azHareket = window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hareketKapali() { return azHareket; }

let bekci = 0;

function hareketBaslat() {
  if (dongu || azHareket) return;

  sonKare = performance.now();
  dongu = requestAnimationFrame(hareketAdimi);

  // Kare hiç gelmezse (arka plan sekmesi, kapalı animasyon) her şeyi
  // son haline oturt. Animasyonun çalışmaması bir eksiklik, ekranda
  // yanlış rakam kalması bir hata.
  clearTimeout(bekci);
  bekci = setTimeout(hareketiBitir, 2000);
}

function hareketiBitir() {
  if (dongu) cancelAnimationFrame(dongu);
  dongu = 0;
  yurumeler.clear();
  zarHareketi = null;
  sayaclar.forEach((s, id) => {
    const e = document.getElementById(id);
    if (e) e.textContent = s.isaretli ? isaretli(s.hedef) : para(s.hedef);
  });
  sayaclar.clear();
  if (durum) {
    pullariYerlestir();
    zarlariSonHaliyleCiz();
  }
}

function hareketAdimi(simdi) {
  const dt = Math.min(0.05, (simdi - sonKare) / 1000);
  sonKare = simdi;
  if (adimUygula(dt)) {
    dongu = requestAnimationFrame(hareketAdimi);
  } else {
    dongu = 0;
    clearTimeout(bekci);
  }
}

// Zaman KAYNAĞI ile döngü GÖVDESİ ayrı: gövde dt alıyor, kareyi kimin
// verdiğini bilmiyor. Böylece gerçek kare beklemeden de sınanabiliyor.
function adimUygula(dt) {
  let devam = false;

  // pullar
  yurumeler.forEach((y, no) => {
    y.gecen += dt;
    const kare = Hareket.PulKare(y.baslangic, y.adim, y.uzunluk, y.gecen);
    const ic = Hareket.PulIlerleme(y.baslangic, y.adim, y.uzunluk, y.gecen);
    y.kesirli = kare + ic;
    if (Hareket.PulBitti(y.baslangic, y.adim, y.uzunluk, y.gecen)) yurumeler.delete(no);
    else devam = true;
  });
  pullariYerlestir();

  // zar
  if (zarHareketi) {
    zarHareketi.gecen += dt;
    zarlariCiz(zarHareketi);
    if (Hareket.ZarBitti(zarHareketi.gecen)) zarHareketi = null;
    else devam = true;
  }

  // sayaçlar
  sayaclar.forEach((s, id) => {
    s.gecen += dt;
    const v = Hareket.SayiDegeri(s.ilk, s.hedef, s.gecen);
    const e = document.getElementById(id);
    if (e) e.textContent = s.isaretli ? isaretli(Math.round(v)) : para(Math.round(v));
    if (s.gecen >= Hareket.SayiSuresi()) sayaclar.delete(id);
    else devam = true;
  });

  return devam;
}

function pullariYerlestir() {
  if (!durum) return;
  const uzunluk = (o) => (o.zenginlikYolunda ? durum.zenginlikKareleri : durum.fareKareleri).length;

  // Aynı karede duran pullar üst üste binmesin diye sayılıp
  // yayılıyor. Anahtara kulvar da giriyor: iki kulvarın aynı numaralı
  // karesi aynı yer değil.
  const yerler = new Map();
  durum.oyuncular.forEach((o) => {
    const y = yurumeler.get(o.no);
    const k = y ? y.kesirli : o.kare;
    const anahtar = (o.zenginlikYolunda ? 'd' : 'i') + Math.round(k);
    yerler.set(anahtar, (yerler.get(anahtar) || 0) + 1);
  });
  const sayac = new Map();
  durum.oyuncular.forEach((o) => {
    const y = yurumeler.get(o.no);
    const k = y ? y.kesirli : o.kare;
    const anahtar = (o.zenginlikYolunda ? 'd' : 'i') + Math.round(k);
    const i = sayac.get(anahtar) || 0;
    sayac.set(anahtar, i + 1);
    pulKonumu(o.no, k, uzunluk(o), o.zenginlikYolunda, i, yerler.get(anahtar));
  });
}

// Alanın en son GÖSTERİLEN değeri. Bu olmadan sayaç hiç çalışmıyordu:
// uçuşta bir sayaç yoksa başlangıcı yeni değere eşitliyordum, dolayısıyla
// "değişmedi" deyip her seferinde erken çıkıyordu. Sayacın başlangıcı
// yeni değer değil, ekranda duran değerdir.
const sonDegerler = new Map();

function sayaciKur(id, yeniDeger, isaretliMi) {
  const e = document.getElementById(id);
  const ucusta = sayaclar.get(id);
  const ilk = ucusta
    ? Hareket.SayiDegeri(ucusta.ilk, ucusta.hedef, ucusta.gecen)
    : (sonDegerler.has(id) ? sonDegerler.get(id) : yeniDeger);
  sonDegerler.set(id, yeniDeger);

  if (ilk === yeniDeger) {
    if (e) e.textContent = isaretliMi ? isaretli(yeniDeger) : para(yeniDeger);
    sayaclar.delete(id);
    return;
  }
  // Son değer HEMEN yazılıyor; sayaç onun üstüne binip geriden
  // getiriyor. Tersi olsaydı döngü çalışmadığında rakam eski
  // değerde donardı.
  if (e) e.textContent = isaretliMi ? isaretli(yeniDeger) : para(yeniDeger);
  if (hareketKapali()) return;

  sayaclar.set(id, { ilk, hedef: yeniDeger, gecen: 0, isaretli: isaretliMi });
  hareketBaslat();
}

function zarlariSonHaliyleCiz() {
  if (!durum) return;
  const kap = $('#zarlar');
  kap.innerHTML = '';
  if (durum.sonZarBirinci <= 0) return;
  kap.appendChild(zarYap(durum.sonZarBirinci));
  if (durum.sonZarIkinci > 0) kap.appendChild(zarYap(durum.sonZarIkinci));
}

function zarlariCiz(z) {
  const kap = $('#zarlar');
  kap.innerHTML = '';
  const adet = z.ikinci > 0 ? 2 : 1;
  for (let i = 0; i < adet; i++) {
    kap.appendChild(zarYap(Hareket.ZarYuzu(i, z.birinci, z.ikinci, z.gecen)));
  }
}

// ---------- akış ----------
let durum = null;

let oncekiKareler = new Map();
let oncekiZar = 0;
let sonHayatSirasi = 0;
let kulvarCikisiGosterildi = false;
let sonEvreSirasi = 0;
let sonTaahhutSirasi = 0;

let sonCezaSirasi = 0;

// İçteki çemberin adı TEK YERDE. Oyunun en çok tekrarlanan terimi bu;
// değişirse arayüzün tamamı buradan değişsin.
//
// T() ILE ISARETLEMEK CEVIRMEK DEGIL ve tam olarak burada yakalandım.
// T() yalnizca cikariciya "bunu tabloya al" diyor; anahtar tabloda
// vardi, Ingilizcesi de vardi ("The Grind"), ama kod hicbir zaman
// metin() ile SORMUYORDU. Sonuc, ayni paragrafta iki ad:
//
//   "...the ones in Kısır Döngü... In The Grind every month..."
//
// Statik denetim bunu goremez: dizge tabloda VAR, yalnizca cozulmuyor.
// Ekrani okuyan denetim (window.__turkceKalan) yakaladi.
//
// Adin kendisi sabit kalıyor (anahtar o), gosterim aninda cozuluyor.
const IC_KULVAR_ADI = T('Kısır Döngü');
const icKulvar = () => metin(IC_KULVAR_ADI);

// ---------------- kaydetme ----------------
//
// OYUN 167 İLA 343 TUR SÜRÜYOR (ölçüldü, her meslek için). Sekmeyi
// kapatmak ya da yanlışlıkla yenilemek o kadar oyunu silmek demekti.
//
// Kayıt DURUMU değil KARARLARI tutuyor; biçimi ve çözümü C# tarafında,
// iOS sürümüyle ortak (OyunKaydi). Burası yalnızca saklama yeri.
const KAYIT_ANAHTARI = 'rr-oyun';

function kaydiYaz() {
  // GİZLİ SEKMEDE localStorage ATIYOR. Oyunun kaydedilememesi
  // oynanamaması demek değil; hata yutuluyor.
  try { localStorage.setItem(KAYIT_ANAHTARI, Kopru.KayitMetni()); }
  catch (e) { /* yok say */ }
}

function kaydiSil() {
  try { localStorage.removeItem(KAYIT_ANAHTARI); } catch (e) { /* yok say */ }
}

// Kayıtlı oyunu açar; açılmadıysa false.
function kaydiAc() {
  let metin = null;
  try { metin = localStorage.getItem(KAYIT_ANAHTARI); } catch (e) { return false; }
  if (!metin) return false;

  let json = '';
  try { json = Kopru.KayitYukle(metin); } catch (e) { json = ''; }
  if (!json) { kaydiSil(); return false; }

  $('#secim').hidden = true;
  $('#oyun').hidden = false;
  ciz(json);
  return true;
}

function ciz(json) {
  const eski = durum;
  durum = JSON.parse(json);
  const ben = durum.oyuncular[0];

  // BIRAKILAN OYUN DA SAYILMALI ve asıl soru zaten o: nerede
  // bırakılıyor. Yalnızca bitişte ölçseydim yarıda kapatılan her oyun
  // hiç olmamış gibi görünürdü — "nerede bırakılıyor" sorusuna
  // cevabı olmayan bir ölçüm.
  //
  // Onda bir turda bir yazıyor: her turda localStorage'a yazmak
  // oyunun akışına dokunurdu, kova zaten ondalık.
  if (eski && durum.tur !== eski.tur && durum.tur % 10 === 0) {
    olc('oyun:ilerleme', { tur: durum.tur });
  }
  if (durum.bitti && (!eski || !eski.bitti)) {
    olc('oyun:bitti', {
      tur: durum.tur,
      sonuc: ben.iflas ? 'iflas' : (durum.hayalSonucu ? 'hayal' : 'pasif'),
    });
  }

  // Kare değişen her pul YÜRÜYOR. Adım sayısı iki konum arasındaki
  // fark: botların zarını bilmiyoruz ama gittikleri yolu biliyoruz.
  if (eski) {
    durum.oyuncular.forEach((o) => {
      const once = oncekiKareler.get(o.no);
      if (once === undefined || once === o.kare || o.iflas) return;
      const uzunluk = (o.zenginlikYolunda ? durum.zenginlikKareleri : durum.fareKareleri).length;
      const adim = ((o.kare - once) % uzunluk + uzunluk) % uzunluk;
      if (adim === 0) return;
      yurumeler.set(o.no, { baslangic: once, adim, uzunluk, gecen: 0, kesirli: once });
    });
  }
  durum.oyuncular.forEach((o) => oncekiKareler.set(o.no, o.kare));

  // HER ÇİZİMDE KAYDEDİLİYOR: durumu değiştiren her köprü çağrısı
  // ciz'den geçiyor, yani burası oyunun tek çıkış kapısı. Bitmiş
  // oyunun kaydı siliniyor — yoksa oyuncu her açılışta bitiş ekranına
  // düşer ve yeni oyuna hiç başlayamaz.
  if (durum.bitti) kaydiSil(); else kaydiYaz();

  // Zar YENİYSE dönsün; aynı sonuç tekrar çizilirken dönmemeli.
  const zarAnahtari = durum.sonZarBirinci * 10 + durum.sonZarIkinci;
  if (durum.sonZarBirinci > 0 && zarAnahtari !== oncekiZar) {
    oncekiZar = zarAnahtari;
    zarHareketi = { birinci: durum.sonZarBirinci, ikinci: durum.sonZarIkinci, gecen: 0 };
  }
  if (azHareket) { yurumeler.clear(); zarHareketi = null; }

  $('#tur').textContent = durum.tur;

  tahtayiCiz(durum);

  // Pullar HER çizimde yerleştiriliyor. Yalnızca hareket döngüsünden
  // yerleştirdiğimde ilk çizimde hiç konumlanmıyorlardı: yeni oyunda
  // yürüyen pul yok, döngü hiç başlamıyor ve dört pul sol üst köşede
  // üst üste duruyordu.
  pullariYerlestir();

  bilancoyuCiz(ben);
  gunlugu(durum);

  // ZAR HER ÇİZİMDE SON HALİYLE YAZILIYOR, animasyon bunun üstüne
  // biniyor. Yalnızca döngüye bırakmak, döngü hiç çalışmadığında zar
  // kabını BOŞ bırakıyordu: arka plandaki bir sekmede tarayıcı
  // requestAnimationFrame'i hiç ateşlemiyor ve oyuncu zarı hiç
  // görmüyordu. Animasyon bir süs, doğru durumun ön koşulu değil.
  zarlariSonHaliyleCiz();

  kimligiCiz(ben);
  panelleriCiz(ben);

  // Boş tur oyunun yarısı ve önceden hiçbir iz bırakmıyordu: zar
  // atılıyor, pul yürüyor, ekranda hiçbir şey değişmiyordu.
  const not = $('#turNotu');
  not.textContent = durum.turNotu || '';
  not.hidden = !durum.turNotu;

  // Hayat durumu görünür olmalı: önüne çıkan kartların NEDEN o kartlar
  // olduğunu oyuncu buradan anlıyor.
  const parcalar = [HAL[ben.hal] || ben.hal, KONUT[ben.konut] || ben.konut];
  if (ben.cocukSayisi > 0) {
    parcalar.splice(1, 0, ben.cocukSayisi + metin(' çocuk'));
  }
  $('#hayat').textContent = '· ' + parcalar.map(metin).join(' · ');
  $('#zarAt').disabled = !durum.siraBende || !!durum.karar || durum.bitti;
  // Sırası gelen zaten ZAR AT düğmesini görüyor; "sıra sende" yazmak
  // ona bilmediği bir şey söylemiyordu. Yazı yalnızca BEKLERKEN ve
  // bereket açıkken bir şey anlatıyor.
  $('#siraMetni').textContent = durum.bitti ? metin('Oyun bitti')
    : !durum.siraBende ? durum.oyuncular[durum.siradaki].ad + ' oynuyor'
    : ben.firsatPenceresi > 0
      ? metin('Bağış penceresi: ') + ben.firsatPenceresi
        + metin(' tur her kare fırsat')
    : ben.bereket > 0 ? metin('İki zar: ') + ben.bereket + metin(' tur')
    : '';

  if (durum.bitti) { sonucGoster(ben); return; }

  // Hayat olayı KARARIN ÖNÜNDE: kart kararı beklerken araya girmesin
  // diye önce karar gösteriliyor, olay bir sonraki çizimde çıkıyor.
  //
  // Kulvar çıkışı hayat olayının ÖNÜNDE: oyunun ilk yarısının bittiği an
  // ve oyun başına bir kez oluyor; beklerse turlar sonra çıkardı.
  const olay = durum.hayatOlayi;
  const ceza = durum.piyasaCezasi;
  //
  // Ceza EN ÖNDE: az önce verilen kararın sonucu ve hemen ardından
  // gelmezse oyuncu neyin neye yol açtığını bağlayamıyor.
  if (ceza && ceza.sira > sonCezaSirasi) {
    sonCezaSirasi = ceza.sira;
    piyasaCezasiGoster(ceza);
  }
  else if (durum.duyuru) duyuruGoster(durum.duyuru);
  else if (durum.karar) kararGoster(durum.karar);
  else if (durum.kulvarCikisi && !kulvarCikisiGosterildi) {
    kulvarCikisiGosterildi = true;
    kulvarCikisiGoster(durum.kulvarCikisi);
  }
  else if (olay && olay.sira > sonHayatSirasi) {
    sonHayatSirasi = olay.sira;
    hayatOlayiGoster(olay);
  }
  // Çocuğun evre atlaması da bir hayat olayı: gider kalıcı olarak
  // artıyor ve sebebi söylenmezse oyuncu sadece giderinin büyüdüğünü
  // görür.
  else if (durum.cocukEvresi && durum.cocukEvresi.sira > sonEvreSirasi) {
    sonEvreSirasi = durum.cocukEvresi.sira;
    cocukEvresiGoster(durum.cocukEvresi);
  }
  // Taahhüdün sonu: ya teslim ya fesih. İkisi de sessizce olsaydı
  // oyuncu aylardır ödediği şeyin ne olduğunu ancak mali tabloyu açıp
  // fark ederdi.
  // EŞ KARARI ZİNCİRİN BAŞINDA: oyunun ilk turundan önce sorulur ve
  // cevaplanana kadar başka hiçbir şey gösterilmez. Sonda dursaydı bir
  // hayat olayıyla aynı tura düştüğünde ertelenir, oyuncu ilk turlarını
  // kararı hiç görmeden oynardı.
  else if (durum.esKarari) {
    esKarariGoster(durum.esKarari);
  }
  else if (durum.taahhutHaberi && durum.taahhutHaberi.sira > sonTaahhutSirasi) {
    sonTaahhutSirasi = durum.taahhutHaberi.sira;
    taahhutHaberiGoster(durum.taahhutHaberi);
  } else modalKapat();

  // HAREKETİN İLK ADIMI BURADA, SENKRON — bütün sayaçlar kurulduktan
  // SONRA. hareketBaslat içinde çağırdığımda yalnızca ilk sayaç
  // başlangıç değerine dönüyor, geri kalanı o karede hedefi gösterip
  // sonra başa atlıyordu: altı alanın beşinde gözle bir sıçrama.
  if (!azHareket && (yurumeler.size || zarHareketi || sayaclar.size)) {
    adimUygula(0);
    hareketBaslat();
  }
}

// ---------- mali tablo ----------
// Oyuncunun sayılarının TAMAMI tek ekranda. Bilanço paneli özet;
// burası gelirin nereden geldiğini ve giderin nereye gittiğini
// kalem kalem yazıyor.
function maliTablo(ben) {
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', 'Mali tablo'));
  kok.appendChild(el('div', 'modalAlt', ben.ad));

  // ÜSTTE ÖZET, altında ayrıntı. Tabloyu açan kişi önce "nerede
  // duruyorum" sorusunu soruyor; kalem kalem döküm ikinci soru.
  // Hedef motordan; aynı kural iki yerde hesaplanmasın.
  const hedefGelir = ben.hedefPasifGelir;
  const ozet = el('div', 'ozetKutu');
  const satirUst = el('div', 'yarisUst');
  const disKulvar = ben.zenginlikYolunda && ben.hayalBedeli > 0;
  satirUst.appendChild(el('span', 'etiket', disKulvar ? 'HAYALİNE' : 'KARŞILAMA'));
  // Ana ekrandaki çubukla aynı ölçü: dışarıda nakit/hayal bedeli.
  const ilerBp = disKulvar
    ? Math.max(0, Math.round(ben.nakit * 10000 / ben.hayalBedeli))
    : ben.karsilamaBp;
  const hedBp = disKulvar ? 10000 : ben.hedefBp;

  satirUst.appendChild(el('b', null, yuzde(ilerBp)));
  ozet.appendChild(satirUst);
  const cubuk = el('div', 'cubuk');
  const dolgu = el('div', 'dolgu');
  dolgu.style.width = Math.min(100, (ilerBp / hedBp) * 100) + '%';
  cubuk.appendChild(dolgu);
  ozet.appendChild(cubuk);
  ozet.appendChild(el('div', 'kalan', disKulvar
    ? (ben.nakit >= ben.hayalBedeli
        ? 'Hayalini alacak nakdin var — HAYAL karesine gelmen yeterli.'
        : bicim('Hayalin {0} · {1} nakit kaldı', para(ben.hayalBedeli),
            para(ben.hayalBedeli - ben.nakit)))
    : (ben.pasifGelir >= hedefGelir
        ? 'Hedefe ulaştın.'
        : bicim('Hedef {0} pasif gelir · {1} kaldı', para(hedefGelir),
            para(hedefGelir - ben.pasifGelir)))));
  kok.appendChild(ozet);

  // ELDE TUTMANIN BEDELİ. Gider tablosuna girmiyor çünkü karşılama
  // oranına dokunmuyor; ama her ay nakitten çıkıyor ve oyuncunun onu
  // görmesi gerekiyor — "al ve unut"u bitiren şey bu satır.
  if (ben.bakim > 0) {
    const b = bolum('ELDE TUTMANIN BEDELİ',
      bicim('−{0} / ay', para(ben.bakim)));
    b.appendChild(el('div', 'dipnot',
      'Bakım, aidat ve komisyon. Gidere yazılmıyor — karşılama oranını '
      + 'değiştirmiyor — ama her ay nakitten çıkıyor, yani hayaline '
      + 'giden yolu yavaşlatıyor. Gayrimenkul en pahalı, kâğıt varlık '
      + 'en ucuz bakılan.'));
    kok.appendChild(b);
  }

  // GELİR — payların oranı bir çubukta, sonra kalem kalem.
  const gelirToplam = ben.maas + ben.pasifGelir;
  const gelir = bolum('GELİR', para(gelirToplam));
  gelir.appendChild(oranCubugu([
    { ad: 'Maaş', tutar: ben.maas, renk: '#9fbfd6' },
    { ad: 'Pasif gelir', tutar: ben.pasifGelir, renk: '#4ca86e' },
  ], gelirToplam));
  gelir.appendChild(tabloSatir('Maaş', para(ben.maas)));
  (ben.varliklar || []).forEach((v) => {
    if (v.akis !== 0) gelir.appendChild(tabloSatir(v.baslik, para(v.akis), 'alt'));
  });
  kok.appendChild(gelir);

  // GİDER
  const gider = bolum('GİDER', para(ben.gider));
  const kalemler = (ben.giderKalemleri || []).map((k, i) => ({
    ad: k.ad, tutar: k.tutar, renk: GIDER_RENKLERI[i % GIDER_RENKLERI.length],
  }));
  const taksitler = (ben.borclar || []).filter((b) => b.gidereGirer);
  const taksitToplam = taksitler.reduce((t, b) => t + b.taksit, 0);
  if (taksitToplam > 0) {
    kalemler.push({ ad: T('Taksitler'), tutar: taksitToplam, renk: '#c07a63' });
  }
  gider.appendChild(oranCubugu(kalemler, ben.gider));
  (ben.giderKalemleri || []).forEach((k) =>
    gider.appendChild(tabloSatir(k.ad, para(k.tutar), 'alt')));
  taksitler.forEach((b) =>
    gider.appendChild(tabloSatir(bicim('{0} taksiti', b.baslik), para(b.taksit), 'alt')));
  kok.appendChild(gider);

  // Aylık akış: tablonun asıl sonucu, o yüzden vurgulu.
  const akis = el('div', 'vurguKutu' + (ben.nakitAkisi < 0 ? ' kotu' : ''));
  akis.appendChild(el('span', null, 'Aylık nakit akışı'));
  akis.appendChild(el('b', null, isaretli(ben.nakitAkisi)));
  kok.appendChild(akis);

  // VARLIK ve BORÇ
  const varlik = bolum('VARLIKLAR',
    bicim('{0} kalem', (ben.varliklar || []).length));
  if (!ben.varliklar || !ben.varliklar.length) {
    varlik.appendChild(el('div', 'bos', 'Henüz varlığın yok. Fırsat karelerinde alınıyor.'));
  } else {
    ben.varliklar.forEach((v) => {
      const r = el('div', 'kalemSatir');
      const sol = el('div', 'sol');
      sol.appendChild(el('div', 'ad', v.baslik));
      sol.appendChild(el('div', 'not', bicim('aylık {0}', isaretli(v.akis))));
      r.appendChild(sol);
      r.appendChild(el('b', null, para(v.deger)));
      varlik.appendChild(r);
    });
  }
  varlik.appendChild(tabloSatir('Nakit', para(ben.nakit), 'toplam'));
  kok.appendChild(varlik);

  // SÜREN TAAHHÜTLER — varlıkların içinde DEĞİL, ayrı bölüm.
  // Varlık listesine koysaydım oyuncu henüz sahip olmadığı bir gelirin
  // toplamını görürdü. Taksit gidere de yazılmıyor (nakitten çıkıyor),
  // bu yüzden burada görünmezse "gelirim giderimi karşılıyor ama kasam
  // eriyor" halinin sebebi ekranın hiçbir yerinde olmazdı.
  if (ben.taahhutler && ben.taahhutler.length) {
    const t = bolum('SÜREN TAAHHÜTLER',
      bicim('aylık {0}', para(ben.taahhutTaksidi)));
    ben.taahhutler.forEach((x) => {
      const r = el('div', 'kalemSatir');
      const sol = el('div', 'sol');
      sol.appendChild(el('div', 'ad', x.baslik));
      sol.appendChild(el('div', 'not',
        bicim('taksit {0} · {1} ay kaldı · ödenen {2} (feshte yanar)',
          para(x.aylikTaksit), x.kalanAy, para(x.odenen))));
      r.appendChild(sol);
      r.appendChild(el('b', null, bicim('{0} ay', x.kalanAy)));
      t.appendChild(r);
    });
    kok.appendChild(t);
  }

  const borc = bolum('BORÇLAR', para(ben.borc));
  if (!ben.borclar || !ben.borclar.length) {
    borc.appendChild(el('div', 'bos', 'Borcun yok.'));
  } else {
    ben.borclar.forEach((b) => {
      const r = el('div', 'kalemSatir');
      const sol = el('div', 'sol');
      sol.appendChild(el('div', 'ad', b.baslik));
      sol.appendChild(el('div', 'not',
        bicim('taksit {0}', para(b.taksit))
        + (b.faizBp > 0 ? bicim(' · aylık faiz {0}', yuzde(b.faizBp))
                        : metin(' · faizsiz'))
        + (b.gidereGirer ? '' : metin(' · gidere girmiyor'))));
      r.appendChild(sol);
      r.appendChild(el('b', null, para(b.bakiye)));
      borc.appendChild(r);
    });
  }
  kok.appendChild(borc);

  const net = el('div', 'vurguKutu' + (ben.netDeger < 0 ? ' kotu' : ''));
  net.appendChild(el('span', null, 'Net değer'));
  net.appendChild(el('b', null, para(ben.netDeger)));
  kok.appendChild(net);

  const kayit = bolum('KAYITLAR');
  const gecmisSatir = el('button', 'tabloDugme');
  gecmisSatir.appendChild(el('span', null, 'Geçmiş kayıtlar'));
  const sag = el('span', 'sag');
  sag.appendChild(el('b', null, bicim('{0} kayıt', tumGunluk.length)));
  sag.appendChild(el('span', 'ok', '›'));
  gecmisSatir.appendChild(sag);
  gecmisSatir.addEventListener('click', () => gecmisGoster(() => maliTablo(ben)));
  kayit.appendChild(gecmisSatir);
  kok.appendChild(kayit);

  if (ben.giderArtisBp > 10050) {
    kok.appendChild(el('div', 'dipnot',
      bicim('Giderler oyun başından bu yana {0} arttı. Kalemler bu oranda '
        + 'ölçeklendi; motor tek toplamla çalışıyor.',
        yuzde(ben.giderArtisBp - 10000))));
  }

  kok.appendChild(dugme('KAPAT', 'ikincil', true, modalKapat));
  modalAc(kok);
}

const GIDER_RENKLERI = ['#c9a76a', '#a8875a', '#8d9a6b', '#7f8fa0', '#9b8098'];

/// Kompozisyonu tek bakışta gösteren oran çubuğu. Kalem listesi
/// "neyin ne kadar" sorusunu ancak toplayarak yanıtlıyor; çubuk
/// doğrudan yanıtlıyor.
function oranCubugu(paylar, toplam) {
  const c = el('div', 'oranCubugu');
  if (!toplam) return c;
  paylar.filter((p) => p.tutar > 0).forEach((p) => {
    const d = el('div', 'pay');
    d.style.width = (p.tutar / toplam * 100) + '%';
    d.style.background = p.renk;
    // Kalem adlarının bir kısmı motordan (zaten çevrili), bir kısmı
    // buradan geliyor; metin() ikisini de doğru bırakıyor.
    d.title = bicim('{0} · {1}', metin(p.ad), para(p.tutar));
    c.appendChild(d);
  });
  return c;
}

function bolum(baslik, sagYazi) {
  const b = el('div', 'tabloBolum');
  const bas = el('div', 'tabloBaslik');
  bas.appendChild(el('span', null, baslik));
  if (sagYazi) bas.appendChild(el('b', null, sagYazi));
  b.appendChild(bas);
  return b;
}

function tabloSatir(ad, deger, sinif) {
  const s = el('div', 'tabloSatir ' + (sinif || ''));
  s.appendChild(el('span', null, ad));
  s.appendChild(el('b', null, deger));
  return s;
}

// ---------- banka ----------
// Kredi ve borç kapatma. Sıraya bağlı değil: nakit sıkıştığı an
// borçlanmak da oyunun bir parçası, kart açıkken bile.
const HAL = { Bekar: T('bekâr'), Nisanli: T('nişanlı'), Evli: T('evli') };
const KONUT = {
  AileYaninda: T('aile yanında'), Kirada: T('kirada'),
  EvSahibi: T('ev sahibi'),
};

// Kredi ve borç kapama İKİ YERDE lazım: banka ekranında ve fırsat
// kararının içinde. Fırsat önüne gelen oyuncunun sorusu "param yeter
// mi" ve cevabı bankada duruyorsa modalı kapatıp geri gelmesi
// gerekiyordu — kararın kendisi kapanmadan.
function bankaGoster(ben) {
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', 'Banka'));
  kok.appendChild(el('div', 'modalAlt',
    bicim("Aylık faiz {0} · taksit anaparanın {1}'i · limit {2}",
      yuzde(ben.krediFaizBp), yuzde(ben.krediTaksitBp),
      para(ben.krediLimiti))));

  kok.appendChild(krediBolumu(ben));
  kok.appendChild(borcBolumu(ben));
  kok.appendChild(dugme('KAPAT', 'ikincil', true, modalKapat));
  modalAc(kok);
}

// Fırsat kararının içindeki para paneli: özet + kredi + borç kapama.
// Katlanır, çünkü çoğu turda oyuncunun buna ihtiyacı yok ve kartların
// önüne geçmemeli.
let paraPaneliAcik = false;

function paraDurumu(ben) {
  const kok = el('div', 'paraDurumu');

  const ozet = el('div', 'paraOzet');
  const satir = (ad, deger, sinif) => {
    const r = el('div', 'paraSatir ' + (sinif || ''));
    r.appendChild(el('span', null, ad));
    r.appendChild(el('b', null, deger));
    return r;
  };
  ozet.appendChild(satir('Nakit', para(ben.nakit)));
  ozet.appendChild(satir('Aylık akış', isaretli(ben.nakitAkisi),
    ben.nakitAkisi < 0 ? 'kotu' : 'iyi'));
  ozet.appendChild(satir('Karşılama', yuzde(ben.karsilamaBp)));
  ozet.appendChild(satir('Toplam borç', para(ben.borc), ben.borc > 0 ? 'kotu' : ''));
  kok.appendChild(ozet);

  const ac = dugme(paraPaneliAcik ? 'PARA İŞLERİNİ KAPAT' : 'KREDİ ÇEK / BORÇ KAPAT',
    // ciz() DEĞİL: ciz durum JSON'u istiyor ve argümansız çağrılınca
    // JSON.parse(undefined) fırlatıyordu — düğme sessizce ölüydü.
    // Panel yalnızca modalın içeriği, mevcut durumdan yeniden çiziliyor.
    // Karar arada kapanmış olabilir (kredi çekilince ciz() durumu
    // tazeliyor): açık karar yoksa modalı kapatmak, olmayan bir kararı
    // yeniden çizmeye çalışmaktan iyi.
    'ikincil', true, () => {
      paraPaneliAcik = !paraPaneliAcik;
      if (durum.karar) kararGoster(durum.karar); else modalKapat();
    });
  kok.appendChild(ac);

  if (paraPaneliAcik) {
    kok.appendChild(krediBolumu(ben));
    kok.appendChild(borcBolumu(ben));
    // Kredi çekmek nakdi değiştiriyor: ciz() yeniden çizince kartların
    // "AL" düğmeleri de yeni nakde göre açılıyor.
    kok.appendChild(el('div', 'dipnot',
      'Kredi çekince kartların fiyatı değişmez, ama alabilirliğin değişir.'));
  }
  return kok;
}

function krediBolumu(ben) {
  const cek = bolum('KREDİ ÇEK');
  if (ben.krediLimiti < ben.krediDilimi) {
    cek.appendChild(el('div', 'bos', 'Şu an kredi çekemezsin: nakit akışın yetmiyor.'));
  } else {
    const en = Math.floor(ben.krediLimiti / ben.krediDilimi);
    let dilim = 1;
    const satir = el('div', 'dilim');
    const kaydirac = el('input');
    kaydirac.type = 'range'; kaydirac.min = 1; kaydirac.max = en; kaydirac.value = 1;
    const etiket = el('b', null, para(ben.krediDilimi));
    const buton = dugme(bicim('ÇEK — {0}', para(ben.krediDilimi)), '', true, () =>
      ciz(Kopru.KrediCek(dilim * ben.krediDilimi)));
    const taksit = el('div', 'tabloSatir alt');
    const yaz = () => {
      const tutar = dilim * ben.krediDilimi;
      etiket.textContent = para(tutar);
      buton.textContent = metin('ÇEK — ') + para(tutar);
      taksit.innerHTML = '';
      taksit.appendChild(el('span', null, 'Aylık taksiti'));
      taksit.appendChild(el('b', null,
        para(Math.round(tutar * ben.krediTaksitBp / 10000))));
    };
    kaydirac.addEventListener('input', () => { dilim = +kaydirac.value; yaz(); });
    satir.appendChild(kaydirac); satir.appendChild(etiket);
    yaz();
    cek.appendChild(satir);
    cek.appendChild(taksit);
    cek.appendChild(buton);
  }
  return cek;

}

function borcBolumu(ben) {
  const kapat = bolum('BORÇ KAPAT');
  const kapatilabilir = (ben.borclar || []).filter((b) => b.gidereGirer);
  if (!kapatilabilir.length) {
    kapat.appendChild(el('div', 'bos', 'Kapatılacak borcun yok.'));
  } else {
    kapatilabilir.forEach((b) => {
      const yeter = ben.nakit >= b.bakiye;
      const s = el('div', 'satisSatir');
      const u = el('div', 'u');
      u.appendChild(el('span', null, b.baslik));
      u.appendChild(el('b', null, para(b.bakiye)));
      s.appendChild(u);
      s.appendChild(el('div', 'd', bicim('aylık taksit {0}', para(b.taksit))
        // Mali tabloyla aynı dil: faizsiz borca "%0" demek, oyuncuya
        // aynı şeyi iki ekranda iki türlü söylemek olurdu.
        + (b.faizBp > 0 ? bicim(' · faiz {0}', yuzde(b.faizBp))
                        : metin(' · faizsiz'))));
      s.appendChild(dugme(
        yeter ? bicim('KAPAT — {0}', para(b.bakiye))
              : bicim('{0} eksik', para(b.bakiye - ben.nakit)),
        '', yeter, () => ciz(Kopru.BorcOde(b.id))));
      kapat.appendChild(s);
    });
  }
  return kapat;
}

// Zar RAKAMLA değil NOKTAYLA gösteriliyor: "1" yazan bir kutu zar
// değil, bir sayaçtır. Noktalar 3x3 ızgarada ve gerçek zar
// yerleşimini izliyor — beş noktalı yüz köşeler artı merkez.
const ZAR_YERLESIM = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function zarYap(deger) {
  const z = el('div', 'zar');
  z.setAttribute('role', 'img');
  // EKRAN OKUYUCU DA OYUNCU. Görünmediği için gözden kaçmıştı:
  // İngilizce oyunda zar "4 geldi" diye okunuyordu.
  z.setAttribute('aria-label', bicim('{0} geldi', deger));
  const yuz = el('div', 'zarYuz');
  const yerler = ZAR_YERLESIM[deger] || [4];
  for (let i = 0; i < 9; i++) {
    const h = el('div', 'zarGoz');
    if (yerler.includes(i)) h.classList.add('dolu');
    yuz.appendChild(h);
  }
  z.appendChild(yuz);
  return z;
}

// ---------- hayat olayları ----------
// Nişan, düğün, çocuk KARAR DEĞİL: oyuncu onaylamıyor, haberi alıyor.
// Ama sessizce geçmemeli — üçü de kalıcı aylık gider bırakıyor ve
// oyuncunun asıl bilmesi gereken o rakam. Önceden yalnızca geçmiş
// kayıtlarına düşüyordu.
const HAYAT_METNI = {
  nisan: {
    baslik: T('Söz kesildi, nişan takıldı'),
    metin: T('Aileler tanıştı, tarih konuşuldu. Bir sonraki adım düğün — '
      + 'ondan önce çocuk haberi gelmiyor.'),
  },
  dugun: {
    baslik: T('Düğün oldu'),
    metin: T('Hane artık iki kişilik. Düğünün faturası bir kerelik, asıl '
      + 'pahalı olan bundan sonrası.'),
  },
  cocuk: {
    baslik: T('Çocuğun oldu'),
    metin: T('Tebrikler. Bu gider kalıcı: her ay, oyun bitene kadar.'),
  },
};

// Çocuk büyüyor: kreş, okul, lise, üniversite. Her eşik aylık gideri
// KALICI olarak artırıyor — oyunun anlattığı şey tam da zamanla büyüyen
// yükümlülük, ama görünmezse yalnızca "gider yine arttı" hissi kalır.
const EVRE_METNI = {
  'kreş': T('Çocuğun kreşe başladı'),
  'okul': T('Çocuğun okula başladı'),
  'lise': T('Çocuğun liseye başladı'),
  'üniversite': T('Çocuğun üniversiteye başladı'),
};

// EŞ ÇALIŞSIN MI — oyunun tezini tek karara sığdıran ekran.
//
// İki rakam da gösteriliyor: eşin getirdiği net para ve yükselttiği
// çıkış barajı. Yalnızca maaşı gösterip barajı kararın ardından
// açsaydım bu bir seçenek değil tuzak olurdu.
function esKarariGoster(e) {
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', 'Eşin çalışsın mı?'));
  kok.appendChild(el('div', 'modalAlt',
    e.cocukSayisi > 0
      ? metin('İkinci maaş eve girer ama servis, yemek ve ') + e.cocukSayisi
        + metin(' çocuğun bakımı da girer. Bu karar geri alınamaz.')
      : metin('İkinci maaş eve girer; servis, yemek ve dışarıda geçen '
        + 'zamanın maliyeti de girer. Bu karar geri alınamaz.')));

  kutuVurgu(kok, 'Eşin maaşı', '+' + para(e.esMaasi));
  kutuVurgu(kok, 'Doğacak gider', '−' + para(e.esGideri), 'kotu');
  kutuVurgu(kok, 'Aylık nete katkı',
    (e.netKatki >= 0 ? '+' : '') + para(e.netKatki));

  // Kararın asıl bedeli: gider büyüdüğü için çıkış barajı yükseliyor.
  // Maaş karşılama oranının payına girmiyor, yalnızca paydasına.
  kok.appendChild(el('div', 'modalAlt',
    bicim('Kısır Döngü\'den çıkmak için gereken aylık pasif gelir {0} '
      + 'yerine {1} olur: maaş seni kurtarmıyor, yalnızca eşiği '
      + 'yükseltiyor. Hayalinin fiyatı da bu gidere bağlı.',
      para(e.baraj), para(e.yeniBaraj))));

  const secim = el('div', 'esSecim');
  secim.appendChild(dugme('ÇALIŞSIN', '', true,
    () => { modalKapat(); ciz(Kopru.EsKarari(true)); }));
  secim.appendChild(dugme('ÇALIŞMASIN', 'ikincil', true,
    () => { modalKapat(); ciz(Kopru.EsKarari(false)); }));
  kok.appendChild(secim);
  modalAc(kok);
}

// Taahhüt bitti: ya anahtar teslim, ya sözleşme feshi.
function taahhutHaberiGoster(h) {
  const kok = el('div');
  const teslim = h.tur === 'teslim';

  kok.appendChild(el('div', 'modalBaslik',
    teslim
      ? h.baslik + metin(' teslim edildi')
      : h.baslik + metin(': sözleşme feshedildi')));
  kok.appendChild(el('div', 'modalAlt', teslim
    ? metin('Aylarca ödedin, bugün geliri başlıyor. Kalan bakiye krediye '
      + 'döndü; varlık artık senin.')
    : metin('Taksit gününde kasan taksidi karşılamadı. Sözleşme feshedildi '
      + 've bugüne kadar ödediğin geri gelmiyor.')));

  kutuVurgu(kok,
    teslim ? 'Aylık geliri' : 'Yanan para',
    (teslim ? '+' : '') + para(h.tutar),
    teslim ? '' : 'kotu');

  kok.appendChild(dugme('TAMAM', '', true, modalKapat));
  modalAc(kok);
}

function cocukEvresiGoster(e) {
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik',
    // e.evre bir ESLESME anahtari ('kreş', 'lise'...). Bu dal yalnizca
    // EVRE_METNI'de karsiligi olmayan yeni bir evre eklenirse calisiyor;
    // o gun anahtarin kendisi ekrana cikacagi icin cozulerek cikiyor.
    EVRE_METNI[e.evre]
      || bicim('Çocuğun {0} çağına geldi', metin(e.evre))));
  kok.appendChild(el('div', 'modalAlt',
    'Büyüdükçe pahalılaşıyor. Bu artış kalıcı: her ay, oyun bitene kadar.'));

  kutuVurgu(kok, 'Aylık giderin artışı', '+' + para(e.aylikArtis), 'kotu');
  kok.appendChild(dugme('TAMAM', '', true, modalKapat));
  modalAc(kok);
}

function hayatOlayiGoster(olay) {
  const bilgi = HAYAT_METNI[olay.tur];
  if (!bilgi) return;

  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik',
    olay.tur === 'cocuk' && olay.cocukSayisi > 1
      // bilgi.baslik BIR T() SABITI, yani tabloda anahtari var ama
      // kendisi cevrilmis degil. el()'e dogrudan verilince el cozuyor
      // (asagidaki dal), bicim()'e ARGUMAN olarak verilince cozen kimse
      // yok: "Çocuğun oldu (2. çocuk)" Ingilizce oyunda yarisi Turkce
      // cikiyordu.
      ? bicim('{0} ({1}. çocuk)', metin(bilgi.baslik), olay.cocukSayisi)
      : bilgi.baslik));
  kok.appendChild(el('div', 'modalAlt', bilgi.metin));

  // Kalıcı aylık gider artışı: bu olayın oyuncuya asıl maliyeti.
  if (olay.aylikArtis > 0) {
    const kutu = el('div', 'vurguKutu kotu');
    kutu.appendChild(el('span', null, 'Aylık giderin artışı'));
    kutu.appendChild(el('b', null, '+' + para(olay.aylikArtis)));
    kok.appendChild(kutu);
  } else {
    kok.appendChild(el('div', 'dipnot',
      'Bu adımın kalıcı aylık gideri yok; masrafı bir kerelik.'));
  }

  kok.appendChild(dugme('TAMAM', '', true, modalKapat));
  modalAc(kok);
}

// Hayal kartının fotoğrafı; seçim ekranıyla AYNI dosya.
// Makro duyuru: faiz ne oldu, piyasa ne bekliyor, ve yanında satış
// penceresi. Faiz ile beklenti arasındaki bağ kuralda (PiyasaDongusu):
// faiz artarsa daralma, inerse genişleme. Ekran bunu ANLATIYOR —
// oyuncunun öğrenmesi gereken işaret bu.
function duyuruGoster(d) {
  const daralma = d.beklenti === 'daralma';
  const kok = el('div');

  const rozet = el('div', 'duyuruRozet ' + (daralma ? 'daralma' : 'genisleme'),
    // ONDALIK AYRACI DA DILE BAGLI: burada elle ',' yaziliydi ve
    // Ingilizce oyunda "0,25 PUAN" cikiyordu.
    bicim(d.faiz === 'artti' ? '▲ FAİZ ARTTI  ·  {0} PUAN'
                             : '▼ FAİZ İNDİ  ·  {0} PUAN',
      (d.faizAdimiBp / 100).toLocaleString(YEREL(),
        { maximumFractionDigits: 2 })));
  kok.appendChild(rozet);

  kok.appendChild(el('div', 'modalBaslik', d.baslik));
  kok.appendChild(el('div', 'modalAlt', d.aciklama));

  kutuVurgu(kok, daralma ? 'Beklenti' : 'Beklenti',
    metin(daralma ? 'Piyasa daralıyor' : 'Piyasa genişliyor'),
    daralma ? 'kotu' : '');

  // Genişleme portföye ANINDA yansıdı; oyuncu bunu görmeli.
  if (!daralma && d.degerlenmeBp > 0) {
    kok.appendChild(el('div', 'dipnot',
      bicim('Varlıklarının değeri bu haberle {0} arttı.',
        yuzde(d.degerlenmeBp))));
  }

  // Faiz kararı kredili varlıkları İKİ YÖNDE de anında vuruyor.
  // Görünmeyen bir kural hiçbir şey öğretmez: oyuncu kaldıracın
  // bedelini rakamla görmeli.
  if (d.faizEtkisiKurus) {
    const iyi = d.faizEtkisiKurus > 0;
    kutuVurgu(kok, 'Aylık akışına etkisi',
      isaretli(d.faizEtkisiKurus), iyi ? '' : 'kotu');
    kok.appendChild(el('div', 'dipnot',
      iyi
        ? 'Faiz indi: değişken faizli taksitlerin ucuzladı, kredili '
          + 'aldığın varlıkların finansman yükü hafifledi.'
        : 'Faiz arttı: değişken faizli taksitlerin zamlandı, kredili '
          + 'aldığın varlıkların finansman yükü ağırlaştı. Borcu olmayan '
          + 'bunu hiç hissetmez — bedeli olan tek şey kaldıraç.'));
  }

  kok.appendChild(el('div', 'modalBaslik', d.teklifBaslik));
  kok.appendChild(el('div', 'modalAlt',
    bicim('{0} — teklif: değerinin {1}',
      d.teklifAciklama, yuzdeIyelik(d.teklifBp))));

  satisListesi(kok, d.satilabilir, (idler) => duyuruGonder('sat', idler));

  // UYARI SAYACI. Ceza sürpriz değil, duyurulmuş bir sonuç olmalı;
  // yalnızca daralma uyarıları sayılıyor.
  if (daralma) {
    const kalan = d.esik - d.kacirilan;
    kok.appendChild(el('div', kalan <= 1 ? 'uyariKutu' : 'dipnot',
      kalan <= 1
        ? bicim('Bu uyarıyı da geçersen portföyün zarar görecek — '
            + 'üst üste {0}. daralma uyarısı.', d.esik)
        : bicim('Üst üste {0} daralma uyarısını geçersen portföyün zarar '
            + 'görür. Şu ana kadar geçilen: {1}.', d.esik, d.kacirilan)));
  }

  kok.appendChild(dugme(daralma ? 'SATMIYORUM' : 'ELİMDE TUTUYORUM',
    'ikincil', true, () => duyuruGonder('gec', '')));
  modalAc(kok);
}

// Kaçırılan uyarıların bedeli. Neyin vurulduğu ve NEDEN vurulduğu
// birlikte söyleniyor.
function piyasaCezasiGoster(c) {
  const kok = el('div');
  kok.appendChild(el('div', 'duyuruRozet daralma', '⚠ PİYASA DARBESİ'));
  kok.appendChild(el('div', 'modalBaslik', c.baslik));
  kok.appendChild(el('div', 'modalAlt', c.aciklama));

  if (c.kaybedilenDeger > 0) {
    kutuVurgu(kok, 'Portföyünden silinen', para(c.kaybedilenDeger), 'kotu');
  }

  const t = bolum('DARBENİN ETKİSİ', TUR_ADI[c.tur] || c.tur);
  t.appendChild(tabloSatir('Varlık değeri', yuzde(c.degerBp), 'alt'));
  if (c.gelirBp) t.appendChild(tabloSatir('Aylık gelir', yuzde(c.gelirBp), 'alt'));
  kok.appendChild(t);

  kok.appendChild(el('div', 'dipnot',
    'Bu darbe, üst üste geçtiğin daralma uyarılarının sonucu. Sayaç '
    + 'sıfırlandı: bir sonraki uyarıda satarsan yeniden baştan başlar.'));

  kok.appendChild(dugme('ANLADIM', '', true, modalKapat));
  modalAc(kok);
}

// DEGERLER GOSTERIM, ANAHTARLAR ESLESME. Anahtarlar motordan gelen
// VarlikTuru adlari; cevrilirse eslesme kopar.
const TUR_ADI = {
  Gayrimenkul: T('gayrimenkul'),
  Isletme: T('işletme'),
  Kagit: T('kâğıt varlık'),
};

function kutuVurgu(kok, ad, deger, sinif) {
  const k = el('div', 'vurguKutu ' + (sinif || ''));
  k.appendChild(el('span', null, ad));
  k.appendChild(el('b', null, deger));
  kok.appendChild(k);
  return k;
}

function hayalGorseli(id, sinif) {
  const g = el('img', sinif);
  g.src = 'hayal/' + id + '.webp';
  g.alt = '';
  return g;
}

// Meslek ve hayal oyun boyunca görünür duruyor: oyuncunun ne olduğu ve
// ne için oynadığı, oyunun ortasında hatırlanması gereken bir şey değil.
// Oyuncunun kimliği ÜÇ yerde birden: tahta panelinin başlığında
// (kim ve ne peşinde), hayal kartında (hedefin ne olduğu ve ne kadar
// yaklaştığı). Hepsi aynı veriden, tek yerden çiziliyor.
function kimligiCiz(ben) {
  $('#meslegim').textContent = durum.meslegim || '';
  $('#hayalim').textContent = durum.hayalim
    ? metin('Hayalin: ') + durum.hayalim
      + metin(' · bugünün fiyatıyla ') + para(durum.hayalimFiyat)
    : '';

  // AVATAR ARTIK MESLEK KARTI DEGIL. Karti 44 piksele kirpinca ekrana
  // gelen sey mesleğin fotoğrafı değil, kartın ÜSTÜNDEKİ YAZININ bir
  // parçası oluyordu — İngilizce oyunda panelin köşesinde okunaksız
  // bir Türkçe metin lekesi. Metinsiz sanat gelince (meslek/foto/)
  // fotoğraf geri dönüyor; o zamana kadar mesleğin baş harfi duruyor,
  // ki o harf çeviriyle birlikte kendiliğinden değişiyor.
  const av = $('#oyuncuAvatar');
  // Kartla aynı kural: görsel yoksa mesleğin baş harfi duruyor.
  const fotoVar = meslekFotografi(durum.meslekId);
  av.classList.toggle('harf', !fotoVar);
  if (fotoVar) {
    av.textContent = '';
    av.style.backgroundImage = "url('" + fotoVar.yol + "')";
  } else {
    av.style.backgroundImage = '';
    av.textContent = (durum.meslegim || '').trim().slice(0, 1).toLocaleUpperCase(
      DIL_KODU === 'tr' ? 'tr-TR' : 'en-US');
  }

  const ban = $('#hayalBanner');
  const banYol = durum.hayalimId ? 'hayal/' + durum.hayalimId + '.webp' : '';
  if (ban.getAttribute('src') !== banYol) ban.setAttribute('src', banYol);

  $('#hayalAd').textContent = durum.hayalim || '';
  $('#hedefCumlesi').textContent = ben.zenginlikYolunda
    ? metin('Hedefin: ') + para(durum.hayalimFiyat)
      + metin(' katını ödeyip hayaline kavuşmak.')
    : metin('Önce Kısır Döngü: pasif gelirin aylık giderini karşılasın.');

  // Hedef çubuğu YARIŞ çubuğuyla aynı sayı — iki ayrı ölçü uydurmak,
  // oyuncuya iki farklı hikâye anlatmak olurdu.
  const oran = Math.min(100, (ben.karsilamaBp / ben.hedefBp) * 100);
  $('#hedefDolgu').style.width = oran + '%';
  $('#hedefOran').textContent = yuzde(ben.karsilamaBp);

  // Hayale özel cümle. Motor erkenken boş gönderiyor; boşken satırı
  // GİZLEMEK gerekiyor, yoksa kartın altında boş bir aralık kalıyor.
  const soz = $('#hayalSozu');
  soz.textContent = durum.hayalSozu || '';
  soz.hidden = !durum.hayalSozu;
}

// Alt paneller GERÇEK veriden: varlıklar ve borçlar. Uydurma ekran yok.
function panelleriCiz(ben) {
  const v = $('#varlikListesi');
  v.innerHTML = '';
  const varliklar = [...(ben.varliklar || [])].sort((a, b) => b.deger - a.deger);
  if (!varliklar.length) {
    v.appendChild(el('div', 'panelBos', 'Henüz varlığın yok.'));
  } else {
    varliklar.slice(0, 5).forEach((x) => {
      const r = el('div', 'panelSatir');
      r.appendChild(el('span', 'ad', x.baslik));
      r.appendChild(el('b', x.akis >= 0 ? 'artiDeger' : 'eksiDeger', isaretli(x.akis)));
      v.appendChild(r);
    });
    if (varliklar.length > 5) {
      v.appendChild(el('div', 'panelBos', bicim('ve {0} tane daha', varliklar.length - 5)));
    }
  }

  const b = $('#borcListesi');
  b.innerHTML = '';
  const borclar = (ben.borclar || []).filter((x) => x.gidereGirer);
  if (!borclar.length) {
    b.appendChild(el('div', 'panelBos', 'Borcun yok.'));
  } else {
    borclar.slice(0, 5).forEach((x) => {
      const r = el('div', 'panelSatir');
      r.appendChild(el('span', 'ad', x.baslik));
      r.appendChild(el('b', 'eksiDeger', para(x.bakiye)));
      b.appendChild(r);
    });
  }
}

// İç çemberden çıkmak oyunun ilk yarısını bitiriyor ama oyunu
// bitirmiyor: buraya kadar amaç pasif geliri gidere yetiştirmekti,
// buradan sonra iki ayrı kazanma yolu açılıyor. O yüzden ekran hem
// kutluyor hem de yeni hedefi rakamıyla söylüyor — "başardın" deyip
// oyuncuyu neyin beklediğini anlatmamak, oyunun ikinci yarısını
// görünmez bırakırdı.
function kulvarCikisiGoster(c) {
  const kok = el('div');
  if (durum.hayalimId) kok.appendChild(hayalGorseli(durum.hayalimId, 'modalGorsel'));

  kok.appendChild(el('div', 'modalBaslik',
    bicim('Tebrikler! {0}\u2019den çıktın', icKulvar())));
  kok.appendChild(el('div', 'modalAlt',
    bicim('Artık maaşın için çalışmıyorsun: kurduğun varlıklar aylık '
      + 'giderini tek başına karşılıyor. {0}. turda, {1}\u2019nün '
      + 'dışındasın.', c.tur, icKulvar())));

  kutuVurgu(kok, 'Karşılama',
    yuzde(Math.round(c.pasifGelir * 10000 / c.cikistakiGider)));

  // Oyuncunun buradan sonra neyin değiştiğini bilmesi lazım: aynı oyunu
  // daha rahat oynamıyor, BAŞKA bir oyun oynuyor.
  kok.appendChild(el('div', 'modalAlt',
    bicim('Dışarısı başka bir ölçek. Buradaki fırsatlar {0}'
    + '\u2019dekilerden kat kat büyük ve artık peşinatlarını ödeyecek '
    + 'gücün var. Hayaline giden yol tam olarak buradan geçiyor: '
    + 'aldığın her fırsat pasif gelirini büyütüyor, büyüyen pasif gelir '
    + 'bir sonrakini ödüyor. Kısır Döngü\u2019de her ay başa dönüyordun; '
    + 'burada her ay bir öncekinin üstüne koyuyorsun.', icKulvar())));

  const b = bolum('ÇIKIŞ ANI');
  b.appendChild(tabloSatir('Aylık giderin', para(c.cikistakiGider), 'alt'));
  b.appendChild(tabloSatir('Pasif gelirin', para(c.pasifGelir), 'alt'));
  kok.appendChild(b);

  // İki kazanma yolu da rakamıyla: hangisinin daha yakın olduğunu
  // oyuncu kendi görsün.
  const y = bolum('BUNDAN SONRA \u2014 TEK HEDEF');
  y.appendChild(tabloSatir(
    c.hayal + metin(' (bugünün fiyatıyla ') + para(c.fiyat) + ')',
    para(c.hayalBedeli), 'toplam'));
  kok.appendChild(y);

  kok.appendChild(el('div', 'dipnot',
    'Oyun yalnızca hayalini SATIN ALARAK biter. Bu rakam çıkıştaki '
    + 'aylık giderine bağlandı ve donduruldu: enflasyon giderini '
    + 'yükseltse de hedefin yerinde duruyor. Pasif gelirin oyunu '
    + 'bitirmiyor ama bu nakdi üreten şey o.'));

  kok.appendChild(dugme('HAYALİMİN PEŞİNE', '', true, modalKapat));
  modalAc(kok);
}

// Hayalle biten oyun ÜÇ ADIMDA anlatılıyor: hayalin neydi, nasıl
// alabildin, ve ancak sonra "gerçekleştirdin". Doğrudan "kazandın"
// demek, oyunun en önemli kuralını — hayalin bedelinin çıkıştaki
// aylık giderin katı olduğunu — görünmez bırakıyordu.
function hayalSonucuGoster(h, ben) {
  const kok = el('div');
  if (h.id) kok.appendChild(hayalGorseli(h.id, 'modalGorsel'));
  kok.appendChild(el('div', 'modalBaslik', h.baslik));
  kok.appendChild(el('div', 'modalAlt', h.aciklama));

  const hesap = bolum('NASIL ALDIN', para(h.bedel));
  hesap.appendChild(tabloSatir(
    'Kısır Döngü\'den çıktığındaki aylık giderin', para(h.cikistakiGider), 'alt'));
  hesap.appendChild(tabloSatir(
    bicim('Bugünün fiyatıyla {0}, çıkışta', para(h.fiyat)),
    para(h.bedel), 'alt'));
  hesap.appendChild(tabloSatir(
    'Ödeme anındaki nakdin', para(h.odemedenOnceNakit), 'alt'));
  hesap.appendChild(tabloSatir('Ödedin', para(h.bedel), 'toplam'));
  kok.appendChild(hesap);

  kok.appendChild(el('div', 'dipnot',
    'Hayalin fiyatı sabit bir rakam değil: yüksek enflasyonlu bir '
    + 'ekonomide sabit hedef her yıl ucuzlardı. Bu yüzden bedel, '
    + 'Kısır Döngü\'den çıktığın andaki aylık giderine bağlandı.'));

  kok.appendChild(dugme('DEVAM', '', true, () => sonucGoster(ben, true)));
  modalAc(kok);
}

// Kazanmanın İKİ yolu var: hayali almak, ya da pasif geliri hedefe
// çıkarmak. Ekran ikisinde de aynı şeyi göstermeli — hayalin fotoğrafı,
// aylık tablo ve o tabloyu kuran varlıklar. Fark yalnızca metinde:
// biri hayali aldı, öteki hayalini artık ne zaman isterse alabilir.
function sonucGoster(ben, hayalAnlatildi) {
  // Hayali ALARAK kazandıysa önce hayalin ne olduğu ve nasıl alındığı.
  if (ben.kazandi && durum.hayalSonucu && !hayalAnlatildi) {
    hayalSonucuGoster(durum.hayalSonucu, ben);
    return;
  }

  const kok = el('div', 'sonuc');
  const kazandin = ben.kazandi;
  const hayalle = kazandin && durum.hayalSonucu;
  const t = durum.sonTablo;

  if (kazandin && durum.hayalimId) {
    kok.appendChild(hayalGorseli(durum.hayalimId, 'modalGorsel'));
  }

  kok.appendChild(el('div', 'buyuk ' + (kazandin ? 'kazandi' : 'kaybetti'),
    hayalle ? 'Hayalini gerçekleştirdin'
      : kazandin ? 'Kazandın'
      : ben.iflas ? 'İflas ettin' : 'Oyun bitti'));

  kok.appendChild(el('div', 'modalAlt',
    hayalle ? bicim('{0} — artık senin.', durum.hayalim)
      : kazandin
        // Pasif gelir yoluyla kazanma: hayal alınmadı ama artık
        // alınabilir durumda; oyunun söylediği şey bu.
        ? bicim('Pasif gelirin hedefi geçti. {0} için artık kimseye ve '
            + 'hiçbir maaşa ihtiyacın yok.', durum.hayalim)
      // TEK KİŞİLİK OYUN: kaybetmenin tek yolu batmak. "X kazandı"
      // dalı kaldırıldı — rakip yok, oyunu bir başkasının bitirmesi de
      // yok. Hayalini ertelemek artık bedelsiz bir karar.
      : ben.iflas
        ? bicim('Üst üste {0} maaş gününü eksi kapattın. {1} bu sefer '
            + 'olmadı.', durum.iflasSiniri, durum.hayalim)
      : 'Oyun burada bitti.'));
  kok.appendChild(el('div', 'modalAlt', bicim('{0} tur oynandı.', durum.tur)));

  if (t) {
    if (kazandin) kutuVurgu(kok, 'Aylık pasif gelirin', para(t.pasifGelir));

    const tb = bolum('AYLIK TABLON');
    tb.appendChild(tabloSatir('Varlıklarından gelen', para(t.pasifGelir), 'alt'));
    tb.appendChild(tabloSatir('Aylık giderin', para(t.aylikGider), 'alt'));
    tb.appendChild(tabloSatir('Her ay eline geçen', isaretli(t.aylikArtan), 'alt'));
    tb.appendChild(tabloSatir('Elinde kalan nakit', para(t.nakit), 'alt'));
    tb.appendChild(tabloSatir('Net değerin', para(t.netDeger), 'toplam'));
    kok.appendChild(tb);

    if (kazandin) {
      kok.appendChild(el('div', 'dipnot',
        bicim('Bu tabloda maaş yok. {0}\u2019den çıktığından beri tek '
          + 'kuruş maaş almadın; yukarıdaki her şey kurduğun '
          + 'varlıklardan geliyor.', icKulvar())));
    }

    const v = t.varliklar || [];
    if (v.length) {
      const kap = bolum(
        kazandin ? 'SENİ ORAYA GÖTÜREN VARLIKLAR' : 'ELİNDEKİ VARLIKLAR',
        bicim('{0} varlık', v.length));
      // En değerlisinden sıralı geliyor (Masa.EnDegerliler).
      v.slice(0, 6).forEach((x) => {
        const r = el('div', 'tabloSatir alt');
        r.appendChild(el('span', null, x.baslik));
        r.appendChild(el('b', null, bicim('{0} · aylık {1}', para(x.deger), isaretli(x.akis))));
        kap.appendChild(r);
      });
      if (v.length > 6) {
        kap.appendChild(el('div', 'dipnot', bicim('ve {0} varlık daha.', v.length - 6)));
      }
      kok.appendChild(kap);
    }
  }

  analizBolumu(kok);
  geriBildirimBolumu(kok);

  kok.appendChild(dugme('YENİDEN', '', true, secimeDon));
  modalAc(kok);
}

// GERİ BİLDİRİM. Oyunun sonunda tek soru, tek kutu, tek düğme.
//
// NEDEN BURADA: ölçüm katmanı kaç oyun oynandığını ve nerede
// bırakıldığını sayıyor ama NEDEN bırakıldığını söyleyemiyor. Bir
// denemeciye "nasıl olmuş" diye sormak "güzel olmuş" getiriyor; oyunun
// bittiği an ise insanın söyleyecek somut bir şeyi olduğu an.
//
// YAZILAN METİN AĞA ÇIKMIYOR, PANOYA GİDİYOR.
//
// Bu bir uygulama ayrıntısı değil, ölçüm katmanının BİRİNCİ KURALI:
// "para ve serbest metin asla girmez". Buradaki kutu tanımı gereği
// serbest metin ve oyuncu ona canı ne isterse yazabilir — maaşını,
// adını, derdini. O yüzden not olc()'ye HİÇ uğramıyor; doğrudan
// panoya yazılıyor ve oyuncu onu kime göndereceğine kendi karar
// veriyor. tool/olcum_denetimi.mjs bu alanın ağa çıkamadığını ayrıca
// sınıyor.
function geriBildirimBolumu(kok) {
  const b = bolum('NE DÜŞÜNDÜN?');
  b.appendChild(el('div', 'dipnot',
    metin('Nerede takıldın, anlamadığın bir ekran oldu mu? Bir iki '
      + 'cümle yeter.')));

  const kutu = el('textarea', 'formGiris geriKutu');
  kutu.rows = 3;
  kutu.placeholder = metin('buraya yaz…');
  b.appendChild(kutu);

  const d = dugme('KOPYALA', 'ikincil', true, async () => {
    // Notun yanına oyunun kendi sayıları da gidiyor: "şurada sıkıldım"
    // cümlesi, kaçıncı turda sıkıldığı bilinmeden yarım kalıyor.
    const yuk = 'RICH ROUTINE — geri bildirim\n'
      + kutu.value.trim() + '\n---\n' + JSON.stringify(ozet());
    try {
      await navigator.clipboard.writeText(yuk);
      d.textContent = metin('KOPYALANDI — şimdi yapıştırıp gönder');
    } catch (hata) {
      // Pano izni yoksa metni seçip gösteriyorum: sessizce başarısız
      // olup boş pano bırakmak, oyuncuya yalan söylemek olurdu.
      kutu.value = yuk;
      kutu.select();
      d.textContent = metin('ELLE KOPYALA');
    }
  });
  b.appendChild(d);
  kok.appendChild(b);
}

// OYUN SONU ANALİZİ. Her cümlenin arkasında SAYILMIŞ bir kayıt var;
// hiçbiri tahmin değil. "Şunu alsaydın şu kadar erken biterdi" cümlesi
// burada YOK ve bilerek yok — o ancak oyunu gerçekten yeniden oynatarak
// söylenebilir, sonraki adımın işi.
function analizBolumu(kok) {
  let a;
  try { a = JSON.parse(Kopru.Analiz()); } catch (hata) { return; }
  if (!a || !a.kararSayisi) return;

  const b = bolum('BU OYUNDA NE OLDU');

  // TEMPO KIYASI YALNIZCA KAZANANA. Kaybedene "59 tur önde bitirdin"
  // demek, erken batmayı bir başarıymış gibi göstermek olurdu — ölçümde
  // tam olarak o çıktı: 27. turda iflas eden oyuna "59 tur önde" dedi.
  const fark = a.medyanaGoreFark;
  if (a.kazandi) {
    b.appendChild(el('div', 'analizSatir',
      bicim('{0} turda bitirdin. Ölçülen masa medyanı {1} tur — {2}',
        a.tur, a.medyanTur,
        fark > 0 ? bicim('{0} tur önde.', fark)
        : fark < 0 ? bicim('{0} tur geride.', -fark)
        : metin('tam ortada.'))));
  } else {
    b.appendChild(el('div', 'analizSatir',
      bicim('{0}. turda bitti. Ölçülen masa medyanı {1} tur.',
        a.tur, a.medyanTur)));
  }

  if (a.cikisTuru > 0) {
    b.appendChild(el('div', 'analizSatir',
      bicim('{0}\u2019den {1}. turda çıktın.',
        icKulvar(), a.cikisTuru)));
  }

  // Kaçırılan fırsatlar. PARASI OLMAYANI SAYMIYORUM: elinde olmayan bir
  // şeyi kaçırmakla suçlamak analizi değersizleştirirdi.
  if (a.parasiVarkenKacirilan > 0) {
    b.appendChild(el('div', 'analizSatir vurgu',
      bicim('{0} kez, paran yeterken destenin ortasının üstünde bir '
        + 'fırsatı geçtin.', a.parasiVarkenKacirilan)));

    if (a.enBuyukKacirilanBaslik) {
      b.appendChild(el('div', 'analizSatir',
        bicim('En büyüğü {0}. turda: {1}, aylık {2} · getiri {3} / ay.',
          a.enBuyukKacirilanTur, a.enBuyukKacirilanBaslik,
          isaretli(a.enBuyukKacirilanAylik),
          yuzde(a.enBuyukKacirilanGetiriBp))));
    }
  } else if (a.firsatSayisi > 0) {
    b.appendChild(el('div', 'analizSatir',
      'Paran yeterken ortalama üstü hiçbir fırsatı kaçırmadın.'));
  }

  b.appendChild(el('div', 'analizSatir',
    bicim('{0} fırsat kararı, {1} alım.',
      a.firsatSayisi, a.alinanFirsat)));

  if (a.odenenLuks > 0) {
    b.appendChild(el('div', 'analizSatir',
      bicim('{0} lüks harcama ödedin: {1}.', a.odenenLuks,
        para(a.toplamLuks))
      + (a.gecilenLuks > 0
         ? ' ' + bicim('{0} tanesini geçtin.', a.gecilenLuks) : '')));
  }

  b.appendChild(el('div', 'dipnot',
    'Bu sayıların hepsi bu oyunda gerçekten olan şeyler; hiçbiri tahmin '
    + 'değil.'));
  kok.appendChild(b);
}

// "%87'si" / "%116'sı": ek, yüzdenin SON RAKAMININ okunuşuna göre.
// Düz "'i" yazmak "%116'i" gibi okunmayan bir şey üretiyordu.
function yuzdeIyelik(bp) {
  const y = yuzde(bp);
  // EK TURKCEYE OZGU VE CEVRILEMEZ. Son rakamin okunusuna gore
  // degisiyor ("%87'si" ama "%116'si") ve Ingilizcede karsiligi yok.
  // Dizge olarak cevirmeye kalkmak "%87's" gibi bir sey uretirdi;
  // dogrusu ekin kendisini dile bagli kilmak.
  if (DIL) return y;
  const son = y.replace(/[^0-9]/g, '').slice(-1);
  return y + ({ 1: "'i", 2: "'si", 3: "'ü", 4: "'ü", 5: "'i",
                6: "'sı", 7: "'si", 8: "'i", 9: "'u", 0: "'ı" }[son] || "'si");
}

// SATIŞ LİSTESİ TEK YERDE. İki ekranda birden vardı (kare teklifi ve
// piyasa duyurusu) ve ikisi de aynı kodun kopyasıydı; birini
// düzeltip diğerini unutmak bu dosyada zaten birkaç kez oldu.
//
// İKİ DEĞİŞİKLİK BİRDEN:
// 1. KÂR/ZARAR. Eskiden yalnızca "eline geçen X ₺" yazıyordu ve X'in
//    iyi mi kötü mü olduğu, oyuncunun kaç tur önce ne ödediğini
//    hatırlamasına bağlıydı. Oyun kendi sorduğu soruyu cevaplamıyordu.
// 2. ÇOKLU SATIŞ. Her satır kendi SAT düğmesini taşıyordu, yani bir
//    teklifte tek varlık satılabiliyordu. Oysa teklif "değerinin
//    %116'sı" diyor ve o oran portföyün tamamı için geçerli.
function satisListesi(kok, satilabilir, gonderici) {
  const liste = satilabilir || [];
  if (!liste.length) {
    kok.appendChild(el('div', 'modalAlt', 'Satacak bir şeyin yok.'));
    return;
  }

  const secili = new Set();
  const dugmeler = [];

  liste.forEach((v) => {
    const r = el('div', 'satisSatir secmeli');
    const kar = v.karZarar || 0;

    const u = el('div', 'u');
    const kutu = el('span', 'onayKutu');
    u.appendChild(kutu);
    u.appendChild(el('span', 'ad', v.baslik));
    u.appendChild(el('b', null, para(v.net)));
    r.appendChild(u);

    r.appendChild(el('div', 'd',
      bicim('ödediğin {0} · aylık {1} gider',
        para(v.odenen || 0), isaretli(v.akis))));

    // Kâr/zarar belirgin ve KENDİ SATIRINDA: rakamın yanına sıkıştırmak,
    // oyuncunun kararını veren tek sayıyı diğerlerinin arasında
    // kaybetmek olurdu.
    const kz = el('div', 'karZarar ' + (kar >= 0 ? 'kar' : 'zarar'));
    kz.appendChild(el('span', 'etiketKz', kar >= 0 ? 'KÂR' : 'ZARAR'));
    kz.appendChild(el('b', null, isaretli(kar)));
    r.appendChild(kz);

    r.appendChild(el('div', 'uyari',
      bicim('satarsan karşılama → {0}', yuzde(v.sonrakiKarsilamaBp))));

    const sec = () => {
      if (secili.has(v.id)) secili.delete(v.id); else secili.add(v.id);
      r.classList.toggle('secili', secili.has(v.id));
      tazele();
    };
    r.addEventListener('click', sec);
    dugmeler.push(r);
    kok.appendChild(r);
  });

  // DÜĞMEYİ 'etkin' KURUP SONRA KAPATIYORUM. dugme() dinleyiciyi
  // yalnızca BAŞLANGIÇTA etkinse bağlıyor; false verince düğme
  // sonradan açılıyor ama hiç tıklanmıyordu — tarayıcıda üç varlık
  // seçip SAT'a bastım, hiçbir şey olmadı. Kapatmayı disabled ile
  // yapıyorum, dinleyici baştan yerinde.
  const sat = dugme('SAT', '', true, () => gonderici([...secili].join(',')));
  const ozet = el('div', 'satisOzet');
  kok.appendChild(ozet);
  kok.appendChild(sat);

  function tazele() {
    const secilenler = liste.filter((v) => secili.has(v.id));
    const netToplam = secilenler.reduce((t, v) => t + v.net, 0);
    const karToplam = secilenler.reduce((t, v) => t + (v.karZarar || 0), 0);

    sat.disabled = secilenler.length === 0;
    sat.textContent = secilenler.length === 0
      ? metin('SATMAK İSTEDİĞİNİ SEÇ')
      : metin('SAT — ') + para(netToplam);

    // Toplam kâr/zarar ancak birden çok seçilince bir şey söylüyor;
    // tek varlıkta satırın kendisi zaten yazıyor.
    if (secilenler.length < 2) { ozet.textContent = ''; ozet.className = 'satisOzet'; return; }
    ozet.className = 'satisOzet ' + (karToplam >= 0 ? 'kar' : 'zarar');
    ozet.textContent = secilenler.length + metin(' varlık · toplam ')
      + (karToplam >= 0 ? metin('kâr ') : metin('zarar ')) + isaretli(karToplam);
  }
  tazele();
}

const gonder = (eylem, secim) => ciz(Kopru.Karar(eylem, secim));
const duyuruGonder = (eylem, secim) => ciz(Kopru.DuyuruKarari(eylem, secim || ''));

// ---------- seçim ekranları ----------
// Meslek ve hayal OYUNCUNUN seçimi. Önceki hâlinde ikisi de rastgele
// dağıtılıyordu: oyuncu neyle ve ne için oynadığını seçemiyordu.
// GÖRSEL ÖLÇÜLERİ. Kart görselleri yüklenene kadar yer kaplamıyordu:
// kartlar önce yassı bir şerit gibi çiziliyor, fotoğraf gelince açılıyor
// ve sayfa zıplıyordu — oyuncunun "şerit şerit görünüyor" dediği şey bu.
// En/boy önceden bilinirse tarayıcı yeri baştan ayırıyor.
//
// Ölçüler görsellerle BİRLİKTE üretiliyor (gorsel-olcu.json); elle
// yazılsaydı bir sonraki kırpmada sessizce bayatlardı.
// ÖLÇÜLER ÇİZİMDEN ÖNCE BEKLENİYOR ve bunu bir kez yanlış yapıp
// ölçümde gördüm. Önce fetch'i .then() ile bağlamıştım; kartlar
// ölçüler gelmeden çiziliyordu ve ortaya kısır bir döngü çıkıyordu:
//
//   ölçü yok -> kart 4 piksel -> tembel yükleme görseli "ekran dışında"
//   sanıp hiç istemiyor -> görsel gelmiyor -> kart 4 pikselde kalıyor
//
// Oyuncunun "şerit şerit görünüyor" dediği şey tam olarak buydu.
// Üst düzey await, modülün geri kalanını bekletiyor; dosya 1 KB.
let gorselOlcu = {};
try {
  gorselOlcu = await fetch('gorsel-olcu.json').then((y) => y.json());
} catch (hata) {
  // Ölçü gelmezse kartlar yine çalışır, yalnızca yüklenirken zıplar.
}

// Meslek görselinin yolu DİLE GÖRE ayrı.
//
// NEDEN İKİ TAKIM: Türkçe sürüm Türkiye'de geçiyor, İngilizce sürüm
// Los Angeles / Toronto / Berlin / Amsterdam'da. Aynı fotoğraf ikisine
// birden hizmet etmiyordu; mekân yanlış oluyordu.
//
// ÖLÇÜ DOSYASI AYNI ZAMANDA VARLIK KONTROLÜ. gorsel-olcu.json'da
// kaydı olmayan görsel HİÇ istenmiyor: yarısı gelmiş bir takım, kartı
// yarısı fotoğraflı yarısı düz gösterirdi. Kayıt yoksa kart yazıyla
// çalışıyor — eksik bir görsel, bozuk bir karttan iyi.
function meslekFotografi(id) {
  if (!id) return null;
  const dal = DIL_KODU === 'tr' ? 'foto/' : 'foto/en/';
  if (!gorselOlcu[dal + id]) return null;
  return { yol: 'meslek/' + dal + id + '.webp', olcu: dal + id };
}

function olcuVer(img, id) {
  const o = gorselOlcu[id];
  if (!o) return;
  img.width = o[0];
  img.height = o[1];
}

const secenekler = JSON.parse(Kopru.Secenekler());
let secilenMeslek = null;
let secilenHayal = null;
let secilenSehir = null;
let sehirSecenekleri = secenekler.sehirler || [];
let adim = 'meslek';

const SECIM_METNI = {
  meslek: {
    baslik: T('Mesleğini seç'),
    alt: T('Bakman gereken sayı maaş değil: maaştan geriye ne kaldığı.'),
  },
  sehir: {
    baslik: T('Nerede yaşıyorsun?'),
    // RAKAM ÖLÇÜMDEN GELİYOR, DengeTests/SehirlerFarkliAmaHicbiriBaskinDegil
    // her koşuda yazdırıyor. Los Angeles eklendiğinde bu cümle "üçü de"
    // diyordu ve bant da artık yarım puan değil bir puan; ölçüm
    // değişince buranın da değişmesi gerekiyor.
    alt: T('Hepsi aynı zorlukta — ölçtüm, kazanma oranları arasında bir '
      + 'puan var. Değişen şey tempo: ucuz şehirden erken çıkarsın ama '
      + 'maaşın her yıl enflasyonun gerisinde kalır; pahalı şehirde ilk '
      + 'yıllar boğar. Ülke değişince tempo da değişir: Türkiye\'de seni '
      + 'zaman ezer, Amerika\'da kira.'),
  },
  hayal: {
    baslik: T('Hayalini seç'),
    // "2026 TÜRKİYE'SİNİN GERÇEK RAKAMLARI" CÜMLESİ ÜLKE SEÇİMİYLE
    // YALAN OLDU. Deste Türkiye'nin: fiyatlar da hayallerin kendisi de
    // (Datça'da taş ev, Çeşme'de yazlık). Los Angeles'ı seçen oyuncuya
    // o rakamlar kendi giderine ölçeklenerek gösteriliyor, yani artık
    // "gerçek" değil — ölçülmüş bir orana göre taşınmış.
    //
    // Cümle o yüzden mekanizmayı anlatıyor: ne olduğu doğru, nereden
    // geldiği doğru. Desteyi ülkeye göre değiştirmek ayrı bir iş.
    alt: T('Oyunu bitiren tek şey bu. Fiyatlar yaşadığın yerin giderine '
      + 'göre ölçekleniyor; listede yalnızca mesleğinin ölçeğindekiler '
      + 'var. Ucuz hayal oyunu erken bitirir, pahalı hayal uzatır — '
      + 'ölçtüm: en ucuzuyla oynayan on oyunun birini, en pahalısıyla '
      + 'oynayan neredeyse yarısını kaybediyor.'),
  },
};

// SEÇİM DEĞİŞİNCE LİSTEYİ YENİDEN KURMUYORUM.
// secimCiz() listeyi innerHTML='' ile boşaltıp yirmi kartı baştan
// yaratıyor; her kart yeni bir <img> demek, yani tarayıcı hepsini
// yeniden boyayana kadar liste boş kalıyor. Kartların zemini koyu
// olduğu için bu "mesleğe tıklayınca ekran anlık siyah olup geri
// geliyor" diye görünüyordu — kartları koyu zemine oturttuğum anda
// ortaya çıktı, ondan önce beyaz üstüne beyaz olduğu için görünmüyordu.
// Seçim değişince değişen tek şey hangi kartın işaretli olduğu ve ileri
// düğmesinin açık olup olmadığı; ikisi de DOM'u yıkmadan olur.
function secimVurgula() {
  const secili = adim === 'meslek' ? secilenMeslek
    : adim === 'sehir' ? secilenSehir : secilenHayal;
  document.querySelectorAll('#secimListe > *').forEach((k) => {
    k.classList.toggle('secili', k.dataset.id === secili);
  });
  $('#secimIleri').disabled = !secili;
}

function secimCiz() {
  // Dugme HEDEF dili gosteriyor, mevcut dili degil: "EN" yazan bir
  // dugmeye basinca Ingilizceye gecmek beklenen davranis.
  const dugme = $('#dilDugme');
  if (dugme) {
    const hedef = DIL ? 'tr' : 'en';
    dugme.textContent = hedef.toUpperCase();
    dugme.onclick = () => dilDegistir(hedef);
  }

  const m = SECIM_METNI[adim];
  $('#secimBaslik').textContent = metin(m.baslik);
  $('#secimAlt').textContent = metin(m.alt);
  $('#secimGeri').hidden = adim === 'meslek';
  $('#secimIleri').textContent = metin(adim === 'hayal' ? 'BAŞLA' : 'DEVAM');
  $('#secimIleri').disabled =
    adim === 'meslek' ? !secilenMeslek
    : adim === 'sehir' ? !secilenSehir
    : !secilenHayal;

  const liste = $('#secimListe');
  liste.innerHTML = '';
  liste.classList.toggle('gorselKartlar', adim !== 'sehir');
  liste.classList.toggle('sehirKartlar', adim === 'sehir');

  if (adim === 'meslek') {
    liste.appendChild(kendiMeslegimKarti());
    secenekler.meslekler.forEach((x, i) => liste.appendChild(meslekKarti(x, i + 1)));
  } else if (adim === 'sehir') {
    liste.appendChild(sehirSecimi());
  } else {
    secenekler.hayaller.forEach((x, i) => liste.appendChild(hayalKarti(x, i + 1)));
  }
}

// ÖNCE ÜLKE, SONRA ŞEHİR.
//
// Üç Türkiye şehri kart kart duruyordu ve liste ülke eklenince
// çalışmıyor: oyuncu "nerede yaşıyorsun" sorusuna önce ülkesiyle cevap
// veriyor, şehir onun içinden geliyor. Kartlar yerine iki açılır liste,
// çünkü bu bir hayat seçimi değil bir ADRES: kart, seçenekleri yan yana
// karşılaştırmak için vardı; adreste karşılaştırılacak bir şey yok,
// oyuncu zaten nerede yaşadığını biliyor.
//
// Ama KARŞILAŞTIRMA BİLGİSİ KAYBOLMUYOR: seçilen şehrin tablosu ve
// yargı cümlesi listelerin altında duruyor ve seçim değişince yeniden
// çiziliyor. Oyuncunun görmesi gereken şey "hangi şehir daha iyi"
// değil, "benim şehrimde bu meslek ne demek".
function ulkeler() {
  const gorulen = new Map();
  sehirSecenekleri.forEach((x) => {
    if (!gorulen.has(x.ulkeId)) gorulen.set(x.ulkeId, x.ulkeAd);
  });
  return [...gorulen].map(([id, ad]) => ({ id, ad }));
}

function sehirSecimi() {
  const kok = el('div', 'sehirSecim');
  const secili = sehirSecenekleri.find((x) => x.id === secilenSehir);
  // Ülke seçilmemişse ilk şehrin ülkesi: oyuncu hiçbir şeye dokunmadan
  // da tutarlı bir ekran görüyor.
  const ulkeId = secili ? secili.ulkeId : ulkeler()[0].id;

  const kutu = (etiket, secenekler, deger, degisti) => {
    const s = el('label', 'acilirSatir');
    s.appendChild(el('span', 'acilirEtiket', etiket));
    const a = el('select', 'acilir');
    secenekler.forEach((o) => {
      const p = el('option', null, o.ad);
      p.value = o.id;
      if (o.id === deger) p.selected = true;
      a.appendChild(p);
    });
    a.addEventListener('change', () => degisti(a.value));
    s.appendChild(a);
    return s;
  };

  kok.appendChild(kutu(T('Ülke'), ulkeler(), ulkeId, (yeni) => {
    // ÜLKE DEĞİŞİNCE ŞEHİR DE DEĞİŞMELİ: eski şehir yeni ülkede yok.
    const ilk = sehirSecenekleri.find((x) => x.ulkeId === yeni);
    secilenSehir = ilk ? ilk.id : null;
    secimCiz();
  }));

  const sehirler = sehirSecenekleri.filter((x) => x.ulkeId === ulkeId);
  kok.appendChild(kutu(T('Şehir'), sehirler, secilenSehir, (yeni) => {
    secilenSehir = yeni;
    secimCiz();
  }));

  if (secili) kok.appendChild(sehirOzeti(secili));
  return kok;
}

// Seçilen şehrin hesabı. Rakamlar soyut çarpan değil, SEÇİLEN MESLEĞİN
// o şehirdeki hâli: "kira %55 ucuz" bir şey söylemez, "giderin 43.220
// yerine 33.870 olur" söyler.
function sehirOzeti(x) {
  const b = el('div', 'sehirKart secili');
  b.appendChild(el('div', 'sehirAnlatim', x.anlatim));

  const t = el('div', 'sehirTablo');
  const sat = (ad, deger, sinif) => {
    const r = el('div', 'sat' + (sinif ? ' ' + sinif : ''));
    r.appendChild(el('span', null, ad));
    r.appendChild(el('b', null, deger));
    t.appendChild(r);
  };
  sat('Maaş', para(x.maas));
  sat('Gider', para(x.gider));
  sat('Aylık artan', isaretli(x.artan));
  sat('Çıkış barajı', para(x.baraj));

  // Kararın ikinci ekseni: maaşın gideri yakalayıp yakalamadığı.
  // Bu satır olmasaydı oyuncu yalnızca "ucuz mu pahalı mı" görür ve
  // her zaman ucuzu seçerdi.
  const kazaniyor = x.maasZammiBp > x.giderArtisiBp;
  sat('Maaş zammı', yuzde(x.maasZammiBp) + metin(' / yıl'),
    kazaniyor ? 'iyi' : 'kotu');
  b.appendChild(t);

  b.appendChild(el('div', 'sehirYargi' + (kazaniyor ? ' iyi' : ' kotu'),
    bicim(kazaniyor
      ? 'Maaşın gider artışını ({0}) geçiyor: uzayan oyun senin lehine.'
      : 'Maaşın gider artışının ({0}) gerisinde: geç kalırsan her yıl '
        + 'biraz daha eziliyorsun.',
      yuzde(x.giderArtisiBp))));

  return b;
}

// KENDİ MESLEĞİN. Yirmi kartın başında, görselsiz: burada seçilen şey
// bir fotoğraf değil, oyuncunun kendi hayatı.
function kendiMeslegimKarti() {
  const b = el('button', 'secKart meslek kendim'
    + (secilenMeslek === KENDIM ? ' secili' : ''));
  b.dataset.id = KENDIM;

  const g = el('div', 'kendimYuz');
  g.appendChild(el('div', 'kendimBaslik', 'Kendi hayatım'));
  g.appendChild(el('div', 'kendimAlt',
    kendiOnizleme
      ? bicim('{0} · {1} / ay', kendiOnizleme.baslik,
          para(kendiOnizleme.maas))
      : metin('Kendi mesleğini, gelirini ve borçlarını yaz. '
        + 'Boş bıraktıklarını oyun kendi ölçülmüş verisiyle dolduruyor.')));
  g.appendChild(el('div', 'kendimEylem',
    kendiOnizleme ? 'rakamları düzenle →' : 'doldurmaya başla →'));
  b.appendChild(g);

  b.addEventListener('click', () => kendiMeslegimFormu());
  return b;
}

// Form değerleri modal kapansa da duruyor: oyuncu geri dönüp
// düzeltebilmeli, her açılışta sıfırdan yazmak zorunda kalmamalı.
let kendiGirdi = {};
let kendiOnizleme = null;
const KENDIM = 'MSL_KENDIM';

function sayiAlani(etiket, anahtar, ipucu) {
  const sar = el('label', 'formSatir');
  sar.appendChild(el('span', 'formEtiket', etiket));
  const g = el('input');
  g.type = 'text';
  g.inputMode = 'numeric';
  g.className = 'formGiris';
  g.placeholder = metin(ipucu || 'boş bırakabilirsin');
  // OYUNCU KENDI BIRIMINDE YAZIYOR, MOTOR KURUSLA CALISIYOR.
  // Ingilizce oynayan "3000" yazdiginda kastettigi 3.000 dolar; bunu
  // 3.000 lira diye almak oyuncunun hayatini on altida bire indirirdi
  // ve hicbir sey kizmazdi -- yalnizca oyun ona "bu rakamlarla her ay
  // para kaybediyorsun" derdi.
  g.value = kendiGirdi[anahtar] == null
    ? '' : String(doviz(Math.round(kendiGirdi[anahtar] / 100)));
  g.addEventListener('input', () => {
    // BOŞ İLE SIFIR AYRI: boş alan null gidiyor, "0" yazan 0.
    const ham = g.value.replace(/[^0-9]/g, '');
    if (ham === '') { kendiGirdi[anahtar] = null; return; }
    const yazilan = Number(ham);
    kendiGirdi[anahtar] = Math.round(
      (DIL_KODU === 'tr' ? yazilan : yazilan * DOLAR_KURU) * 100);
  });
  sar.appendChild(g);
  return sar;
}

function secimAlani(etiket, anahtar, secenekler) {
  const sar = el('div', 'formSatir dikey');
  sar.appendChild(el('span', 'formEtiket', etiket));
  const grup = el('div', 'formSecim');
  secenekler.forEach(([deger, yazi]) => {
    const d = el('button', 'formDugme'
      + (kendiGirdi[anahtar] === deger ? ' secili' : ''), yazi);
    d.type = 'button';
    d.addEventListener('click', () => {
      kendiGirdi[anahtar] = kendiGirdi[anahtar] === deger ? null : deger;
      [...grup.children].forEach((c) => c.classList.remove('secili'));
      if (kendiGirdi[anahtar] === deger) d.classList.add('secili');
    });
    grup.appendChild(d);
  });
  sar.appendChild(grup);
  return sar;
}

function kendiMeslegimFormu() {
  // İŞ MODELİNİN ASIL SAYISI BU. Oyunu oynayanların kaçı kendi
  // rakamlarını giriyor? Çok ise ürün bir araç, az ise bir oyun —
  // fiyatlandırma da tamamen buna bağlı.
  olc('kendiForm:acildi', { dil: DIL_KODU });
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', 'Kendi hayatın'));
  kok.appendChild(el('div', 'modalAlt',
    'Hiçbirini yazmak zorunda değilsin. Boş bıraktığın her alanı oyun '
    + 'kendi ölçülmüş verisinden dolduruyor ve hangisini doldurduğunu '
    + 'sana tek tek gösteriyor.'));

  const ad = el('label', 'formSatir');
  ad.appendChild(el('span', 'formEtiket', 'Mesleğin'));
  const adG = el('input');
  adG.type = 'text';
  adG.className = 'formGiris';
  adG.placeholder = metin('örn. Tornacı');
  adG.value = kendiGirdi.baslik || '';
  adG.addEventListener('input', () => { kendiGirdi.baslik = adG.value; });
  ad.appendChild(adG);
  kok.appendChild(ad);

  kok.appendChild(sayiAlani('Aylık net gelirin (₺)', 'aylikNetKurus'));
  kok.appendChild(secimAlani('Evli misin?', 'evli', [[true, 'Evliyim'], [false, 'Bekârım']]));
  kok.appendChild(secimAlani('Çocuk', 'cocukSayisi',
    [[0, 'Yok'], [1, '1'], [2, '2'], [3, '3+']]));
  kok.appendChild(secimAlani('Ev', 'konut',
    [['kirada', 'Kirada'], ['evSahibi', 'Ev benim'], ['ailesiyle', 'Ailemle']]));
  kok.appendChild(secimAlani('İş', 'kendiIsi',
    [[false, 'Maaşlıyım'], [true, 'Kendi işim']]));
  kok.appendChild(sayiAlani('Kredi kartıyla aylık ortalama harcaman (₺)',
    'kartAylikHarcamaKurus', 'kartım yoksa 0 yaz'));

  kok.appendChild(el('div', 'formBaslik', 'Kredilerin'));
  kok.appendChild(el('div', 'formNot',
    'Kredin yoksa boş bırak — oyun burada hiçbir şey uydurmuyor. '
    + 'Taksiti biliyorsan kalan borcu boş geçebilirsin.'));
  [[T('Konut kredisi'), 'ev'], [T('Taşıt kredisi'), 'araba'],
   [T('İhtiyaç kredisi'), 'ihtiyac']]
    .forEach(([yazi, k]) => {
      kok.appendChild(el('div', 'formAltBaslik', yazi));
      kok.appendChild(sayiAlani('aylık taksit (₺)', k + 'TaksitKurus'));
      kok.appendChild(sayiAlani('kalan borç (₺)', k + 'KalanKurus'));
    });

  const ayak = el('div', 'modalAyak');
  ayak.appendChild(dugme('VAZGEÇ', 'ikincil', true, () => modalKapat()));
  ayak.appendChild(dugme('HESAPLA', '', true, () => {
    // YALNIZCA "HESAPLANDI" SAYILIYOR, ne hesaplandığı değil. Formun
    // içinde oyuncunun gerçek maaşı ve borçları var; olc() beyaz liste
    // dışındaki her alanı düşürüyor ve tool/olcum_denetimi.mjs bunu
    // doğruluyor. Burada bilerek hiçbir şey geçirmiyorum.
    olc('kendiForm:hesaplandi', {});
    kendiOnizleme = JSON.parse(
      Kopru.KendiMeslegiKur(JSON.stringify(kendiGirdi), new Date().getFullYear()));
    kendiOnizlemeGoster();
  }));
  kok.appendChild(ayak);
  modalAc(kok);
}

function kendiOnizlemeGoster() {
  const o = kendiOnizleme;
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', o.baslik));
  kok.appendChild(el('div', 'modalAlt', o.aciklama));

  const t = el('div', 'defterKutu');
  const sat = (a, b, sinif) => {
    const r = el('div', 'defSat' + (sinif ? ' ' + sinif : ''));
    r.appendChild(el('span', null, a));
    r.appendChild(el('i', 'defKilavuz'));
    r.appendChild(el('b', null, b));
    t.appendChild(r);
  };
  sat('Aylık gelir', para(o.maas));
  sat('Aylık gider', para(o.gider));
  (o.borclar || []).forEach((b) =>
    sat(bicim('{0} taksiti', b.baslik), para(b.taksit)));
  sat('Aylık artan', isaretli(o.aylikAkis), o.aylikAkis >= 0 ? 'iyi' : 'kotu');
  kok.appendChild(t);

  if (o.kiyas) kok.appendChild(el('div', 'kiyasNot', o.kiyas));
  if (o.bogulma) {
    kok.appendChild(el('div', 'uyariKutu',
      'Yazdığın rakamlarla her ay para kaybediyorsun. Oyun yine '
      + 'başlıyor — ama bu oyunun zorluğu değil, senin zeminin.'));
  }

  // HANGİ RAKAM KİMİN. Bu liste olmasaydı oyun, oyuncuya kendi
  // hayatıymış gibi sunulan bir tahmin gösterirdi.
  kok.appendChild(el('div', 'formBaslik', 'Rakamlar nereden geldi'));
  const n = el('div', 'notListe');
  (o.notlar || []).forEach((x) => {
    const r = el('div', 'notSatir' + (x.seninki ? ' seninki' : ''));
    r.appendChild(el('span', 'notAd', x.alan));
    r.appendChild(el('b', null, para(x.tutar)));
    // AÇIKLAMA VARSA O KAZANIR. Kart borcunu oyuncu yazmadı, aylık
    // harcamasını yazdı; "senin yazdığın" demek onu, yazmadığı bir
    // rakamın sahibi yapardı. Motor bu durumda kaynağı da gönderiyor
    // ve burada onu yutuyordum.
    r.appendChild(el('span', 'notKaynak',
      x.kaynak || (x.seninki ? 'senin yazdığın' : 'oyunun verisi')));
    n.appendChild(r);
  });
  kok.appendChild(n);

  const ayak = el('div', 'modalAyak');
  ayak.appendChild(dugme('DÜZELT', 'ikincil', true, () => kendiMeslegimFormu()));
  ayak.appendChild(dugme('BU HAYATLA OYNA', '', true, () => {
    olc('kendiForm:oynandi', {});
    secilenMeslek = KENDIM;
    modalKapat();
    secimCiz();
  }));
  kok.appendChild(ayak);
  modalAc(kok);
}

// KART ARTIK VERIDEN CIZILIYOR, GORSELDEN OKUNMUYOR.
//
// Onceki halinde meslek karti tek bir .webp'ti: ad, maas, aciklama ve
// bes rakamin hepsi fotografin ICINE basiliydi. Iki sorun vardi ve
// ikisi de olculdu:
//
// 1. CEVRILEMIYOR. Icerik tablosunu Ingilizceye cevirmek karta
//    hicbir sey yapmiyor; yazi fotografin pikselleri. Yirmi kartin
//    onsekizinde ayrica sahne icinde Turkce tabela var ("DOCENT
//    (UNVAN VAR, ZAM YOK)", "BUG FIX HAYAT FIX ETMIYOR").
// 2. BAYATLIYOR. Rakamlar icerikle birlikte degismiyor; bir kez
//    degistiler ve dort kart sessizce yalan soyledi. Tests.Data/
//    MeslekGorselleriTests tam olarak bu tuzagi yakalamak icin yuz
//    rakami elle sabitliyordu.
//
// Fotografi kurtarmayi uc yolla denedim ve ucu de olcumle elendi:
// kirpma (x>=0.62'de bile yirmi kartin onaltisinda tabela kirpmanin
// odaginda kaliyor), perde (basili rakamlar %90 opaklikta bile
// siziyor, iki takim sayi ust uste okunuyor), bulaniklik (fotograflar
// zaten koyu; yirmisinin baskin rengi #3e3733-#595043 arasinda, yani
// bulaninca hepsi ayni koyu lekeye donusuyor).
//
// Sonuc: bu gorsellerde metin ile fotograf birlikte kurtarilamiyor.
// Kart veriden ciziliyor; fotograf, METINSIZ yeni sanat gelince geri
// donecek — asagidaki foto yuvasi onun icin duruyor ve bir bayrakla
// degil DOSYANIN VARLIGIYLA aciliyor (unutulacak bir adim birakmamak
// icin).
//
// Rozet numarasi listedeki sira: gorsellere basili numaralar da
// meslekler.json'daki dizi sirasiydi (8. sirada duran 60.000'lik
// Bankaci'nin rozeti 8, maasa gore 5 degil).
function meslekKarti(m, sira) {
  const b = el('button', 'secKart meslek' + (secilenMeslek === m.id ? ' secili' : ''));
  b.title = m.baslik + ' — ' + para(m.maas) + metin(' / ay')
    + metin(' · artan ') + para(m.artan);

  // FOTOĞRAF DİLE GÖRE AYRI TAKIMDAN GELİYOR.
  //
  // Eskiden İngilizce kartta fotoğraf hiç yoktu: eldeki yirmi fotoğraf
  // basılı Türkçe karttan kırpılmıştı ve çoğunda arka planda hâlâ bir
  // Türkçe tabela, kara tahta ya da kupa yazısı vardı. İngilizce
  // oynayan için bu, kartın üzerinde anlamadığı bir yazı demekti.
  //
  // Şimdi iki ayrı takım var (tasarim/istem-meslek-tr.md ve -en.md).
  // Dosyalar gelmediği sürece o dilde kart yazıyla çalışıyor; bu da
  // takımın yarısı gelirse kartların yarısının düz kalmasını önlüyor.
  const foto = meslekFotografi(m.id);
  if (foto) {
    const g = el('img', 'secGorsel');
    g.src = foto.yol;
    g.alt = '';
    // İLK DÖRT KART ÖNCELİKLİ, GERİSİ TEMBEL.
    //
    // Hepsi tembelken açılışta ekrandaki kartlar bir an siyah kalıyordu:
    // tarayıcı görseli ancak düzen oturup kart görünür alana girdikten
    // SONRA istiyor. İlk izlenimin siyah dikdörtgenler olması, oyunun
    // ilk saniyesini bozan tek şeydi.
    //
    // DÖRT, çünkü telefonda katlamanın üstünde iki sütun × iki satır
    // duruyor; beşinci zaten kaydırmadan görünmüyor ve onu da öncelikli
    // yapmak, kazandığımız bant genişliğini geri vermek olurdu.
    const ilkler = sira <= 4;
    g.loading = ilkler ? 'eager' : 'lazy';
    g.decoding = ilkler ? 'sync' : 'async';
    if (ilkler) g.fetchPriority = 'high';
    olcuVer(g, foto.olcu);
    b.appendChild(g);
  }

  const y = el('div', 'meslekYuz');

  const ust = el('div', 'meslekUst');
  ust.appendChild(el('div', 'meslekSira', String(sira)));
  const bas = el('div', 'meslekBas');
  bas.appendChild(el('div', 'meslekAd', m.baslik));
  bas.appendChild(el('div', 'meslekMaas', para(m.maas) + metin(' / ay')));
  ust.appendChild(bas);
  y.appendChild(ust);

  y.appendChild(el('p', 'meslekAck', m.aciklama));

  const t = el('dl', 'meslekTablo');
  const sat = (ad, deger, sinif) => {
    t.appendChild(el('dt', null, ad));
    t.appendChild(el('dd', sinif || null, deger));
  };
  sat('gider', para(m.gider));
  sat('artan', para(m.artan), m.artan > 0 ? 'iyi' : 'kotu');
  sat('nakit', para(m.nakit));
  sat('borç', para(m.borc), 'kotu');
  y.appendChild(t);

  // KARARIN ASIL SAYISI BU ve karttaki tek vurgulu satir o yuzden.
  // Maas degil, maastan geriye kalanin maasa orani: ekranin ustundeki
  // "Bakman gereken sayi maas degil" cumlesinin karsiligi.
  const o = el('div', 'meslekMarj');
  o.appendChild(el('span', 'meslekMarjAd', 'artan/maaş'));
  o.appendChild(el('b', 'meslekMarjSayi', yuzde(m.marjBp)));
  const c = el('div', 'meslekCubuk');
  // Olcek %40'a gore: oyundaki en iyi oran %26,4, en kotusu %21,2.
  // %100'e gore cizilseydi yirmi cubugun hepsi ayni gorunurdu.
  const dolu = el('div', 'meslekCubukDolu');
  dolu.style.width = Math.max(4, Math.min(100, m.marjBp / 40)) + '%';
  c.appendChild(dolu);
  o.appendChild(c);
  y.appendChild(o);

  b.appendChild(y);

  b.dataset.id = m.id;
  b.addEventListener('click', () => { secilenMeslek = m.id; secimVurgula(); });
  return b;
}

// Hayal kartı da bir görsel, ama meslek kartından bir farkı var:
// görselin üstünde sadece ad ve "aylık giderin N katı" yazıyor, açıklama
// yok. O yüzden açıklama görselin altında metin olarak duruyor —
// hiçbir bilgi görsele geçerken kaybolmuyor.
function hayalKarti(h, sira) {
  const b = el('button', 'secKart hayal' + (secilenHayal === h.id ? ' secili' : ''));
  // BAŞLIKTA BUGÜNÜN FİYATI: "tekne 35 milyon" cümlesi bir çapa ve
  // oyuncunun rakamı gerçek dünyayla eşleştirdiği tek yer orası.
  // Çıkışta ödenecek tahmin bir alt satırda duruyor.
  const fiyatYazi = h.bugunkuFiyat ? para(h.bugunkuFiyat) : '';
  b.title = h.baslik + ' — ' + fiyatYazi;

  const g = el('img', 'secGorsel');
  g.src = 'hayal/' + h.id + '.webp';
  g.alt = h.baslik + ' — ' + fiyatYazi;
  // Meslek kartındakiyle aynı kural, aynı sebep: hayal ekranı da
  // görselle açılıyor ve ilk izlenimi siyah dikdörtgen olmamalı.
  const ilkler = sira <= 4;
  g.loading = ilkler ? 'eager' : 'lazy';
  g.decoding = ilkler ? 'sync' : 'async';
  if (ilkler) g.fetchPriority = 'high';
  olcuVer(g, h.id);

  // Kolajda bir kart üç sütun genişliğinde; kimliğine göre değil, kendi
  // en/boy oranına göre tam satır kaplıyor ki görsel değişirse kod da
  // kendiliğinden uysun.
  g.addEventListener('load', () => {
    if (g.naturalHeight && g.naturalWidth / g.naturalHeight > 1.6) {
      b.classList.add('genis');
    }
  });
  b.appendChild(g);

  // BASILI BAŞLIK ÖRTÜLÜYOR, YERİNE CANLISI ÇİZİLİYOR.
  //
  // Görselin üstünde "aylık giderin 25 katı" yazıyor ve bu rakam
  // içerikte değişebiliyor — fiyatlar bir kez yükseltildi ve on sekiz
  // kartın hepsi bir anda yalan söylemeye başladı. Fotoğrafın içindeki
  // rakamı düzeltmek yerine hiç okumamak doğrusu: başlık da fiyat da
  // artık veriden geliyor, görsel yalnızca fotoğraf.
  // SINIF ADLARI OYUN EKRANINDAKİLERDEN AYRI: "hayalUst" ve "hayalAd"
  // index.html'de zaten kimlik bloğunda kullanılıyor ve aynı adı
  // kullanmak oyun sayfasının üstünü siyah bir bantla kapatmıştı.
  const ust = el('div', 'kartUstSerit');
  ust.appendChild(el('div', 'kartUstAd', h.baslik));
  // FİYAT LİRA OLARAK. Önce "aylık giderin 22 katı" yazıyordu ve bu
  // cümle oyuncuya hiçbir şey söylemiyordu: hac ile Boğaz yalısı
  // arasındaki farkı ancak iki katsayıyı zihinden bölerek anlayabilirdi.
  // Rakam seçilen mesleğe VE şehre göre hesaplanıyor.
  ust.appendChild(el('div', 'kartUstKat', fiyatYazi));
  b.appendChild(ust);

  b.appendChild(el('div', 'altYazi', h.aciklama));

  // Lira tek başına da yetmiyor: 4,4 milyon çok mu az mı, oyuncu kendi
  // ölçeğini bilmeden söyleyemez. Aylık artanına bölünce cevap çıkıyor.
  // UZAKLIK ETİKETİ. Liste artık oyuncunun ölçeğinin üstündeki
  // hayalleri de gösteriyor; fiyat tek başına "bu benim için ne demek"
  // sorusunu cevaplamıyor.
  //
  // Dil zorluk değil UZUNLUK ve bu ölçümden geliyor: doktorda kat 44 ile
  // kat 188 aynı kayıp oranını veriyor, yalnızca oyun uzuyor. "Çok zor"
  // demek ona yalan olurdu; "uzun" ikisine de doğru.
  const UZAK_METNI = {
    yakin:  T('Mesleğine göre kısa yol — en erken biten hedeflerden'),
    uzun:   T('Uzun soluklu — oyunu belirgin uzatır'),
    enUzun: T('En uzun yol — oyunu yaklaşık iki katına çıkarır'),
  };
  if (h.uzaklik && UZAK_METNI[h.uzaklik]) {
    b.appendChild(el('div', 'hayalUzak ' + h.uzaklik, UZAK_METNI[h.uzaklik]));
  }

  if (h.tahminiFiyat) {
    // KISA TUTULUYOR. Uzun hâli ("Kısır Döngü'den çıkacağın güne kadar
    // enflasyonla ≈ …") iki sütuna düşen telefon kartında üç satır
    // kaplıyordu ve kartı gereksiz uzatıyordu. Aynı iki bilgi, yarısı
    // kadar yazıyla.
    b.appendChild(el('div', 'hayalOlcek',
      bicim('Çıkışta ≈ {0}', para(h.tahminiFiyat))
      + (h.aylikArtanKati > 0
         ? bicim(' · bugünkü artanınla {0} ay', h.aylikArtanKati)
         : '')));
  }

  b.dataset.id = h.id;
  b.addEventListener('click', () => { secilenHayal = h.id; secimVurgula(); });
  return b;
}

function kalem(ad, deger) {
  const s = el('span', null, ad + ' ');
  s.appendChild(el('b', null, deger));
  return s;
}

function secimeDon() {
  yurumeler.clear();
  sayaclar.clear();
  sonDegerler.clear();
  pulOgeleri.clear();
  oncekiKareler = new Map();
  oncekiZar = 0;
  sonHayatSirasi = 0;
  sonEvreSirasi = 0;
  kulvarCikisiGosterildi = false;
  sonCezaSirasi = 0;
  zarHareketi = null;
  tahtaImzasi = '';
  tumGunluk = [];
  adim = 'meslek';
  secilenMeslek = null;
  secilenHayal = null;
  $('#oyun').hidden = true;
  $('#ortu').hidden = true;
  $('#secim').hidden = false;
  secimCiz();
}

function oyunuBaslat() {
  olc('oyun:basladi', {
    dil: DIL_KODU, sehir: secilenSehir,
    meslek: secilenMeslek, hayal: secilenHayal,
    ulke: (sehirSecenekleri.find((x) => x.id === secilenSehir) || {}).ulkeId,
  });
  $('#secim').hidden = true;
  $('#oyun').hidden = false;
  ciz(Kopru.YeniOyun(
    Math.floor(Math.random() * 1e9), secilenMeslek, secilenHayal, secilenSehir));
}

$('#secimIleri').addEventListener('click', () => {
  if (adim === 'meslek') {
    // Şehir rakamları SEÇİLEN MESLEĞE göre yeniden hesaplanıyor: aynı
    // şehir, öğretmene ve doktora farklı bir teklif.
    sehirSecenekleri = JSON.parse(Kopru.SehirSecenekleri(secilenMeslek));
    // AÇILIR LİSTEDE GÖRÜNEN ŞEY SEÇİLMİŞTİR. Kartlar dururken "hiçbiri
    // seçili değil" gösterilebilir bir durumdu ve İLERİ kapalı
    // bekliyordu; açılır listede öyle bir durum yok, kutu zaten bir
    // şehir yazıyor. Seçimi boş bırakmak, ekranda yazanla kodun
    // birbirini tutmaması olurdu.
    if (!sehirSecenekleri.some((x) => x.id === secilenSehir)) {
      secilenSehir = sehirSecenekleri.length ? sehirSecenekleri[0].id : null;
    }
    // Meslek BURADA sayılmıyor: oyun:basladi'da da gönderiliyor ve
    // ikisi birden aynı seçimi iki kez sayardı. Huni basamağının
    // kendisi olayın varlığı.
    olc('adim:sehir', {});
    adim = 'sehir'; secimCiz(); window.scrollTo(0, 0);
  } else if (adim === 'sehir') {
    // Hayal fiyatları meslek VE şehre bağlı: Anadolu'da yaşayan
    // öğretmenin hayali İstanbul'dakinden ucuz, çünkü fiyat giderin katı.
    secenekler.hayaller =
      JSON.parse(Kopru.HayalSecenekleri(secilenMeslek, secilenSehir));
    olc('adim:hayal', { sehir: secilenSehir });
    adim = 'hayal'; secimCiz(); window.scrollTo(0, 0);
  } else oyunuBaslat();
});
$('#secimGeri').addEventListener('click', () => {
  adim = adim === 'hayal' ? 'sehir' : 'meslek';
  secimCiz(); window.scrollTo(0, 0);
});

$('#zarAt').addEventListener('click', () => ciz(Kopru.ZarAt()));
$('#banka').addEventListener('click', () => {
  if (durum) bankaGoster(durum.oyuncular[0]);
});
$('#bilanco').addEventListener('click', () => {
  if (durum) maliTablo(durum.oyuncular[0]);
});
// PORTFÖY: varlıkların tam listesi. Yarış kartındaki panel yalnızca
// ilk beşini gösteriyor; tamamı ve satış seçenekleri burada.
$('#portfoy').addEventListener('click', () => {
  if (durum) portfoyGoster(durum.oyuncular[0]);
});
$('#yeni').addEventListener('click', secimeDon);

function portfoyGoster(ben) {
  const kok = el('div');
  kok.appendChild(el('div', 'modalBaslik', 'Portföyün'));
  kok.appendChild(el('div', 'modalAlt',
    bicim('Aylık pasif gelirin {0} — bu satırların toplamı.',
      para(ben.pasifGelir))));

  const v = [...(ben.varliklar || [])].sort((a, b) => b.deger - a.deger);
  if (!v.length) {
    kok.appendChild(el('div', 'bos', 'Henüz hiçbir varlığın yok.'));
  } else {
    const b = bolum('VARLIKLARIN', bicim('{0} varlık', v.length));
    v.forEach((x) => {
      const r = el('div', 'tabloSatir alt');
      r.appendChild(el('span', null, x.baslik));
      r.appendChild(el('b', null, bicim('{0} · aylık {1}', para(x.deger), isaretli(x.akis))));
      b.appendChild(r);
    });
    kok.appendChild(b);
  }
  kok.appendChild(dugme('KAPAT', 'ikincil', true, modalKapat));
  modalAc(kok);
}

// AÇILIŞ EKRANI EN AZ BİR SANİYE DURUYOR. Motor önbellekten gelince
// yükleme birkaç yüz milisaniye sürüyor ve ekran göz kırpması gibi
// geçip gidiyordu — "açılış ekranı yok" diye görünen şey buydu.
// performance.now() sayfanın açılışından beri geçen süre; bir saniyeye
// ne kaldıysa o kadar bekliyoruz, motor yavaş yüklendiyse hiç.
const ACILIS_EN_AZ = 1000;
function acilisKapat() {
  const y = $('#yukleniyor');
  y.classList.add('bitti');
  // Geçiş bitince gizle; geçiş hiç çalışmazsa (azaltılmış hareket,
  // arka plandaki sekme) transitionend gelmez, o yüzden yedek sayaç.
  let kapandi = false;
  const gizle = () => { if (!kapandi) { kapandi = true; y.hidden = true; } };
  y.addEventListener('transitionend', gizle, { once: true });
  setTimeout(gizle, 600);
}
setTimeout(acilisKapat, Math.max(0, ACILIS_EN_AZ - performance.now()));

// KAYIT SEÇİMDEN ÖNCE DENENİYOR: kayıt açılırsa meslek listesinin bir
// an bile görünmemesi gerekiyor. Sonra deneseydim oyuncu seçim
// ekranını görür, altından eski oyunu çıkardı.
if (!kaydiAc()) secimeDon();
