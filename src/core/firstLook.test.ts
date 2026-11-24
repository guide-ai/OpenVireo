import {describe,expect,it} from 'vitest';
import {FIRST_LOOK_STEPS,firstLookProgress,observatoryBandStep,type FirstLookState} from './firstLook';
import {companionNow,companionTarget} from './guideCompanion';

const START:FirstLookState={open:false,pointedCentred:false,canAccess:false,spectrumSeen:false};
const at=(s:Partial<FirstLookState>)=>firstLookProgress({...START,...s});

describe('first look (Front NEWCOMER NC1): the current step comes from the observatory\'s own state',()=>{
 it('walks the four steps in order: dome, point, look, spectrum, then its closing state',()=>{
  expect(FIRST_LOOK_STEPS).toEqual(['dome','point','look','spectrum']);
  expect(at({}).next).toBe('dome');
  expect(at({open:true}).next).toBe('point');
  // Pointed and centred in the finder view: the telescope view is next.
  expect(at({open:true,pointedCentred:true}).next).toBe('look');
  expect(at({open:true,pointedCentred:true,canAccess:true}).next).toBe('spectrum');
  const done=at({open:true,pointedCentred:true,canAccess:true,spectrumSeen:true});
  expect(done).toEqual({done:{dome:true,point:true,look:true,spectrum:true},next:'done'});
 });
 it('marks go back with the state: closing the dome or moving away takes the walk back',()=>{
  expect(at({open:false,pointedCentred:true,canAccess:false}).next).toBe('dome');
  // A pointing that is centred but with the dome closed does not count as the pointing step.
  expect(at({open:false,pointedCentred:true}).done.point).toBe(false);
  // Another object selected (no longer centred), or back in the finder view.
  expect(at({open:true,pointedCentred:false}).next).toBe('point');
  expect(at({open:true,pointedCentred:true,canAccess:false}).next).toBe('look');
 });
 it('the spectrum mark is one-way: once a library spectrum was shown, the first look stays done whatever is pointed at next',()=>{
  expect(at({spectrumSeen:true}).next).toBe('done');
  expect(at({open:true,spectrumSeen:true}).next).toBe('done');
 });
 it('an object without a library spectrum (M81) stays on the spectrum step; one without a photograph (NGC 4889) completes "look" all the same',()=>{
  // M81: the telescope view shows its photograph (look done); the analyser button is absent, so nothing sets the flag.
  expect(at({open:true,pointedCentred:true,canAccess:true}).next).toBe('spectrum');
  // NGC 4889: "look" depends on the telescope view only, not on a photograph being there.
  const ngc4889=at({open:true,pointedCentred:true,canAccess:true});
  expect(ngc4889.done.look).toBe(true);
  expect(at({open:true,pointedCentred:true,canAccess:true,spectrumSeen:true}).next).toBe('done');
 });
 it('the observatory band\'s current item reads the same rule',()=>{
  expect(observatoryBandStep({open:false,pointedCentred:false,canAccess:false})).toBe(0);
  expect(observatoryBandStep({open:false,pointedCentred:true,canAccess:false})).toBe(0);
  expect(observatoryBandStep({open:true,pointedCentred:false,canAccess:false})).toBe(1);
  expect(observatoryBandStep({open:true,pointedCentred:true,canAccess:false})).toBe(2);
  expect(observatoryBandStep({open:true,pointedCentred:true,canAccess:true})).toBe(2);
 });
 it('the companion shows it as a four-step guide whose closing state has no step number, and Show me where uses the step itself',()=>{
  expect(companionNow({lab:'first-look',progress:at({open:true})})).toEqual({lab:'first-look',step:'point',index:2,total:4,allDone:false});
  const done={lab:'first-look',progress:at({spectrumSeen:true})} as const;
  expect(companionNow(done)).toEqual({lab:'first-look',step:'done',index:4,total:4,allDone:true});
  expect(companionTarget(done)).toBe('done');
  expect(companionTarget({lab:'first-look',progress:at({open:true,pointedCentred:true})})).toBe('look');
 });
});
