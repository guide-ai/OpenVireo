import {t} from './i18n';
import type {ClusterLabProgress,ClusterLabStep} from './core/clusterLab';

/** Front GUIDE-COMPANION: the cluster HR guide's texts that the companion strip (components/GuideCompanion.tsx) shows too. They
 * live apart from ClusterLabGuide.tsx, which loads with the cluster database, so the shell can name them. */
/** The "Next:" line. */
export const clusterNextText=(next:ClusterLabProgress['next'])=>t(`clusterLab.next.${next}`);
/** What the guide says under a step's heading and status; once every step shows an action, how to keep the work. */
export function clusterStepBody(step:ClusterLabStep|'preserve'){
 return step==='preserve'?<><p>{t('clusterLab.preserve.save')}</p><p>{t('clusterLab.preserve.restore')}</p></>:<p>{t(`clusterLab.step.${step}.help`)}</p>;
}
