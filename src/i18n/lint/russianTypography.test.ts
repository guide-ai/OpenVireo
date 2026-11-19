import {describe,expect,it} from 'vitest';
import {countBeforeNoun,fixRussianTypography,russianTypography,russianTypographyFindings} from './russianTypography';
import {fixSourceLiterals} from './frenchSpacing';
// Front RU0 (plan front-i18n-ru.md §1.2 #3, §4; user decisions Q1 and Q2 of 2026-11-19): the Russian typography fixer.
const N='\u202f',B='\u00a0';
const fix=(s:string)=>fixRussianTypography(s);
describe('Front RU0: the Russian typography fixer',()=>{
 it('groups thousands with U+202F and leaves decimals, versions, dates and placeholders alone',()=>{
  expect(fix('Расстояние 24,000 пк и 2,400,000 лет')).toBe(`Расстояние 24${N}000${B}пк и 2${N}400${N}000 лет`);
  // Review (RU0): an ordinary space may stand between two numbers, so it is left to the thousands lint.
  expect(fix('Звёзды 5 120 и 130')).toBe('Звёзды 5 120 и 130');expect(fix(`31${B}147`)).toBe(`31${N}147`);
  expect(fix('1.5 и 12,5? 3.14, версия 1.2.3, 2026-11-19, 12:30:45')).toBe('1.5 и 12,5? 3.14, версия 1.2.3, 2026-11-19, 12:30:45');
  expect(fix(`Всего ${'{count}'} записей: 31${B}147`)).toBe(`Всего {count} записей: 31${N}147`);
 });
 it('writes « » for straight and top-level English quotes, „ “ inside « », and keeps text with unbalanced quotes for the lint',()=>{
  expect(fix('Нажмите "Сохранить".')).toBe('Нажмите «Сохранить».');
  expect(fix('Нажмите “Сохранить”.')).toBe('Нажмите «Сохранить».');
  expect(fix('Раздел «Работа "Закон Хаббла"» открыт')).toBe('Раздел «Работа „Закон Хаббла“» открыт');
  expect(fix('Раздел «Работа “Закон Хаббла”» открыт')).toBe('Раздел «Работа „Закон Хаббла“» открыт');
  expect(fix('Раздел «Работа „Закон Хаббла“» открыт')).toBe('Раздел «Работа „Закон Хаббла“» открыт');
  expect(fix('Только "одна кавычка')).toBe('Только "одна кавычка');
  expect(fix('Лишняя » кавычка')).toBe('Лишняя » кавычка');
 });
 it('writes « — » with a no-break space before, and leaves ranges, line-start dashes and hyphenated words',()=>{
  expect(fix('Телескоп - инструмент')).toBe(`Телескоп${B}— инструмент`);
  expect(fix('Телескоп – инструмент')).toBe(`Телескоп${B}— инструмент`);
  expect(fix('Телескоп — инструмент')).toBe(`Телескоп${B}— инструмент`);
  expect(fix('Телескоп—инструмент')).toBe(`Телескоп${B}— инструмент`);
  expect(fix(`Телескоп${B}— инструмент`)).toBe(`Телескоп${B}— инструмент`);
  expect(fix('1990—2000, 2–4 и северо-запад')).toBe('1990—2000, 2–4 и северо-запад');
  expect(fix('Список:\n— первый\n— второй')).toBe('Список:\n— первый\n— второй');
  expect(fix('{name} - файл')).toBe(`{name}${B}— файл`);
  expect(fix('{observed} - {computed}')).toBe('{observed} - {computed}');// a subtraction
 });
 it('puts U+00A0 in т. е. and between a number or placeholder and a unit symbol; «с» and «ч» stay words',()=>{
  expect(fix('т. е. и т. д.')).toBe(`т.${B}е. и т.${B}д.`);
  expect(fix('скорость 300 км/с, {distance} Мпк, 1420 МГц')).toBe(`скорость 300${B}км/с, {distance}${B}Мпк, 1420${B}МГц`);
  expect(fix('5 с половиной, 2 часа')).toBe('5 с половиной, 2 часа');
 });
 it('keeps placeholders, samples, URLs, ?lang= and VIREO English glosses in brackets',()=>{
  const kept='См. https://openvireo.space/?lang=ru и «A1»; пункт «Сохранить как...» (Save As...) - {name} (RA: "x" - y)';
  expect(fix(kept)).toBe(`См. https://openvireo.space/?lang=ru и «A1»; пункт «Сохранить как...» (Save As...)${B}— {name} (RA: "x" - y)`);
 });
 it('is idempotent, the lint view reports exactly what is left, and the source rewriter writes characters',()=>{
  for(const s of ['Нажмите "Сохранить" - готово, 24,000 км/с','«Работа "X"»','т. е.'])expect(fix(fix(s))).toBe(fix(s));
  expect(russianTypographyFindings('Нажмите "Сохранить" - готово').map(f=>f.label)).toEqual(['« » instead of English or straight quotes','« » instead of English or straight quotes','« — » with a no-break space before']);
  expect(russianTypographyFindings('24,000')).toEqual([]);// thousands are the thousandsRules' (they name U+202F)
  expect(russianTypography(`Нажмите «Сохранить»${B}— готово`).changes).toEqual([]);
  const source="export const M={a:'Нажмите \"OK\" - готово',b:`Всего ${n} - 1,000`};";
  expect(fixSourceLiterals(source,(t,o)=>fixRussianTypography(t,o))).toBe(`export const M={a:'Нажмите «OK»${B}— готово',b:\`Всего \${n}${B}— 1${N}000\`};`);
 });
});
describe('Front RU0: a noun right after a count in a counted message (plan §1.2 #2)',()=>{
 it('flags «{count} записей», passes count-neutral wordings, prepositions, «из {total}» and units',()=>{
  expect(countBeforeNoun('Найдено {count} записей.')).toEqual(['записей']);
  expect(countBeforeNoun('{n} звёзд в поле')).toEqual(['звёзд']);
  expect(countBeforeNoun('Записей: {count}.')).toEqual([]);
  expect(countBeforeNoun('{n} из {total} отмечено')).toEqual([]);
  expect(countBeforeNoun('{count} км/с и {n} Мпк')).toEqual([]);
  expect(countBeforeNoun('Строка {n}, позиция {name} файла')).toEqual([]);
  expect(countBeforeNoun('{n} выбрано, {count} найдено, {total} взято')).toEqual([]);
  expect(countBeforeNoun('{count} место и {n} окно')).toEqual(['место','окно']);// nouns, not participles
 });
});
