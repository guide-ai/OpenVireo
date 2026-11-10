/** Front SEO [W]: the seven VIREO lab overviews published as static pages under /labs/ (user request, 2026-11-08), and the
 * #lab=<slug> links that open each lab's guide in the app. Pure data and parsing; src/seo/pages.ts renders the HTML. The
 * texts describe what a student does in this web reconstruction; they claim no equivalence with the original program. */

export const SITE_URL='https://openvireo.space';

import type {LabSlug} from './labSlugs.ts';
export {labFromHash,labLink,labUrl,labsIndexUrl,LAB_SLUGS,SEO_PATH_PREFIX,type LabSlug} from './labSlugs.ts';

/** The texts of one lab page in one language (src/seo/labs.es.ts has the Spanish). */
export type LabText={
 /** Short name, used in lists and links. */
 name:string;
 /** <title>, under about 65 characters. */
 title:string;
 /** <meta name="description">, under about 160 characters. */
 description:string;
 heading:string;
 intro:string;
 steps:readonly string[];
 learn:readonly string[];
};
export type Lab=LabText&{
 slug:LabSlug;
 /** Exercise code on the student board (docs/STUDENT-EXERCISES.md). */
 exercise:string;
 /** The guide's button in the app's Guides menu (English pages only). */
 guide:string;
};

export const LABS:readonly Lab[]=Object.freeze([
 {slug:'hubble',exercise:'E01',name:"Hubble's law",guide:'Hubble lab guide',
  title:"Hubble's law lab online (CLEA VIREO) · OpenVireo",
  description:"Measure galaxy redshifts with a virtual telescope and spectrometer, then fit Hubble's law yourself. A free web reconstruction of CLEA's VIREO Hubble lab.",
  heading:"Hubble's law: the redshift–distance relation",
  intro:"Point a virtual telescope at galaxies from the original VIREO Hubble exercise, take their spectra, and measure how far their spectral lines are shifted. From your own measurements you build a Hubble diagram and estimate the expansion rate of the universe.",
  steps:['Point the telescope at each of the thirteen galaxies of the original exercise list and take its spectrum.','Line up the calcium K and H lines and the G band in the spectrum analyser to measure each redshift.','Turn each redshift into a recession velocity and combine it with the galaxy\'s distance from its magnitude.','Plot velocity against distance, fit the Hubble relation yourself and save your investigation.'],
  learn:['How a spectrum reveals the motion of a galaxy.','What the Hubble constant means and how it is measured.','Why astronomers use standard candles to estimate distances.']},
 {slug:'large-scale-structure',exercise:'E02',name:'Large-scale structure',guide:'LSS guide',
  title:'Large-scale structure lab (CLEA VIREO) · OpenVireo',
  description:"Survey a strip of sky, measure many galaxy redshifts and plot a wedge diagram of the cosmic web. A free web reconstruction of CLEA's VIREO LSS lab.",
  heading:'The large-scale structure of the universe',
  intro:'Choose one of the nine original survey fields, measure the redshift of galaxy after galaxy, and plot them in a wedge diagram. Walls, filaments and voids appear in your own data.',
  steps:['Choose a survey field and a telescope.','Take the spectrum of each galaxy and record its redshift.','Plot your own records in a right ascension–velocity wedge diagram.','Describe the structures you see and save your investigation.'],
  learn:['How redshift surveys map the universe in three dimensions.','What clusters, walls, filaments and voids are.','How a wedge diagram is read.']},
 {slug:'stellar-classification',exercise:'E03',name:'Stellar classification',guide:'Classification guide',
  title:'Classification of stellar spectra lab (CLEA VIREO) · OpenVireo',
  description:"Classify stars by comparing their spectra with standards, marking lines and measuring equivalent widths. A free web reconstruction of a CLEA VIREO lab.",
  heading:'Classification of stellar spectra',
  intro:'Load one of the 25 original practice spectra and compare it with an atlas of standard stars. You decide its spectral type from the lines you see; nothing is graded and no answer is given away.',
  steps:['Load a practice spectrum and an atlas of standard spectra.','Compare it with neighbouring standards, side by side or as a difference.','Mark spectral lines from the line table and measure an equivalent width.','Record your own spectral type and reasoning, then save your investigation.'],
  learn:['The OBAFGKM spectral sequence and what sets it.','Which absorption lines mark hot and cool stars.','How to compare a spectrum with standards objectively.']},
 {slug:'pleiades',exercise:'E04',name:'Pleiades photometry',guide:'Pleiades lab guide',
  title:'Photometry of the Pleiades lab (CLEA VIREO) · OpenVireo',
  description:"Measure the B and V brightness of Pleiades stars with a virtual photometer and estimate the cluster's distance. A free web reconstruction of a CLEA VIREO lab.",
  heading:'Photoelectric photometry of the Pleiades',
  intro:'Point the telescope at the 24 Pleiades stars of the original exercise list and measure each one through B and V filters with a virtual photometer. From your own readings you plot the cluster sequence and estimate its distance.',
  steps:['Load the Pleiades list and point the telescope at a star.','Measure the sky and the star through the B and V filters.','Record your readings and form a B−V colour for each star.','Fit the main sequence by hand to estimate the distance, and save your investigation.'],
  learn:['How photometry measures the brightness and colour of stars.','What a colour–magnitude diagram shows.','How main-sequence fitting gives the distance to a cluster.']},
 {slug:'cluster-hr',exercise:'E05',name:'Cluster HR diagrams',guide:'Cluster HR guide',
  title:'HR diagrams of star clusters lab (CLEA VIREO) · OpenVireo',
  description:"Plot HR diagrams of star clusters, fit their main sequences and compare them with your own Pleiades data. A free web reconstruction of a CLEA VIREO lab.",
  heading:'HR diagrams of star clusters',
  intro:'Plot a reference cluster from the database, fit its main sequence, and compare it with the Pleiades stars you measured yourself in the photometry lab.',
  steps:['Choose a reference cluster from the database and plot its HR diagram.','Fit its main sequence.','Plot your own Pleiades B and V measurements.','Compare both sequences yourself.'],
  learn:['How the Hertzsprung–Russell diagram is built.','How cluster diagrams reveal distance and age.','Why reddening by dust shifts a cluster in the diagram.']},
 {slug:'pulsars',exercise:'E06',name:'Pulsars',guide:'Pulsar guide',
  title:'Radio astronomy of pulsars lab (CLEA VIREO) · OpenVireo',
  description:"Record pulsars at two frequencies with a virtual radio telescope and measure their periods and dispersion. A free web reconstruction of CLEA's VIREO pulsar lab.",
  heading:'Radio astronomy of pulsars',
  intro:'Steer a virtual radio telescope to pulsars from the original catalogue and record their pulses at two radio frequencies. The delay between frequencies reveals how much interstellar matter the signal crossed.',
  steps:['Start the pulsar exercise and point the radio telescope at a pulsar.','Record its pulses at two different frequencies.','Measure the period and the delay between the frequencies.','Compare your results with the dispersion measure and period, and save your investigation.'],
  learn:['What pulsars are and why they pulse.','How dispersion delays low-frequency radio signals.','How the dispersion measure hints at a pulsar\'s distance.']},
 {slug:'object-x',exercise:'E08',name:'Object X',guide:'Object X guide',
  title:'Object X: identify a mystery object (CLEA VIREO) · OpenVireo',
  description:"From coordinates alone, tell if Object X is a star, galaxy, quasar, pulsar or asteroid using images, spectra and radio. A free web reconstruction of a CLEA lab.",
  heading:'Object X: what is it?',
  intro:'You receive only an identifier and coordinates. Using CCD images taken at different times, spectra and the radio telescope, you decide whether the object is a star, a galaxy, a quasar, a pulsar or an asteroid.',
  steps:['Receive a target as an identifier and coordinates; its identity stays hidden.','Observe it with the CCD camera, the spectrometer and the radio telescope.','Decide what kind of object it is and justify it with your own observations.','For an asteroid, measure its positions on several images and describe its motion.'],
  learn:['How different kinds of objects look in images, spectra and radio.','How motion between images reveals a Solar System body.','How to build an argument from several kinds of evidence.']},
]);
