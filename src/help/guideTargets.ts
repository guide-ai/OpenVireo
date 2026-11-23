/** Front GUIDE-COMPANION [W]: the control each guide step points at ("Show me where"), as CSS selectors tried in order
 * (help/spot.ts chooseCandidate: the first that can be shown and is enabled). A step that is a short chain of actions lists its
 * controls from the last action to the first, so the page's own enabled state decides which one is outlined (where every control
 * of a step is always enabled, the first action comes first); no progress rule is added here. Every selector names an `id` or a
 * `data-testid`, never a position or a translated label; a few also read a state the page itself publishes (a galaxy whose
 * spectrum is already archived, a survey row already recorded), so a control the student has finished with is not outlined
 * again. guideTargets.test.ts checks that each name exists in the source and is on the step's page
 * (components/guideCompanionRoute.ts). Pure data: no text, no DOM. New web presentation, not a CLEA resource. */
import type {LabSlug} from '../seo/labSlugs';

const id=(name:string)=>`[data-testid="${name}"]`;
/** Save investigation, in the page bar of every page. */
const SAVE=id('investigation-save');
/** The observable row buttons of the LSS survey list; first those of rows with no record yet. */
const LSS_ROW=`${id('lss-rows')} button`,LSS_NEW_ROW=`${id('lss-rows')} tr:not([data-recorded]) button`;
/** The galaxy exposure page while the chosen galaxy has no archived spectrum yet (core/hubbleLab.ts `archived`). */
const GALAXY_NEW=`${id('galaxy-exposure-page')}:not([data-target-archived])`;
/** The LSS acquisition controls, last action first. */
const LSS_OBSERVE=[id('lss-acq-pause'),id('lss-acq-start'),id('lss-acq-activate'),LSS_ROW,'#lss-field'];

export const GUIDE_TARGETS:Readonly<Record<LabSlug,Readonly<Record<string,readonly string[]>>>>=Object.freeze({
 // Keys are the phases of core/hubbleLab.ts.
 hubble:Object.freeze({
  // Once the chosen galaxy is archived its exposure buttons stay enabled; the next action is choosing another galaxy.
  acquire:[`${GALAXY_NEW} ${id('galaxy-analyze')}`,`${GALAXY_NEW} ${id('galaxy-start')}`,`${GALAXY_NEW} ${id('galaxy-activate')}`,'#acquisition-galaxy'],
  measure:[id('record-measurement'),'#reference'],
  // The step asks to save and then clear rows: the card is outlined, never a button that discards work.
  dataset:[id('hubble-card-summary')],
  recipe:['#hubble-recipe',id('hubble-card-summary')],
  // With the recipe chosen and no rows yet, the next action is Add saved measurements (disabled once nothing is missing).
  inputs:[`${id('hubble-row')}:not([data-complete]) ${id('hubble-row-magnitude')}`,id('hubble-add-measurements'),'#hubble-recipe',id('hubble-card-summary')],
  interpret:[id('hubble-value'),id('hubble-card-summary')],
 }),
 'large-scale-structure':Object.freeze({
  load:[id('lss-load-list'),'#lss-field'],
  observe:LSS_OBSERVE,
  record:[id('lss-record-z'),'#lss-shift','#lss-step',...LSS_OBSERVE],
  repeat:[LSS_NEW_ROW,LSS_ROW,'#lss-field'],
  wedge:[id('lss-plot-wedge')],
  describe:['#lss-description'],
  save:[SAVE],
 }),
 'object-x':Object.freeze({
  target:[id('objectx-id'),id('objectx-target')],
  clock:[id('objectx-date'),id('objectx-set-clock')],
  list:[id('objectx-build-list')],
  // The camera's own "turn tracking on" shortcut is there only while tracking is what the camera is waiting for.
  image:[id('camera-start'),`${id('camera-control')} ${id('tracking-shortcut')}`,id('dome-open'),id('point-coordinates'),id('camera-control')],
  // The step's first action, on the Object X page (guideCompanionRoute.ts): a later time, then Set the observatory clock.
  repeat:[id('objectx-date'),id('objectx-set-clock')],
  measure:[id('objectx-measure-viewport'),id('objectx-measure-start'),id('objectx-measure-first'),id('objectx-measure-section')],
  classify:[id('objectx-answer')],
  describe:[id('objectx-description')],
  reveal:[id('objectx-reveal-button'),id('objectx-reveal')],
  save:[SAVE],
 }),
 'stellar-classification':Object.freeze({
  choose:['#class-practice','#class-source'],
  compare:['#class-standard','#class-atlas'],
  inspect:[id('class-line-table')],
  record:['#class-type'],
  save:[SAVE],
 }),
 'cluster-hr':Object.freeze({
  load:[id('cluster-load'),'#cluster-database-choice'],
  inspect:['#cluster-point-choice','#cluster-database-choice'],
  trial:['#db-native-modulus','#cluster-database-choice'],
  confirm:['#db-native-confirm','#db-native-modulus','#cluster-database-choice'],
  report:['#db-native-report','#cluster-database-choice'],
  preserve:[SAVE],
 }),
 pulsars:Object.freeze({
  setup:[id('radio-exercise-start')],
  // Setup is incomplete only because the activated panel has Tracking off (PulsarLabProgress.trackingOff).
  'setup-tracking':[id('antenna-tracking'),id('radio-exercise-start')],
  catalog:[id('radio-exercise-catalog-retry'),id('pulsar-ref-load'),id('radio-exercise-catalog')],
  // Both are always enabled, so the first action comes first: find the pulsar's coordinates, then Receiver.
  point:[id('pulsar-params-open'),id('antenna-receiver-button')],
  channels:[id('receiver-add'),id('receiver-frequency-0'),id('antenna-receiver-button')],
  capture:[id('receiver-record'),id('receiver-mode'),id('antenna-receiver-button')],
  period:[id('pulsar-record'),id('pulsar-panel-1'),id('pulsar-analysis')],
  delay:[id('pulsar-record'),id('pulsar-panel-1'),id('pulsar-analysis')],
  investigation:[SAVE],
  save:[id('pulsar-save-capture'),id('pulsar-raw-export'),id('pulsar-save'),id('pulsar-analysis')],
 }),
 pleiades:Object.freeze({
  list:['[data-htl-exercise="PLEIADES.HTL"]',`${id('htl-details')} summary`],
  point:[id('dome-open'),id('htl-point'),'#htl-rows',`${id('htl-details')} summary`],
  activate:[id('photo-activate')],
  measure:[id('photo-start'),'#photo-pointing'],
  record:[id('photo-record'),id('photo-start')],
  color:[id('photo-calc-color'),'#photo-b-reading'],
  sample:['#photo-target'],
  distance:['#pleiades-modulus'],
  save:[SAVE],
 }),
});
/** The selectors of a step, or none for a step the table does not know. */
export const guideTargets=(lab:LabSlug,step:string):readonly string[]=>GUIDE_TARGETS[lab][step]??[];
