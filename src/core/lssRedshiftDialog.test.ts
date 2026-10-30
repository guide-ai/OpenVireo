import {describe,it,expect} from 'vitest';
import {lssDialogFields,lssDialogOk,lssDialogZ,lssDialogRecordValid,lssVelocityAccepted,LSS_DIALOG_TEXT} from './lssRedshiftDialog';

describe('Front L2: TLSSRsltsDlg1 FormActivate 0x57cab8 / OKBtnClick 0x57cd80',()=>{
 it('FormActivate texts: JD ffFixed 6, z ffExponent 4, RA h m s.ss, Dec ±d m s.s, z = 0 blank',()=>{
  expect(lssDialogFields({jd:2451545.25,z:0.02345,ra:12.5,dec:-27.25})).toEqual({jd:'2451545.250000',z:'2.345E-02',raH:'12',raM:'30',raS:'0.00',decD:'-27',decM:'15',decS:'0.0'});
  expect(lssDialogFields({jd:2451545,z:0,ra:1.0002,dec:29.5}).z).toBe('');
 });
 it('OK re-quantises z to its 4-digit text and stores the typed velocity as Single',()=>{
  const z=0.0234567;expect(lssDialogZ(z)).toBe(Math.fround(0.02346));
  const r=lssDialogOk(z,' 7033 ');expect(r).toMatchObject({ok:true,zSingle:Math.fround(0.02346),velocitySingle:7033});
  expect(lssDialogZ(0)).toBe(0);
 });
 it('the 1 % rule (Single fields), NaN and z = 0 fail; conversion errors get the Velocity Error box',()=>{
  const z=Math.fround(0.02),cz=299792.458*z;
  expect(lssVelocityAccepted(Math.fround(cz*1.009),z)).toBe(true);expect(lssVelocityAccepted(Math.fround(cz*1.011),z)).toBe(false);
  expect(lssVelocityAccepted(1000,0)).toBe(false);
  expect(lssDialogOk(0.02,'abc')).toEqual({ok:false,caption:LSS_DIALOG_TEXT.velocityCaption,message:LSS_DIALOG_TEXT.velocityMissing});
  expect(lssDialogOk(0.02,'1e3')).toEqual({ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid});
  expect(lssDialogOk(0,'0')).toEqual({ok:false,caption:null,message:LSS_DIALOG_TEXT.velocityInvalid});
 });
 it('restore check: only the hexes OK could have stored are accepted',()=>{
  const r=lssDialogOk(0.02,'6000');if(!r.ok)throw Error();
  expect(lssDialogRecordValid(0.02,r.zHex,r.velocityHex)).toEqual({zSingle:r.zSingle,velocitySingle:r.velocitySingle});
  expect(lssDialogRecordValid(0.020001,r.zHex,r.velocityHex)).not.toBeNull();// same 4-digit text
  expect(lssDialogRecordValid(0.0201,r.zHex,r.velocityHex)).toBeNull();
  expect(lssDialogRecordValid(0.02,r.zHex,'459c4000')).toBeNull();// 5000
 });
});
import {lssPrefilledVelocity} from './lssRedshiftDialog';
describe('Front R3: Compute Rdshft Vel. pre-fills the velocity (0x57cbcb)',()=>{
 it('is Single(c·Single(z)) as ffExponent 4, and OK accepts it unchanged; z = 0 is still refused by OK',()=>{
  for(const z of [0.0123,0.025,0.031,0.004]){
   const text=lssPrefilledVelocity(z);expect(text).toMatch(/^\d\.\d{3}E[+-]\d{2}$/);
   expect(lssDialogOk(z,text).ok).toBe(true);
  }
  expect(lssPrefilledVelocity(0.0123)).toBe('3.687E+03');
  expect(lssDialogOk(0,lssPrefilledVelocity(0)).ok).toBe(false);
 });
});
