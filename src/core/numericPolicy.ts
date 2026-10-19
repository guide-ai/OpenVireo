/** Browser adapter policy for finite inputs; not a measured x87 control word.
 * Keep sampler, slit and raster integer conversions on the same policy. */
export function roundNearestEven(value: number): number {
  const lower = Math.floor(value), fraction = value - lower;
  return fraction < 0.5 ? lower : fraction > 0.5 ? lower + 1 : lower % 2 === 0 ? lower : lower + 1;
}
