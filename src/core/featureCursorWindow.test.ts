import{it,expect}from'vitest';
import{featureCursorAnchor,featureCursorLocation,featureCursorPoint,moveFeatureCursor,featureDraftMarkers}from'./featureCursor';
import{FULL_CLASSIFICATION_VIEW,zoomClassification,panClassification}from'./classificationViewport';
const window={minimum:4075,maximum:4225};
it('maps a zoomed measurement window to the same manual height scale using independent fractional positions',()=>{
 for(const[x,w]of[[60,4075],[275,4112.5],[490,4150],[705,4187.5],[920,4225]])for(const[y,i]of[[56,1],[118.5,.75],[243.5,.25],[306,0]]){
  expect(featureCursorPoint(x,y,window)).toEqual({wavelength:w,intensity:i});expect(featureCursorLocation({wavelength:w,intensity:i},window)).toEqual({x,y});
 }
});
it('hides off-window marks without clamping them to false edges or changing any scientific draft strings',()=>{
 const d=Object.freeze({unknownId:'manual',center:'4150.000000',left:'4100.123456',leftContinuum:'.987654',right:'4200.654321',rightContinuum:'.999999'}),before=JSON.stringify(d),marks=featureDraftMarkers(d),shifted={minimum:4160,maximum:4198};
 expect(featureCursorLocation({wavelength:marks.center!,intensity:.5},shifted)).toBeNull();expect(featureCursorLocation(marks.left!,shifted)).toBeNull();expect(featureCursorLocation(marks.right!,shifted)).toBeNull();expect(JSON.stringify(d)).toBe(before);
 expect(featureCursorLocation(marks.left!,window)).not.toBeNull();expect(featureCursorLocation(marks.right!,window)).not.toBeNull();
});
it('rejects invalid manual windows rather than extending the width admission domain',()=>{
 for(const v of[{minimum:3500,maximum:4500},{minimum:3900,maximum:4600},{minimum:4200,maximum:4200},{minimum:4300,maximum:4100},{minimum:NaN,maximum:4500},{minimum:3900,maximum:Infinity}]){
  expect(()=>featureCursorPoint(490,181,v)).toThrow();expect(()=>featureCursorLocation({wavelength:4200,intensity:.5},v)).toThrow();expect(()=>featureCursorAnchor(v,4200)).toThrow();expect(()=>moveFeatureCursor({wavelength:4200,intensity:.5},'ArrowLeft',false,v)).toThrow();
 }
 expect(featureCursorPoint(59,181,window)).toBeNull();expect(featureCursorPoint(490,307,window)).toBeNull();
});
it('seeds focus at a visible center or the window midpoint and confines the existing keyboard steps to that window',()=>{
 expect(featureCursorAnchor(window,4150)).toEqual({wavelength:4150,intensity:.5});for(const center of[null,3901,4499,NaN,Infinity])expect(featureCursorAnchor(window,center)).toEqual({wavelength:4150,intensity:.5});
 expect(moveFeatureCursor({wavelength:4078,intensity:.5},'ArrowLeft',true,window)).toEqual({wavelength:4075,intensity:.5});expect(moveFeatureCursor({wavelength:4224,intensity:.5},'ArrowRight',true,window)).toEqual({wavelength:4225,intensity:.5});expect(moveFeatureCursor({wavelength:4200,intensity:.5},'ArrowUp',false,window)).toEqual({wavelength:4200,intensity:.51});
});
it('reuses the recovered interval policy through a complete zoom/pan sequence without changing retained manual scalars',()=>{
 const center=4150;let v=zoomClassification(FULL_CLASSIFICATION_VIEW,'in',center);expect(v).toMatchObject({minimum:4000,maximum:4300,zoom:2});v=zoomClassification(v,'in',center);expect(v).toMatchObject({...window,zoom:4});
 v=panClassification(v,'right');expect(v).toMatchObject({minimum:4090,maximum:4240,zoom:4});expect(featureCursorPoint(490,181,v)).toEqual({wavelength:4165,intensity:.5});expect(center).toBe(4150);
});
