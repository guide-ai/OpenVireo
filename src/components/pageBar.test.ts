import {describe,expect,it} from 'vitest';
import {APP_SHELL_MESSAGES_EN} from './AppShellMessages';
import {APP_SHELL_ES} from '../i18n/es/maps/appShell';
import {APP_SHELL_PT} from '../i18n/pt-br/maps/appShell';
import {APP_SHELL_FR} from '../i18n/fr/maps/appShell';
import {APP_SHELL_ID} from '../i18n/id/maps/appShell';
import {APP_SHELL_HI} from '../i18n/hi/maps/appShell';
import {APP_SHELL_JA} from '../i18n/ja/maps/appShell';
import {APP_SHELL_ZH_HANS} from '../i18n/zh-hans/maps/appShell';
import {APP_SHELL_RU} from '../i18n/ru/maps/appShell';

// Front HEADER: the More button shows a word (from 600 px up) and is named by a longer phrase; the visible word must start the
// accessible name in every language (WCAG 2.5.3, label in name), so speech users can say what they see.
describe('page bar labels',()=>{
 for(const [tag,m] of [['en',APP_SHELL_MESSAGES_EN],['es-419',APP_SHELL_ES],['pt-BR',APP_SHELL_PT],['fr',APP_SHELL_FR],['id',APP_SHELL_ID],['hi',APP_SHELL_HI],['ja',APP_SHELL_JA],['zh-Hans',APP_SHELL_ZH_HANS],['ru',APP_SHELL_RU]] as const){
  it(`${tag}: "More" starts its accessible name, and the bar's region name is set`,()=>{
   expect(m.pageBar.more.trim().length).toBeGreaterThan(0);
   // Front JA0: Japanese writes no space between words («その他» starts «その他の調査操作»); Front ZH0: nor does Chinese («更多» starts «更多探究操作»).
   const cjk=tag==='ja'||tag.startsWith('zh');
   expect(m.pageBar.moreName.toLocaleLowerCase(tag).startsWith(m.pageBar.more.toLocaleLowerCase(tag)+(cjk?'':' '))).toBe(true);
   if(cjk)expect(m.pageBar.moreName.length).toBeGreaterThan(m.pageBar.more.length);
   expect(m.pageBar.label.trim().length).toBeGreaterThan(0);
  });
 }
});
