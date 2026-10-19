import { describe, expect, it } from 'vitest';
import { galaxySelectionRadius, nearestCatalogObject, ObjectSelectionError, selectCatalogObject, createNativeSelectionScene, type NativeSelectionScene } from './objectSelection';

const at = (id: string, x: number, y = 0) => ({ id, x, y });
const galaxy = (id: string, x: number, majorArcminutes = 1, y = 0) => ({ ...at(id, x, y), majorArcminutes });
const select = (stars:ReturnType<typeof at>[],galaxies:ReturnType<typeof galaxy>[],_x:number,_y:number,scale:number,throughput?:number) => {
  const sky=(row:ReturnType<typeof at>)=>({id:row.id,ra:12-row.x/1024,dec:0});
  const frame={width:1024,height:scale*15,fieldDegrees:15,center:{ra:12,dec:0},population:{coverage:'complete' as const,provenance:'synthetic exact-rational contract fixture'}};
  const scene=createNativeSelectionScene(stars.map(sky),galaxies.map(row=>({...sky(row),majorArcminutes:row.majorArcminutes})),frame);
  return selectCatalogObject(scene,512,frame.height/2,throughput);
};
describe('native catalog selection with explicit projected scene inputs', () => {
  it('constructs only explicit native frames from sky positions and rejects limited/display-space scenes', () => {
    const frame={width:1024,height:1800,fieldDegrees:15,center:{ra:12,dec:0},population:{coverage:'complete' as const,provenance:'synthetic projection test'}};
    const scene=createNativeSelectionScene([{id:'west',ra:11.75,dec:0}],[],frame);
    expect(scene.stars[0].x).toBe(768);expect(scene.stars[0].y).toBe(900);expect(scene.verticalPixelsPerDegree).toBe(120);
    expect(Object.isFrozen(scene)).toBe(true);expect(Object.isFrozen(scene.stars)).toBe(true);
    const wrapped=createNativeSelectionScene([{id:'wrap',ra:23.5,dec:60}],[],{...frame,width:120,height:240,center:{ra:0,dec:0}});
    expect(wrapped.stars[0].x).toBeCloseTo(90,12);expect(wrapped.stars[0].y).toBe(-840); // object cosine and independent height
    expect(()=>createNativeSelectionScene([],[],{...frame,population:{coverage:'limited',provenance:'display subset'}})).toThrowError(expect.objectContaining({code:'scene'}));
    expect(()=>selectCatalogObject({stars:[],galaxies:[],verticalPixelsPerDegree:120} as unknown as NativeSelectionScene,350,350)).toThrowError(expect.objectContaining({code:'scene'}));
    if(false){
      // @ts-expect-error A display-space array is not a branded native scene.
      selectCatalogObject([at('display',350)],350,350);
    }
  });
  it('uses a strict350-pixel nearest sentinel and preserves collection order on equal distance', () => {
    expect(nearestCatalogObject([], 0, 0)).toBeNull();
    expect(nearestCatalogObject([at('boundary',350)], 0, 0)).toBeNull();
    const nearest = nearestCatalogObject([at('first',3,4),at('second',-3,-4),at('far',349)],0,0)!;
    expect(nearest.object.id).toBe('first'); expect(nearest.distance).toBe(5); expect(nearest.index).toBe(0);
    expect(nearestCatalogObject([at('near boundary',349)],0,0)?.distance).toBe(349);
  });
  it('keeps galaxy angular diameter, native scale, zero fallback and chosen nearest-even radius policy distinct', () => {
    expect(galaxySelectionRadius(1,600)).toBe(5);
    expect(galaxySelectionRadius(0,600)).toBe(3); // .5 arcmin ->2.5, rounded2 then minimum3
    expect(galaxySelectionRadius(0,1200)).toBe(5);
    expect(select([], [galaxy('negative-zero Single',0,-Number.MIN_VALUE)],0,0,1200).galaxyRadius).toBe(5);
    expect(galaxySelectionRadius(.5,1800)).toBe(8); //7.5 rounds8
    expect(galaxySelectionRadius(.5,2040)).toBe(8); //8.5 rounds8, not half-up9
    expect(galaxySelectionRadius(.85,1200)).toBe(9); // Single rounds above8.5; unrounded Number would tie to8
  });
  it('rejects the exact galaxy radius and does not silently choose a farther star', () => {
    expect(select([at('star',5)],[galaxy('galaxy',3)],0,0,120).kind).toBe('none');
    expect(select([at('star',5)],[galaxy('galaxy',2)],0,0,120)).toMatchObject({kind:'galaxy',object:{id:'galaxy'}});
    expect(select([at('star',2)],[galaxy('galaxy',3)],0,0,120)).toMatchObject({kind:'star',object:{id:'star'}});
    expect(select([],[],0,0,120).kind).toBe('none');
    // The original selection stage has no new star-aperture cutoff.
    expect(select([at('star',349)],[],0,0,120).kind).toBe('star');
  });
  it('requires actual star throughput only in the overlap branch, including equal candidate distances', () => {
    for (const starDistance of [1,2]) {
      const stars=[at('star',starDistance)],galaxies=[galaxy('galaxy',2)];
      expect(select(stars,galaxies,0,0,120).kind).toBe('throughput-required');
      expect(select(stars,galaxies,0,0,120,0)).toMatchObject({kind:'galaxy',object:{id:'galaxy'}});
      expect(select(stars,galaxies,0,0,120,Number.MIN_VALUE)).toMatchObject({kind:'star',object:{id:'star'}});
    }
    expect(select([], [galaxy('galaxy',0)],0,0,120).kind).toBe('galaxy');
    expect(select([], [galaxy('outside sentinel',350,2000)],0,0,120).kind).toBe('none');
  });
  it('copies/freeze candidates and never changes caller arrays or candidate coordinates', () => {
    const stars=[{id:'star',ra:12,dec:0}],galaxies=[{id:'galaxy',ra:12-1/1024,dec:0,majorArcminutes:1}];
    const scene=createNativeSelectionScene(stars,galaxies,{width:1024,height:1800,fieldDegrees:15,center:{ra:12,dec:0},population:{coverage:'complete',provenance:'synthetic ownership test'}});
    const result=selectCatalogObject(scene,512,900);
    stars[0].ra=5;galaxies[0].majorArcminutes=50;
    expect(result.star?.object.x).toBe(512);expect(result.galaxy?.object.majorArcminutes).toBe(1);
    expect(Object.isFrozen(result)).toBe(true);expect(Object.isFrozen(result.star)).toBe(true);expect(Object.isFrozen(result.star?.object)).toBe(true);
  });
  it('rejects sparse/nonfinite or oversized scenes, invalid integer points, unsupported diameters and overflowing geometry', () => {
    for (const scene of [new Array(2),[at('',0)],[at('bad',NaN)],[at('overflow',1e308)]]) expect(()=>nearestCatalogObject(scene,0,0)).toThrow(ObjectSelectionError);
    expect(()=>nearestCatalogObject(new Array(200001),0,0)).toThrowError(expect.objectContaining({code:'scene'}));
    for (const point of [NaN,.5,2**31,-(2**31)-1]) expect(()=>nearestCatalogObject([],point,0)).toThrowError(expect.objectContaining({code:'point'}));
    for (const major of [-1,NaN,Infinity]) expect(()=>select([], [galaxy('bad',0,major)],0,0,120)).toThrowError(expect.objectContaining({code:'scene'}));
    for (const scale of [0,-1,NaN,Infinity]) expect(()=>select([],[],0,0,scale)).toThrowError(expect.objectContaining({code:'scale'}));
    for (const throughput of [-1,NaN,Infinity]) expect(()=>select([],[],0,0,120,throughput)).toThrowError(expect.objectContaining({code:'throughput'}));
    expect(()=>galaxySelectionRadius(1e30,1e30)).toThrowError(expect.objectContaining({code:'overflow'}));
  });
});
