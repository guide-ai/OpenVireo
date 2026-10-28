import {readFileSync} from 'node:fs';
import {describe,expect,test} from 'vitest';
import {decodeNakedEyeFile} from './nakedEye';
import {buildNakedEyeSky,nakedEyeDrawLevel,nakedEyeVisible} from './nakedEyeSky';

/** Independent Python witness (binary64, not an x87 oracle): analysis/front-o-info-forms/tools/nakedeye_witness.py,
 * SHA-256 58e2615f8ffcb666797a66e89f4e2ba2b1815aac59d1cbb0153aab03b71f01e6; output nakedeye-witness.json (first four stars,
 * admitted counts). Sites from data/observatory/compiled-optical-profiles.json; V4 is a synthetic southern site. */
const VECTORS=[{"name": "V1", "site": [0.6953440221701371, -1.3481020105916126], "ut": "2009-06-01T04:00:00", "tel": [0.0, 0.0], "azc": 180.0, "jd": 2454983.6666666665, "gast": 5.406625672045211, "admitted": 96, "first": [[1856, 33.303251806034574, 179.20560699999388, 114.85985989813622, 207.61370067047352, 14], [1859, 22.104783429321863, 178.93393617007231, 112.35325027666411, 280.96366853794177, 14], [1861, 40.08651022318589, 178.70231459464793, 112.31361980325336, 163.1833580381324, 13], [1863, 40.96627334862499, 178.5951081358331, 111.7871403008649, 157.42090956650634, 14]]}, {"name": "V2", "site": [0.5578654065209432, -1.9477874452256718], "ut": "2000-01-01T12:00:00", "tel": [0.0, 0.0], "azc": 180.0, "jd": 2451545.0, "gast": 4.894900573921682, "admitted": 64, "first": [[1372, 15.727804491309259, -177.06338197441556, 141.88391206460233, 322.73288058192435, 13], [1383, 15.374596446797684, -178.44527400112906, 131.60583559890938, 325.0463932734752, 14], [1396, 71.34389855335067, 179.66808022784107, 119.1779854757572, -41.55253552444688, 14], [1397, 54.383794279619565, 179.4717127367581, 117.61819638210176, 69.53614746849186, 13]]}, {"name": "V3", "site": [0.6953440221701371, -1.3481020105916126], "ut": "2009-12-15T02:00:00", "tel": [5.5, 20.0], "azc": 103.06589691983622, "jd": 2455180.5833333335, "gast": 1.9873670271425927, "admitted": 258, "first": [[282, 70.22947304279306, 156.94610751764793, 261.09824942566604, -34.25304843029454, 13], [283, 70.22947304279306, 156.94610751764793, 261.09824942566604, -34.25304843029454, 13], [304, 67.67589987762926, 151.00397998576108, 260.9733308884555, -17.52714419847166, 13], [309, 68.55302423990116, 147.65760124687966, 246.22847642488603, -23.272308771352613, 14]]}, {"name": "V4", "site": [-0.5270894341022875, -1.2356931104119853], "ut": "2009-06-01T04:00:00", "tel": [0.0, 0.0], "azc": 0.0, "jd": 2454983.6666666665, "gast": 5.406625672045211, "admitted": 147, "first": [[1722, 20.37311705010794, -21.087053876521633, -33.04228949051503, 292.306083321793, 14], [1744, 26.213780394365475, -20.177851868080467, -20.149186847490228, 254.04973841690614, 11], [1746, 18.753804299287737, -17.24124979560019, -6.393993980916036, 302.91258183966534, 10], [1748, 27.012952614376314, -19.76844614882016, -16.34930455858614, 248.81516037583515, 13]]}] as const;
const records=decodeNakedEyeFile(new Uint8Array(readFileSync('public/original/nakedeye/NkdEye.dat')));
const D=180/Math.PI;
describe('naked-eye dome sky (0x553a10, 0x4bac0c, 0x5550b8, 0x555464/0x555524) against the independent witness',()=>{
 for(const v of VECTORS)test(v.name,()=>{
  const tel=v.tel[0]===0?null:{ra:v.tel[0],dec:v.tel[1]};
  const sky=buildNakedEyeSky(records,{latitudeRadians:v.site[0],longitudeRadians:v.site[1]},Date.parse(v.ut+'Z'),tel);
  expect(sky.jd).toBeCloseTo(v.jd,8);expect(sky.gast).toBeCloseTo(v.gast,9);
  expect(((sky.azCenter*D)%360+360)%360).toBeCloseTo(v.azc,7);
  expect(sky.points).toHaveLength(v.admitted);
  v.first.forEach(([index,alt,az,x,y,level],i)=>{const p=sky.points[i];
   expect(p.record.index).toBe(index);expect(p.alt*D).toBeCloseTo(alt,7);expect(p.az*D).toBeCloseTo(az,7);
   expect(p.x).toBeCloseTo(x,6);expect(p.y).toBeCloseTo(y,6);expect(nakedEyeDrawLevel(p.level)).toBe(level);});
 });
 test('the original wrap after the cos scaling rejects stars just west of south',()=>{
  const r=Math.PI/180;
  expect(nakedEyeVisible(40*r,179*r,Math.PI)).toBe(true);
  expect(nakedEyeVisible(40*r,-179*r,Math.PI)).toBe(false);// a correct wrap would admit it (2° away)
 });
});
