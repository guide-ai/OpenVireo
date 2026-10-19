import{it,expect,vi,afterEach}from'vitest';
import{opticalProfile,OPTICAL_PROFILE_SHA256}from'./opticalTelescope';
const packetSHA=OPTICAL_PROFILE_SHA256;
afterEach(()=>{vi.doUnmock('./opticalTelescope');vi.resetModules();});
it.each(([1,2]as const).flatMap(index=>(['seeing','correction','index','packet']as const).map(change=>[index,change]as const)))('telescope%i rejects a changed %s binding before photons can be prepared',async(index,change)=>{const profile=opticalProfile(index);vi.resetModules();vi.doMock('./opticalTelescope',()=>({OPTICAL_PROFILE_SHA256:change==='packet'?'unbound':packetSHA,opticalProfile:()=>({...profile,...(change==='seeing'?{seeingArcsec:2}:change==='correction'?{scopeFactorMag:1}:change==='index'?{recordIndex:0}:{})})}));const{photometerTelescope}=await import('./photometerTelescope');expect(()=>photometerTelescope(index)).toThrow('Unsupported photometer telescope/target');});
