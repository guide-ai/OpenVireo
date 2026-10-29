// Identities of the original VIREO help files bundled byte-exact from CLEA_Vireo.zip (SHA-256
// 58dc02a66c2ca89c80912aa0acc31f032e68ec88e8c85099708758ab50e6778b, program files/CLEA/VIREO/): the 35 files of the user
// approval of 2026-10-29 (research analysis/help-files-2026-10-29.txt), HRAnalHlp.LST/.TXT (approval of 2026-10-28) and
// VarTypeHlp.TXT (approval of 2026-10-27). Keyed by the upper-case file name, because VIREO opens them on Windows, where
// file names are case-insensitive (an index row may name "VIRMnHlp.txt" for VIRMNHLP.TXT). Zip dates are the member dates.
export type HelpFileIdentity=Readonly<{name:string;path:string;bytes:number;sha256:string;zipDate:string;archiveMember:string}>;
const file=(name:string,path:string,bytes:number,sha256:string,zipDate:string):HelpFileIdentity=>Object.freeze({name,path,bytes,sha256,zipDate,
 archiveMember:`program files/CLEA/VIREO/${name}`});
export const HELP_FILES:Readonly<Record<string,HelpFileIdentity>>=Object.freeze({
 'ASTRMHLP.LST':file('ASTRMHLP.LST','/original/help/ASTRMHLP.LST',1366,'a5088a41ca31f7a6ecca82c0368b8d979e7758682718e09c96107fd39cb40993','2002-08-30'),
 'CAMHLP.LST':file('CAMHLP.LST','/original/help/CAMHLP.LST',456,'7ca10650d72074ce46d24c5b1460f4cb764ed789520d7e8492355f80974dbf57','2002-08-30'),
 'CAMHLP.TXT':file('CAMHLP.TXT','/original/help/CAMHLP.TXT',3887,'bf4976da1b1f976613646e10c954b95039e646f3362004cafb242da4572155b8','2005-11-04'),
 'CLASSHLP.LST':file('CLASSHLP.LST','/original/help/CLASSHLP.LST',470,'42816959943e8d817884bd08b1f91856d4fab4450d5431ceee0f5b595c550fb0','2002-08-30'),
 'CLASSHLP.TXT':file('CLASSHLP.TXT','/original/help/CLASSHLP.TXT',11919,'9a3a70c11f5cfc024552e6b70db59953b16f40cafeea09a8d06974859a26a3b7','2005-11-04'),
 'HRANALHLP.LST':file('HRAnalHlp.LST','/original/cluster-help/HRAnalHlp.LST',715,'b50c590f0f0f3e60456b8adeae06d123a2121ed5db3f741a74610d28d0a61537','2006-10-17'),
 'HRANALHLP.TXT':file('HRAnalHlp.TXT','/original/cluster-help/HRAnalHlp.TXT',7557,'3a2f0ef20fd5d89384e429783ceda62325e59a752fd076e02a2c4256143c956b','2006-10-19'),
 'HUBHLP.LST':file('HUBHLP.LST','/original/help/HUBHLP.LST',880,'ec4b9c183d430d371e13b6c3e5ea65167a58aeb8a866563b0425def1f7c25cf7','2002-08-30'),
 'LSSHLP.LST':file('LSSHLP.LST','/original/help/LSSHLP.LST',1141,'f4ee3de45cead6cac0ae53458c94f9927bd48248a573632787d9e6a275e05c10','2002-08-30'),
 'MEASHLP.LST':file('MEASHLP.LST','/original/help/MEASHLP.LST',576,'3912d67bafaaee84b877f326dc171171dd19a87a659c287911f77994d938a04c','2003-06-18'),
 'MEASHLP.TXT':file('MEASHLP.TXT','/original/help/MEASHLP.TXT',6851,'e9f20545e1ff580439f45af3fd2e9aff0b64b1cd4edab467d07e8de1813577ac','2005-11-04'),
 'MLTSPHLP.LST':file('MLTSPHLP.LST','/original/help/MLTSPHLP.LST',0,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','2003-08-18'),
 'OBJXHLP.LST':file('OBJXHLP.LST','/original/help/OBJXHLP.LST',1119,'79ab3f8ffdbbaa0d06c74bcf438ff6ae47ad1fcb1c4ec10b185f6694aedae37c','2002-08-30'),
 'OBSRVHLP.LST':file('OBSRVHLP.LST','/original/help/OBSRVHLP.LST',429,'916b1453d6d99ab0a81091140790814e4c99a4c3800a6194a70f076ee5982a3a','2002-08-30'),
 'OBSRVHLP.TXT':file('OBSRVHLP.TXT','/original/help/OBSRVHLP.TXT',5275,'2dcae5e678d69ed80784bb2958ed856289ff04779edd19656681288846102bd7','2005-11-04'),
 'OBXMNHLP.LST':file('OBXMNHLP.LST','/original/help/OBXMNHLP.LST',804,'62d1c620cb3d2155e4790de4e194fd34ba524a6d90aa1168a3c2d87842bd6e9f','2003-06-03'),
 'PHOTOHLP.LST':file('PHOTOHLP.LST','/original/help/PHOTOHLP.LST',609,'315364175f104f6da587aec795e9aeec9b0b931fcfbf6a3f129a24784f20cc7b','2003-07-23'),
 'PHOTOHLP.TXT':file('PHOTOHLP.TXT','/original/help/PHOTOHLP.TXT',12647,'aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a','2005-11-04'),
 'PLSANHLP.LST':file('PLSANHLP.LST','/original/help/PLSANHLP.LST',672,'fc62c7f0f49ffdc8cc188e6119b9ebe79da613e27bc1561c44e5d5565ac16ec8','2002-08-30'),
 'PLSLSHLP.LST':file('PLSLSHLP.LST','/original/help/PLSLSHLP.LST',306,'d5203ea9d4468c0d2ed5933c23d71174d6cadd0e0ea099be86e9a92d492d4f27','2002-08-30'),
 'PULSRANL.TXT':file('PULSRANL.TXT','/original/help/PULSRANL.TXT',8571,'9d1cb3ff7daf80cc79f9a97f0b8f13a740b41f7162ba46f3d0cb31e8ac851bf4','1997-03-06'),
 'PULSRHLP.LST':file('PULSRHLP.LST','/original/help/PULSRHLP.LST',956,'4b229953564fd1df57cf88e724848f38ae1f66d85a12a270f879618145fcb270','2002-08-30'),
 'PULSRHLP.TXT':file('PULSRHLP.TXT','/original/help/PULSRHLP.TXT',17785,'3a6b8e727be8340095a284ad8dbe4e075613b2d081d83e93537a901a6c8377fc','2005-11-04'),
 'PULSRLST.TXT':file('PULSRLST.TXT','/original/help/PULSRLST.TXT',2882,'51df0d67752ffa73d661e33751905db3af359e723062c70eb25883b947c79bb8','1997-03-19'),
 'REMINDER.OBS':file('Reminder.obs','/original/help/Reminder.obs',186,'adb3d5a92895363d961ca0cdf66ec9b4b4656d1e641e228041cabc5a104f3ee6','2002-01-16'),
 'REMINDER.PLS':file('REMINDER.PLS','/original/help/REMINDER.PLS',179,'88b039ea22794aec5ffb332c0b25a0e3eb78a045f8d212e80abbe69e0f7da11f','1996-03-08'),
 'SPECHLP.LST':file('SPECHLP.LST','/original/help/SPECHLP.LST',476,'1b90822216661b0592e1873d6a44994cd30ec5843f5f907774ad580e0f7b4c49','2003-06-06'),
 'SPECHLP.TXT':file('SPECHLP.TXT','/original/help/SPECHLP.TXT',5585,'e085a513389cd65a7726260daf6607b8c277be6e6a2a46222a8fd5bb90fcee79','2005-11-04'),
 'SPECLNS.LNL':file('SPECLNS.LNL','/original/help/SPECLNS.LNL',1005,'c3c4eb3171ba2b8f35c5248fc28a084ec49f7abfe18918df89d6285c8369b6c5','2002-08-30'),
 'SPECLNS.TXT':file('SPECLNS.TXT','/original/help/SPECLNS.TXT',3557,'495d0627f11e1f8a5e780f04aa4f402a6b6650e6a26181c5842b7ecaea9faa5a','2000-08-24'),
 'SPLSTHLP.LST':file('SPLSTHLP.LST','/original/help/SPLSTHLP.LST',0,'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855','2003-08-18'),
 'TOOLSHLP.LST':file('TOOLSHLP.LST','/original/help/TOOLSHLP.LST',1119,'79ab3f8ffdbbaa0d06c74bcf438ff6ae47ad1fcb1c4ec10b185f6694aedae37c','2002-08-30'),
 'VARTYPEHLP.LST':file('VarTypeHlp.LST','/original/variables/VarTypeHlp.LST',294,'81cc58382cc90a1d0e3eaa41d414a7df73f07b80453f1bd65d169df72fffe913','2008-02-18'),
 'VARTYPEHLP.TXT':file('VarTypeHlp.TXT','/original/variables/VarTypeHlp.TXT',743,'d92f4a14aa7a2923d2921d4ab7fe90a38870e8667b7274629884b69bb6c5f445','2008-02-18'),
 'VIRMNHLP.LST':file('VIRMNHLP.LST','/original/help/VIRMNHLP.LST',960,'db9bab876ef1d03ad8b0e96596eb47c3ca9573156a65b4bff7b49bbfac295b2a','2007-11-26'),
 'VIRMNHLP.TXT':file('VIRMNHLP.TXT','/original/help/VIRMNHLP.TXT',19231,'6267cd7f2ae72562f8218b4404e566817682b75143cd67bc34fa133fe8dddebc','2007-11-27'),
 'WDGPLTHLP.LST':file('WdgPltHlp.LST','/original/help/WdgPltHlp.LST',440,'737b422b9470b2513de43e8adb45b998127cffbede93c569c5f97e5fa11eea8a','2007-11-28'),
 'WDGPLTHLP.TXT':file('WdgPltHlp.TXT','/original/help/WdgPltHlp.TXT',3891,'01d062eb13b41a197aa6123256a991c5b4b4194b47968d816d60d1302f5fd10e','2007-12-05'),
});
/** The bundled file a VIREO help file name refers to (case-insensitive), or null when CLEA_Vireo.zip has no such file. */
export function helpFile(name:string):HelpFileIdentity|null{
 let key='';for(const c of name)key+=c>='a'&&c<='z'?c.toUpperCase():c;
 return Object.hasOwn(HELP_FILES,key)?HELP_FILES[key]:null;
}
