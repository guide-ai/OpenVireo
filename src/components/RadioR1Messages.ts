/** Web texts of Front R1 (docs/RADIO-R1.md). Original literals stay in the core files. */
export const RADIO_R1_MESSAGES=Object.freeze({
 saveData:'File ▸ Save Recorded Data...',
 saveDataNote:'VIREO’s File ▸ Save Recorded Data... (SvRcData1Click 0x567f70) runs the same save as the pulsar analysis Save; it is enabled while recorded data exist. Here it opens the pulsar analysis, whose verified Save writes the recording (web adaptation).',
 optionEffectsTitle:'What these VIREO settings do (shown with their compiled values; not editable here):',
 optionEffects:Object.freeze([
  'Plot Pulsar Positions (off): draws the catalogue pulsars on the radio sky map.',
  'Write Hot List File (off): shows Slew ▸ Hot List ▸ Save Updated List....',
  'Exact Pos for Hot List (off): Add Current Item to List stores the pulsar’s catalogue position instead of the pointing.',
  'Sound Features (on): the receiver plays its pulse sound when a sound device exists.',
  'Test Mode (off): an instructor setting; Set Coordinates moves the telescope instantly.',
  'Pulsar Identification (Use B1950 Name): names the receiver caption, the record header and Add Current Item entries.',
  'Telescope Type (Fully Steerable): only Transit Only changes VIREO’s behaviour; Arecibo has no code of its own and behaves as Fully Steerable.',
 ]),
 findNote:'Find searches each stored line (the original’s text of every measurement, as written by Record) from the top or after the selected row, ignoring case, without wrapping, as in VIREO. Web adaptation: the stored text is this site’s; it can differ from VIREO’s in the file-name tail (the browser gives no folder) and, rarely, in the last digit of a number.',
 saveDataOff:'Nothing recorded yet: VIREO keeps this item disabled until the analysis holds recorded data.',
});
