import type {OBSERVATION_METADATA_EN} from '../../../ObservationMetadataMessages';
import type {Translation} from '../../maps';
/** Front PT1: Brazilian Portuguese (pt-BR) for the Observational Data values of loaded and acquired spectra. A web adaptation by OpenVireo, not CLEA's. */
export const OBSERVATION_METADATA_PT:Translation<typeof OBSERVATION_METADATA_EN>=Object.freeze({
 empty:'(vazio)',
 note:'Como no VIREO, um espectro carregado de um arquivo recebe o ID do objeto a partir do nome do arquivo, o horário a partir da última modificação do arquivo (aqui convertida em JD em UTC) e a posição a partir da posição do telescópio no cabeçalho do arquivo; a fotometria e o desvio para o vermelho ficam vazios, e uma caixa vazia significa que o valor não é conhecido. Um espectro classificado diretamente a partir de uma exposição não tem horário de arquivo, então seu JD fica vazio.',
 row:(jd:string,ra:string,dec:string)=>`JD ${jd||'—'} · AR ${ra||'—'} · Dec ${dec||'—'}`,
});
