/** Front ES-SEO [W]: the languages of the static search pages, one row each (user decision 8 of 2026-11-09, AGENTS.md: a Spanish
 * home page /es/ and the Spanish lab pages /es/labs/, with hreflang and a Spanish preview image). src/seo/pages.ts renders every
 * page of every row, the hreflang alternates and the sitemap from this table, so a later language (PT-SEO: pt-BR under /pt-br/)
 * adds its lab texts (src/seo/labs.<dir>.ts), one row here, its path prefix in src/seo/labSlugs.ts and its preview image; no
 * renderer changes. English is first and is the x-default. Its home page is the app itself (index.html); every other language's
 * home is a static page under its prefix that links into the app with `?lang=<tag>` (that load only, never stored: the
 * precedence of docs/I18N.md is unchanged).
 *
 * Front PT-SEO: Brazilian Portuguese (pt-BR) under /pt-br/, added as data only (its row, its texts in src/seo/labs.pt-br.ts).
 * Front FR-REL+SEO: French (fr) under /fr/, the same way (its row, its texts in src/seo/labs.fr.ts).
 * Front ID-REL+SEO: Indonesian (id) under /id/, the same way (its row, its texts in src/seo/labs.id.ts).
 * Front HI-REL+SEO: Hindi (hi) under /hi/, the same way (its row, its texts in src/seo/labs.hi.ts).
 * Front JA-REL+SEO: Japanese (ja) under /ja/, the same way (its row, its texts in src/seo/labs.ja.ts).
 * Front RU-REL+SEO: Russian (ru) under /ru/, the same way (its row, its texts in src/seo/labs.ru.ts).
 *
 * Which languages exist here is independent of which are released in the app: a row is added by that language's SEO front,
 * after its release (src/seo/pages.test.ts checks each row's tag against src/i18n/languages.json). */
import {LABS,type LabText} from './labs.ts';
import {LAB_TEXT_ES} from './labs.es.ts';
import {LAB_TEXT_PT_BR} from './labs.pt-br.ts';
import {LAB_TEXT_FR} from './labs.fr.ts';
import {LAB_TEXT_ID} from './labs.id.ts';
import {LAB_TEXT_HI} from './labs.hi.ts';
import {LAB_TEXT_JA} from './labs.ja.ts';
import {LAB_TEXT_RU} from './labs.ru.ts';
import {SEO_PATH_PREFIX,type LabSlug} from './labSlugs.ts';
import {LANGUAGES,textDirection,type LanguageEntry,type TextDirection} from '../i18n/languages.ts';

export type SeoLab=LabText&{slug:LabSlug;exercise:string};

export type SeoLanguage=Readonly<{
 /** The UI language tag (src/i18n/languages.json), also the pages' <html lang> and the JSON-LD inLanguage. */
 tag:string;
 /** Its hreflang values. Google takes an ISO 639-1 language with an optional ISO 3166-1 alpha-2 region, so a UN M.49 region such
  * as es-419's is not one (ES-SEO review): Spanish is `es`, which also matches every `es-*` searcher, as the app opens Spanish for
  * any `es-*` browser. A language whose tag is valid there lists it first: Brazilian Portuguese is `pt-BR` and also `pt`, the
  * same URL, because the app opens pt-BR for every `pt` and `pt-*` browser (pt-PT, pt-AO, pt-MZ…), so a Portuguese searcher
  * outside Brazil is sent to the Portuguese page rather than to the English x-default. French is `fr` alone (one neutral French
  * that every `fr-*` browser opens, AGENTS.md 2026-11-11), which every French searcher matches. Indonesian is `id` alone (one
  * standard Indonesian that every `id-*` browser opens, and the withdrawn `in`/`in-*` too, AGENTS.md 2026-11-19), which every
  * Indonesian searcher matches; Malay (`ms`) is another language and stays on the English x-default. Hindi is `hi`
  * alone (the app opens Hindi for every `hi` and `hi-*` browser, AGENTS.md 2026-11-19), which every Hindi searcher matches.
  * Japanese is `ja` alone, the same way (one Japanese that every `ja-*` browser opens, AGENTS.md 2026-11-19). Russian is `ru`
  * alone (one Russian that every `ru-*` browser opens, AGENTS.md 2026-11-19); Ukrainian, Belarusian and Kazakh searchers keep the
  * English x-default, as those browsers keep English. */
 hreflang:readonly string[];
 /** Open Graph locale (language_TERRITORY): en_US, es_LA, pt_BR, fr_FR, id_ID, hi_IN, ja_JP, ru_RU (Open Graph needs a territory;
  * hreflang stays `fr`, `id`, `hi`, `ja`, `ru`). */
 ogLocale:string;
 /** Path prefix of its pages: '' for English, SEO_PATH_PREFIX for the others. */
 prefix:string;
 /** The address that opens the app in this language. */
 app:string;
 /** Link-preview image (1200×630, rendered by scripts/render-og-image.mjs from ogImageText) and its description. */
 ogImage:string;
 ogImageAlt:string;
 ogImageText:Readonly<{title:string;lines:readonly string[]}>;
 labs:readonly SeoLab[];
 ui:Readonly<{
  /** The language's own name, for the links to it from the other languages' pages. */
  languageName:string;
  siteNav:string;breadcrumb:string;labsCrumb:string;allLabs:string;openObservatory:string;
  labEyebrow:string;openLab:string;openLabNote:(slug:LabSlug)=>string;
  whatYouDo:string;whatYouLearn:string;otherLabs:string;
  about:string;platform:string;
  learningResourceType:string;educationalLevel:readonly string[];
 }>;
 labsIndex:Readonly<{title:string;description:string;eyebrow:string;heading:string;lead:string;listName:string}>;
 /** Front LAUNCH-3: its block of the shared 404 page (src/seo/pages.ts notFoundPage): a short word for the <title>, the heading
  * and the sentence. The links reuse ui.openObservatory and ui.allLabs. */
 notFound:Readonly<{title:string;heading:string;text:string}>;
 /** Its static home page, or null when the home page is the app (English: index.html, src/i18n/html.ts). */
 home:Readonly<{title:string;description:string;operatingSystem:string;eyebrow:string;heading:string;lead:string;note:string;labsHeading:string;howHeading:string;how:readonly string[]}>|null;
}>;

const merge=(texts:Readonly<Record<LabSlug,LabText>>):readonly SeoLab[]=>Object.freeze(LABS.map(l=>({...texts[l.slug],slug:l.slug,exercise:l.exercise})));
const GUIDE=Object.fromEntries(LABS.map(l=>[l.slug,l.guide])) as Record<LabSlug,string>;

const EN:SeoLanguage={
 tag:'en',hreflang:['en'],ogLocale:'en_US',prefix:SEO_PATH_PREFIX.en,app:'/',
 ogImage:'/og-image.png',ogImageAlt:'OpenVireo: CLEA VIREO astronomy labs in your browser',
 // The text of public/og-image.png (Front SEO, rendered before the script existed; the script reproduces its design).
 ogImageText:{title:'CLEA VIREO astronomy labs in your browser',lines:["Hubble's law · Pulsars · Pleiades · Object X · and more.",'An unofficial, free web reconstruction. Nothing to install.']},
 labs:LABS,
 ui:{languageName:'English',siteNav:'Site',breadcrumb:'Breadcrumb',labsCrumb:'Labs',allLabs:'All labs',openObservatory:'Open the observatory',
  labEyebrow:'Lab based on a CLEA VIREO exercise',openLab:'Open the lab',openLabNote:slug=>`Opens the observatory with the ${GUIDE[slug]}. Free, no sign-up.`,
  whatYouDo:'What you do',whatYouLearn:'What you learn',otherLabs:'Other labs',
  about:'OpenVireo is a free, non-commercial web reconstruction of VIREO, the Virtual Educational Observatory of Project CLEA '+
   '(Gettysburg College, supported by the National Science Foundation and Gettysburg College). It is based on the original '+
   "program's recovered behaviour and uses the original data files with credit. It is not the original program and is not "+
   'affiliated with Project CLEA. The app labels its known web adaptations.',
  platform:'Runs in a modern web browser on Windows, Mac, Linux or Chromebook. Nothing to install, no account.',
  learningResourceType:'Interactive lab',educationalLevel:['High school','Undergraduate']},
 labsIndex:{title:'Astronomy simulation labs online (CLEA VIREO) · OpenVireo',
  description:"Seven CLEA VIREO astronomy simulations rebuilt for the browser: Hubble's law, large-scale structure, stellar spectra, Pleiades, HR diagrams, pulsars, Object X.",
  eyebrow:'CLEA VIREO labs',heading:'Astronomy labs in your browser',
  lead:"Each lab is an astronomy simulation that follows one of the student exercises of VIREO, Project CLEA's virtual observatory. You observe with virtual telescopes and instruments, measure your own data and draw your own conclusions.",
  listName:'CLEA VIREO labs'},
 notFound:{title:'Not found',heading:'Page not found',text:'This address is not part of OpenVireo.'},
 home:null,
};

const ES:SeoLanguage={
 tag:'es-419',hreflang:['es'],ogLocale:'es_LA',prefix:SEO_PATH_PREFIX['es-419'],app:'/?lang=es-419',
 ogImage:'/og-image-es.png',ogImageAlt:'OpenVireo: prácticas de astronomía de CLEA VIREO en tu navegador, en español',
 ogImageText:{title:'Prácticas de astronomía CLEA VIREO en tu navegador',lines:['Ley de Hubble · Púlsares · Pléyades · Objeto X · y más.','Reconstrucción web gratuita y no oficial, en español. Nada que instalar.']},
 labs:merge(LAB_TEXT_ES),
 ui:{languageName:'Español',siteNav:'Sitio',breadcrumb:'Ruta de navegación',labsCrumb:'Prácticas',allLabs:'Todas las prácticas',openObservatory:'Abrir el observatorio',
  labEyebrow:'Práctica basada en un ejercicio de CLEA VIREO',openLab:'Abrir la práctica',
  openLabNote:()=>'Abre el observatorio en español con la guía de esta práctica. Gratis y sin registro.',
  whatYouDo:'Qué haces',whatYouLearn:'Qué aprendes',otherLabs:'Otras prácticas',
  about:'OpenVireo es una reconstrucción web gratuita y sin fines comerciales de VIREO, el observatorio educativo virtual '+
   '(Virtual Educational Observatory) de Project CLEA (Gettysburg College, con el apoyo de la National Science Foundation y del '+
   'Gettysburg College). Se basa en el comportamiento recuperado del programa original y usa sus archivos de datos originales, '+
   'con su crédito. No es el programa original ni está afiliado a Project CLEA. La aplicación señala sus adaptaciones web '+
   'conocidas. Este texto en español es una adaptación web hecha por OpenVireo, no un texto de CLEA.',
  platform:'Funciona en un navegador web actual en Windows, Mac, Linux o Chromebook. No hay nada que instalar ni necesitas una cuenta.',
  learningResourceType:'Práctica interactiva',educationalLevel:['Educación secundaria','Universidad']},
 labsIndex:{title:'Prácticas de astronomía de CLEA VIREO en línea · OpenVireo',
  description:'Prácticas CLEA VIREO reconstruidas en el navegador: ley de Hubble, estructura a gran escala, espectros, Pléyades, diagramas H-R de cúmulos, púlsares y Objeto X.',
  eyebrow:'Prácticas de CLEA VIREO',heading:'Prácticas de astronomía en tu navegador',
  lead:'Cada práctica es una simulación de astronomía que sigue uno de los ejercicios para estudiantes de VIREO, el observatorio virtual de Project CLEA. Observas con telescopios e instrumentos virtuales, mides tus propios datos y sacas tus propias conclusiones.',
  listName:'Prácticas de CLEA VIREO'},
 notFound:{title:'No encontrada',heading:'Página no encontrada',text:'Esta dirección no forma parte de OpenVireo.'},
 home:{title:'OpenVireo: prácticas de astronomía de CLEA VIREO en español',
  description:'Reconstrucción web gratuita y no oficial del observatorio virtual VIREO de Project CLEA, en español: ley de Hubble, púlsares, Pléyades, Objeto X y más.',
  operatingSystem:'Cualquiera (funciona en un navegador web)',
  eyebrow:'Observatorio virtual en español',heading:'Prácticas de astronomía de CLEA VIREO, en tu navegador',
  lead:'OpenVireo reconstruye para la web VIREO, el observatorio virtual de Project CLEA. Apuntas telescopios virtuales, tomas espectros, mides el brillo de las estrellas y registras púlsares, y con tus propios datos llegas a tus conclusiones.',
  note:'Gratis, sin registro y sin nada que instalar.',
  labsHeading:'Las siete prácticas',howHeading:'Cómo funciona',
  how:['Todo ocurre en tu navegador: no hay nada que instalar ni necesitas una cuenta.',
   // Front HOME: the facts of the app's welcome (home.factInstall, home.factFaithful).
   'No necesitas Windows ni una máquina virtual: funciona en un navegador actual en Mac, Windows, Linux o una Chromebook.',
   'Sigue el comportamiento recuperado del programa original y señala sus adaptaciones web. Es una reconstrucción no oficial.',
   'Guardas tus investigaciones como archivos en tu propia computadora y las vuelves a cargar cuando quieras.',
   'La interfaz, las guías y la ayuda están en español. Los archivos que escribe el sitio (TXT, FITS, CSV e investigaciones guardadas) quedan en inglés, en el formato de VIREO o de OpenVireo.',
   'Puedes cambiar a inglés cuando quieras con el selector de idioma del menú.']},
};

const PT_BR:SeoLanguage={
 tag:'pt-BR',hreflang:['pt-BR','pt'],ogLocale:'pt_BR',prefix:SEO_PATH_PREFIX['pt-BR'],app:'/?lang=pt-BR',
 ogImage:'/og-image-pt-br.png',ogImageAlt:'OpenVireo: práticas de astronomia do CLEA VIREO no seu navegador, em português',
 ogImageText:{title:'Práticas de astronomia CLEA VIREO no seu navegador',lines:['Lei de Hubble · Pulsares · Plêiades · Objeto X · e mais.','Reconstrução web gratuita e não oficial, em português. Nada a instalar.']},
 labs:merge(LAB_TEXT_PT_BR),
 ui:{languageName:'Português (Brasil)',siteNav:'Site',breadcrumb:'Trilha de navegação',labsCrumb:'Práticas',allLabs:'Todas as práticas',openObservatory:'Abrir o observatório',
  labEyebrow:'Prática baseada em um exercício do CLEA VIREO',openLab:'Abrir a prática',
  openLabNote:()=>'Abre o observatório em português com o guia desta prática. Gratuito e sem cadastro.',
  whatYouDo:'O que você faz',whatYouLearn:'O que você aprende',otherLabs:'Outras práticas',
  about:'O OpenVireo é uma reconstrução web gratuita e sem fins comerciais do VIREO, o observatório educacional virtual '+
   '(Virtual Educational Observatory) do Project CLEA (Gettysburg College, com o apoio da National Science Foundation e do '+
   'Gettysburg College). Ele se baseia no comportamento recuperado do programa original e usa os arquivos de dados originais, '+
   'com o devido crédito. Não é o programa original nem tem vínculo com o Project CLEA. O aplicativo indica as suas adaptações web '+
   'conhecidas. Este texto em português é uma adaptação web feita pelo OpenVireo, não um texto do CLEA.',
  platform:'Funciona em um navegador web atual no Windows, Mac, Linux ou Chromebook. Não há nada a instalar e você não precisa de uma conta.',
  learningResourceType:'Prática interativa',educationalLevel:['Ensino médio','Ensino superior']},
 labsIndex:{title:'Práticas de astronomia do CLEA VIREO on-line · OpenVireo',
  description:'Práticas do CLEA VIREO recriadas no navegador: lei de Hubble, estrutura em grande escala, espectros, Plêiades, diagramas HR de aglomerados, pulsares e Objeto X.',
  eyebrow:'Práticas do CLEA VIREO',heading:'Práticas de astronomia no seu navegador',
  lead:'Cada prática é uma simulação de astronomia que segue um dos exercícios para estudantes do VIREO, o observatório virtual do Project CLEA. Você observa com telescópios e instrumentos virtuais, mede os seus próprios dados e tira as suas próprias conclusões.',
  listName:'Práticas do CLEA VIREO'},
 notFound:{title:'Não encontrada',heading:'Página não encontrada',text:'Este endereço não faz parte do OpenVireo.'},
 home:{title:'OpenVireo: práticas de astronomia do CLEA VIREO em português',
  description:'Reconstrução web gratuita e não oficial do observatório virtual VIREO do Project CLEA, em português: lei de Hubble, pulsares, Plêiades, Objeto X e mais.',
  operatingSystem:'Qualquer um (funciona em um navegador web)',
  eyebrow:'Observatório virtual em português',heading:'Práticas de astronomia do CLEA VIREO no seu navegador',
  lead:'O OpenVireo reconstrói para a web o VIREO, o observatório virtual do Project CLEA. Você aponta telescópios virtuais, obtém espectros, mede o brilho das estrelas e registra pulsares, e com os seus próprios dados chega às suas conclusões.',
  note:'Gratuito, sem cadastro e sem nada a instalar.',
  labsHeading:'As sete práticas',howHeading:'Como funciona',
  how:['Tudo acontece no seu navegador: não há nada a instalar e você não precisa de uma conta.',
   // Front HOME: the facts of the app's welcome (home.factInstall, home.factFaithful), as on /es/.
   'Você não precisa de Windows nem de máquina virtual: funciona em um navegador moderno no Mac, Windows, Linux ou Chromebook.',
   'Segue o comportamento recuperado do programa original e sinaliza suas adaptações para a web. É uma reconstrução não oficial.',
   'Você salva as suas investigações como arquivos no seu próprio computador e as carrega de novo quando quiser.',
   'A interface, os guias e a ajuda estão em português. Os arquivos que o site grava (TXT, FITS, CSV e investigações salvas) ficam em inglês, no formato do VIREO ou do OpenVireo.',
   'Na tela, os números usam ponto decimal, como os arquivos do VIREO, e separam os milhares com um espaço fino (24\u202f000).',
   'Você pode mudar para o inglês quando quiser com o seletor de idioma do menu.']},
};

const FR:SeoLanguage={
 tag:'fr',hreflang:['fr'],ogLocale:'fr_FR',prefix:SEO_PATH_PREFIX.fr,app:'/?lang=fr',
 ogImage:'/og-image-fr.png',ogImageAlt:'OpenVireo : TP d’astronomie de CLEA VIREO dans votre navigateur, en français',
 ogImageText:{title:'TP d’astronomie CLEA VIREO dans votre navigateur',lines:['Loi de Hubble · Pulsars · Pléiades · Objet X · et plus encore.','Reconstruction web gratuite et non officielle. Rien à installer.']},
 labs:merge(LAB_TEXT_FR),
 ui:{languageName:'Français',siteNav:'Site',breadcrumb:'Fil d’Ariane',labsCrumb:'TP',allLabs:'Tous les TP',openObservatory:'Ouvrir l’observatoire',
  labEyebrow:'TP fondé sur un exercice de CLEA VIREO',openLab:'Ouvrir le TP',
  openLabNote:()=>'Ouvre l’observatoire en français avec le guide de ce TP. Gratuit et sans inscription.',
  whatYouDo:'Ce que vous faites',whatYouLearn:'Ce que vous apprenez',otherLabs:'Autres TP',
  about:'OpenVireo est une reconstruction web gratuite et non commerciale de VIREO, l’observatoire éducatif virtuel '+
   '(Virtual Educational Observatory) du Project CLEA, au Gettysburg College, soutenu par la NSF (National Science Foundation) et par le '+
   'Gettysburg College. Il s’appuie sur le comportement retrouvé du programme d’origine et utilise les fichiers de données '+
   'd’origine, avec mention de leur source. Ce n’est pas le programme d’origine et il n’est pas affilié au Project CLEA. '+
   'L’application signale ses adaptations web connues. Ce texte en français est une adaptation web d’OpenVireo, pas un texte du CLEA.',
  platform:'Fonctionne dans un navigateur web récent sous Windows, Mac, Linux ou Chromebook. Rien à installer, aucun compte nécessaire.',
  learningResourceType:'TP interactif',educationalLevel:['Lycée','Enseignement supérieur']},
 labsIndex:{title:'TP d’astronomie CLEA VIREO en ligne · OpenVireo',
  description:'Sept TP de CLEA VIREO reconstruits pour le navigateur : loi de Hubble, structure à grande échelle, spectres, Pléiades, diagrammes HR d’amas, pulsars, Objet X.',
  eyebrow:'TP de CLEA VIREO',heading:'Des TP d’astronomie dans votre navigateur',
  lead:'Chaque TP est une simulation d’astronomie qui suit l’un des exercices pour étudiants de VIREO, l’observatoire virtuel du Project CLEA. Vous observez avec des télescopes et des instruments virtuels, vous mesurez vos propres données et vous tirez vos propres conclusions.',
  listName:'TP de CLEA VIREO'},
 notFound:{title:'Introuvable',heading:'Page introuvable',text:'Cette adresse ne fait pas partie d’OpenVireo.'},
 home:{title:'OpenVireo : TP d’astronomie de CLEA VIREO en français',
  description:'Reconstruction web gratuite et non officielle de l’observatoire virtuel VIREO du Project CLEA, en français : loi de Hubble, pulsars, Pléiades, Objet X et plus.',
  operatingSystem:'Tous (fonctionne dans un navigateur web)',
  eyebrow:'Observatoire virtuel en français',heading:'Les TP d’astronomie de CLEA VIREO, dans votre navigateur',
  lead:'OpenVireo reconstruit pour le web VIREO, l’observatoire virtuel du Project CLEA. Vous pointez des télescopes virtuels, obtenez des spectres, mesurez l’éclat des étoiles et captez des pulsars, puis vous tirez vos propres conclusions de vos propres données.',
  note:'Gratuit, sans inscription et sans rien à installer.',
  labsHeading:'Les sept TP',howHeading:'Comment ça marche',
  how:['Tout se passe dans votre navigateur : rien à installer, aucun compte nécessaire.',
   // Front HOME: the facts of the app's welcome (home.factInstall, home.factFaithful), as on /es/ and /pt-br/.
   'Pas besoin de Windows ni de machine virtuelle : il fonctionne dans un navigateur récent sur Mac, Windows, Linux ou Chromebook.',
   'Il suit le comportement retrouvé du programme d’origine et signale ses adaptations web. C’est une reconstruction non officielle.',
   'Vous enregistrez vos investigations dans des fichiers sur votre propre ordinateur et vous les rechargez quand vous le souhaitez.',
   'L’interface, les guides et l’aide sont en français. Les fichiers que le site écrit (TXT, FITS, CSV et investigations enregistrées) restent en anglais, au format de VIREO ou d’OpenVireo.',
   'À l’écran, les nombres utilisent le point décimal, comme les fichiers de VIREO, et séparent les milliers par une espace fine (24 000).',
   'Vous pouvez passer à l’anglais à tout moment avec le sélecteur de langue en haut de la page.']},
};

const ID:SeoLanguage={
 tag:'id',hreflang:['id'],ogLocale:'id_ID',prefix:SEO_PATH_PREFIX.id,app:'/?lang=id',
 ogImage:'/og-image-id.png',ogImageAlt:'OpenVireo: praktikum astronomi CLEA VIREO di browser Anda, dalam bahasa Indonesia',
 ogImageText:{title:'Praktikum astronomi CLEA\u00a0VIREO di browser Anda',lines:['Hukum Hubble · Pulsar · Pleiades · Objek X · dan lainnya.','Rekonstruksi web gratis dan tidak resmi. Tanpa instalasi.']},
 labs:merge(LAB_TEXT_ID),
 ui:{languageName:'Bahasa Indonesia',siteNav:'Situs',breadcrumb:'Jejak navigasi',labsCrumb:'Praktikum',allLabs:'Semua praktikum',openObservatory:'Buka observatorium',
  labEyebrow:'Praktikum berdasarkan latihan CLEA VIREO',openLab:'Buka praktikum',
  openLabNote:()=>'Membuka observatorium dalam bahasa Indonesia dengan panduan praktikum ini. Gratis, tanpa pendaftaran.',
  whatYouDo:'Yang Anda lakukan',whatYouLearn:'Yang Anda pelajari',otherLabs:'Praktikum lainnya',
  about:'OpenVireo adalah rekonstruksi web gratis dan nonkomersial dari VIREO, observatorium pendidikan virtual (Virtual Educational '+
   'Observatory) milik Project CLEA di Gettysburg College. Project CLEA didukung oleh NSF (National Science Foundation) dan Gettysburg College. '+
   'OpenVireo didasarkan pada perilaku program asli yang berhasil dipulihkan dan memakai file data asli dengan mencantumkan sumbernya. '+
   'OpenVireo bukan program asli dan tidak berafiliasi dengan Project CLEA. Aplikasi ini menandai adaptasi webnya yang sudah diketahui. '+
   'Teks berbahasa Indonesia ini adalah adaptasi web OpenVireo, bukan teks CLEA.',
  platform:'Berjalan di browser web modern pada Windows, Mac, Linux, atau Chromebook. Tidak perlu memasang apa pun dan tidak perlu akun.',
  learningResourceType:'Praktikum interaktif',educationalLevel:['Sekolah menengah atas','Perguruan tinggi']},
 labsIndex:{title:'Praktikum astronomi CLEA VIREO online · OpenVireo',
  description:'Tujuh praktikum CLEA VIREO yang dibangun ulang untuk browser: hukum Hubble, struktur skala besar, spektrum bintang, Pleiades, diagram HR gugus, pulsar, Objek X.',
  eyebrow:'Praktikum CLEA VIREO',heading:'Praktikum astronomi di browser Anda',
  lead:'Setiap praktikum adalah simulasi astronomi yang mengikuti salah satu latihan siswa VIREO, observatorium virtual milik Project CLEA. Anda mengamati dengan teleskop dan instrumen virtual, mengukur data Anda sendiri, dan menarik kesimpulan Anda sendiri.',
  listName:'Praktikum CLEA VIREO'},
 notFound:{title:'Tidak ditemukan',heading:'Halaman tidak ditemukan',text:'Alamat ini bukan bagian dari OpenVireo.'},
 home:{title:'OpenVireo: praktikum astronomi CLEA VIREO dalam bahasa Indonesia',
  description:'Rekonstruksi web gratis dan tidak resmi dari observatorium virtual VIREO milik Project CLEA: hukum Hubble, pulsar, Pleiades, Objek X, dan lainnya.',
  operatingSystem:'Apa saja (berjalan di browser web)',
  eyebrow:'Observatorium virtual dalam bahasa Indonesia',heading:'Praktikum astronomi CLEA VIREO di browser Anda',
  lead:'OpenVireo membangun ulang VIREO, observatorium virtual milik Project CLEA, untuk web. Anda mengarahkan teleskop virtual, mengambil spektrum, mengukur kecerahan bintang, dan merekam sinyal pulsar, lalu menarik kesimpulan sendiri dari data Anda sendiri.',
  note:'Gratis, tanpa pendaftaran, dan tanpa perlu memasang apa pun.',
  labsHeading:'Tujuh praktikum',howHeading:'Cara kerja',
  how:['Semuanya berlangsung di browser Anda: tidak perlu memasang apa pun dan tidak perlu akun.',
   // Front HOME: the facts of the app's welcome (home.factInstall, home.factFaithful), as on /es/, /pt-br/ and /fr/.
   'Anda tidak memerlukan Windows atau mesin virtual: OpenVireo berjalan di browser modern pada Mac, Windows, Linux, atau Chromebook.',
   'OpenVireo mengikuti perilaku program asli yang berhasil dipulihkan dan menandai adaptasi webnya. Ini adalah rekonstruksi tidak resmi.',
   'Anda menyimpan investigasi sebagai file di komputer Anda sendiri dan dapat memuatnya kembali kapan saja.',
   'Antarmuka, panduan, dan bantuan tersedia dalam bahasa Indonesia. File yang ditulis situs (TXT, FITS, CSV, dan investigasi tersimpan) tetap dalam bahasa Inggris, dalam format VIREO atau OpenVireo.',
   'Di layar, angka memakai titik desimal, seperti file VIREO, dan memisahkan ribuan dengan spasi tipis (24 000).',
   'Anda dapat beralih ke bahasa Inggris kapan saja dengan pemilih bahasa di bagian atas halaman.']},
};

const HI:SeoLanguage={
 tag:'hi',hreflang:['hi'],ogLocale:'hi_IN',prefix:SEO_PATH_PREFIX.hi,app:'/?lang=hi',
 ogImage:'/og-image-hi.png',ogImageAlt:'OpenVireo: आपके ब्राउज़र में CLEA VIREO के खगोल विज्ञान प्रयोग, हिन्दी में',
 ogImageText:{title:'आपके ब्राउज़र में CLEA VIREO खगोल प्रयोग',lines:['हबल का नियम · पल्सर · कृत्तिका · ऑब्जेक्ट X · और अन्य।','मुफ़्त, गैर-आधिकारिक वेब पुनर्निर्माण, बिना कुछ इंस्टॉल किए।']},
 labs:merge(LAB_TEXT_HI),
 ui:{languageName:'हिन्दी',siteNav:'साइट',breadcrumb:'नेविगेशन पथ',labsCrumb:'प्रयोग',allLabs:'सभी प्रयोग',openObservatory:'वेधशाला खोलें',
  labEyebrow:'CLEA VIREO के एक प्रयोग पर आधारित',openLab:'प्रयोग खोलें',
  openLabNote:()=>'इस प्रयोग के गाइड के साथ वेधशाला को हिन्दी में खोलता है। मुफ़्त, बिना पंजीकरण के।',
  whatYouDo:'क्या करना है',whatYouLearn:'क्या सीखने को मिलेगा',otherLabs:'अन्य प्रयोग',
  about:'OpenVireo, Project CLEA की आभासी शैक्षिक वेधशाला (Virtual Educational Observatory) VIREO का मुफ़्त और गैर-व्यावसायिक '+
   'वेब पुनर्निर्माण है। Project CLEA, Gettysburg College की परियोजना है और उसे National Science Foundation और Gettysburg College का '+
   'सहयोग मिला। यह मूल प्रोग्राम के पुनर्प्राप्त व्यवहार पर आधारित है और मूल डेटा फ़ाइलों का श्रेय के साथ उपयोग करता है। '+
   'यह मूल प्रोग्राम नहीं है और Project CLEA से संबद्ध नहीं है। ऐप अपने ज्ञात वेब अनुकूलनों को चिह्नित करता है। '+
   'यह हिन्दी पाठ OpenVireo का वेब अनुकूलन है, CLEA का पाठ नहीं।',
  platform:'Windows, Mac, Linux या Chromebook पर किसी आधुनिक वेब ब्राउज़र में चलता है। कुछ इंस्टॉल करने की ज़रूरत नहीं, कोई खाता नहीं।',
  learningResourceType:'इंटरैक्टिव प्रयोग',educationalLevel:['हाई स्कूल','स्नातक स्तर']},
 labsIndex:{title:'CLEA VIREO के ऑनलाइन खगोल विज्ञान प्रयोग · OpenVireo',
  description:'ब्राउज़र के लिए फिर से बने सात CLEA VIREO प्रयोग: हबल का नियम, बृहत् पैमाने की संरचना, तारकीय स्पेक्ट्रम, कृत्तिका, तारागुच्छों के H-R आरेख, पल्सर, ऑब्जेक्ट X।',
  eyebrow:'CLEA VIREO के प्रयोग',heading:'आपके ब्राउज़र में खगोल विज्ञान प्रयोग',
  lead:'हर प्रयोग एक खगोल विज्ञान सिमुलेशन है, जो Project CLEA की आभासी वेधशाला VIREO के किसी एक विद्यार्थी प्रयोग पर आधारित है। आभासी दूरबीनों और उपकरणों से प्रेक्षण करें, अपना डेटा खुद मापें और अपने निष्कर्ष खुद निकालें।',
  listName:'CLEA VIREO के प्रयोग'},
 notFound:{title:'नहीं मिला',heading:'पेज नहीं मिला',text:'यह पता OpenVireo का हिस्सा नहीं है।'},
 home:{title:'OpenVireo: CLEA VIREO के खगोल विज्ञान प्रयोग, हिन्दी में',
  description:'मुफ़्त और गैर-आधिकारिक वेब पुनर्निर्माण: Project CLEA की आभासी वेधशाला VIREO, हिन्दी में। हबल का नियम, पल्सर, कृत्तिका, ऑब्जेक्ट X और भी बहुत कुछ।',
  operatingSystem:'कोई भी (वेब ब्राउज़र में चलता है)',
  eyebrow:'हिन्दी में आभासी वेधशाला',heading:'CLEA VIREO के खगोल विज्ञान प्रयोग, आपके ब्राउज़र में',
  lead:'OpenVireo, Project CLEA की आभासी वेधशाला VIREO को वेब के लिए फिर से बनाता है। आभासी दूरबीनों को लक्ष्य की ओर घुमाएँ, स्पेक्ट्रम लें, तारों की चमक मापें और पल्सरों के सिग्नल रिकॉर्ड करें, फिर अपने ही डेटा से अपने निष्कर्ष तक पहुँचें।',
  note:'मुफ़्त, बिना पंजीकरण के और बिना कुछ इंस्टॉल किए।',
  labsHeading:'सात प्रयोग',howHeading:'यह कैसे काम करता है',
  how:['सब कुछ आपके ब्राउज़र में होता है: कुछ इंस्टॉल करने की ज़रूरत नहीं, कोई खाता नहीं।',
   // Front HOME: the facts of the app welcome (home.factInstall, home.factFaithful), as on /es/, /pt-br/ and /fr/.
   'Windows या वर्चुअल मशीन की ज़रूरत नहीं: यह Mac, Windows, Linux या Chromebook पर किसी आधुनिक ब्राउज़र में चलता है।',
   'यह मूल प्रोग्राम के पुनर्प्राप्त व्यवहार का अनुसरण करता है और अपने वेब अनुकूलनों को साफ़ बताता है। यह एक गैर-आधिकारिक पुनर्निर्माण है।',
   'अपनी जाँचें अपने ही कंप्यूटर पर फ़ाइलों के रूप में सहेजें और जब चाहें उन्हें फिर से लोड करें।',
   'इंटरफ़ेस, गाइड और सहायता हिन्दी में हैं। साइट जो फ़ाइलें लिखती है (TXT, FITS, CSV और सहेजी गई जाँचें), वे अंग्रेज़ी में और VIREO या OpenVireo के फ़ॉर्मेट में रहती हैं।',
   'स्क्रीन पर संख्याएँ VIREO की फ़ाइलों की तरह दशमलव बिंदु का उपयोग करती हैं, और अंग्रेज़ी की तरह हर तीन अंकों के समूह को अल्पविराम से अलग करती हैं।',
   'पेज के ऊपर दिए भाषा चयनकर्ता से कभी भी अंग्रेज़ी पर जाया जा सकता है।']},
};

const JA:SeoLanguage={
 tag:'ja',hreflang:['ja'],ogLocale:'ja_JP',prefix:SEO_PATH_PREFIX.ja,app:'/?lang=ja',
 ogImage:'/og-image-ja.png',ogImageAlt:'OpenVireo：ブラウザーで使えるCLEA VIREOの天文実習（日本語）',
 ogImageText:{title:'CLEA VIREOの天文実習をブラウザーで',lines:['ハッブルの法則 · パルサー · プレアデス星団 · 天体X · ほか','無料の非公式なWeb版です。インストールは不要です。']},
 labs:merge(LAB_TEXT_JA),
 ui:{languageName:'日本語',siteNav:'サイト',breadcrumb:'パンくずリスト',labsCrumb:'実習',allLabs:'すべての実習',openObservatory:'天文台を開く',
  labEyebrow:'CLEA VIREOの実習課題に基づく実習',openLab:'実習を開く',
  openLabNote:()=>'この実習のガイドを表示して、天文台を日本語で開きます。無料で、登録は不要です。',
  whatYouDo:'実習の流れ',whatYouLearn:'学べること',otherLabs:'ほかの実習',
  // The sentences the tests require: the adaptation and not-the-original sentences, and the names of CLEA and its supporters.
  about:'OpenVireoは、Project CLEAの仮想教育天文台（Virtual Educational Observatory）であるVIREOを、無料かつ非営利で再構築したWeb版です。'+
   'Project CLEAはGettysburg Collegeのプロジェクトで、National Science FoundationとGettysburg Collegeの支援を受けています。'+
   '元のプログラムの復元された動作に基づき、元のデータファイルを出典を明記して使っています。'+
   '元のプログラムではなく、Project CLEAと提携しているものでもありません。アプリは、把握しているWeb版の調整を明示しています。'+
   'この日本語の文章は、OpenVireoがWeb向けに翻案したもので、CLEAの文章ではありません。',
  platform:'Windows、Mac、Linux、Chromebookの最新のWebブラウザーで動作します。インストールもアカウントも不要です。',
  learningResourceType:'インタラクティブな実習',educationalLevel:['高校','大学']},
 labsIndex:{title:'CLEA VIREOの天文実習をオンラインで · OpenVireo',
  description:'ハッブルの法則、大規模構造、恒星のスペクトル、プレアデス星団、星団のHR図、パルサー、天体Xの7つのCLEA VIREO実習を、ブラウザー向けに再構築しました。',
  eyebrow:'CLEA VIREOの実習',heading:'ブラウザーで取り組む天文実習',
  lead:'各実習は、Project CLEAの仮想天文台VIREOの実習課題の1つに沿った天文シミュレーションです。仮想の望遠鏡と観測装置で観測し、自分でデータを測って、自分で結論を出します。',
  listName:'CLEA VIREOの実習'},
 notFound:{title:'見つかりません',heading:'ページが見つかりません',text:'このアドレスはOpenVireoのサイトにはありません。'},
 home:{title:'OpenVireo: CLEA VIREOの天文実習を日本語で',
  description:'無料の非公式なWeb版として再構築した、Project CLEAの仮想天文台VIREOの日本語版です。ハッブルの法則、パルサー、プレアデス星団、天体Xなどの実習があります。',
  operatingSystem:'すべて（Webブラウザーで動作）',
  eyebrow:'日本語で使える仮想天文台',heading:'CLEA VIREOの天文実習を、ブラウザーで',
  lead:'OpenVireoは、Project CLEAの仮想天文台VIREOをWeb向けに再構築したものです。仮想の望遠鏡を天体に向け、スペクトルを取得し、星の明るさを測り、パルサーを記録して、自分のデータから自分で結論を導きます。',
  note:'無料で、登録もインストールも不要です。',
  labsHeading:'7つの実習',howHeading:'仕組み',
  how:['すべてブラウザーの中で動きます。インストールもアカウントも不要です。',
   // Front HOME: the facts of the app's welcome (home.factInstall, home.factFaithful), as on /es/, /pt-br/ and /fr/.
   'Windowsや仮想マシンは必要ありません。Mac、Windows、Linux、Chromebookの最新のブラウザーで動作します。',
   '元のプログラムの復元された動作に従い、Web版の調整を明示しています。非公式の再構築です。',
   '調査は自分のコンピューターにファイルとして保存し、いつでも読み込み直せます。',
   'インターフェース、ガイド、ヘルプは日本語です。サイトが書き出すファイル（TXT、FITS、CSV、保存した調査）は、VIREOまたはOpenVireoの形式のまま英語で残ります。',
   // Japanese writes «24,000» and «1.5» as English does (no thousands setting, AGENTS.md 2026-11-19): only the decimal point and half-width digits are said.
   '画面と入力では小数点に「.」を使い、数字は半角で入力します。',
   '上部の言語セレクターで、いつでも英語に切り替えられます。']},
};

const RU:SeoLanguage={
 tag:'ru',hreflang:['ru'],ogLocale:'ru_RU',prefix:SEO_PATH_PREFIX.ru,app:'/?lang=ru',
 ogImage:'/og-image-ru.png',ogImageAlt:'OpenVireo: астрономические работы CLEA VIREO в вашем браузере, на русском языке',
 ogImageText:{title:'Работы по астрономии CLEA\u00a0VIREO в\u00a0браузере',lines:['Закон Хаббла · Пульсары · Плеяды · Объект X · и не только.','Бесплатная неофициальная веб-реконструкция. Без установки.']},
 labs:merge(LAB_TEXT_RU),
 ui:{languageName:'Русский',siteNav:'Сайт',breadcrumb:'Навигационная цепочка',labsCrumb:'Лабораторные работы',allLabs:'Все лабораторные работы',openObservatory:'Открыть обсерваторию',
  labEyebrow:'Лабораторная работа по заданию CLEA VIREO',openLab:'Открыть работу',
  openLabNote:()=>'Открывает обсерваторию на русском языке с руководством к этой работе. Бесплатно и без регистрации.',
  whatYouDo:'Что вы делаете',whatYouLearn:'Чему вы научитесь',otherLabs:'Другие лабораторные работы',
  about:'OpenVireo\u00a0— бесплатная некоммерческая веб-реконструкция VIREO, виртуальной образовательной обсерватории (Virtual Educational '+
   'Observatory) Project CLEA в Gettysburg College. Project CLEA поддерживают NSF (National Science Foundation) и Gettysburg College. '+
   'OpenVireo опирается на восстановленное поведение оригинальной программы и использует исходные файлы данных с указанием их источника. '+
   'OpenVireo не является оригинальной программой и не связана с Project CLEA. Приложение помечает свои известные веб-адаптации. '+
   'Этот текст на русском языке\u00a0— веб-адаптация OpenVireo, а не текст CLEA.',
  platform:'Работает в современном веб-браузере на Windows, Mac, Linux или Chromebook. Ничего не нужно устанавливать, учётная запись не нужна.',
  learningResourceType:'Интерактивная лабораторная работа',educationalLevel:['Старшая школа','Высшее образование']},
 labsIndex:{title:'Лабораторные работы по астрономии CLEA VIREO онлайн · OpenVireo',
  description:'Семь лабораторных работ CLEA VIREO для браузера: закон Хаббла, крупномасштабная структура, спектры звёзд, Плеяды, диаграммы Г\u00a0— Р скоплений, пульсары, Объект X.',
  eyebrow:'Лабораторные работы CLEA VIREO',heading:'Лабораторные работы по астрономии в вашем браузере',
  lead:'Каждая работа — астрономическая симуляция по одному из учебных заданий VIREO, виртуальной обсерватории Project CLEA. Вы наблюдаете с помощью виртуальных телескопов и приборов, получаете собственные данные и делаете собственные выводы.',
  listName:'Лабораторные работы CLEA VIREO'},
 notFound:{title:'Не найдена',heading:'Страница не найдена',text:'Этот адрес не относится к OpenVireo.'},
 home:{title:'OpenVireo: астрономические работы CLEA VIREO на русском языке',
  description:'Бесплатная неофициальная веб-реконструкция виртуальной обсерватории VIREO от Project CLEA на русском языке: закон Хаббла, пульсары, Плеяды, Объект X и другие.',
  operatingSystem:'Любая (работает в веб-браузере)',
  eyebrow:'Виртуальная обсерватория на русском языке',heading:'Астрономические работы CLEA VIREO в вашем браузере',
  lead:'OpenVireo воссоздаёт в браузере VIREO, виртуальную обсерваторию Project CLEA. Вы наводите виртуальные телескопы, снимаете спектры, измеряете блеск звёзд и записываете пульсары, а затем делаете собственные выводы по собственным данным.',
  note:'Бесплатно, без регистрации и без установки.',
  labsHeading:'Семь лабораторных работ',howHeading:'Как это работает',
  how:['Всё происходит в вашем браузере: ничего не нужно устанавливать, учётная запись не нужна.',
   // Front HOME: the facts of the app's welcome (home.factInstall, home.factFaithful), as on /es/, /pt-br/, /fr/ and /id/.
   'Вам не нужны ни Windows, ни виртуальная машина: OpenVireo работает в современном браузере на Mac, Windows, Linux или Chromebook.',
   'OpenVireo следует восстановленному поведению оригинальной программы и помечает свои веб-адаптации. Это неофициальная реконструкция.',
   'Вы сохраняете свои исследования в файлы на своём компьютере и можете снова загрузить их в любой момент.',
   'Интерфейс, руководства и справка\u00a0— на русском языке; файлы TXT, FITS, CSV и сохранённые исследования записываются в формате VIREO или OpenVireo.',
   // Plan front-i18n-ru.md §4.1 (the user's decision Q1 of 2026-11-19): the numbers sentence, with U+202F in «24 000».
   'На экране в числах используется десятичная точка, а разряды разделяются узким пробелом (например, 1.5 и 24\u202f000); дробные числа вводите тоже с точкой. Файлы, которые сохраняет сайт, остаются на английском, как их записывает VIREO.',
   'Переключиться на английский можно в любой момент: выбор языка находится вверху страницы.']},
};


/** Every language with static pages, English first (the x-default). */
export const SEO_LANGUAGES:readonly SeoLanguage[]=Object.freeze([EN,ES,PT_BR,FR,ID,HI,JA,RU]);
export const ENGLISH=EN;

/** A page, named the same in every language: the home page, the labs index or one lab. */
export type PageKey='home'|'labs'|LabSlug;
/** Front RT9 (plan front-i18n-rtl.md § 7): a language's text direction, from the app's registry (src/i18n/languages.json `direction`,
 * ltr when absent; English is ltr), so the pages, their language links and the preview image follow the registry with no row of
 * this table repeating it. `registry` is for the tests. */
export const seoDirection=(language:Pick<SeoLanguage,'tag'>,registry:readonly LanguageEntry[]=LANGUAGES):TextDirection=>textDirection(language.tag,registry);
/** The site path of a page in a language. English's home is the app at "/". */
export const pathOf=(language:SeoLanguage,key:PageKey):string=>key==='home'?`${language.prefix}/`:key==='labs'?`${language.prefix}/labs/`:`${language.prefix}/labs/${key}/`;
