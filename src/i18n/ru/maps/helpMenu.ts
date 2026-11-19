import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front RU0: Russian (ru) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_RU:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'(откроется в новой вкладке)',
 noEquivalent:(original:string)=>`— VIREO открывала: ${original}. Этого сайта больше нет, равнозначной страницы тоже нет, поэтому ссылка не предлагается.`,
 websitesNote:'VIREO открывала эти страницы в новом окне браузера. Здесь они открываются в новой вкладке, только когда вы нажимаете на них, и ничего не отправляется. Два адреса VIREO больше не существуют: 2MASS (xena.harvard.edu) открывает нынешнюю страницу 2MASS в IRSA (NASA/IPAC), а NVO (www.us-vo.org) открывает страницу его преемника — NAVO (NASA Astronomical Virtual Observatories, виртуальные астрономические обсерватории NASA).',
 reminderLoading:'Загрузка напоминания VIREO…',
 reminderError:'Файл напоминания VIREO (Reminder.obs) не удалось загрузить, либо он не совпал с записанными размером и SHA-256.',
 ok:'ОК',cancel:'Отмена',close:'Закрыть',yes:'Да',no:'Нет',
 menuName:Object.freeze({main:'Меню «Справка» обсерватории',radio:'Меню «Справка» радиотелескопа'}),
 radioOff:'Меню «Справка» радио в VIREO (Разделы..., Об этой работе...) находится на панели управления радиотелескопа, которая открывается при включении телескопа.',
 reminderErrorQuestion:'Вместо этого VIREO спрашивает:',
 exitDone:'Вы закончили работу. Веб-страница не может закрыться сама: сохраните результаты, затем закройте эту вкладку браузера, когда будете готовы.',
 siteAbout:'Об OpenVireo и конфиденциальность',
 webTopics:'Разделы справки…',
 tour:'Пройти экскурсию по сайту',
 shortcutKey:'?',
 buttonNames:Object.freeze({
 'OBSRVHLP.LST':'Справка по управлению телескопом','PHOTOHLP.LST':'Справка по фотометру','CAMHLP.LST':'Справка по камере','SPECHLP.LST':'Справка по спектрометру',
 'CLASSHLP.LST':'Справка по спектральной классификации','MEASHLP.LST':'Справка по измерению спектров','HRANALHLP.LST':'Справка по диаграмме Г — Р','VARTYPEHLP.LST':'Справка по типам переменных звёзд',
 'WDGPLTHLP.LST':'Справка по клиновидной диаграмме','PLSANHLP.LST':'Справка по анализу пульсаров','PLSLSHLP.LST':'Справка по параметрам пульсаров','MLTSPHLP.LST':'Справка по многообъектному спектрометру',
 'SPLSTHLP.LST':'Справка по списку спектров многообъектного спектрометра',
 }) as Readonly<Record<string,string>>,
 exitNote:'VIREO показывает это напоминание, когда вы выходите из обсерватории во время работы (после Run Exercise); в остальных случаях она лишь спрашивает, выйти ли. В OpenVireo нет шагов Log In и Run Exercise, поэтому обсерватория всегда находится в состоянии идущей работы. В VIREO «ОК» или «Да» закрывает программу, а «Отмена» или «Нет» оставляет её открытой.',
});
