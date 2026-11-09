/** Front ES0 (docs/I18N.md): the `*Messages.ts` maps chosen per load by pickMessages (src/i18n/registry.ts), by id. Type-only
 * imports: this module has no runtime dependency, so src/i18n/active.ts can check a bundle's map ids against MAP_IDS. The two
 * catalog-backed maps (CLUSTER_NATIVE_HR_MESSAGES, RADIO_MESSAGES_EN) take their text from t and are not listed. */
import type {OBSERVATION_METADATA_EN} from '../ObservationMetadataMessages';
import type {SPECTRAL_RANGE_EN} from '../SpectralRangeMessages';
import type {ENGINE_VIEW_EN} from '../SpectrumEngineMessages';
import type {CAMERA_MESSAGES_EN} from '../camera/CameraMessages';
import type {CLUSTER_DATA_MESSAGES_EN} from '../clusterdata/ClusterDataMessages';
import type {CLUSTER_HR_EN} from '../clusters/ClusterHrMessages';
import type {APP_SHELL_MESSAGES_EN} from '../components/AppShellMessages';
import type {LOAD_SAVE_MESSAGES_EN} from '../components/PulsarLoadSaveMessages';
import type {PULSAR_MESSAGES_EN} from '../components/PulsarMessages';
import type {SAVED_ROWS_MESSAGES_EN} from '../components/PulsarSavedRowsMessages';
import type {RADIO_ANTENNA_MESSAGES_EN} from '../components/RadioAntennaMessages';
import type {FINISH_SAVE_MESSAGES_EN} from '../components/RadioFinishSaveMessages';
import type {RADIO_R1_MESSAGES_EN} from '../components/RadioR1Messages';
import type {RADIO_SAVE_MESSAGES_EN} from '../components/RadioRecordSaveMessages';
import type {WEDGE_MESSAGES_EN} from '../components/WedgeMessages';
import type {HELP_MENU_EN} from '../help/HelpMessages';
import type {OBJECT_X_GUIDE_EN,OBJECT_X_LAB_EN,OBJECT_X_MEASURE_EN,OBJECT_X_SESSION_EN} from '../objectx/ObjectXMessages';
import type {FIELD_INFO_MESSAGES_EN,FIELD_READ_DETAILS_EN,NAKED_EYE_MESSAGES_EN} from '../observatory/FieldInfoMessages';
import type {OBSERVATORY_MESSAGES_EN} from '../observatory/ObservatoryMessages';
import type {QSO_LIST_MESSAGES_EN} from '../observatory/QsoListMessages';
import type {POLISH_MESSAGES_EN} from '../polish/PolishMessages';
import type {SOUND_MESSAGES_EN} from '../sound/SoundMessages';
import type {VARIABLE_STARS_EN} from '../variables/VariableStarMessages';
export interface MessageMaps{
 appShell:typeof APP_SHELL_MESSAGES_EN;
 camera:typeof CAMERA_MESSAGES_EN;
 clusterData:typeof CLUSTER_DATA_MESSAGES_EN;
 clusterHr:typeof CLUSTER_HR_EN;
 engineView:typeof ENGINE_VIEW_EN;
 fieldInfo:typeof FIELD_INFO_MESSAGES_EN;
 fieldReadDetails:typeof FIELD_READ_DETAILS_EN;
 helpMenu:typeof HELP_MENU_EN;
 nakedEye:typeof NAKED_EYE_MESSAGES_EN;
 objectXGuide:typeof OBJECT_X_GUIDE_EN;
 objectXLab:typeof OBJECT_X_LAB_EN;
 objectXMeasure:typeof OBJECT_X_MEASURE_EN;
 objectXSession:typeof OBJECT_X_SESSION_EN;
 observationMetadata:typeof OBSERVATION_METADATA_EN;
 observatory:typeof OBSERVATORY_MESSAGES_EN;
 polish:typeof POLISH_MESSAGES_EN;
 pulsar:typeof PULSAR_MESSAGES_EN;
 pulsarLoadSave:typeof LOAD_SAVE_MESSAGES_EN;
 pulsarSavedRows:typeof SAVED_ROWS_MESSAGES_EN;
 qsoList:typeof QSO_LIST_MESSAGES_EN;
 radioAntenna:typeof RADIO_ANTENNA_MESSAGES_EN;
 radioFinishSave:typeof FINISH_SAVE_MESSAGES_EN;
 radioR1:typeof RADIO_R1_MESSAGES_EN;
 radioRecordSave:typeof RADIO_SAVE_MESSAGES_EN;
 sound:typeof SOUND_MESSAGES_EN;
 spectralRange:typeof SPECTRAL_RANGE_EN;
 variableStars:typeof VARIABLE_STARS_EN;
 wedge:typeof WEDGE_MESSAGES_EN;
}
export type MapId=keyof MessageMaps;
export const MAP_IDS=Object.freeze(['appShell','camera','clusterData','clusterHr','engineView','fieldInfo','fieldReadDetails','helpMenu','nakedEye','objectXGuide','objectXLab','objectXMeasure','objectXSession','observationMetadata','observatory','polish','pulsar','pulsarLoadSave','pulsarSavedRows','qsoList','radioAntenna','radioFinishSave','radioR1','radioRecordSave','sound','spectralRange','variableStars','wedge'] as const satisfies readonly MapId[]);
/** A translated map: the English map's shape, with string literal types widened to string and functions kept. */
export type Translation<T>=T extends string?string
 :T extends (...args:infer A)=>infer R?(...args:A)=>R extends string?string:R
 :T extends readonly (infer U)[]?readonly Translation<U>[]
 :T extends object?{readonly [K in keyof T]:Translation<T[K]>}
 :T;
/** The maps a language bundle may carry, by id. */
export type BundleMaps={readonly [K in MapId]?:Translation<MessageMaps[K]>};
