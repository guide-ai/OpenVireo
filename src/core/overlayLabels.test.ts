import {describe,expect,it} from 'vitest';
import {SKY_LABEL_GAP,SKY_SAME_RING,multiSpecNumberBaseline,skyLabelX,skyLabelXs} from './overlayLabels';

describe('sky-map label placement (Front SKY-LABELS, web overlay)',()=>{
 it('keeps a label that fits on the right of its ring, unchanged',()=>{
  expect(skyLabelX(350,120,700)).toBe(350+SKY_LABEL_GAP);
  expect(skyLabelX(700-SKY_LABEL_GAP-120,120,700)).toBe(700-120);
 });
 it('draws a label at the right edge left of its ring, ending 13 units before it (Coma-1 at x≈691.8)',()=>{
  const x=skyLabelX(691.8128,140,700);
  expect(x+140).toBeCloseTo(691.8128-SKY_LABEL_GAP,10);
  expect(x).toBeGreaterThanOrEqual(0);
 });
 it('flips only when the left has more room, so a label wider than both sides stays where it was',()=>{
  expect(skyLabelX(300,690,700)).toBe(313);
  expect(skyLabelX(400,690,700)).toBe(400-13-690);
 });
 it('one unit past the edge flips; exactly at the edge does not',()=>{
  expect(skyLabelX(600,87,700)).toBe(613);
  expect(skyLabelX(600,88,700)).toBe(600-13-88);
 });
 it('places the labels on one ring as a group, by the widest, so they still start at the same x (the Coma-1 pair)',()=>{
  const rings=[{x:691.8128,y:399,width:105},{x:350.3091,y:349.2222,width:105},{x:691.0923,y:399.7778,width:205},{x:350,y:350,width:205}];
  const xs=skyLabelXs(rings,700);
  expect(xs[0]).toBeCloseTo(691.8128-SKY_LABEL_GAP-205,10);
  expect(xs[2]).toBeCloseTo(691.0923-SKY_LABEL_GAP-205,10);
  expect(xs[1]).toBeCloseTo(363.3091,10);// the Coma-2 pair fits: unchanged
  expect(xs[3]).toBe(363);
 });
 it('groups rings within SKY_SAME_RING on both axes, transitively, and no farther',()=>{
  expect(skyLabelXs([{x:690,y:10,width:5},{x:690+SKY_SAME_RING,y:10,width:400}],700)[0]).toBe(690-13-400);
  expect(skyLabelXs([{x:500,y:10,width:5},{x:500+SKY_SAME_RING+.01,y:10,width:400}],700)[0]).toBe(513);
  expect(skyLabelXs([{x:500,y:10,width:5},{x:500,y:10+SKY_SAME_RING+.01,width:400}],700)[0]).toBe(513);
  expect(skyLabelXs([{x:500,y:10,width:5},{x:502.5,y:10,width:5},{x:505,y:10,width:400}],700)[0]).toBe(500-13-400);
 });
 it('a group whose short label would fit still flips with its wide one; unmeasured labels (width 0) never move',()=>{
  expect(skyLabelXs([{x:600,y:10,width:10},{x:600,y:10,width:120}],700)).toEqual([600-13-120,600-13-120]);
  expect(skyLabelXs([{x:695,y:10,width:0}],700)).toEqual([708]);
 });
});

describe('Multi-Spec selection number baseline (Front SKY-LABELS [W])',()=>{
 it('is y+4 away from the edges',()=>{
  for(const y of [7,100,156,305])expect(multiSpecNumberBaseline(y,312,11)).toBe(y+4);
 });
 it('stays at least one font size from the top, so a selection at y=4 keeps the whole number',()=>{
  expect(multiSpecNumberBaseline(4,312,11)).toBe(11);
  expect(multiSpecNumberBaseline(0,312,11)).toBe(11);
 });
 it('stays 3 units above the bottom edge',()=>{
  expect(multiSpecNumberBaseline(311,312,11)).toBe(309);
  expect(multiSpecNumberBaseline(306,312,11)).toBe(309);
 });
});
