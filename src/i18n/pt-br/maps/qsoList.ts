import {HST_ARCHIVE} from '../../../core/observatoryMenuLiterals';
import type {QSO_LIST_MESSAGES_EN} from '../../../observatory/QsoListMessages';
import type {Translation} from '../../maps';
/** Front PT1: Brazilian Portuguese (pt-BR) for the QSO List and the HST Image Archive item. A web adaptation by OpenVireo, not CLEA's. */
export const QSO_LIST_PT:Translation<typeof QSO_LIST_MESSAGES_EN>=Object.freeze({
 virtualObservatoryLabel:'Observatório virtual (instrutor, VIREO)',
 virtualObservatoryAdaptation:'Adaptação web: no VIREO, esta opção do instrutor, desativada por padrão, habilita Executar exercício (Run Exercise) › Observatório virtual (todos os instrumentos), o modo em que os estudantes têm Arquivo (File) › Lista de QSO (QSO List). Aqui ela só se abre no modo instrutor (a forma web do Modo de demonstração, Demonstration Mode, sem senha); fica desativada por padrão, a página não a salva (só Salvar alterações [Save Updates] a grava, em um arquivo de opções que você guarda), Sair a desativa e seu único efeito é mostrar Arquivo › Lista de QSO.',
 sortDisabled:'Opções de ordenação (Sort Options) só está disponível no Modo de edição (Edit Mode), como no VIREO; sem ele, a lista é ordenada por magnitude.',
 limitLabel:'Magnitude limite, V',
 withheld:'As linhas perto dos alvos do Objeto X não são listadas, para que a lista não possa revelar o que é um alvo do Objeto X ainda não revelado (regra web; o VIREO mostra esta lista só no modo Observatório virtual [Virtual Observatory] ou, durante o Objeto X, no Modo de edição [Edit Mode]).',
 editModeColumns:'Colunas do Modo de edição (Edit Mode): Z é o desvio para o vermelho do catálogo; B−V e U−B entre parênteses são cores médias atribuídas. Nenhum alvo de exercício está nesta lista.',
 noActivate:'Clicar duas vezes em uma linha não faz nada, como no VIREO; use Seleção (Selection) para adicionar um QSO à lista de objetos.',
 csvDisabled:'No VIREO, Separado por vírgulas (Comma Delimit) está desativado para esta lista.',
 modeless:'A lista continua aberta enquanto você observa; escolha Arquivo (File) › Lista de QSO (QSO List) de novo para mudar o limite ou a ordem.',
 printStudent:'Adaptação web: sem o Modo de edição (Edit Mode), o VIREO imprime o número da mesa do laboratório e os nomes dos estudantes abaixo da data; este site não registra nenhum dos dois, então imprime o “(não registrado)” (Not Recorded) do VIREO e nenhum nome.',
 fileError:(reason:string)=>`Adaptação web: a cópia incluída ${reason}.`,
 fileReasons:Object.freeze({download:'não pôde ser baixada',size:'não tem o tamanho registrado',sha256:'não corresponde ao SHA-256 registrado'}),
 objectXUnavailable:'Não é possível mostrar a lista de QSO: as posições dos alvos do Objeto X não puderam ser carregadas e, sem elas, a lista poderia revelar um alvo ainda não revelado.',
 loading:'Carregando o catálogo de QSO…',
 noSelection:'Selecione primeiro uma linha de QSO.',
 hst:Object.freeze({
  newTab:'(site externo, abre em uma nova aba)',
  note:`Adaptação web: o VIREO abria ${HST_ARCHIVE.defaultUrl} (o “${HST_ARCHIVE.optionsLabel}” das opções de arquivo [File Options] do VIREO) em uma janela do navegador. Essa página não existe mais; este link abre o equivalente atual em hubblesite.org, que a NASA agora oferece como sua galeria de imagens do Hubble (Hubble Images). Nada é enviado com ele.`,
 }),
});
