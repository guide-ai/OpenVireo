/** Yield to the event loop for one macrotask, so the page can repaint and input can run between long synchronous steps (Front G,
 * G1b review 1 L3). A MessageChannel message, not setTimeout: it is not throttled to 4 ms or more, and it still runs when page
 * timers are paused (for example a paused observatory clock in a test). */
export function yieldTask():Promise<void>{
 return new Promise(resolve=>{const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();resolve();};channel.port2.postMessage(0);});
}
