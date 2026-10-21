import{describe,expect,it}from'vitest';
import{WEDGE_C_EXTENDED,wedgeBitsHex,wedgeDecimalToSingle,wedgeSingleExact,wedgeSingleFromBits,wedgeVelocityFromZ,wedgeZFromVelocity}from'./wedgeNumeric';
// Independent controls: IEEE-754 reference encodings, the c decimal published in
// docs/HUBBLE-VELOCITY.md, and Math.fround cross-checks away from midpoints.
// All values are synthetic test vectors, not CLEA observations.
const single=(text:string)=>{const r=wedgeDecimalToSingle(text);if(r.status!=='value')throw new Error('range');return r;};
describe('wedge binary32/Extended numerics',()=>{
 it('pins the Extended c constant to the documented exact decimal',()=>{
  const{n,e}=WEDGE_C_EXTENDED,places=-e,digits=(n*5n**BigInt(places)).toString();
  expect(digits.slice(0,-places)+'.'+digits.slice(-places)).toBe('299792.457999999999998408384271897375583648681640625');
 });
 it('rounds decimals to IEEE binary32 including subnormal, signed zero and range',()=>{
  expect(wedgeBitsHex(single('0.1').single)).toBe('3dcccccd');
  expect(wedgeBitsHex(single('1').single)).toBe('3f800000');
  expect(wedgeBitsHex(single('-0').single)).toBe('80000000');
  expect(wedgeBitsHex(single('3.4028235e38').single)).toBe('7f7fffff');
  expect(wedgeDecimalToSingle('3.5e38').status).toBe('range');
  expect(wedgeBitsHex(single('1e-45').single)).toBe('00000001');
  expect(wedgeBitsHex(single('1e-46').single)).toBe('00000000');
  expect(wedgeBitsHex(single('1.1754942e-38').single)).toBe('007fffff');
 });
 it('resolves an exact binary32 tie to even and flags near-midpoint inputs where double rounding fails',()=>{
  const tie=single('1.000000059604644775390625');expect(wedgeBitsHex(tie.single)).toBe('3f800000');expect(tie.boundary).toBe(true);
  const above=single('1.000000059604644775390626');expect(wedgeBitsHex(above.single)).toBe('3f800001');expect(above.boundary).toBe(true);
  // Browser double rounding gets this one wrong; the exact path does not.
  expect(Math.fround(parseFloat('1.000000059604644775390626'))).toBe(1);
  expect(single('6000').boundary).toBe(false);
 });
 it('derives z=Single(v/c) and v=Single(c·z) consistently with an independent fround path away from ties',()=>{
  for(const v of['1000','3000','6000','12345.678','29979.2458','-1500.25']){
   const vs=single(v).single,z=wedgeZFromVelocity(vs);
   expect(z.value).toBe(Math.fround(vs.value/299792.458));
  }
  for(const z of['0.01','0.02','0.04','0.0333']){
   const zs=single(z).single,v=wedgeVelocityFromZ(zs);
   expect(v?.value).toBe(Math.fround(zs.value*299792.458));
  }
  expect(wedgeZFromVelocity(single('0').single).bits).toBe(0);
  expect(wedgeZFromVelocity(single('-0').single).bits).toBe(0x80000000);
 });
 it('reports the unmasked FSTP overflow of c·z as null instead of a value',()=>{
  expect(wedgeVelocityFromZ(single('1e38').single)).toBeNull();
  expect(wedgeVelocityFromZ(single('1e33').single)).not.toBeNull();
 });
 it('prints exact binary32 decimals and validates bit inputs',()=>{
  expect(wedgeSingleExact(wedgeSingleFromBits(0x3dcccccd))).toBe('0.100000001490116119384765625');
  expect(wedgeSingleExact(wedgeSingleFromBits(0x80000000))).toBe('-0');
  expect(()=>wedgeSingleFromBits(-1)).toThrow(RangeError);
  expect(()=>wedgeZFromVelocity(wedgeSingleFromBits(0x7f800000))).toThrow(RangeError);
 });
});
