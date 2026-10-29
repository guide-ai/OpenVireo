import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {ABOUT_BOX,HELP_WEBSITES,REMINDER_LIMIT,reminderBoxText} from './mainHelp';

const read=(n:string)=>new Uint8Array(readFileSync(new URL(`../../public/original/help/${n}`,import.meta.url)));
describe('main window Help data (RECOVERY.md §3–5)',()=>{
 it('builds the reminder box from Reminder.obs as 0x5a0418 does',()=>{
  expect(reminderBoxText(read('Reminder.obs'))).toBe('Thank you for using CLEA\'s "Virtual Educational Observatory" software.  We hope you found it both educational and enjoyable.\r\n\r\nAre you SURE you have completely finished this exercise?\r\n\r\nSelect "OK" to Quit Exercise, "Cancel" to Continue.');
  // Readln into char[256] keeps 255 characters of a line and skips the rest; the whole text stops at 1023 characters.
  const long=reminderBoxText(Uint8Array.from(('x'.repeat(300)+'\r\n').repeat(5),c=>c.charCodeAt(0)));
  expect(long.length).toBe(REMINDER_LIMIT);expect(long.startsWith('x'.repeat(255)+'\r\nx')).toBe(true);expect(long).not.toContain('Select');
 });
 it('keeps every original website address and opens only checked ones',()=>{
  expect(HELP_WEBSITES.map(w=>w.original)).toEqual(['http://xena.harvard.edu/software/catalogs/tmpsc.html','http://public.gettysburg.edu/~marschal/clea/CLEAhome.html','http://www.us-vo.org']);
  expect(HELP_WEBSITES.map(w=>w.web)).toEqual(['https://irsa.ipac.caltech.edu/Missions/2mass.html','https://public.gettysburg.edu/~marschal/clea/CLEAhome.html','https://heasarc.gsfc.nasa.gov/navo/summary/about_navo.html']);
  expect(ABOUT_BOX.mainVersion).toBe('Version 1.504');expect(ABOUT_BOX.radioVersion).toBe('Version 1.001-32');
 });
});
