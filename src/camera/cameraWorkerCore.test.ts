import {describe,expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {handleCameraWorkerRequest,exposureFromWorker,type CameraWorkerState} from './cameraWorkerCore';
import controls from '../core/cameraExposure.controls.json';

const recorded=new Uint8Array(readFileSync(new URL('../../tests/fixtures/vizier/nomad-56.75+24.12-r0.01.xml',import.meta.url)));
const context={catalog:'I/297' as const,band:'R' as const,epochOffsetYears:0,queryBrightMagnitude:1,queryFaintMagnitude:21.5};
const sha=(px:ArrayLike<number>)=>{const b=Buffer.alloc(px.length*4);for(let i=0;i<px.length;i++)b.writeFloatBE(px[i],i*4);return createHash('sha256').update(b).digest('hex');};
describe('camera worker messages',()=>{
 test('parse then compose returns the pinned control image, exactly, through a Float32Array',()=>{
  const state:CameraWorkerState={selection:null};
  expect(handleCameraWorkerRequest(state,{type:'parse',bytes:recorded,context,magnitudeLimit:21.5}).reply).toEqual({type:'parsed',ok:true,rows:4,selected:1});
  const {reply,transfer}=handleCameraWorkerRequest(state,{type:'compose',recipe:{camera:'ccd',opticalIndex:0,filterPosition:0,seconds:10,gain:2,centerRaHours:56.745/15,centerDecDegrees:24.118,seed:20261027},extras:[]});
  if(reply.type!=='composed'||!reply.ok)throw new Error('compose failed');
  expect(transfer).toHaveLength(1);expect(sha(reply.exposure.plane.pixels)).toBe(controls.cases['nf-catalog'].sha256);
  expect(sha(exposureFromWorker(reply.exposure).plane.pixels)).toBe(controls.cases['nf-catalog'].sha256);
 });
 test('failures are typed replies, never exceptions',()=>{
  const state:CameraWorkerState={selection:null};
  expect(handleCameraWorkerRequest(state,{type:'compose',recipe:{} as never,extras:[]}).reply).toEqual({type:'composed',ok:false,code:'preparation'});
  expect(handleCameraWorkerRequest(state,{type:'parse',bytes:new TextEncoder().encode('<VOTABLE><INFO name="QUERY_STATUS" value="OVERFLOW"/></VOTABLE>'),context,magnitudeLimit:21.5}).reply).toEqual({type:'parsed',ok:false,code:'overflow'});
  expect(handleCameraWorkerRequest(state,{type:'parse',bytes:new Uint8Array([1]),context,magnitudeLimit:21.5}).reply).toEqual({type:'parsed',ok:false,code:'catalog'});
 });
});
