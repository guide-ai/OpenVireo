/** Finite decimal text; nonzero decimal underflow is invalid, not a zero trial. */
export function decimal(text:string):number|undefined {
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()))return;
  const value=Number(text);
  if(value===0&&/[1-9]/.test(text.trim().split(/[eE]/)[0]))return;
  return Number.isFinite(value)?value:undefined;
}
