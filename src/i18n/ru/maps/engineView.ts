import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front RU2: Russian (ru) for the measuring engine's web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA's. */
export const ENGINE_VIEW_RU:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'Сдвинуть окно на 100 Å влево',
 panRight:'Сдвинуть окно на 100 Å вправо',
 readoutEmpty:'Проведите мышью по графику или переведите на него фокус и нажимайте клавиши со стрелками, чтобы прочитать длину волны.',
 nearest:'Ближайшая линия сравнения',
 nearestNone:'В пределах 100 Å от курсора нет линии сравнения.',
 nearestFound:(label:string,shifted:string)=>`Ближайшая линия сравнения: ${label} на ${shifted} Å.`,
 plotHelp:'График спектра. Перетаскивайте курсор мышью или двигайте его клавишами со стрелками; щёлкните правой кнопкой или нажмите N, чтобы найти ближайшую линию сравнения.',
 window:(min:string,max:string)=>`Окно ${min}–${max} Å`,
 fullViewNote:'Полный вид и вид H/K — готовые веб-виды; «Масштаб» и стрелки действуют в обычном виде.',
 note:'Как и в VIREO, «Масштаб» выбирает окно с шагом 100 Å от начала загруженного спектра и сначала переносит поправку z в базовое значение (как «Центрировать регулятор»); стрелки сдвигают окно на 100 Å и могут выводить его за края спектра меньше чем на 100 Å; в показании выводятся наблюдаемая длина волны под курсором и высота курсора на оси графика, а не значение спектра.',
});
