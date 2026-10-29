/** Front D3: the variable-star field list literals, split out unchanged from core/variableFieldList so windows that only
 * show them do not load the field engine (re-exported by core/variableFieldList). */
import {VARIABLE_STARS_MENU} from './observatoryMenuLiterals';
export const VARIABLE_FIELD_LITERALS=Object.freeze({
 menu:VARIABLE_STARS_MENU,
 captionFinder:'Variable Stars in Finder Field',captionInstrument:'Variable Stars in Instrument Field',
 center:'Field Center:',ra:'RA: ',dec:'Dec:',limits:'Field Limits:',to:'to',
 note:'(Visible field is 1/3 of loaded field and may not be centered.)',
 empty:'No variable stars found in field!',headGcvs:'All variables from GCVS in region:',headModeled:'Variables modeled in VIREO in region:',
 columns:'Name          Rt. Ascension    Declination   Max   Min  Type',
 listMenu:Object.freeze({list:'&List',search:'&Search...',print:'&Print...',saveText:'Save &Text',asDisplayed:'As &Displayed...',commaDelimit:'&Comma Delimit (for Spreadsheet)...',close:'&Close'}),
 selectionMenu:Object.freeze({selection:'&Selection',data:'&Get Selection Data...',slew:'&Slew to Selection...',add:'&Add Selection to Current Hot List',start:'Start &New Hot List with Selection'}),
 addedHead:'Object ',addedTail:' Added to Current Hot List.',confirmation:'Confirmation',
 newList:'New Hot List Created - Object ',newListTail:' Added to New Hot List.',
 unsavedText:'The current observation Hot List has been updated.  You will lose the updates if you do not save it.\r\n\r\nDo you want to save it now?',unsavedCaption:'Current Hot List not Saved!',
 csvText:'Comma-Delimited Output not Available for Displayed Material.',csvCaption:'Not Available',
 savedHead:'Report Text Written to ',savedTail:'.',savedCaption:'Text File Written',
});
