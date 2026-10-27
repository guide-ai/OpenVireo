/** Presentation strings of the E08 Object X screens, keyed and pure so the coordinator can fold them into the shared i18n
 * catalog at merge. English default. Nothing here reveals a target's identity. */
export type ObjectXMeasureMessages=Readonly<{
 title:string;intro:string;adaptation:string;
 frame:(n:number,label:string)=>string;noFrames:string;
 blinkStart:string;blinkStop:string;blinkInterval:string;showFrame:string;
 roleTarget:string;roleReference:string;roleLegend:string;
 refRa:string;refDec:string;refInvalid:string;
 cursor:(x:number,y:number)=>string;measure:string;viewport:string;keyboardHelp:string;
 rangeLow:string;rangeHigh:string;rangeNote:string;
 blinkAligned:string;blinkRaw:string;
 plateTitle:string;plateFrame:(n:number,refs:number)=>string;plateNone:(n:number,refs:number)=>string;plateDegenerate:(n:number)=>string;plateRms:(rms:string,scale:string)=>string;colResidual:string;
 table:string;colFrame:string;colRole:string;colX:string;colY:string;colRa:string;colDec:string;colUt:string;colMethod:string;remove:string;
 notSolved:string;methodPlate:string;methodWcs:string;
 motion:(rate:string,pa:string,arcsec:string,hours:string)=>string;motionNone:string;
 errors:Readonly<Record<string,string>>;
}>;
export const OBJECT_X_MEASURE_EN:ObjectXMeasureMessages=Object.freeze({
 title:'Measure positions',
 intro:'Blink two images to find what moved, then click a source to measure it. Mark at least three reference stars with catalogue coordinates on a frame for an astrometric solution, or use the image coordinates written in its header.',
 adaptation:'Web adaptation: the original sends images to the external CLEA Astrometry Toolkit. This tool follows the toolkit user guide (brightest pixel within 8 pixels, cubed weights, six plate constants) and is not a port of it.',
 frame:(n,label)=>`Image ${n}: ${label}`,noFrames:'No images loaded.',
 blinkStart:'Blink',blinkStop:'Stop blinking',blinkInterval:'Blink interval (ms)',showFrame:'Show image',
 roleTarget:'Target',roleReference:'Reference star',roleLegend:'Next mark is a',
 refRa:'Catalogue RA (h m s)',refDec:'Catalogue Dec (° ′ ″)',refInvalid:'Enter the reference star RA as h m s and Dec as ° ′ ″.',
 cursor:(x,y)=>`Cursor x ${x}, y ${y}`,measure:'Measure at cursor',viewport:'Image; arrow keys move the cursor, Enter measures',
 keyboardHelp:'Arrow keys move the cursor by one pixel (Shift: ten). Enter or Space measures.',
 rangeLow:'Low cut',rangeHigh:'High cut',
 rangeNote:'The cuts set both the display stretch and the centroid weights (web default: 5 % and 50 % of the image range).',
 blinkAligned:'Blinking aligned on the first two reference stars of each image.',
 blinkRaw:'Blinking the raw frames (same pointing assumed); mark two reference stars on each image to align them.',
 plateTitle:'Astrometric solutions',plateFrame:(n,refs)=>`Image ${n}: ${refs} reference stars`,plateNone:(n,refs)=>`Image ${n}: ${refs} reference stars (at least 3 needed)`,
 plateDegenerate:n=>`Image ${n}: the reference stars are too close to a line.`,plateRms:(rms,scale)=>`rms ${rms}″, scale ${scale}″/pixel`,colResidual:'Residual (″)',
 table:'Measurements',colFrame:'Image',colRole:'Mark',colX:'x',colY:'y',colRa:'RA',colDec:'Dec',colUt:'UT',colMethod:'Solution',remove:'Remove',
 notSolved:'not solved',methodPlate:'plate constants',methodWcs:'header WCS',
 motion:(rate,pa,arcsec,hours)=>`Motion: ${rate}″/h toward position angle ${pa}° (${arcsec}″ in ${hours} h).`,
 motionNone:'Measure the target on two images taken at different times to get its motion.',
 errors:Object.freeze({bounds:'The cursor is outside the image.',range:'The low cut must be below the high cut.','no-signal':'No source above the low cut near the cursor.',references:'Too many marks; remove some first.',degenerate:'The reference stars are too close to a line; choose others.',wcs:'This image has no usable coordinate header.',time:'The two images have the same time.'}),
});

/** #object-x route and E08 guide. No string names or describes a particular target. */
export const OBJECT_X_LAB_EN=Object.freeze({
 nav:'Object X',guideNav:'Object X guide',
 title:'The quest for Object X',
 scope:'You receive only an identifier and sky coordinates. Decide with the instruments whether the object is a star, a galaxy, a quasar, a pulsar or an asteroid.',
 startTitle:'1. Your object',
 idLabel:'ID # of your unknown object (from the lab sheet or instructor)',
 idHelp:'The ID only labels your saved data (ObjX-<ID>); it does not choose the object.',
 targetLabel:'Object code',targetChoose:'Choose a code…',targetRandom:'Assign me one at random',
 targetHelp:'Your instructor may give you a code. Codes do not reveal what the object is.',
 targetCoords:(ra:string,dec:string)=>`Coordinates (J2000): RA ${ra}, Dec ${dec}`,
 loadingTargets:'Loading the object list…',targetsError:'The object list could not be loaded.',
 dateLabel:'Observation date and time (UT)',dateHelp:'The original exercise starts at 2009-06-01 04:00:00 UT.',
 setClock:'Set the observatory clock',clockSet:(utc:string)=>`Observatory clock set to ${utc} UT.`,dateInvalid:'Enter a date and time as YYYY-MM-DDTHH:MM:SS between 1900 and 2099.',
 branchesTitle:'2. Investigate',
 cameraTitle:'CCD camera',
 cameraHelp:'Take an image, wait, then take another of the same field. Anything that moved between them is in the Solar System. Asteroids from the orbit file are placed in your images when an asteroid list is built.',
 orbitLabel:'Orbit file',
 orbitNote:'Orbit file: ObjX_MPC.CMO.sav (web default; it reproduces ObjectX.HTL at 2009-06-01 04:00 UT — the original\'s default is ObjX_MPC.CMO).',
 orbitNames:Object.freeze({'ObjX_MPC.CMO.sav':'ObjX_MPC.CMO.sav (2009, web default)','ObjX_MPC.CMO':'ObjX_MPC.CMO (2010, original default, 31 MB)','ObjX_AST.CMO':'ObjX_AST.CMO (Lowell, 2009)'}) as Readonly<Record<string,string>>,
 limitLabel:'Limiting magnitude',
 buildList:'Build the asteroid list for the observatory date',
 building:(done:number,total:number)=>`Computing asteroid positions… ${done} of ${total}`,
 listBuilt:(n:number,nea:number,opp:number,date:string)=>`Observable asteroids on ${date} UT: ${n} (${nea} near-Earth, ${opp} near opposition). New images include those near the pointing.`,
 listErrors:(n:number)=>`${n} records could not be computed and were skipped.`,
 listError:'The orbit file could not be loaded.',
 noList:'No asteroid list yet: images will show catalogue stars only.',
 pointObservatory:'Copy the coordinates to the observatory',
 pointHelp:'In the observatory: open the dome, use Point to coordinates under Enter coordinates, choose the Telescope field of view, start the clock, turn tracking on and use the CCD camera.',
 radioTitle:'Radio telescope',
 radioHelp:'A pulsar shows regular pulses. Enter the coordinates above in the radio telescope and listen.',
 openRadio:'Open the radio telescope',
 spectrumTitle:'Spectrometer',
 spectrumHelp:'Stars, galaxies and quasars are told apart by their spectra.',
 spectrumUnavailable:'Not available yet: spectra at arbitrary coordinates need field-engine parts that are not ported (quasar merge, photographic association, own galaxy spectra and star templates). Use the camera and the radio telescope for now.',
 imagesTitle:'3. Your images',noImages:'No images yet. Images taken with the CCD camera appear here.',
 imageRow:(label:string,ut:string,filter:string,seconds:number)=>`${label}: ${ut} UT, ${filter}, ${seconds} s`,
 datePlaceholder:'2009-06-01T04:00:00',imageRowPlain:(label:string,ut:string)=>`${label}: ${ut} UT`,
 imageMovers:(pairs:number)=>`${pairs} ${pairs===1?'asteroid':'asteroids'} in the field box.`,
 /** Moving pairs the camera did not draw, by the composer's typed reason (no names: they could reveal the object). */
 imageSkipped:(reasons:readonly string[])=>{
  const text:Readonly<Record<string,string>>={'moving-pair-off-detector':'far outside the detector','moving-pair-geometry':'no measurable motion to draw','moving-pair-budget':'trail too large to draw'};
  const counts=new Map<string,number>();for(const r of reasons)counts.set(r,(counts.get(r)??0)+1);
  return `Not drawn: ${[...counts].map(([r,n])=>`${n} ${text[r]??r}`).join(', ')}.`;
 },
 imageOffTarget:'(not at your object\'s coordinates)',
 imageNotLoaded:'not loaded — open its saved FITS file',
 loadFits:'Open saved FITS images',loadFitsError:(name:string)=>`${name} could not be opened as a camera image.`,
 measureTitle:'4. Compare and measure',measureFirst:'First image',measureSecond:'Second image',measureNeedTwo:'Take or open two images to blink and measure them.',
 measureNotLoaded:'Open the saved FITS files of both images to measure them.',
 listTitle:'Current observable asteroids',listColumns:Object.freeze(['Name','RA','Dec','V','Δ (AU)','(1)','(2)','(3)','(4)']),
 listNotesAst:'Notes (Lowell file): (1) planet-crossing code, (2) orbit computation code, (3) critical-list code, (4) importance of observations.',
 listNotesMpc:'Notes (MPC file): (1) orbit type (2 Aten, 3 Apollo, 4 Amor, …), (2) eccentricity/H assumed, (3) flags (128 = potentially hazardous), (4) uncertainty U.',
 listSorted:'Sorted by RA (web choice; the original sort key is not recovered). Compare positions with what moved in your images.',listTruncated:(n:number)=>`Only the first ${n} rows are shown.`,
 answerTitle:'5. Your answer',answerLegend:'My object is a',
 kinds:Object.freeze({star:'star',galaxy:'galaxy',qso:'quasar (QSO)',pulsar:'pulsar',asteroid:'asteroid'}) as Readonly<Record<string,string>>,
 describeLabel:'Describe your evidence',
 reveal:'Reveal the identity',revealConfirm:'Reveal now? Your answer stays as it is.',revealNeedAnswer:'Choose an answer before revealing.',
 revealed:(id:string,remarks:string)=>`Object: ${id} — ${remarks}`,
 verdict:(right:boolean,kind:string)=>right?`Your answer is right: it is a ${kind}.`:`It is a ${kind}.`,
 progress:'Your progress',
});
export type ObjectXLabMessages=typeof OBJECT_X_LAB_EN;

export const OBJECT_X_GUIDE_EN=Object.freeze({
 eyebrow:'Exercise E08 guide',title:'The quest for Object X',
 intro:'You get only an identifier and coordinates. Use the instruments to decide what kind of object it is, then reveal its identity. The steps update as you work; nothing judges your answer before the reveal.',
 counts:(done:number,total:number,images:number)=>`${done} of ${total} steps · ${images} images of your object`,
 done:'(done)',todo:'(to do)',
 steps:Object.freeze({
  target:['Get your object','On the Object X page, enter your ID and choose or receive an object code.'],
  clock:['Set the date and time','Set the observatory clock; the original exercise starts on 2009-06-01 at 04:00 UT.'],
  list:['Build the asteroid list','Build the list of observable asteroids for that date so your images include them.'],
  image:['Image the field','Copy the coordinates to the observatory, open the dome, track, point and take a CCD image (no filter and 2 minutes make a faint object easier to see).'],
  repeat:['Image it again later','Take a second image of the same field 30–60 minutes later (or the next night). A fast object leaves a short trail during a long exposure.'],
  measure:['Blink and measure','Blink the two images. If something moved, measure it on both to get its rate and direction. Objects outside the Solar System do not move.'],
  classify:['Decide what it is','If nothing moved, try the radio telescope for pulses; stars, galaxies and quasars need the spectrometer (not available yet).'],
  describe:['Describe your evidence','Write what you saw with each instrument.'],
  reveal:['Reveal the identity','Reveal the object and compare it with your answer.'],
  save:['Save your investigation','Use Save investigation in the toolbar; keep the FITS files of your images too.'],
 }) as Readonly<Record<string,readonly [string,string]>>,
 progress:'Your progress',go:'Go to Object X',goObservatory:'Go to the observatory',
 close:'Close Object X guide',return:'Return',
});

export const OBJECT_X_SESSION_EN=Object.freeze({
 saveError:'The Object X part could not be saved: the asteroid positions of your images could not be recomputed from the orbit file.',
});
