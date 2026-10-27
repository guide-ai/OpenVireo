/** E08 Object X ephemeris (X0a/X2), recovered statically from CLEA_VEO.exe 781bc970…c54c. Evidence: research notes-x0a.md
 * (front-x-objectx-20261027) and docs/OBJECT-X.md. Pipeline of the CCD field builder 0x59940c and the asteroid list
 * 0x51a160 (both construct the asteroid with mode 2):
 *  1. 0x515f24 + 0x517af8: CMO state vector (J2000 ecliptic, km, km/s) → elements; 0x516990/0x5169cc/0x51689c a, n, M.
 *  2. 0x5157b4 mode 2 (astrometric): Earth E(t) (Bretagnon–Simon Sun 0x51522c/0x515434, +π, reduced to J2000 by the
 *     general precession in longitude 0x4ba87c); light-time loop on the asteroid A(t−τ) (0x516ab0 true anomaly, 0x517878
 *     position); Δ is the first (geometric) distance; rect→ecliptic 0x4b9ec8; ecliptic precession 0x4b99c0 J2000→t.
 *  3. 0x515b40 magnitude (H,G or comet H,K; otherwise 100).
 *  4. Caller: 0x4b99c0 back to J2000, 0x4ba454 ecliptic→equatorial with the mean obliquity 0x4ba990, RA hours wrapped
 *     by +24 while negative.
 * Mode 1 (apparent, with nutation 0x4ba65c/0x4ba76c) is not used by Object X and is not ported.
 *
 * Numeric policy (declared approximation): binary64 in source evaluation order; each Extended or Single cell rounded once to
 * binary64. sin/cos/tan/atan2/exp/log are Math.*; ArcSin/ArcCos keep the native atan2 forms; Power is Math.pow. The original
 * keeps Extended on the x87 stack. Two web guards are added where the original has no bound (light-time loop and the first
 * parabolic Newton loop): they throw typed errors instead of hanging. The JD is the program clock (no ΔT anywhere). Pure. */
import type {OrbitRecord,Vector3} from './orbitFile';

export const EPHEMERIS_CONSTANTS=Object.freeze({
 /** Extended 0x515ac8 / 0x5174e8: km per AU. */
 kmPerAu:149597870.66,
 /** Extended 0x515ad8: light time, days per AU. */
 lightDaysPerAu:0.005775518329861111,
 /** Extended 0x515ae4: light-time convergence (days). */
 lightTolerance:1e-5,
 /** Single 0x5174a4 etc.: seconds per day. */
 secondsPerDay:86400,
 /** Extended 0x5174a8 (2π) and 0x5174b8 (π). */
 twoPi:6.283185307179586,pi:3.141592653589793,halfPi:1.5707963267948966,
 /** Extended 0x5174d0: Kepler/Barker tolerance; Single 0x517504: series term limit. */
 keplerTolerance:1e-10,seriesLimit:10000,
 /** Extended 0x5174dc: hyperbolic start ln(2M/e + 1.8). Extended 0x5174f4: Gaussian constant k. */
 hyperbolicStart:1.8,gaussK:0.01720209895,
 /** Extended 0x516978 / 0x516984: orbit-kind limits; 0x51840c / 0x518428: element-branch limits. */
 kindEllipticBelow:0.98,kindParabolicUpTo:1.02,elementsEllipticBelow:0.9999999,elementsHyperbolicAbove:1.0000001,
 /** Extended 0x5183f0: |1/a| below which a := 0. */
 inverseAxisFloor:1e-20,
 /** Caller Extended 0x599918 (12/π) and 0x59992c (180/π). */
 radiansToHours:3.819718634205488,radiansToDegrees:57.29577951308232,
 degreesToRadians:0.017453292519943295,
 jdJ2000:2451545,
});

/** GM table 0x5b57e0 → 0x5b3a7c (12 Extended, km³/s²) indexed by the record's central-body byte; index 0 is the Sun. */
export const CENTRAL_BODY_GM:readonly number[]=Object.freeze([132712440000,22032.080483431833,324858.7657747963,403503.247,42828.28660958915,126712598.46278703,37939519.72555746,5780158.536585365,6871307.8595837215,1020.8649230769231,4902.799,403503.3087514309]);

/** Bretagnon & Simon solar series used by 0x51522c (longitude, 50 terms) and 0x515434 (radius): l (Single 0x5b3af4),
 * r (Single 0x5b3bbc), α (Single 0x5b3c84) and ν (Double 0x5b3d4c). SHA-256 of each table's bytes is in docs/OBJECT-X.md. */
export const SUN_SERIES=Object.freeze({
 l:Object.freeze([403406,195207,119433,112392,3891,2819,1721,0,660,350,334,314,268,242,234,158,132,129,114,99,93,86,78,72,68,64,46,38,37,32,29,28,27,27,25,24,21,21,20,18,17,14,13,13,13,12,10,10,10,10]),
 r:Object.freeze([0,-97597,-59715,-56188,-1556,-1126,-861,941,-264,-163,0,309,-158,0,-54,0,-93,-20,0,-47,0,0,-33,-32,0,-10,-16,0,0,-24,-13,0,-9,0,-17,-11,0,31,-10,0,-12,0,-5,0,0,0,0,0,0,-9]),
 alpha:Object.freeze([4.721963882446289,5.937458038330078,1.1155890226364136,5.7816162109375,5.547399997711182,1.5119999647140503,4.189700126647949,1.1629999876022339,5.414999961853027,4.315000057220459,4.552999973297119,5.197999954223633,5.988999843597412,2.9110000133514404,1.4229999780654907,0.061000000685453415,2.316999912261963,3.193000078201294,2.828000068664551,0.5199999809265137,4.650000095367432,4.349999904632568,2.75,4.5,3.2300000190734863,1.2200000286102295,0.14000000059604645,3.440000057220459,4.369999885559082,1.1399999856948853,2.8399999141693115,5.960000038146973,5.090000152587891,1.7200000286102295,2.559999942779541,1.9199999570846558,0.09000000357627869,5.980000019073486,4.03000020980835,4.269999980926514,0.7900000214576721,4.239999771118164,2.009999990463257,2.6500000953674316,4.980000019073486,0.9300000071525574,2.2100000381469727,3.5899999141693115,1.5,2.549999952316284]),
 nu:Object.freeze([1.621043,62830.348067,62830.821524,62829.634302,125660.5691,125660.9845,62832.4766,0.813,125659.31,57533.85,-33.931,777137.715,78604.191,5.412,39302.098,-34.861,115067.698,15774.337,5296.67,58849.27,5296.11,-3980.7,52237.69,55076.47,261.08,15773.85,188491.03,-7756.55,264.89,117906.27,55075.75,-7961.39,188489.81,2132.19,109771.03,54868.56,25443.93,-55731.43,60697.74,2132.79,109771.63,-7752.82,188491.91,207.81,29424.63,-7.99,46941.14,-68.29,21463.25,157208.4]),
 /** Extended 0x5153e0, 0x5153ec, 0x5153f8 (1e-7), 0x5154fc; Singles 0x488370 (J2000) and 0x488374 (days per 10 000 years). */
 rate:62833.196168,epoch:4.9353929,scale:1e-7,radius0:1.0001026,daysPerUnit:3652500,
});

export type EphemerisErrorCode='orbit-calculation'|'light-time'|'central-body'|'nonfinite';
export class EphemerisError extends Error{
 constructor(readonly code:EphemerisErrorCode){super(`Ephemeris ${code}`);this.name='EphemerisError';}
}
const fail=(code:EphemerisErrorCode):never=>{throw new EphemerisError(code);};

/** Frac 0x40365c (truncation). */
const frac=(x:number)=>x-Math.trunc(x);
/** 0x4859f8 / 0x485984: clamp to ±1 (NaN passes), then ArcCos/ArcSin in their atan2 forms. */
/** ArcCos 0x426fd8 (unclamped). */
const arcCos=(x:number)=>Math.atan2(Math.sqrt((1+x)*(1-x)),x);
const clamp=(x:number)=>Math.abs(x)>1?(x>0?1:-1):x;
const clampedAcos=(x:number)=>{const c=clamp(x);return Math.atan2(Math.sqrt((1+c)*(1-c)),c);};
const clampedAsin=(x:number)=>{const c=clamp(x);return Math.atan2(c,Math.sqrt(1-c*c));};
/** Math unit ArcSinh 0x427290 and Sign 0x4272d4. */
const arcSinh=(x:number)=>Math.log(x+Math.sqrt(x*x+1));
const sign=(x:number)=>x>0?1:x<0?-1:0;
const add=(a:Vector3,b:Vector3):Vector3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale=(a:Vector3,s:number):Vector3=>[s*a[0],s*a[1],s*a[2]];
const dot=(a:Vector3,b:Vector3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=(a:Vector3)=>Math.sqrt(dot(a,a));
const cross=(a:Vector3,b:Vector3):Vector3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** 0x516930: 0 circular (e = 0, also unordered), 1 elliptic (e < 0.98), 2 near-parabolic (e ≤ 1.02), 3 hyperbolic. */
export type OrbitKind=0|1|2|3;
export function orbitKind(e:number):OrbitKind{
 const k=EPHEMERIS_CONSTANTS;
 if(e===0||Number.isNaN(e))return 0;
 if(k.kindEllipticBelow>e)return 1;
 return k.kindParabolicUpTo>=e?2:3;
}

/** Element record (188 bytes in the original) as far as the ephemeris reads it. Angles in radians, q and a in km, n in
 * rad/s. */
export type OrbitElements=Readonly<{
 name:string;number:string;epochJd:number;perihelionJd:number;
 q:number;e:number;a:number;inclination:number;node:number;perihelionArgument:number;meanMotion:number;meanAnomaly:number;
 centralBody:number;gm:number;kind:OrbitKind;magnitudeModel:number;h:number;g:number;
}>;

/** 0x515f24 → 0x517af8 → 0x516990/0x5169cc/0x51689c: elements from the CMO state vector at its epoch. */
export function elementsFromState(record:OrbitRecord):OrbitElements{
 const k=EPHEMERIS_CONSTANTS,mu=CENTRAL_BODY_GM[record.centralBody];
 if(mu===undefined)return fail('central-body');
 const R=record.position,V=record.velocity,t=record.epochJd;
 const r=norm(R),v2=dot(V,V),rv=dot(R,V);
 const ev=add(scale(R,v2/mu-1/r),scale(V,-rv/mu));
 const hv=cross(R,V),nv:Vector3=[-hv[1],hv[0],0];
 const inverseA=2/r-v2/mu;
 const a0=k.inverseAxisFloor>=Math.abs(inverseA)?0:1/inverseA;
 const e=norm(ev),h=norm(hv),p=h*h/mu,q=p/(e+1);
 const inclination=clampedAcos(hv[2]/h);
 const nn=norm(nv);
 let node=clampedAcos(nv[0]/nn);
 if(nv[1]<0)node=k.twoPi-node;
 let peri=clampedAcos(dot(nv,ev)/(nn*e));
 if(ev[2]<0)peri=k.twoPi-peri;
 const rCos=e!==0?(p-r)/e:1,rSin=e!==0?Math.sqrt(p/mu)*rv/e:1;
 let M:number,n:number;
 const wrap=(x:number)=>{let m=frac(x/k.twoPi)*k.twoPi;if(!(k.pi>=m))m-=k.twoPi;return m;};
 if(k.elementsEllipticBelow>e){
  const cosE=rCos/a0+e,sinE=rSin/(Math.sqrt(1-e*e)*a0);
  M=wrap(Math.atan2(sinE,cosE)-e*sinE);n=Math.sqrt(mu/(a0*a0*a0));
 }else if(k.elementsHyperbolicAbove>=e){
  const s=sign(rv)*Math.sqrt(r/q-1);
  n=Math.sqrt((e+1)*mu/(q*4*q*q));M=wrap(s*s*s/3+s);
 }else{
  const sinhF=rSin/(-a0*Math.sqrt(e*e-1));
  M=wrap(e*sinhF-arcSinh(sinhF));n=Math.sqrt(mu/(-a0*a0*a0));
 }
 const perihelionJd=t-M/(n*k.secondsPerDay);
 if(node===k.twoPi)node=0;
 if(peri===k.twoPi)peri=0;
 // 0x516990, 0x5169cc, 0x51689c.
 const kind=orbitKind(e);
 const a=kind!==2?q/(1-e):q;
 const meanMotion=kind!==2?Math.sqrt(mu/Math.abs(a*a*a)):Math.sqrt((e+1)*mu/(q*4*q*q));
 let meanAnomaly=frac((t-perihelionJd)*k.secondsPerDay*meanMotion/k.twoPi)*k.twoPi;
 if(kind===1&&!(meanAnomaly>=0))meanAnomaly+=k.twoPi;
 const out={name:record.name,number:record.number,epochJd:t,perihelionJd,q,e,a,inclination,node,perihelionArgument:peri,meanMotion,meanAnomaly,
  centralBody:record.centralBody,gm:mu,kind,magnitudeModel:record.magnitudeModel,h:record.h,g:record.g};
 if(![perihelionJd,q,e,a,inclination,node,peri,meanMotion].every(Number.isFinite))return fail('nonfinite');
 return Object.freeze(out);
}

/** 0x516ab0: true anomaly at JD t; throws 'orbit-calculation' where the original shows "*** Orbit Calculation Error! ***"
 * (more than 10 Kepler corrections, more than 50 series terms or inner Newton passes, or a series term above 10⁴). */
export function trueAnomaly(el:OrbitElements,t:number):number{
 const k=EPHEMERIS_CONSTANTS,e=el.e,dt=t-el.perihelionJd;
 let M=el.meanMotion*dt*k.secondsPerDay;
 if(el.kind===0)return M;
 let tanHalf:number;
 if(el.kind===1||el.kind===3){
  const elliptic=el.kind===1;
  let x:number;
  if(elliptic){
   M=frac(M/k.twoPi)*k.twoPi;
   if(!(M>=0))M+=k.twoPi;
   if(!(k.pi>=M))M-=k.twoPi;
   x=Math.sin(M)*e/(Math.sin(M)+(1-Math.sin(M+e)))+M;
  }else x=Math.log(M*2/e+k.hyperbolicStart);
  const terms=(v:number)=>elliptic?[Math.sin(v)*e,Math.cos(v)*e]:[Math.sinh(v)*e,Math.cosh(v)*e];
  let [es,ec]=terms(x),f=elliptic?x-es-M:es-x-M,count=0;
  while(!(k.keplerTolerance>=Math.abs(f))){
   if(++count>10)return fail('orbit-calculation');
   const fp=elliptic?1-ec:ec-1;
   const d1=-f/fp,b=d1*es/2+fp,d2=-f/b,d3=-f/(d2*d2*ec/6+b);
   x+=d3;[es,ec]=terms(x);f=elliptic?x-es-M:es-x-M;
  }
  tanHalf=elliptic?Math.sqrt((e+1)/(1-e))*Math.tan(x/2):Math.sqrt((e+1)/(e-1))*Math.tanh(x/2);
 }else{
  const qAu=el.q/k.kmPerAu,A=Math.sqrt((e+1)/qAu)*k.gaussK/(qAu*2),W=A*dt/3;
  let s=0,s0:number,guard=0;
  do{s0=s;s=(s0*s0*(s0*2)+W)/((s0*s0+1)*3);if(++guard>1000)return fail('orbit-calculation');}while(!(k.keplerTolerance>Math.abs(s-s0)));
  if(e!==1){
   const gamma=(1-e)/(1+e),B=A*dt;let inner=0,outer:number;
   do{
    outer=s;const s2=s*s;let g=-s2*s,sum=gamma*2*s*s2/3+B,j=1,term:number;
    do{
     if(++j>50)return fail('orbit-calculation');
     g=-g*gamma*s2;term=(j-(j+1)*gamma)/(2*j+1)*g;
     if(Math.abs(term)>k.seriesLimit)return fail('orbit-calculation');
     sum+=term;
    }while(!(k.keplerTolerance>Math.abs(term)));
    let s1:number;
    do{if(++inner>50)return fail('orbit-calculation');s1=s;s=(s*2*s*s/3+sum)/(s*s+1);}while(!(k.keplerTolerance>Math.abs(s-s1)));
   }while(!(k.keplerTolerance>Math.abs(s-outer)));
  }
  tanHalf=s;
 }
 return Math.atan(tanHalf)*2;
}

/** 0x51759c P/Q vectors from i (+0x5e), Ω (+0x68), ω (+0x72), in source order. */
function orientation(el:OrbitElements):readonly [Vector3,Vector3]{
 const sO=Math.sin(el.node),cO=Math.cos(el.node),sw=Math.sin(el.perihelionArgument),cw=Math.cos(el.perihelionArgument),si=Math.sin(el.inclination),ci=Math.cos(el.inclination);
 return [[cw*cO-sw*sO*ci,cw*sO+sw*cO*ci,sw*si],[-sw*cO-cw*sO*ci,-sw*sO+cw*cO*ci,cw*si]];
}

/** 0x517878: heliocentric position (km, frame of the elements: J2000 ecliptic). */
export function heliocentricPosition(el:OrbitElements,t:number):Vector3{
 const nu=trueAnomaly(el,t),s=Math.sin(nu),c=Math.cos(nu);
 const p=(el.e+1)*el.q,r=p/(el.e*c+1);
 const [P,Q]=orientation(el);
 return add(scale(P,r*c),scale(Q,r*s));
}

/** 0x51522c mode 0 (geometric longitude, radians in [0, 2π)) and 0x515434 (radius, AU). */
export function sunGeometric(jd:number):Readonly<{longitude:number;radiusAu:number}>{
 const s=SUN_SERIES,k=EPHEMERIS_CONSTANTS,U=(jd-k.jdJ2000)/s.daysPerUnit;
 let sl=0,sr=0;
 for(let i=0;i<50;i++){
  sl+=Math.sin(U*s.nu[i]+s.alpha[i])*s.l[i];
  if(s.r[i]!==0)sr+=Math.cos(U*s.nu[i]+s.alpha[i])*s.r[i];
 }
 let L=s.rate*U+s.epoch+sl*s.scale;
 L=frac(L/k.twoPi)*k.twoPi;
 if(!(L>=0))L+=k.twoPi;
 return Object.freeze({longitude:L,radiusAu:sr*s.scale+s.radius0});
}

/** 0x4ba87c general precession in longitude (radians): Horner in Julian millennia τ, arcseconds. */
export function generalPrecessionLongitude(jd:number):number{
 const t=(jd-2451545)/365250;
 return ((((((((1.3095e-05*t+0.00017451)*t+-0.0018055)*t+-0.235316)*t+0.07732)*t+111.1971)*t+50290.966)*t)/3600)*EPHEMERIS_CONSTANTS.degreesToRadians;
}
/** 0x4ba990 mean obliquity (radians): Laskar, 7 terms in Julian millennia, arcseconds + 23.43929111°. */
export function meanObliquity(jd:number):number{
 const u=(jd-2451545)/365250;
 return ((((((((7.12e-07*u+-3.905e-05)*u+-0.0024967)*u+-0.005138)*u+1.99925)*u+-0.0155)*u+-468.093)*u)/3600+23.43929111)*EPHEMERIS_CONSTANTS.degreesToRadians;
}

/** 0x51556c + 0x515e8c: Earth heliocentric vector (km) reduced to J2000 by subtracting pA (latitude 0). The Earth's
 * longitude is the Sun's ±π (+π when below π). */
export function earthHeliocentricVector(jd:number):Vector3{
 const k=EPHEMERIS_CONSTANTS,sun=sunGeometric(jd);
 const lon=k.pi<=sun.longitude?sun.longitude-k.pi:sun.longitude+k.pi;
 const r=sun.radiusAu*k.kmPerAu,colat=k.halfPi-0,az=lon-generalPrecessionLongitude(jd);
 const rs=Math.sin(colat)*r;
 return [Math.cos(az)*rs,Math.sin(az)*rs,Math.cos(colat)*r];
}

/** Ecliptic coordinate record (latitude at +0xd, longitude at +0x17, equinox JD at +3). */
export type EclipticCoordinate=Readonly<{jd:number;latitude:number;longitude:number}>;
/** 0x4b99c0: ecliptic precession (Meeus η, Π, p) from coord.jd to targetJd; pole branch keeps the unsigned ArcCos. */
export function precessEcliptic(coord:EclipticCoordinate,targetJd:number):EclipticCoordinate{
 const k=EPHEMERIS_CONSTANTS,e0=coord.jd;
 if(!(targetJd<e0||targetJd>e0))return coord;
 const T=(e0-2451545)/36525,t=(targetJd-e0)/36525,deg=k.degreesToRadians;
 const eta=(((0.000598*T+-0.06603)*T+47.0029+((0.000598*T+-0.03302)+6e-05*t)*t)*t)/3600*deg;
 const Pi=(((0.60622*T+3289.4789)*T+((-869.8089-0.50491*T)+0.03536*t)*t)/3600+174.876384)*deg;
 const p=((((2.22226-4.2e-05*T)*T+5029.0966)+(((1.11113-4.2e-05*T)-6e-06*t)*t))*t)/3600*deg;
 const sb=Math.sin(coord.latitude),cb=Math.cos(coord.latitude),se=Math.sin(eta),ce=Math.cos(eta),spl=Math.sin(Pi-coord.longitude),cpl=Math.cos(Pi-coord.longitude);
 const A=ce*cb*spl-se*sb,B=cb*cpl,C=ce*sb+se*cb*spl;
 let lon=Pi+p-Math.atan2(A,B);
 lon=frac(lon/k.twoPi)*k.twoPi;
 if(!(lon>=0))lon+=k.twoPi;
 const polar=0.01>=k.halfPi-Math.abs(coord.latitude);
 return Object.freeze({jd:targetJd,longitude:lon,latitude:polar?clampedAcos(Math.sqrt(A*A+B*B)):clampedAsin(C)});
}

/** 0x4ba454 with a type-2 record (mean obliquity, no nutation): RA and Dec in radians; RA is not wrapped. */
export function eclipticToEquatorial(coord:EclipticCoordinate):Readonly<{ra:number;dec:number}>{
 const eps=meanObliquity(coord.jd),b=coord.latitude,l=coord.longitude;
 const dec=clampedAsin(Math.cos(eps)*Math.sin(b)+Math.sin(eps)*(Math.sin(l)*Math.cos(b)));
 const ra=Math.cos(l)===0?l:Math.atan2(Math.cos(eps)*(Math.sin(l)*Math.cos(b))-Math.sin(eps)*Math.sin(b),Math.cos(l)*Math.cos(b));
 return Object.freeze({ra,dec});
}

/** 0x515b40 for the stored model: 1 = H,G (IAU two-parameter), 2 = comet (H + 5 log Δ + K log r), otherwise 100. */
export function apparentMagnitude(model:number,h:number,g:number,rAu:number,deltaAu:number,earthSunAu:number):number{
 if(model===1){
  const cosPhase=(deltaAu*deltaAu+rAu*rAu-earthSunAu*earthSunAu)/(rAu*2*deltaAu);
  const x=Math.abs(Math.tan(clampedAcos(cosPhase)/2));
  const phi1=Math.exp(Math.pow(x,0.63)*-3.33),phi2=Math.exp(Math.pow(x,1.22)*-1.87);
  return Math.log10(rAu*deltaAu)*5+h-Math.log10((1-g)*phi1+g*phi2)*2.5;
 }
 if(model===2)return Math.log10(deltaAu)*5+h+Math.log10(rAu)*g;
 return 100;
}

export type AstrometricPosition=Readonly<{
 /** J2000 RA (hours, +24 while negative as the caller does) and Dec (degrees). */
 raHours:number;decDeg:number;
 /** First-pass geometric distance (AU), heliocentric distance at the retarded time and Earth–Sun distance. */
 deltaAu:number;rAu:number;earthSunAu:number;
 /** Final light-time τ (days) and number of asteroid evaluations. */
 lightTimeDays:number;evaluations:number;
 magnitude:number;
 /** The CCD item stores magnitude and Δ as Singles (0x599648..0x599659). */
 magnitudeSingle:number;deltaSingle:number;
}>;

/** Light-time evaluations allowed by the web guard (the original loop has no bound). */
export const LIGHT_TIME_GUARD=100;

/** 0x5157b4 mode 2 + 0x515b40 + caller 0x599593..0x59964f at program JD t. */
export function astrometricPosition(el:OrbitElements,t:number):AstrometricPosition{
 const k=EPHEMERIS_CONSTANTS;
 const earth=earthHeliocentricVector(t),minusEarth=scale(earth,-1);
 let tau=0,delta=NaN,geo:Vector3=[0,0,0],helio:Vector3=[0,0,0],evaluations=0;
 for(;;){
  if(++evaluations>LIGHT_TIME_GUARD)return fail('light-time');
  helio=heliocentricPosition(el,t-tau);
  geo=add(helio,minusEarth);
  const dist=norm(geo)/k.kmPerAu;
  if(tau===0)delta=dist;
  const previous=tau;tau=dist*k.lightDaysPerAu;
  if(k.lightTolerance>=Math.abs(tau-previous))break;
 }
 // 0x4b9ec8 into the J2000 template, then 0x4b99c0 J2000→t and (caller) t→J2000.
 const rr=norm(geo);
 const ecl:EclipticCoordinate={jd:k.jdJ2000,longitude:Math.atan2(geo[1],geo[0]),latitude:k.halfPi-arcCos(geo[2]/rr)};
 const back=precessEcliptic(precessEcliptic(ecl,t),k.jdJ2000);
 const eq=eclipticToEquatorial(back);
 let raHours=eq.ra*k.radiansToHours;
 if(!Number.isFinite(raHours))return fail('nonfinite');
 while(raHours<0)raHours+=24;
 const rAu=norm(helio)/k.kmPerAu,earthSunAu=norm(minusEarth)/k.kmPerAu;
 const magnitude=apparentMagnitude(el.magnitudeModel,el.h,el.g,rAu,delta,earthSunAu);
 return Object.freeze({raHours,decDeg:eq.dec*k.radiansToDegrees,deltaAu:delta,rAu,earthSunAu,lightTimeDays:tau,evaluations,magnitude,
  magnitudeSingle:Math.fround(magnitude),deltaSingle:Math.fround(delta)});
}

/** Angular separation (degrees) between two RA (hours)/Dec (degrees) pairs; analysis helper, not an original contract. */
export function separationDegrees(ra1:number,dec1:number,ra2:number,dec2:number):number{
 const d=Math.PI/180,a=ra1*15*d,b=ra2*15*d,x=dec1*d,y=dec2*d;
 const h=Math.sin((y-x)/2)**2+Math.cos(x)*Math.cos(y)*Math.sin((b-a)/2)**2;
 return 2*Math.asin(Math.min(1,Math.sqrt(h)))/d;
}
