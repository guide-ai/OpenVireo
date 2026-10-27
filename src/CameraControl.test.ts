import {expect,test} from 'vitest';
import {cameraExtras} from './CameraControl';
test('the moving-pair callback receives the JD at Start and the exposure seconds',()=>{
 const calls:number[][]=[];
 const pair={raHours:1,decDeg:2,storedMag:12,kind:'pair' as const,end:{raHours:1.001,decDeg:2}};
 expect(cameraExtras((jd,seconds)=>{calls.push([jd,seconds]);return [pair];},2454983.6666667,600)).toEqual([pair]);
 expect(calls).toEqual([[2454983.6666667,600]]);
 expect(cameraExtras(jd=>{calls.push([jd]);return [];},1,30)).toEqual([]);
 expect(cameraExtras(undefined,1,30)).toEqual([]);
});
