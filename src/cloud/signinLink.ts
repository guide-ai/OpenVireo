/** Pure: the sign-in token travels in the URL fragment (`#signin=<43 base64url chars>`), so it never reaches a server
 * log or a Referer. It is read once and removed from the address bar before anything else uses the URL. */
const PATTERN=/^#signin=([A-Za-z0-9_-]{43})$/;

export function readSigninToken(hash:string):string|null{return PATTERN.exec(hash)?.[1]??null;}

export function takeSigninToken(location:Pick<Location,'hash'|'pathname'|'search'>,history:Pick<History,'replaceState'>):string|null{
 if(!location.hash.startsWith('#signin='))return null;
 const token=readSigninToken(location.hash);
 history.replaceState(null,'',location.pathname+location.search);
 return token;
}
