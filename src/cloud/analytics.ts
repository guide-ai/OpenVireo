/** Visit analytics placeholder (plan §10). The proposal is Cloudflare Web Analytics: aggregate, cookieless, no backend.
 * It is OFF: nothing calls this until deployment is approved, and without a build-time token it returns null. Loading
 * static.cloudflareinsights.com is part of that later approval, not of this front. */
export type AnalyticsBeacon=Readonly<{src:string;token:string}>;
export function analyticsBeacon(env:Readonly<Record<string,string|boolean|undefined>>=import.meta.env??{}):AnalyticsBeacon|null{
 const token=env.VITE_CF_BEACON_TOKEN;
 if(typeof token!=='string'||!/^[A-Za-z0-9]{16,64}$/.test(token))return null;
 return {src:'https://static.cloudflareinsights.com/beacon.min.js',token};
}
