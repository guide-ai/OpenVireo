import {useContext} from 'react';
import {VireoOptionsContext} from './vireoOptionsContext';
import {instrumentParameterField,spectrometerRouteRefusal} from './core/instrumentParameters';
import {t} from './i18n';
/** Front T6 (core/instrumentParameters.ts): the spectrometer exercise routes (Hubble, LSS, Object X, stellar classification, sky,
 * Multi-Spec) refuse while an instructor value they read differs from the compiled one; their witnesses hold for the compiled
 * values only (typed uncertified-parameter). null: the route may run. */
export function useSpectrometerParameterGate(route:'exercise'|'multispec'):string|null{
 const keys=spectrometerRouteRefusal(useContext(VireoOptionsContext).instrumentParameters,route);
 return keys.length?t('instrumentParameters.exerciseRefused',{fields:keys.map(k=>instrumentParameterField(k).control).join(', ')}):null;
}
