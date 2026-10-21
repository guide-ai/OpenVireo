import type{WedgeColours,WedgeOptions,WedgePlot}from'../core/wedgePlot';
import{WEDGE_GEOMETRY as G,wedgeArcSvgPath}from'../core/wedgePlot';
import type{WedgeRecord}from'../core/wedgeLssText';

/** SVG rendering of the recovered TWedgePlot frame and points on a 550×550 client,
 * in the recovered TColor scheme. Arc paths (SVG approximation of GDI Arc) come from the
 * pure core. Text is placed at its top-left like TextOut; fonts are approximate. */
export type WedgePlotSvgProps=Readonly<{plot:WedgePlot;records:readonly WedgeRecord[];options:WedgeOptions;colours:WedgeColours;selected:number|null;label:string;onSelect:(index:number)=>void;idPrefix:string}>;
export default function WedgePlotSvg({plot,records,options,colours,selected,label,onSelect,idPrefix}:WedgePlotSvgProps){
 const{frame}=plot,fill=options.pointStyle===1?colours.own:'none';
 const sel=selected!==null?plot.points[selected]:undefined;
 return <svg className="wedge-svg" viewBox={`0 0 ${G.client} ${G.client}`} role="group" aria-labelledby={idPrefix+'figure-title'} data-testid="wedge-svg">
  <title id={idPrefix+'figure-title'}>{label}</title>
  <rect x={0} y={0} width={G.client} height={G.client} fill={colours.background} data-testid="wedge-background"/>
  <g className="wedge-grid" stroke={colours.ink} aria-hidden="true">
   {frame.lines.map((l,i)=><line key={'l'+i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}/>)}
   {frame.arcs.map((a,i)=><path key={'a'+i} d={wedgeArcSvgPath(a)} data-radius={a.r}/>)}
  </g>
  <g className="wedge-text" fill={colours.ink} aria-hidden="true">
   {frame.texts.map((t,i)=><text key={'t'+i} x={t.x} y={t.y} dominantBaseline="hanging" data-role={t.role}>{t.text}</text>)}
   <text x={G.countLabel.x} y={G.countLabel.y} dominantBaseline="hanging" data-testid="wedge-count">{plot.countText}</text>
  </g>
  <g className="wedge-points">
   {plot.points.map(p=>p.status!=='plotted'||p.cx===null||p.cy===null?null:
    <g key={p.index} className="wedge-point-target" onClick={()=>onSelect(p.index)}>
     <title>{(records[p.index]?.objectId||'#'+(p.index+1))}</title>
     {/* Transparent hit area only; the drawn ellipse keeps the recovered radius. */}
     <circle cx={p.cx} cy={p.cy} r={options.pointSize+4} className="wedge-hit"/>
     <circle cx={p.cx} cy={p.cy} r={options.pointSize} stroke={colours.own} fill={fill} className={'wedge-point'+(options.pointStyle===1?' filled':'')}
      data-testid={'wedge-point-'+p.index} data-x={p.cx} data-y={p.cy}/>
    </g>)}
   {sel?.status==='plotted'&&sel.cx!==null&&sel.cy!==null?<circle cx={sel.cx} cy={sel.cy} r={options.pointSize+5} className="wedge-selection" aria-hidden="true" data-testid="wedge-selection"/>:null}
  </g>
 </svg>;
}
