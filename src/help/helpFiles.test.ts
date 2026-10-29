import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {HELP_FILES,helpFile} from './helpFiles';
import manifest from '../../docs/LOCAL-RESOURCES.json';

// The 35 files of the user approval of 2026-10-29, as listed (name, bytes, SHA-256) in the research file
// analysis/help-files-2026-10-29.txt, copied here as the expected identities.
const APPROVED_2026_10_29=`ASTRMHLP.LST 1366 a5088a41ca31f7a6ecca82c0368b8d979e7758682718e09c96107fd39cb40993
CAMHLP.LST 456 7ca10650d72074ce46d24c5b1460f4cb764ed789520d7e8492355f80974dbf57
CAMHLP.TXT 3887 bf4976da1b1f976613646e10c954b95039e646f3362004cafb242da4572155b8
CLASSHLP.LST 470 42816959943e8d817884bd08b1f91856d4fab4450d5431ceee0f5b595c550fb0
CLASSHLP.TXT 11919 9a3a70c11f5cfc024552e6b70db59953b16f40cafeea09a8d06974859a26a3b7
HUBHLP.LST 880 ec4b9c183d430d371e13b6c3e5ea65167a58aeb8a866563b0425def1f7c25cf7
LSSHLP.LST 1141 f4ee3de45cead6cac0ae53458c94f9927bd48248a573632787d9e6a275e05c10
MEASHLP.LST 576 3912d67bafaaee84b877f326dc171171dd19a87a659c287911f77994d938a04c
MEASHLP.TXT 6851 e9f20545e1ff580439f45af3fd2e9aff0b64b1cd4edab467d07e8de1813577ac
MLTSPHLP.LST 0 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
OBJXHLP.LST 1119 79ab3f8ffdbbaa0d06c74bcf438ff6ae47ad1fcb1c4ec10b185f6694aedae37c
OBSRVHLP.LST 429 916b1453d6d99ab0a81091140790814e4c99a4c3800a6194a70f076ee5982a3a
OBSRVHLP.TXT 5275 2dcae5e678d69ed80784bb2958ed856289ff04779edd19656681288846102bd7
OBXMNHLP.LST 804 62d1c620cb3d2155e4790de4e194fd34ba524a6d90aa1168a3c2d87842bd6e9f
PHOTOHLP.LST 609 315364175f104f6da587aec795e9aeec9b0b931fcfbf6a3f129a24784f20cc7b
PHOTOHLP.TXT 12647 aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a
PLSANHLP.LST 672 fc62c7f0f49ffdc8cc188e6119b9ebe79da613e27bc1561c44e5d5565ac16ec8
PLSLSHLP.LST 306 d5203ea9d4468c0d2ed5933c23d71174d6cadd0e0ea099be86e9a92d492d4f27
PULSRANL.TXT 8571 9d1cb3ff7daf80cc79f9a97f0b8f13a740b41f7162ba46f3d0cb31e8ac851bf4
PULSRHLP.LST 956 4b229953564fd1df57cf88e724848f38ae1f66d85a12a270f879618145fcb270
PULSRHLP.TXT 17785 3a6b8e727be8340095a284ad8dbe4e075613b2d081d83e93537a901a6c8377fc
PULSRLST.TXT 2882 51df0d67752ffa73d661e33751905db3af359e723062c70eb25883b947c79bb8
Reminder.obs 186 adb3d5a92895363d961ca0cdf66ec9b4b4656d1e641e228041cabc5a104f3ee6
REMINDER.PLS 179 88b039ea22794aec5ffb332c0b25a0e3eb78a045f8d212e80abbe69e0f7da11f
SPECHLP.LST 476 1b90822216661b0592e1873d6a44994cd30ec5843f5f907774ad580e0f7b4c49
SPECHLP.TXT 5585 e085a513389cd65a7726260daf6607b8c277be6e6a2a46222a8fd5bb90fcee79
SPECLNS.LNL 1005 c3c4eb3171ba2b8f35c5248fc28a084ec49f7abfe18918df89d6285c8369b6c5
SPECLNS.TXT 3557 495d0627f11e1f8a5e780f04aa4f402a6b6650e6a26181c5842b7ecaea9faa5a
SPLSTHLP.LST 0 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
TOOLSHLP.LST 1119 79ab3f8ffdbbaa0d06c74bcf438ff6ae47ad1fcb1c4ec10b185f6694aedae37c
VarTypeHlp.LST 294 81cc58382cc90a1d0e3eaa41d414a7df73f07b80453f1bd65d169df72fffe913
VIRMNHLP.LST 960 db9bab876ef1d03ad8b0e96596eb47c3ca9573156a65b4bff7b49bbfac295b2a
VIRMNHLP.TXT 19231 6267cd7f2ae72562f8218b4404e566817682b75143cd67bc34fa133fe8dddebc
WdgPltHlp.LST 440 737b422b9470b2513de43e8adb45b998127cffbede93c569c5f97e5fa11eea8a
WdgPltHlp.TXT 3891 01d062eb13b41a197aa6123256a991c5b4b4194b47968d816d60d1302f5fd10e`.split('\n').map(l=>l.split(' '));

describe('bundled VIREO help files (approval 2026-10-29)',()=>{
 it('are exactly the 35 approved files, byte-exact and manifested',()=>{
  expect(APPROVED_2026_10_29).toHaveLength(35);
  for(const [name,bytes,sha] of APPROVED_2026_10_29){
   const id=helpFile(name)!;
   expect(id.name).toBe(name);expect(id.bytes).toBe(Number(bytes));expect(id.sha256).toBe(sha);
   const b=readFileSync(new URL(`../../public${id.path}`,import.meta.url));
   expect(b.length).toBe(id.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(sha);
   expect(manifest.files).toContainEqual({path:'public'+id.path,bytes:id.bytes,sha256:sha});
  }
 });
 it('adds only the earlier approved HRAnalHlp pair and VarTypeHlp.TXT',()=>{
  const extra=Object.keys(HELP_FILES).filter(k=>!APPROVED_2026_10_29.some(([n])=>n.toUpperCase()===k)).sort();
  expect(extra).toEqual(['HRANALHLP.LST','HRANALHLP.TXT','VARTYPEHLP.TXT']);
 });
 it('resolves names case-insensitively as Windows does, and absent files to null',()=>{
  expect(helpFile('VIRMnHlp.txt')?.name).toBe('VIRMNHLP.TXT');
  expect(helpFile('ObsrvHlp.LST')?.name).toBe('OBSRVHLP.LST');
  for(const missing of ['hublab.txt','lsslab.txt','astrmlab.txt','astrmhlp.txt','ObXMnHlp.txt','toString','__proto__'])expect(helpFile(missing)).toBeNull();
 });
});
