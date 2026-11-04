import {createContext} from 'react';
import type {ObservationList} from './core/sharedObservationList';
/** Front ONERESULTS: VIREO's one Observational Results list (core/sharedObservationList.ts), held by the shell. The routes that
 * write it (photometer Record/Review, Classification Results, Hubble Record) read it with `get` when the dialog opens and
 * `commit` the next list when it closes; the dialog is modal, so this equals VIREO's write before ShowModal. Save investigation
 * reads it and Restore `commit`s the restored one. The stable part never changes identity, so a commit re-renders only the
 * readers of ObservationListValue. */
export type ObservationListAccess=Readonly<{get:()=>ObservationList;commit:(next:ObservationList)=>void;
 /** Time-Dependent Data (env+0x2e8c) and Compute Rdshft Vel. (FormActivate 0x54aedb), as set now. */
 options:()=>Readonly<{timeDependentData:boolean;computeRedshiftVelocity:boolean}>}>;
export const EMPTY_SHARED_OBSERVATION_LIST:ObservationList=Object.freeze({records:Object.freeze([])});
export const ObservationListContext=createContext<ObservationListAccess|null>(null);
export const ObservationListValue=createContext<ObservationList>(EMPTY_SHARED_OBSERVATION_LIST);
