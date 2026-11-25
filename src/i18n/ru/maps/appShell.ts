import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front RU0: Russian (ru) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_RU:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Цветовая тема',system:'Системная',light:'Светлая',dark:'Тёмная'}),
 navGroups:Object.freeze({optical:'Оптическая обсерватория',radio:'Радиообсерватория',analysis:'Анализ',files:'Файлы',guides:'Руководства к работам'}),
 backupHelpSummary:'Что входит в резервную копию',
 toolsMenu:'Меню',
 skipToContent:'Перейти к содержимому',
 pageBar:Object.freeze({label:'Исследование, язык и справка',more:'Ещё',moreName:'Ещё действия с исследованием'}),
 companion:Object.freeze({label:'Текущий шаг руководства',stepOf:(n:number,total:number)=>`Шаг ${n} из ${total}`,actions:'Действия руководства',show:'Показать, где',details:'Описание шага',full:'Всё руководство',hide:'Скрыть',hideName:'Скрыть это руководство',notYet:'Этого элемента пока нет на экране: он появится, когда будет выполнено одно из предшествующих действий. Вы на нужной странице.',allDone:'Все шаги выполнены.',
  restart:'Начать работу заново',restartTitle:'Начать эту работу заново?',restartWhat:'Сайт перезагрузится, и это руководство откроется на первом шаге.',
  restartLost:'Всё, что вы не сохранили, будет потеряно: материалы этой работы и всех остальных инструментов в этой вкладке.',
  restartSave:'Чтобы сохранить их, нажмите «Отмена» и сначала выберите «Сохранить исследование».',restartConfirm:'Начать заново',restartCancel:'Отмена'}),
 firstLook:Object.freeze({name:'Первый взгляд',dome:'Откройте купол',point:'Выберите галактику M82 и наведите на неё телескоп',look:'Посмотрите на неё в телескоп',
  spectrum:'Откройте её спектр',spectrumDetail:'Спектр в библиотеке VIREO есть лишь у некоторых объектов; у M82 он есть. Это исходный спектр из библиотеки VIREO, а не новое наблюдение.',
  closing:'Первый взгляд брошен. Чтобы продолжить, выберите лабораторную работу.',start:'Пройти с гидом (около 3 мин)',help:'Бросить первый взгляд'}),
 recovery:Object.freeze({
  updatedTitle:'Опубликована новая версия OpenVireo',
  updated:'Эту часть сайта не удалось загрузить, потому что сайт обновился, пока эта страница была открыта.',
  errorTitle:'Эта часть OpenVireo остановилась из-за ошибки',
  error:'Обычно помогает перезагрузка страницы. Если ошибка повторится, запишите, что вы делали перед этим.',
  kept:'Остальная часть сайта и другие ваши материалы в этой вкладке на месте.',
  saveFirst:'Сначала сохраните исследование, затем перезагрузите страницу, чтобы продолжить с текущей версией.',
  saveHow:'Перезагрузите страницу, чтобы продолжить. Работу, которую вы раньше сохранили кнопкой «Сохранить исследование», затем можно восстановить кнопкой «Восстановить исследование (JSON)».',
  save:'Сохранить исследование',
  reload:'Перезагрузить страницу',
 }),
});
