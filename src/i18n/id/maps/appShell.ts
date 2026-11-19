import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front ID0: Indonesian (id) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_ID:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Tema warna',system:'Sistem',light:'Terang',dark:'Gelap'}),
 navGroups:Object.freeze({optical:'Observatorium optik',radio:'Observatorium radio',analysis:'Analisis',files:'File',guides:'Panduan praktikum'}),
 backupHelpSummary:'Isi cadangan',
 toolsMenu:'Menu',
 skipToContent:'Langsung ke konten',
 pageBar:Object.freeze({label:'Investigasi, bahasa, dan bantuan',more:'Tindakan',moreName:'Tindakan investigasi lainnya'}),
 recovery:Object.freeze({
  updatedTitle:'Versi baru OpenVireo telah dirilis',
  updated:'Bagian situs ini tidak dapat dimuat karena situs diperbarui saat halaman ini terbuka.',
  errorTitle:'Bagian OpenVireo ini berhenti karena terjadi kesalahan',
  error:'Memuat ulang halaman biasanya menyelesaikan masalah ini. Jika terjadi lagi, catat apa yang Anda lakukan sebelumnya.',
  kept:'Bagian situs lainnya dan pekerjaan Anda yang lain di tab ini masih ada.',
  saveFirst:'Simpan investigasi Anda terlebih dahulu, lalu muat ulang halaman untuk melanjutkan dengan versi terbaru.',
  saveHow:'Muat ulang halaman untuk melanjutkan. Pekerjaan yang sebelumnya Anda simpan dengan Simpan investigasi kemudian dapat dipulihkan dengan Pulihkan investigasi (JSON).',
  save:'Simpan investigasi',
  reload:'Muat ulang halaman',
 }),
});
