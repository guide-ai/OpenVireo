/** Browser delivery of the recovered TTimer callbacks (TRadioLab SlewTimer2, 100 ms; TEnvironment1 ScopeTimer, 1 ms).
 * OpenVireo web policy WEB-TIMER-01, not recovered behavior: Windows WM_TIMER delivery and the message loop are not
 * reproduced and no timing parity is claimed.
 *
 * One registration is one periodic browser interval owned by its caller. Its cadence does not depend on how often
 * the caller's other state changes: only cancel() ends it (true disable, pause, unmount or an owner key change).
 * Each callback reads the latest committed input when it fires, and delivers at most once per input, so a
 * delivery that the host has not committed yet is never repeated from the same input. A callback that runs after
 * cancel() (for example one already queued) does nothing. Pure TypeScript: no React, clock or state. */

export type RadioTimerHost=Readonly<{
 setInterval:(callback:()=>void,ms:number)=>unknown;
 clearInterval:(handle:unknown)=>void;
}>;
export type RadioTimerRegistration=Readonly<{
 /** Ends the registration; idempotent. */
 cancel:()=>void;
 /** False after cancel(). */
 active:()=>boolean;
}>;

/** Starts one registration. `read` returns the latest committed input (compared with Object.is); `deliver` runs
 * with it when it differs from the input of the previous delivery of this registration. */
export function startRadioTimer<T>(host:RadioTimerHost,intervalMs:number,read:()=>T,deliver:(input:T)=>void):RadioTimerRegistration{
 if(!Number.isFinite(intervalMs)||intervalMs<=0)throw new Error('Invalid radio timer interval');
 let live=true,delivered=false,last:T|undefined;
 const handle=host.setInterval(()=>{
  if(!live)return;
  const input=read();
  if(delivered&&Object.is(input,last))return;
  delivered=true;last=input;deliver(input);
 },intervalMs);
 return Object.freeze({
  cancel:()=>{if(!live)return;live=false;host.clearInterval(handle);},
  active:()=>live,
 });
}
