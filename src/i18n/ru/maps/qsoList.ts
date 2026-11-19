import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front RU1: Russian (ru) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_RU:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'Виртуальная обсерватория (преподаватель, VIREO)',
 virtualObservatoryAdaptation:'Веб-адаптация: в VIREO этот параметр преподавателя, по умолчанию выключенный, включает «Выполнить работу (Run Exercise) › Виртуальная обсерватория (Virtual Observatory) (все инструменты)» — режим, в котором доступен «Файл (File) › Список QSO (QSO List)». Здесь он открывается только в режиме преподавателя (веб-форма демонстрационного режима, Demonstration Mode, без пароля); по умолчанию он выключен, страница его не сохраняет (его записывает только «Сохранить изменения» (Save Updates) — в файл параметров, который вы храните у себя), «Выйти» его выключает, а его единственное действие — показать «Файл › Список QSO».',
 sortDisabled:'«Параметры сортировки» (Sort Options) доступны только в режиме правки (Edit Mode), как и в VIREO; без него список отсортирован по звёздной величине.',
 limitLabel:'Предельная звёздная величина, V',
 withheld:'Строки рядом с целями Объекта X не перечислены, чтобы список не мог раскрыть, что такое нераскрытая цель Объекта X (правило веб-версии; VIREO показывает этот список только в режиме виртуальной обсерватории (Virtual Observatory) или, во время работы с Объектом X, в режиме правки (Edit Mode)).',
 editModeColumns:'Столбцы режима правки (Edit Mode): z — красное смещение из каталога; B−V и U−B в скобках — назначенные средние цвета. В этом списке нет ни одной цели работ.',
 noActivate:'Двойной щелчок по строке ничего не делает, как и в VIREO; используйте «Выбор» (Selection), чтобы добавить QSO в список объектов.',
 csvDisabled:'«Через запятую» (Comma Delimit) отключено для этого списка в VIREO.',
 modeless:'Список остаётся открытым, пока вы наблюдаете; выберите «Файл (File) › Список QSO (QSO List)» снова, чтобы изменить предел или порядок.',
 printStudent:'Веб-адаптация: без режима правки (Edit Mode) VIREO печатает под датой номер лабораторного стола и имена студентов; этот сайт не записывает ни то, ни другое, поэтому печатает «(не записано)» из VIREO и никаких имён.',
 fileError:(reason:string)=>`Веб-адаптация: входящая в сайт копия ${reason}.`,
 fileReasons:Object.freeze({download:'не удалось скачать',size:'не имеет записанного размера',sha256:'не совпадает с записанным SHA-256'}),
 objectXUnavailable:'Список QSO нельзя показать: положения целей Объекта X не удалось загрузить, а без них список мог бы раскрыть нераскрытую цель.',
 loading:'Загрузка каталога QSO…',
 noSelection:'Сначала выберите строку с QSO.',
 hst:Object.freeze({
  newTab:'(внешний сайт, откроется в новой вкладке)',
  note:`Веб-адаптация: VIREO открывала ${HST_ARCHIVE.defaultUrl} («${HST_ARCHIVE.optionsLabel}» в параметрах файлов (File Options) VIREO) в окне браузера. Этой страницы больше нет; эта ссылка открывает её нынешний аналог на hubblesite.org, который NASA теперь предлагает как свою галерею изображений «Хаббла» (Hubble Images). С ней ничего не отправляется.`,
 }),
});
