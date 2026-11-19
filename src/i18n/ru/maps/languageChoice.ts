import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front RU0: Russian (ru) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json. A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_RU:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'Язык / Language',
 title:'Сменить язык?',
 reload:(language:string)=>`Страница будет перезагружена на том же месте сайта. Новый язык: ${language}.`,
 lost:'Всё, что есть только на экране, будет потеряно: текущее положение телескопа, идущие экспозиции, измерения, открытые окна, режим преподавателя и всё остальное, что вы не сохранили в файл.',
 kept:'Файлы, которые вы сохранили на компьютере, не затрагиваются; кнопка «Восстановить исследование (JSON)» снова загружает исследование. Этот браузер также хранит подтверждённые результаты наблюдений и ваши настройки отображения.',
 save:'Сохранить исследование',
 saveNote:'Кнопка «Сохранить исследование» сначала скачивает файл с вашей текущей работой. Затем смените язык.',
 change:'Сменить и перезагрузить',
 cancel:'Отмена',
 preview:'Предварительный просмотр до выпуска: язык выбирается адресом (?lang=) и не сохраняется.',
 notRemembered:'Этот браузер не позволяет OpenVireo сохранить выбор, поэтому он действует только для этой загрузки страницы.',
 originals:'Показывать собственные тексты VIREO на английском',
 originalsNote:'Тексты меню, окон и сообщений VIREO отображаются на английском — точно так, как их пишет VIREO. Собственные тексты OpenVireo остаются на выбранном языке. Действует при следующей загрузке страницы.',
 originalsNotStored:'Этот браузер не позволяет OpenVireo сохранить этот параметр.',
});
