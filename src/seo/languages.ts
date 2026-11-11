/** Front ES-SEO [W]: the languages of the static search pages, one row each (user decision 8 of 2026-11-09, AGENTS.md: a Spanish
 * home page /es/ and the Spanish lab pages /es/labs/, with hreflang and a Spanish preview image). src/seo/pages.ts renders every
 * page of every row, the hreflang alternates and the sitemap from this table, so a later language (PT-SEO: pt-BR under /pt-br/)
 * adds its lab texts (src/seo/labs.<dir>.ts), one row here, its path prefix in src/seo/labSlugs.ts and its preview image; no
 * renderer changes. English is first and is the x-default. Its home page is the app itself (index.html); every other language's
 * home is a static page under its prefix that links into the app with `?lang=<tag>` (that load only, never stored: the
 * precedence of docs/I18N.md is unchanged).
 *
 * Front PT-SEO: Brazilian Portuguese (pt-BR) under /pt-br/, added as data only (its row, its texts in src/seo/labs.pt-br.ts).
 *
 * Which languages exist here is independent of which are released in the app: a row is added by that language's SEO front,
 * after its release (src/seo/pages.test.ts checks each row's tag against src/i18n/languages.json). */
import {LABS,type LabText} from './labs.ts';
import {LAB_TEXT_ES} from './labs.es.ts';
import {LAB_TEXT_PT_BR} from './labs.pt-br.ts';
import {SEO_PATH_PREFIX,type LabSlug} from './labSlugs.ts';

export type SeoLab=LabText&{slug:LabSlug;exercise:string};

export type SeoLanguage=Readonly<{
 /** The UI language tag (src/i18n/languages.json), also the pages' <html lang> and the JSON-LD inLanguage. */
 tag:string;
 /** Its hreflang values. Google takes an ISO 639-1 language with an optional ISO 3166-1 alpha-2 region, so a UN M.49 region such
  * as es-419's is not one (ES-SEO review): Spanish is `es`, which also matches every `es-*` searcher, as the app opens Spanish for
  * any `es-*` browser. A language whose tag is valid there lists it first: Brazilian Portuguese is `pt-BR` and also `pt`, the
  * same URL, because the app opens pt-BR for every `pt` and `pt-*` browser (pt-PT, pt-AO, pt-MZ…), so a Portuguese searcher
  * outside Brazil is sent to the Portuguese page rather than to the English x-default. */
 hreflang:readonly string[];
 /** Open Graph locale (language_TERRITORY): en_US, es_LA, pt_BR. */
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
 labsIndex:{title:'CLEA VIREO astronomy labs online · OpenVireo',
  description:"Seven CLEA VIREO labs rebuilt for the browser: Hubble's law, large-scale structure, stellar spectra, Pleiades, cluster HR diagrams, pulsars and Object X.",
  eyebrow:'CLEA VIREO labs',heading:'Astronomy labs in your browser',
  lead:"Each lab follows one of the student exercises of VIREO, Project CLEA's virtual observatory. You observe with virtual telescopes and instruments, measure your own data and draw your own conclusions.",
  listName:'CLEA VIREO labs'},
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
  lead:'Cada práctica sigue uno de los ejercicios para estudiantes de VIREO, el observatorio virtual de Project CLEA. Observas con telescopios e instrumentos virtuales, mides tus propios datos y sacas tus propias conclusiones.',
  listName:'Prácticas de CLEA VIREO'},
 home:{title:'OpenVireo: prácticas de astronomía de CLEA VIREO en español',
  description:'Reconstrucción web gratuita y no oficial del observatorio virtual VIREO de Project CLEA, en español: ley de Hubble, púlsares, Pléyades, Objeto X y más.',
  operatingSystem:'Cualquiera (funciona en un navegador web)',
  eyebrow:'Observatorio virtual en español',heading:'Prácticas de astronomía de CLEA VIREO, en tu navegador',
  lead:'OpenVireo reconstruye para la web VIREO, el observatorio virtual de Project CLEA. Apuntas telescopios virtuales, tomas espectros, mides el brillo de las estrellas y registras púlsares, y con tus propios datos llegas a tus conclusiones.',
  note:'Gratis, sin registro y sin nada que instalar.',
  labsHeading:'Las siete prácticas',howHeading:'Cómo funciona',
  how:['Todo ocurre en tu navegador: no hay nada que instalar ni necesitas una cuenta.',
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
   'Gettysburg College). Ele se baseia no comportamento recuperado do programa original e usa os seus arquivos de dados originais, '+
   'com o devido crédito. Não é o programa original nem tem vínculo com o Project CLEA. O aplicativo indica as suas adaptações web '+
   'conhecidas. Este texto em português é uma adaptação web feita pelo OpenVireo, não um texto do CLEA.',
  platform:'Funciona em um navegador web atual no Windows, Mac, Linux ou Chromebook. Não há nada a instalar e você não precisa de uma conta.',
  learningResourceType:'Prática interativa',educationalLevel:['Ensino médio','Ensino superior']},
 labsIndex:{title:'Práticas de astronomia do CLEA VIREO on-line · OpenVireo',
  description:'Práticas do CLEA VIREO recriadas no navegador: lei de Hubble, estrutura em grande escala, espectros, Plêiades, diagramas HR de aglomerados, pulsares e Objeto X.',
  eyebrow:'Práticas do CLEA VIREO',heading:'Práticas de astronomia no seu navegador',
  lead:'Cada prática segue um dos exercícios para estudantes do VIREO, o observatório virtual do Project CLEA. Você observa com telescópios e instrumentos virtuais, mede os seus próprios dados e tira as suas próprias conclusões.',
  listName:'Práticas do CLEA VIREO'},
 home:{title:'OpenVireo: práticas de astronomia do CLEA VIREO em português',
  description:'Reconstrução web gratuita e não oficial do observatório virtual VIREO do Project CLEA, em português: lei de Hubble, pulsares, Plêiades, Objeto X e mais.',
  operatingSystem:'Qualquer um (funciona em um navegador web)',
  eyebrow:'Observatório virtual em português',heading:'Práticas de astronomia do CLEA VIREO no seu navegador',
  lead:'O OpenVireo reconstrói para a web o VIREO, o observatório virtual do Project CLEA. Você aponta telescópios virtuais, obtém espectros, mede o brilho das estrelas e registra pulsares, e com os seus próprios dados chega às suas conclusões.',
  note:'Gratuito, sem cadastro e sem nada a instalar.',
  labsHeading:'As sete práticas',howHeading:'Como funciona',
  how:['Tudo acontece no seu navegador: não há nada a instalar e você não precisa de uma conta.',
   'Você salva as suas investigações como arquivos no seu próprio computador e as carrega de novo quando quiser.',
   'A interface, os guias e a ajuda estão em português. Os arquivos que o site grava (TXT, FITS, CSV e investigações salvas) ficam em inglês, no formato do VIREO ou do OpenVireo.',
   'Na tela, os números separam os milhares com um espaço estreito (24\u202f000) e usam ponto decimal, como os arquivos do VIREO.',
   'Você pode mudar para o inglês quando quiser com o seletor de idioma do menu.']},
};

/** Every language with static pages, English first (the x-default). */
export const SEO_LANGUAGES:readonly SeoLanguage[]=Object.freeze([EN,ES,PT_BR]);
export const ENGLISH=EN;

/** A page, named the same in every language: the home page, the labs index or one lab. */
export type PageKey='home'|'labs'|LabSlug;
/** The site path of a page in a language. English's home is the app at "/". */
export const pathOf=(language:SeoLanguage,key:PageKey):string=>key==='home'?`${language.prefix}/`:key==='labs'?`${language.prefix}/labs/`:`${language.prefix}/labs/${key}/`;
