import type {HELP_VIEWER_EN} from '../../../help/HelpViewerMessages';
import type {Translation} from '../../maps';
/** Front PT-HELP: Brazilian Portuguese (pt-BR) for the help viewer's language switch and the Spectral Line Table window. A web
 * adaptation by OpenVireo, not CLEA's (VIREO's missing-file box is spectralLines.ts SPECTRAL_LINE_MISSING_LITERALS, through vireo()). */
export const HELP_VIEWER_PT:Translation<typeof HELP_VIEWER_EN>=Object.freeze({
 translationLabel:'Tradução: adaptação web do OpenVireo (não é do CLEA)',
 originalLabel:'Original: o texto exato do VIREO, em inglês',
 viewOriginal:'Ver original (inglês)',
 viewTranslation:'Ver tradução',
 translationError:'Não foi possível carregar a ajuda traduzida, ou ela não correspondeu ao arquivo original do qual foi traduzida; por isso, é exibida a ajuda original do VIREO em inglês.',
 helpAdaptationTranslation:(list:string)=>`A tradução para o português do OpenVireo da ajuda do próprio VIREO (seu índice ${list} e os arquivos de texto que ele indica; uma adaptação web, não do CLEA), exibida em uma versão web do visualizador de ajuda do VIREO. Os tamanhos de janela, as fontes e o bipe do sistema não são reproduzidos.`,
 linkNoteTranslation:'Clique duas vezes ou pressione Enter em um título abaixo de “Tópicos relacionados” para abri-lo. Uma linha em branco ali não faz nada neste site; o VIREO para com um erro nela.',
 searchFoldNote:'Na tradução, a pesquisa ignora acentos e maiúsculas e minúsculas, o que é uma adaptação web. A pesquisa do próprio VIREO, mantida na visão original, ignora apenas as maiúsculas e minúsculas de A a Z.',
 spectralLines:Object.freeze({
  listCaption:'Linhas espectrais',
  rows:'Linhas espectrais',helpRows:'Texto de ajuda da linha espectral',close:'Fechar',
  loading:'Carregando a lista de linhas espectrais do VIREO…',
  error:'Não foi possível carregar os arquivos de linhas espectrais do VIREO (SPECLNS.LNL, SPECLNS.TXT), ou eles não corresponderam ao tamanho e ao SHA-256 registrados.',
  retry:'Tentar de novo',ok:'OK',
  note:'A lista de linhas espectrais do VIREO (SPECLNS.LNL). Clique duas vezes em uma linha, ou pressione Enter, para ler a ajuda dela em SPECLNS.TXT. Como no VIREO, a ajuda é encontrada pelo nome da linha, então algumas linhas (por exemplo, as últimas linhas de He I) mostram a seção da primeira linha com esse nome. Um único clique (ou uma tecla de seta) move o cursor de classificação para a linha, na coluna de pixels mais próxima da exibição; a lista então seleciona a linha mais próxima dessa coluna, como faz o VIREO (assim, Fe I 4143.878 seleciona He I 4143.76 na visão completa). As teclas de seta seguem a mesma regra, de modo que a seta para baixo não passa de He I 4143.76 para Fe I 4143.88; use End ou Home, ou clique em uma linha posterior, para passar dela.',
  cursorAt:(wl:string)=>`Cursor em: ${wl} Å (o VIREO mostra o comprimento de onda da coluna de pixels do cursor, não o comprimento de onda da própria linha).`,
  cursorOutside:'A linha fica fora da faixa exibida, então nenhum cursor é desenhado (no VIREO, as leituras do cursor são apagadas ou apontam além da borda direita).',
  textErrorCaption:'Erro no arquivo de ajuda',
  textError:(file:string)=>`Não foi possível carregar o arquivo de ajuda de linhas espectrais do VIREO (${file}), ou ele não correspondeu ao tamanho e ao SHA-256 registrados. A lista de linhas continua aberta; tente a linha de novo.`,
 }),
});
