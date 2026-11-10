import type {FIELD_READ_DETAILS_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front PT1: Brazilian Portuguese (pt-BR) for the readable details of the catalogue tile and field read results. A web adaptation by OpenVireo, not CLEA's. */
export const FIELD_READ_DETAILS_PT:Translation<typeof FIELD_READ_DETAILS_EN>=Object.freeze({
 'field-tiles':Object.freeze({
  fetch:'um fragmento do catálogo não chegou',
  integrity:'um fragmento do catálogo não correspondeu ao tamanho e ao SHA-256 registrados',
  index:'não foi possível ler o índice do catálogo, ou ele não corresponde a este site',
  budget:'este campo precisa ao mesmo tempo de mais fragmentos do catálogo do que este site mantém na memória',
  'missing-tile':'este site pediu o fragmento do catálogo errado (por favor, relate o problema)',
 } as Record<string,string>),
 'field-unreadable':Object.freeze({
  'band-end':'no VIREO, este campo lê além do fim de uma faixa de declinação do catálogo, o que gera um erro de entrada/saída e deixa uma lista parcial de estrelas. Neste site, nenhum campo é exibido [adaptação web].',
  regions:'o VIREO avisaria “O campo contém regiões demais!” e manteria as primeiras 100 regiões; este site não reproduz isso [adaptação web].',
  budget:'o campo contém mais registros do catálogo do que este site lê em uma faixa de declinação [limite web].',
  plan:'este site leu fora dos fragmentos do catálogo que havia planejado (por favor, relate o problema).',
  source:'um arquivo de catálogo incluído não tem a forma esperada (por favor, relate o problema).',
  input:'esta posição do telescópio não é um ponto válido do céu.',
  evidence:'o mecanismo de campos encontrou seus registros inconsistentes (por favor, relate o problema).',
 } as Record<string,string>),
});
