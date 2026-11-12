import{expect,type Locator,type Page}from'@playwright/test';

/** React 19's FALLBACK_THROTTLE_MS (react-dom-client): once a Suspense boundary has shown its fallback, React holds back the
 * reveal of resolved content until this long after the most recent fallback anywhere on the page, measured with
 * performance.now() and waited for with setTimeout. */
export const REACT_FALLBACK_THROTTLE_MS=300;

/** page.clock fakes performance.now() and setTimeout, so while it is paused a lazily loaded view (LazyBoundary, React.lazy) whose
 * fallback was committed is never revealed: the throttled reveal waits for a timer that does not fire. That happens when the view
 * mounts under the paused clock before its chunk is in, also hidden (a restore mounts the tools it restores). Call this right
 * after the action that shows such a view, with a locator inside it. When the view is already shown it does nothing. Otherwise it
 * advances the fake clock by one throttle and waits for the view; usually that is enough, and a chunk that arrives after another
 * reveal restarted the throttle needs one more step. Only the page timers due within those steps run, so the test can still prove
 * that nothing else moved (stopped exposures, unchanged saved bytes). */
export async function revealLazyView(page:Page,content:Locator){
 if(await content.isVisible())return;
 await expect(async()=>{await page.clock.runFor(REACT_FALLBACK_THROTTLE_MS);await expect(content).toBeVisible({timeout:500});}).toPass({intervals:[0],timeout:5000});
}
