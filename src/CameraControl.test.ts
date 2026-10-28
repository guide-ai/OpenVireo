import {expect,test} from 'vitest';
import {cameraExtras} from './CameraControl';
test('the moving-pair callback receives the JD at Start, the exposure seconds and the camera kind',()=>{
 const calls:number[][]=[];
 const pair={raHours:1,decDeg:2,storedMag:12,kind:'pair' as const,end:{raHours:1.001,decDeg:2}};
 const kinds:string[]=[];
 expect(cameraExtras((jd,seconds,camera)=>{calls.push([jd,seconds]);kinds.push(camera);return [pair];},2454983.6666667,600,'ccd')).toEqual([pair]);
 expect(calls).toEqual([[2454983.6666667,600]]);
 expect(cameraExtras((_jd,_s,camera)=>{kinds.push(camera);return [];},1,30,'ir')).toEqual([]);
 expect(kinds).toEqual(['ccd','ir']);
 expect(cameraExtras(undefined,1,30,'ccd')).toEqual([]);
});
