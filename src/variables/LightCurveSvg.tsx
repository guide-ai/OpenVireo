import {LIGHT_CURVE_DISPLAY,type LightCurvePlot} from '../core/lightCurve';
import {lightCurveScheme} from '../core/lightCurveScheme';
/** FormPaint 0x52b9cc/0x52c090 rendered from the pure plot data, in the scheme of the form's flag +0x404 (Front R4b,
 * src/core/lightCurveScheme.ts): colour = brush navy $800000, pen and font white, curve yellow $00FFFF; monochrome = white
 * brush, black pen, font and curve. Font size 10 with style byte 0x52c040 = [fsBold].
 * TextOut positions are top-left corners (dominant-baseline hanging). The panel keeps fixed colours in both themes. */
export default function LightCurveSvg({plot,label,monochrome,testId}:{plot:LightCurvePlot;label:string;monochrome:boolean;testId?:string}){
 const {left,top,right,bottom}=plot.box,{ink,background:bg,curve:curveInk}=lightCurveScheme(monochrome);
 return <svg className="lc-svg" viewBox={`0 0 ${LIGHT_CURVE_DISPLAY.width} ${LIGHT_CURVE_DISPLAY.height}`} role="img" aria-label={label} data-testid={testId} data-scheme={monochrome?'mono':'colour'}
  data-faint-bound={plot.faintBound} data-bright-bound={plot.brightBound} data-points={'points' in plot.curve?plot.curve.points.length:0}>
  <rect x={0} y={0} width={LIGHT_CURVE_DISPLAY.width} height={LIGHT_CURVE_DISPLAY.height} fill={bg}/>
  <rect data-part="box" x={left} y={top} width={right-left} height={bottom-top} fill="none" stroke={ink} strokeWidth={1} shapeRendering="crispEdges"/>
  <g stroke={ink} strokeWidth={1} shapeRendering="crispEdges" data-part="ticks">{plot.ticks.map((s,i)=><line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}/>)}</g>
  <g fill={ink} fontFamily='"MS Sans Serif","Microsoft Sans Serif",Tahoma,Arial,sans-serif' fontSize={13} fontWeight="bold" dominantBaseline="hanging" data-part="texts">
   {plot.texts.map((t,i)=><text key={i} x={t.x} y={t.y} textAnchor={t.anchor}>{t.text}</text>)}
  </g>
  {'points' in plot.curve&&<polyline data-part="curve" fill="none" stroke={curveInk} strokeWidth={1} points={plot.curve.points.map(p=>`${p[0]},${p[1]}`).join(' ')}/>}
 </svg>;
}
