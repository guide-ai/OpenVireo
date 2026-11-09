import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front ES2: Spanish (es-419) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_ES:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'(vacío)',
 note:'Como en VIREO, un espectro cargado desde un archivo toma su ID de objeto del nombre del archivo, su fecha a partir de la última modificación del archivo (aquí convertida a JD en UTC) y su posición, de la posición del telescopio que figura en el encabezado del archivo; la fotometría y el corrimiento al rojo quedan vacíos, y un cuadro vacío significa que el valor no se conoce. Un espectro clasificado directamente desde una exposición no tiene fecha de archivo, así que su JD queda vacío.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · AR ${ra||'—'} · Dec ${dec||'—'}`,
});
