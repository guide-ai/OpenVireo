import type {CLUSTER_DATA_MESSAGES_EN} from '../../../clusterdata/ClusterDataMessages';
import type {Translation} from '../../maps';
/** Front PT4: Brazilian Portuguese (pt-BR) for the File › Cluster Data… web texts (Front K). A web adaptation by OpenVireo, not CLEA's.
 * VIREO's own captions and messages are rendered through vireo() and originals.json, not here. */
export const CLUSTER_DATA_PT:Translation<typeof CLUSTER_DATA_MESSAGES_EN>=Object.freeze({
 menuNote:'O VIREO mostra Arquivo (File) › Dados de aglomerados… (Cluster Data) nos modos de fotometria, de diagrama HR e de todos os instrumentos; este site não tem modos, então o item está sempre aqui.',
 groupsDisabled:'Tipo de listagem (Type of Listing) e Ordenar por (Sort By) são configurações do instrutor (Modo de edição [Edit Mode]) no VIREO; sem o Modo de edição, a lista é a lista de busca do estudante, ordenada por AR.',
 useTelescopeOff:'Usar as coordenadas do telescópio (Use Telescope Coordinates) exige a cúpula aberta e o acompanhamento ativado, assim como o VIREO exige o acionamento do telescópio ligado.',
 loading:'Carregando os dados de aglomerados…',loadError:'Não foi possível carregar os dados de aglomerados.',
 unavailableCaption:'Dados de aglomerados',
 tileReason:Object.freeze({
  polar:'Esta lista não pode ser feita aqui: tão perto de um polo celeste, o retângulo do VIREO em torno do centro se dobra de um modo que este site não reproduz. Afaste um pouco o centro do polo.',
  regions:'Esta lista não pode ser feita aqui: o retângulo cobre mais de 100 regiões do catálogo, mais do que o VIREO mantém. Use um diâmetro menor.',
  budget:'Esta lista não pode ser feita aqui: o retângulo contém mais registros do catálogo do que este site lê de uma vez. Use um diâmetro menor.',
  'band-end':'Esta lista não pode ser feita aqui: neste centro, o VIREO lê além do fim de um arquivo do catálogo e para com um erro.',
  plan:'Esta lista não pode ser feita aqui: um bloco do catálogo não estava onde era esperado.',
 }),
 tileFetch:'Não foi possível carregar os blocos do catálogo deste campo. Verifique a conexão e tente novamente.',
 reportNoteTiles:'A lista é a consulta do VIREO ao catálogo de estrelas-guia (Guide Star Catalog) completo, lido dos blocos do catálogo deste site, no centro e no diâmetro da caixa de diálogo, filtrada pelo limite de magnitude. As posições e as magnitudes são as do catálogo; apenas os 16 aglomerados publicados têm comentários.',
 spectral:'Esta lista não pode ser exibida: um código espectral deste campo não tem texto recuperado.',
 editModeColumns:'Modo de edição (Edit Mode): o VIREO também lista, de cada aglomerado, a cor do ponto de desvio da sequência principal, a distância, o módulo de distância e a idade; esses valores do catálogo não são publicados neste site, então apenas E(B−V) é exibido.',
 saveListUnavailable:'Salvar lista (Save List) não está disponível aqui: o VIREO grava os registros completos de aglomerados, de 102 bytes, que incluem valores do catálogo que este site não publica.',
 noSelection:'Primeiro selecione a linha de um aglomerado (clique com o botão esquerdo).',
 reportNote:'A lista é a consulta do VIREO ao campo publicado do aglomerado no centro e no diâmetro da caixa de diálogo (conferida antecipadamente para dar exatamente as estrelas publicadas), filtrada pelo limite de magnitude.',
 emptyField:'Nenhuma estrela deste campo é tão brilhante quanto o limite de magnitude. Depois da caixa acima, o VIREO ainda abre o relatório dele, com “0 Stars” (0 estrelas) e as linhas da consulta anterior; este site não exibe nenhuma lista.',
 emptyUnknown:'Nenhuma estrela publicada deste campo é tão brilhante quanto o limite de magnitude. O VIREO pode não ter listado nenhuma ou ter respondido “Nenhuma estrela encontrada no campo!” (“No Stars Found in Field!”), conforme estrelas do catálogo que este site não publica, então nenhuma lista é exibida.',
 listModal:'Adaptação web: o VIREO mostra esta lista em uma janela separada ao lado da caixa de diálogo; aqui ela abre por cima dela.',
 listNote:'Clique duas vezes em uma linha (ou use Obter os dados da seleção [Get Selection Data]) para copiá-la para Parâmetros de dados de aglomerados (Cluster Data Parameters); clique com o botão direito em uma linha selecionada para ver os itens da lista de objetos.',
 printNote:'Adaptação web: uma visualização de impressão da lista; o VIREO imprime em paisagem no Modo de edição e em retrato nos demais casos.',
});
