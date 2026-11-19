import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front ID0: Indonesian (id) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_ID:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'(dibuka di tab baru)',
 noEquivalent:(original:string)=>`— VIREO membuka ${original}. Situs itu sudah tidak ada dan tidak ada halaman yang setara, sehingga tidak ada tautan yang ditawarkan.`,
 websitesNote:'VIREO membuka halaman berikut di jendela browser baru. Di sini, halaman itu dibuka di tab baru hanya saat Anda mengeklik tautannya, dan tidak ada data yang dikirim. Dua alamat VIREO sudah tidak ada: 2MASS (xena.harvard.edu) membuka halaman 2MASS terkini dari IRSA (NASA/IPAC), dan NVO (www.us-vo.org) membuka halaman penerusnya, NAVO (NASA Astronomical Virtual Observatories), observatorium virtual astronomi NASA.',
 reminderLoading:'Memuat pengingat VIREO…',
 reminderError:'File pengingat VIREO (Reminder.obs) tidak dapat dimuat atau tidak sesuai dengan ukuran dan SHA-256 yang tercatat.',
 ok:'OK',cancel:'Batal',close:'Tutup',yes:'Ya',no:'Tidak',
 menuName:Object.freeze({main:'Menu Bantuan observatorium',radio:'Menu Bantuan teleskop radio'}),
 radioOff:'Menu Bantuan radio VIREO (Topik..., Tentang Praktikum Ini...) ada di panel kontrol teleskop radio, yang terbuka saat Anda menyalakan teleskop.',
 reminderErrorQuestion:'Sebagai gantinya, VIREO bertanya:',
 exitDone:'Anda telah menyelesaikan praktikum. Halaman web tidak dapat menutup dirinya sendiri: simpan pekerjaan Anda, lalu tutup tab browser ini kapan pun Anda siap.',
 siteAbout:'Tentang OpenVireo dan privasi',
 webTopics:'Topik bantuan…',
 tour:'Ikuti tur situs',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'Bantuan untuk kontrol teleskop','PHOTOHLP.LST':'Bantuan untuk fotometer','CAMHLP.LST':'Bantuan untuk kamera','SPECHLP.LST':'Bantuan untuk spektrometer',
  'CLASSHLP.LST':'Bantuan untuk klasifikasi spektrum','MEASHLP.LST':'Bantuan untuk pengukuran spektrum','HRANALHLP.LST':'Bantuan untuk diagram HR','VARTYPEHLP.LST':'Bantuan untuk jenis bintang variabel',
  'WDGPLTHLP.LST':'Bantuan untuk diagram kerucut','PLSANHLP.LST':'Bantuan untuk analisis pulsar','PLSLSHLP.LST':'Bantuan untuk parameter pulsar','MLTSPHLP.LST':'Bantuan untuk spektrometer multi-objek',
  'SPLSTHLP.LST':'Bantuan untuk daftar spektrum multi-objek',
 }),
 exitNote:'VIREO menampilkan pengingat ini saat Anda keluar dari observatorium selama praktikum (setelah Jalankan Praktikum (Run Exercise)); jika tidak, VIREO hanya menanyakan apakah Anda ingin keluar. OpenVireo tidak memiliki langkah Masuk (Log In) atau Jalankan Praktikum, sehingga observatorium selalu berupa praktikum yang sedang berlangsung. Di VIREO, OK atau Ya (Yes) menutup program; Batal (Cancel) atau Tidak (No) membiarkannya tetap terbuka.',
});
