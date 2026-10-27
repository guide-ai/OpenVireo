/** Observatory site editing (OB-ST, docs/OPTICAL-OBSERVATORY-PROVENANCE.json). CLEA_VEO.exe 781bc970…c54c, static only.
 * TStationDlg "Site Parameters" (OB-ST-02/03) edits one telescope record's site block: name ShortString[40], longitude and
 * latitude in radians (West/South negative), horizon radians, height Single metres, UT − local standard time Single hours.
 * File ▸ Site Information (OB-ST-01) lists the running site read-only.
 *
 * WEB-ST-01 (coordinator decision): natively TStationDlg is reached only from the instructor's Telescope Parameters dialog;
 * here a student may override the site of the selected telescope from the observatory, and the override drives ONLY the
 * clocks (local time, LST; JD is site-independent) and the horizon readout/Limit Slewing guard. Acquisitions, telescope
 * profiles and pinned journals keep the compiled site (they never read this module). Whether native edits reach a running
 * observatory before the next telescope setup is not traced (OB-ST-04). Pure: no React or I/O. */
import {opticalIndex,opticalProfile,type OpticalIndex} from './opticalTelescope';
import {formatFixed,parseDelphiFloat,splitSexagesimal} from './radioAntenna';

export type ObservatorySite=Readonly<{name:string;longitudeRadians:number;latitudeRadians:number;horizonRadians:number;heightMetres:number;utMinusLocalHours:number}>;
export type SiteOverrides=Readonly<Partial<Record<OpticalIndex,ObservatorySite>>>;
export const NO_SITE_OVERRIDES:SiteOverrides=Object.freeze({});

export const STATION_DIALOG_CAPTIONS=Object.freeze({
 form:'Site Parameters',name:'Site Name:',utLocal:'Local Time Difference',altitude:'Altitude',horizon:'Horizon',longitude:'Longitude',latitude:'Latitude',
 deg:'Deg',min:'Min',sec:'Sec',ew:Object.freeze(['East','West']as const),ns:Object.freeze(['North','South']as const),ok:'&OK',cancel:'&Cancel',
 hints:Object.freeze({name:'Name of observatory or site.',utLocal:'UT minus local Standard (not Daylight) Time in hours',lngDeg:'0-180',lngMin:'0-59',lngSec:'0.00-59.99',latDeg:'0-90',latMin:'0-59',latSec:'0.00-59.99',altitude:'Meters above sea level',horizon:'Horizon Altitude in Degrees'}),
 maxLength:Object.freeze({name:79,utLocal:3}),
 errorCaption:'Input Error!',utOrHeight:'Error In Station Altitude or Local Time Difference!',longitudeError:'Longitude is Invalid!',latitudeError:'Latitude is Invalid!',
});
export const SITE_INFORMATION_LITERALS=Object.freeze({
 caption:'Current Site & Telescope Parameters',name:'Site Name/ID: ',longitude:'Longitude: ',latitude:'Latitude: ',altitude:'Altitude: ',horizon:'Horizon Height: ',
 timeZone:'Time Zone (UT-Local Time): ',telescope:'Telescope: ',aperture:'Aperture: ',focal:'Focal Length: ',
 west:' W',east:' E',south:' S',north:' N',meters:' Meters',degrees:' Degrees',hour:' Hour',hours:' Hours',mm:' mm',
});
const RAD=Math.PI/180;

export function compiledObservatorySite(index:OpticalIndex):ObservatorySite{
 const s=opticalProfile(index).site;
 return Object.freeze({name:s.name,longitudeRadians:Number(s.longitude.exactDecimalRadians),latitudeRadians:Number(s.latitude.exactDecimalRadians),horizonRadians:Number(s.horizon.exactDecimalRadians),heightMetres:s.heightMetres,utMinusLocalHours:s.utMinusLocalStandardHours});
}
export function effectiveObservatorySite(overrides:SiteOverrides,index:OpticalIndex):ObservatorySite{return overrides[opticalIndex(index)]??compiledObservatorySite(index);}

export type StationField='name'|'utLocal'|'lngDeg'|'lngMin'|'lngSec'|'latDeg'|'latMin'|'latSec'|'altitude'|'horizon';
export type StationDraft=Readonly<Record<StationField,string>&{ew:0|1;ns:0|1}>;
/** OB-ST-02 FormCreate prefill: IntToStr degrees/minutes and FloatToStrF(2) seconds of |angle|, East/North when the angle
 * is positive (> 0; 0 shows West/South as natively), FloatToStrF(1) for UT − local, height and horizon degrees. The split
 * is the ported 0x486bc0 (splitSexagesimal); FloatToStrF is formatFixed (web policy WEB-HL-07). */
export function stationDraft(site:ObservatorySite):StationDraft{
 const dms=(radians:number)=>{const s=splitSexagesimal(Math.abs(radians/RAD),2);return [String(s.whole),String(s.minutes),formatFixed(s.seconds,2)] as const;};
 const [lngDeg,lngMin,lngSec]=dms(site.longitudeRadians),[latDeg,latMin,latSec]=dms(site.latitudeRadians);
 return Object.freeze({name:site.name,utLocal:formatFixed(site.utMinusLocalHours,1),lngDeg,lngMin,lngSec,ew:site.longitudeRadians>0?0:1,latDeg,latMin,latSec,ns:site.latitudeRadians>0?0:1,
  altitude:formatFixed(site.heightMetres,1),horizon:formatFixed(site.horizonRadians/RAD,1)});
}
export type StationResult=Readonly<{status:'ok';site:ObservatorySite}|{status:'error';message:string}|{status:'unsupported';field:'name'|'horizon'}>;
/** OB-ST-03 OKBtnClick order: UT − local, height and horizon parse (|UT − local| ≤ 12), then longitude d + m/60 + s/3600 in
 * [0, 180] (West negates), then latitude in [0, 90] (South negates); bounds inclusive. Singles are Math.fround.
 * WEB: the name must be printable ASCII of at most 40 characters (the ShortString[40] the dialog truncates to) and the
 * horizon within ±90° (no native range check; the horizon readout needs it). */
export function parseStationDraft(d:StationDraft):StationResult{
 const C=STATION_DIALOG_CAPTIONS,err=(message:string):StationResult=>Object.freeze({status:'error',message});
 const ut=parseDelphiFloat(d.utLocal),height=parseDelphiFloat(d.altitude),horizon=parseDelphiFloat(d.horizon);
 if(ut===null||height===null||horizon===null||Math.abs(Math.fround(ut))>12)return err(C.utOrHeight);
 const angle=(a:string,b:string,c:string,max:number)=>{const x=parseDelphiFloat(a),y=parseDelphiFloat(b),z=parseDelphiFloat(c);if(x===null||y===null||z===null)return null;const v=x+y/60+z/3600;return Number.isFinite(v)&&v>=0&&v<=max?v:null;};
 const lng=angle(d.lngDeg,d.lngMin,d.lngSec,180);if(lng===null)return err(C.longitudeError);
 const lat=angle(d.latDeg,d.latMin,d.latSec,90);if(lat===null)return err(C.latitudeError);
 const name=d.name.slice(0,40);
 if(!/^[\x20-\x7e]*$/.test(name))return Object.freeze({status:'unsupported',field:'name'});
 if(!Number.isFinite(Math.fround(height))||Math.abs(horizon)>90)return Object.freeze({status:'unsupported',field:'horizon'});
 return Object.freeze({status:'ok',site:Object.freeze({name,utMinusLocalHours:Math.fround(ut),heightMetres:Math.fround(height),horizonRadians:horizon*RAD,
  longitudeRadians:(d.ew===1?-1:1)*lng*RAD,latitudeRadians:(d.ns===1?-1:1)*lat*RAD})});
}
/** OB-ST-01 Site Information lines (the horizon line only while Limit Slewing is on). Angles: 0x486ca0 with digits 0 and
 * '°', "'", '"' separators, here whole-second rounding of |angle| (web policy). */
export function siteInformationLines(site:ObservatorySite,index:OpticalIndex,limitSlewing:boolean):readonly string[]{
 const L=SITE_INFORMATION_LITERALS,p=opticalProfile(index);
 const dms=(radians:number)=>{const total=Math.round(Math.abs(radians/RAD)*3600),d=Math.trunc(total/3600),m=Math.trunc(total%3600/60),s=total%60;return `${String(d).padStart(3,' ')}°${String(m).padStart(2,'0')}'${String(s).padStart(2,'0')}"`;};
 const lines=[L.name+site.name,L.longitude+dms(site.longitudeRadians)+(site.longitudeRadians<0?L.west:L.east),L.latitude+dms(site.latitudeRadians)+(site.latitudeRadians<0?L.south:L.north),L.altitude+formatFixed(site.heightMetres,1)+L.meters];
 if(limitSlewing)lines.push(L.horizon+formatFixed(site.horizonRadians/RAD,1)+L.degrees);
 lines.push(L.timeZone+formatFixed(site.utMinusLocalHours,1)+(Math.abs(site.utMinusLocalHours)===1?L.hour:L.hours),'',L.telescope+p.name,L.aperture+formatFixed(p.apertureMM,0)+L.mm,L.focal+formatFixed(p.focalLengthMM,0)+L.mm);
 return Object.freeze(lines);
}

/** v26 persistence: only explicit overrides, by telescope index, re-admitted through the dialog parse (no other path). */
export function portableSiteOverrides(o:SiteOverrides):unknown{
 return Object.fromEntries(([0,1,2] as const).filter(i=>o[i]).map(i=>[String(i),{...o[i]!}]));
}
export function readSiteOverrides(value:unknown):SiteOverrides{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid site overrides');
 const out:Partial<Record<OpticalIndex,ObservatorySite>>={};
 for(const [key,raw] of Object.entries(value as Record<string,unknown>)){
  if(!['0','1','2'].includes(key)||!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid site override');
  const r=raw as Record<string,unknown>,keys=['name','longitudeRadians','latitudeRadians','horizonRadians','heightMetres','utMinusLocalHours'];
  if(Object.keys(r).length!==keys.length||!keys.every(k=>Object.hasOwn(r,k)))throw new Error('Invalid site override');
  const s=r as unknown as ObservatorySite;
  if(typeof s.name!=='string'||s.name.length>40||!/^[\x20-\x7e]*$/.test(s.name)||[s.longitudeRadians,s.latitudeRadians,s.horizonRadians,s.heightMetres,s.utMinusLocalHours].some(v=>typeof v!=='number'||!Number.isFinite(v))
   ||Math.abs(s.longitudeRadians)>Math.PI*(1+1e-15)||Math.abs(s.latitudeRadians)>Math.PI/2*(1+1e-15)||Math.abs(s.horizonRadians)>Math.PI/2*(1+1e-15)||Math.abs(s.utMinusLocalHours)>12||Math.fround(s.heightMetres)!==s.heightMetres||Math.fround(s.utMinusLocalHours)!==s.utMinusLocalHours)throw new Error('Invalid site override');
  out[Number(key) as OpticalIndex]=Object.freeze({name:s.name,longitudeRadians:s.longitudeRadians,latitudeRadians:s.latitudeRadians,horizonRadians:s.horizonRadians,heightMetres:s.heightMetres,utMinusLocalHours:s.utMinusLocalHours});
 }
 return Object.freeze(out);
}
