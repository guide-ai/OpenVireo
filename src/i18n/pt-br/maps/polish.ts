import type {BundledHotListFailure} from '../../../io/bundledHotList';
import type {POLISH_MESSAGES_EN} from '../../../polish/PolishMessages';
import type {Translation} from '../../maps';

const FILE_REASONS:Readonly<Record<BundledHotListFailure,string>>=Object.freeze({download:'não pôde ser baixado',size:'não tem o tamanho registrado',sha256:'não corresponde ao SHA-256 registrado'});

/** Front PT0–PT1: Brazilian Portuguese (pt-BR) for the Front P web texts (About, Results Editors, cluster guide and the other polish items). A web adaptation by OpenVireo, not CLEA's. */
export const POLISH_PT:Translation<typeof POLISH_MESSAGES_EN>=Object.freeze({
 spectrometerIndex:Object.freeze({
  title:'Onde obter um espectro',
  intro:'O espectrômetro do VIREO é usado a partir do observatório, com o telescópio apontado para um alvo. No OpenVireo, cada exercício tem a sua própria rota verificada até o espectrômetro:',
  routesTitle:'Rotas até o espectrômetro',
  routes:Object.freeze([
   Object.freeze({label:'Exposição de estrela do catálogo',help:'o espectro da estrela compatível do catálogo, com Salvar e Imprimir.'}),
   Object.freeze({label:'Exposição de galáxias',help:'as treze galáxias do Hubble.HTL (lei de Hubble).'}),
   Object.freeze({label:'Levantamento LSS',help:'espectros de galáxias nos nove campos LSS.'}),
   Object.freeze({label:'Objeto X',help:'espectros dos alvos do Objeto X.'}),
   Object.freeze({label:'Multi-Spec',help:'o painel do espectrômetro multiobjeto no observatório, nos campos de exercício incluídos (e na prática do Objeto X).'}),
   Object.freeze({label:'Analisador de espectros',help:'meça deslocamentos de linhas e registre desvios para o vermelho.'}),
   Object.freeze({label:'Classificação',help:'classifique espectros de estrelas em comparação com os padrões.'}),
  ]),
  retired:'Esta página mostrava uma prévia de perfis de fonte preparados (M82, Coma1, Coma2) antes de existir a aquisição. Ela foi retirada em 2026-10-29; as rotas acima a substituem.',
 }),
 clusterGuide:Object.freeze({nav:'Guia do diagrama HR de aglomerados'}),
 multiSpecPrint:Object.freeze({unavailable:'Imprimir campo de seleção (Print Selection Field) não está disponível: nenhum campo do Multi-Spec é mostrado aqui.'}),
 infoListPrint:Object.freeze({
  note:'Prévia de impressão da página de lista do VIREO: a data e a hora (aqui no formato do seu navegador), a linha da mesa de laboratório (não registrada neste site), a linha do estudante (em branco: aqui não há login), o título da janela e as linhas da lista, em Courier. O espaçamento entre linhas e os recuos seguem a página do VIREO; as métricas da impressora não são reproduzidas. O título do trabalho de impressão do VIREO não é impresso na página.',
 }),
 siteInfo:Object.freeze({
  note:'No VIREO, esta janela de lista oculta seus menus Pesquisar (Search), Salvar texto (Save Text) e Editar (Edit) nas Informações do local (Site Information), então só Imprimir (Print) e Fechar (Close) são oferecidos.',
  printNote:'Adaptação web: o VIREO imprime as linhas da lista sob o seu cabeçalho compartilhado na impressora; aqui são impressos a data, o título e as linhas.',
 }),
 hotListEdit:Object.freeze({
  note:'Editar, Excluir e Desfazer (Edit, Delete, Undo) alteram a lista de objetos compartilhada, assim como o editor de Listas de objetos originais; Desfazer reverte apenas a última edição ou exclusão feita aqui.',
  deleteNote:'Adaptação web: a linha é removida da lista compartilhada; Desfazer a coloca de volta onde estava no arquivo (o VIREO a reinsere de acordo com a AR).',
 }),
 hotListPopup:Object.freeze({
  note:'Editar, Excluir e Desfazer (Edit, Delete, Undo) ficam no editor de Listas de objetos originais desta página.',
 }),
 cameraFieldSize:Object.freeze({
  note:'Para o telescópio aplicado, como o VIREO mostra quando a câmera abre (aqui com duas casas decimais).',
 }),
 terminateSlew:Object.freeze({
  note:'Adaptação web: o VIREO suspende o movimento enquanto pergunta; aqui o telescópio continua se movendo até você responder (se ele chegar antes, a pergunta se fecha). Sim o interrompe onde está; Não o deixa continuar.',
 }),
 comparison:Object.freeze({
  clear:'Limpar a comparação',none:'Nenhuma (limpa)',
  note:'Espectro de comparação (Comparison Spectrum) › Limpar (Clear) do VIREO: remove as linhas de comparação do gráfico e da tabela. Escolha uma lista para mostrá-las de novo. O estado limpo não é salvo; uma investigação salva mantém a lista escolhida.',
 }),
 results:Object.freeze({
  help:'Ferramentas › Editores de resultados (Results Editors) do VIREO. Resultados de observação abre os seus resultados de observação no analisador de espectros; Resultados de pulsares abre as medições de pulsares salvas na análise de pulsares.',
 }),
 pulsarPrint:Object.freeze({
  note:'Imprimir janela (Print Window) do VIREO (PrintScreen1Click 0x56d9d8, Front RE5) imprime o seu próprio cabeçalho e os parâmetros dos dados, e depois a imagem da janela. Como no VIREO, abri-la muda todos os painéis para o modo de cursor vertical, e os painéis são impressos com as cores de impressão do VIREO (fundo branco; eixos, rótulos e traços pretos; os cursores mantêm suas cores). Em paisagem, imprime “(Screen Image Printed on Next Page)” (a imagem da tela vai na página seguinte) e coloca a imagem na página 2. Adaptação web: a orientação é escolhida aqui (o VIREO usa a da impressora), a data é a do navegador, o número da mesa e o nome do estudante aparecem como “(Not Recorded)” (não registrado), pois não há login, e a imagem são os painéis web, não a imagem da janela do VIREO.',
  orientation:'Orientação da página',portrait:'Retrato',landscape:'Paisagem',
 }),
 wedgePrint:Object.freeze({
  note:'Adaptação web: Imprimir (Print) do VIREO define o esquema de cores como o oposto da opção Imprimir em cores (Print in Color) (scheme := Env+0x2e8d XOR 1, 0x580fba–0x580fc3), então imprime em preto e branco, a menos que essa opção esteja marcada (desativada na versão compilada; Opções de simulação óptica [Optical Simulation Options]). Esta impressão segue a opção e usa o layout de impressão do navegador. O destaque da seleção não é impresso.',
 }),
 printSky:Object.freeze({
  note:'O VIREO imprime o seu cabeçalho (a data e a hora, aqui no formato do seu navegador; o número da mesa de laboratório somente quando há um registrado; depois a linha do nome do estudante, em branco aqui porque o OpenVireo não tem login), a imagem do céu com as cores invertidas e em escala 1.5, e o rodapé com o centro do campo, o tamanho do campo, o telescópio e o instrumento. Adaptação web: o navegador monta a página e imprime a visão como ela é mostrada.',
  noInstrument:'(nenhum instrumento escolhido na visão do telescópio do OpenVireo)',
 }),
 about:Object.freeze({
  nativeNote:'A caixa Sobre (About) do VIREO, com seus textos como foram lidos do programa original (o logotipo dela não está incluído). O restante desta janela descreve esta reconstrução web.',
  siteTitle:'Este site',
  site:'O OpenVireo é uma reconstrução web gratuita e não comercial do VIREO do Project CLEA para estudantes, refeita no navegador a partir do comportamento recuperado do VIREO e de seus arquivos de dados originais. Não é o programa do CLEA e não afirma ser equivalente a ele; as adaptações web são identificadas onde aparecem. A tradução para o português do Brasil é uma adaptação web do OpenVireo; os arquivos e textos do CLEA não são alterados.',
  worksTitle:'O que funciona',
  works:Object.freeze([
   'Os sete exercícios do VIREO têm um caminho web para estudantes: a lei de Hubble (13 galáxias), a estrutura em grande escala, a classificação estelar, a fotometria das Plêiades (24 estrelas), os diagramas HR de aglomerados, os pulsares e a busca pelo Objeto X.',
   'Observatório óptico: cúpula, telescópios, visões do buscador e do telescópio, movimento do telescópio com o limite opcional do horizonte, listas de objetos, local e data, informações do catálogo e do campo, e as listas de estrelas variáveis e de QSO.',
   'Instrumentos: espectrômetro e fotômetro para os alvos dos exercícios, câmeras CCD e infravermelha (consulta ao catálogo em tempo real), o espectrômetro multiobjeto (Multi-Spec, nos campos de exercício incluídos e na prática do Objeto X) e o radiotelescópio com seu receptor e a análise de pulsares.',
   'Análise: medição e classificação de espectros, ajustes de Hubble e das Plêiades, o diagrama em cunha de LSS, os seus resultados de observação e as investigações salvas.',
  ]),
  privacyTitle:'Privacidade',
  privacy:Object.freeze([
   'Sem cookies e sem contas: o OpenVireo nunca pede o seu nome, o seu endereço de e-mail nem uma senha.',
   'Suas investigações, opções e resultados são salvos somente no seu computador: no armazenamento próprio deste navegador ou em arquivos que você escolhe baixar. Nada é enviado.',
   'As visitas são contadas somente de forma agregada e sem cookies (Cloudflare Web Analytics). Como qualquer provedor de hospedagem web, a Cloudflare recebe os dados técnicos de cada solicitação, como o seu endereço IP, para entregar a página.',
   'A consulta ao catálogo em tempo real das câmeras CCD e infravermelha envia somente as coordenadas do céu e o raio do campo ao CDS/VizieR (ou a um de seus espelhos oficiais). O seu navegador se conecta diretamente a esse servidor, então, como qualquer site, ele vê o seu endereço IP.',
   'Os links externos (o Arquivo de imagens do HST, Ajuda › Sites) abrem em uma nova aba somente quando você clica neles, e nada é enviado com eles.',
  ]),
  creditsTitle:'Créditos',
  credits:Object.freeze([
   'Project CLEA, Gettysburg College: criador do VIREO e de seus arquivos de dados. Com o apoio da National Science Foundation e do Gettysburg College.',
   'Dados de pulsares: provavelmente derivados do Catálogo de Pulsares do ATNF (Manchester, Hobbs, Teoh & Hobbs 2005); essa origem é incerta.',
   'Catálogos das câmeras: CDS/VizieR (doi:10.26093/cds/vizier); NOMAD (Zacharias et al. 2004); USNO-B1.0 (Monet et al. 2003); 2MASS (Skrutskie et al. 2006) por meio do NOMAD.',
   'Campos de estrelas: subconjuntos limitados do catálogo de estrelas-guia (Guide Star Catalog) tal como acompanha o VIREO.',
  ]),
 }),
 print:Object.freeze({
  title:'Prévia de impressão',button:'Imprimir…',close:'Fechar',error:'A impressão não está disponível neste navegador.',
  missing:'Nada para imprimir: a imagem não está sendo mostrada agora.',
 }),
 pulsarsHtl:Object.freeze({
  button:'Carregar o Pulsars.HTL incluído',
  note:'Adaptação web: a lista de pulsares do VIREO, Pulsars.HTL (8 pulsares), está incluída byte a byte neste site; no VIREO, você a abre com Carregar lista de objetos... (Load Hot List) a partir da pasta do VIREO. Carregá-la substitui a lista de objetos atual, como faz Carregar lista de objetos...',
  error:(code:BundledHotListFailure)=>`O Pulsars.HTL incluído ${FILE_REASONS[code]}; a lista de objetos atual não foi alterada.`,
 }),
});
