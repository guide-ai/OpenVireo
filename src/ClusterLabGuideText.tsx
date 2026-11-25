import {t} from './i18n';
import type {ClusterLabProgress,ClusterLabStep} from './core/clusterLab';
import {glossKey,termScope} from './help/glossary';

/** Front GUIDE-COMPANION: the cluster HR guide's texts that the companion strip (components/GuideCompanion.tsx) shows too. They
 * live apart from ClusterLabGuide.tsx, which loads with the cluster database, so the shell can name them. */
/** The "Next:" line. */
export const clusterNextText=(next:ClusterLabProgress['next'])=>t(`clusterLab.next.${next}`);
/** Front NEWCOMER NC3: a step's title, shared by the guide and the strip's line. */
export const clusterStepTitle=(step:ClusterLabStep)=>t(`clusterLab.step.${step}.title`);
/** What the guide says under a step's heading and status; once every step shows an action, how to keep the work. Front NEWCOMER
 * NC7: with its glossary terms marked (help/glossary.tsx); `found` collects the window's. */
export function clusterStepBody(step:ClusterLabStep|'preserve',found?:Set<string>){
 return step==='preserve'?<><p>{t('clusterLab.preserve.save')}</p><p>{t('clusterLab.preserve.restore')}</p></>:<p>{glossKey(termScope(found),`clusterLab.step.${step}.help`)}</p>;
}
