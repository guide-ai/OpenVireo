import type {WEB_HELP_EN} from '../../../help/webHelp';
import type {Translation} from '../../maps';
/** Front PT-HELP: Brazilian Portuguese (pt-BR) for OpenVireo's own help topics (Ajuda › Tópicos de ajuda…). The labels quoted from
 * OpenVireo's screen are the Portuguese ones the interface already shows; VIREO's own menu names come from originals.json. A web
 * adaptation by OpenVireo, not CLEA's. Text only: the topic ids, block kinds and related links are the English source's
 * (webHelp.ts). */
const p=(text:string)=>text;
const steps=(...items:string[])=>items;
const list=(...items:string[])=>items;
const topic=(title:string,blocks:readonly (string|readonly string[]|{head:readonly string[];rows:readonly (readonly string[])[]})[])=>({title,blocks});

const START={title:'Comece aqui',topics:[
 topic('O que é o OpenVireo',[
  p('O OpenVireo é uma versão para navegador do VIREO, o Observatório virtual educacional do Project CLEA (Gettysburg College). Ele foi reconstruído a partir do comportamento recuperado do VIREO e de seus arquivos de dados originais; não é o programa do próprio CLEA.'),
  p('Nada é instalado e não há login nem conta. Tudo roda nesta aba do navegador, e o seu trabalho fica na aba até você salvá-lo como arquivo no seu computador.'),
  p('A versão 1.0 contém os sete exercícios do VIREO: a lei de Hubble, a estrutura em grande escala (LSS), a classificação estelar, a fotometria das Plêiades, os diagramas HR de aglomerados, os pulsares e a busca pelo Objeto X. Cada um tem um guia em Guias dos exercícios, no cabeçalho.'),
 ]),
 topic('Primeiros passos',[
  p('Se o seu instrutor passou um exercício, abra primeiro o guia dele: o guia lista cada etapa e leva você à página certa. Para explorar livremente:'),
  steps(
   'Abra Observatório no cabeçalho (grupo Observatório óptico).',
   'Pressione Abrir cúpula.',
   'Em Escolha um objeto, escolha um alvo da lista (ou digite em Pesquisar no catálogo) e depois pressione Apontar telescópio.',
   'Abra Relógio do observatório e acompanhamento espectral e pressione Ativar o acompanhamento. As câmeras e os espectrômetros precisam do acompanhamento.',
   'Mude para a visão do telescópio e use um instrumento: Abrir espectrômetro, a câmera CCD ou a câmera IR, ou o Multi-Spec.',
   'Meça o que você registrou em uma página de Análise e depois salve o seu trabalho (veja Salvar o seu trabalho).'),
 ]),
 topic('Guias dos exercícios',[
  p('O grupo Guias dos exercícios, no cabeçalho, tem um botão por exercício: Guia da prática de Hubble, Guia do LSS, Guia do Objeto X, Guia de pulsares, Guia da prática das Plêiades, Guia de classificação e Guia do diagrama HR de aglomerados.'),
  p('Um guia abre como uma janela com etapas numeradas. Uma marca indica cada etapa que você concluiu, e um botão como Continuar para a próxima etapa ou Ir para a próxima etapa leva você à página da etapa seguinte. Feche o guia quando quiser e abra-o de novo pelo cabeçalho; o seu progresso fica guardado enquanto a aba continuar aberta.'),
  p('Abrir um guia também inicia aquele exercício, como fazia escolher um exercício no VIREO: define quais telescópios ficam abertos (veja Telescópios e Solicitar tempo) e se os nomes e as magnitudes dos objetos são mostrados. No exercício do Objeto X, a identidade do objeto fica oculta até você revelá-la.'),
 ]),
 topic('Se você vem do VIREO (Windows)',[
  p('Se você conhece o programa para Windows, ou se a sua folha de exercícios foi escrita para ele, esta tabela mostra onde fica cada passo do VIREO no OpenVireo.'),
  {head:['No VIREO (Windows)','No OpenVireo'],rows:[
   ['Arquivo › Fazer login...','Não é necessário: não há contas nem login. Os nomes nas impressões ficam em branco.'],
   ['Arquivo › Executar exercício','Abra o guia do exercício em Guias dos exercícios, no cabeçalho.'],
   ['Arquivo › Definir data/hora de observação e ID...','Relógio do local › Definir data/hora… na página Observatório (UT). A página do Objeto X tem a sua própria caixa de data e hora (Definir o relógio do observatório); a caixa de ID dela identifica os seus dados salvos.'],
   ['Telescópios › Óptico','O cartão Telescópio óptico na página Observatório: escolha um perfil e depois Usar este telescópio.'],
   ['Telescópios › Óptico › Solicitar tempo','A caixa Solicitar tempo do mesmo cartão (só nos exercícios que restringem os telescópios maiores).'],
   ['Telescópios › Rádio','Radiotelescópio no cabeçalho (grupo Observatório de rádio).'],
   ['Interruptor Abrir/Fechar a cúpula','Abrir cúpula / Fechar cúpula na página Observatório.'],
   ['Botão do painel de controle do telescópio','Mudar para a visão do telescópio, depois Mover o telescópio e os cartões dos instrumentos.'],
   ['Ferramentas › (ferramentas de análise)','O grupo Análise no cabeçalho: Analisador de espectros, Classificação estelar, Banco de dados de aglomerados, Levantamento LSS, Dados do LSS, Objeto X, Estrelas variáveis; Dados de rádio para os pulsares.'],
   ['Ferramentas › Editores de resultados','O grupo Editores de resultados no cabeçalho: Resultados de observação e Resultados de pulsares.'],
   ['Carregar dados salvos...','Restaurar investigação (JSON) no menu Mais, no topo da página, ou o botão de carregar do editor de resultados em que você salvou.'],
   ['Ferramentas › Planilha','Use Baixar CSV dos resultados e abra o arquivo em qualquer programa de planilha.'],
   ['Ferramentas › Processamento de imagens (DS9)','As imagens das câmeras são salvas como arquivos FITS baixados e podem ser abertas em Arquivos › Imagens salvas ou em qualquer visualizador de FITS, inclusive o DS9.'],
   ['Arquivo › Sair do observatório','Salve o seu trabalho e depois feche a aba do navegador. O menu Arquivo de Mover o telescópio tem Sair do observatório, que mostra o lembrete do VIREO.'],
   ['Teclado: Alt, NumLock e MouseKeys','As teclas normais do navegador: veja Menus, teclado e celulares.'],
  ]},
 ]),
]};

const OBSERVATORY={title:'O observatório',topics:[
 topic('Cúpula, apontamento e acompanhamento',[
  p('A página Observatório segue três passos: 1 · Abra a cúpula, 2 · Escolha e aponte, 3 · Explore um instrumento.'),
  list(
   'Abrir cúpula revela o céu e habilita os controles do telescópio. O campo de visão alterna entre Buscador · 2.5° e Telescópio · 15′.',
   'Escolha um objeto lista alvos sugeridos, a lista do exercício de Hubble e todos os alvos do catálogo; Pesquisar no catálogo filtra a lista (Esc limpa o filtro). Apontar telescópio centraliza o telescópio na sua escolha. Em Digite as coordenadas, Apontar para as coordenadas aponta para qualquer ascensão reta e declinação.',
   'Mover o telescópio move o telescópio enquanto você mantém pressionado um botão de direção (com o mouse, Espaço ou Enter). O menu dele tem Definir coordenadas…, Ver/selecionar da lista… (as listas de objetos) e Adicionar o objeto ou a posição atual à lista….',
   'O acompanhamento fica em Relógio do observatório e acompanhamento espectral: Ativar o acompanhamento mantém o apontamento enquanto o relógio corre. As câmeras e os espectrômetros se recusam a obter dados enquanto o acompanhamento está desativado.'),
 ]),
 topic('Telescópios e Solicitar tempo',[
  p('O cartão Telescópio óptico da página Observatório oferece os três telescópios do VIREO: o de 0.4 m, o de 0.9 m do KPNO e o de 4 m do KPNO. Escolha um em Perfil de telescópio a examinar ou selecionar e pressione Usar este telescópio. Os menus do VIREO chamam o de 0.9 m de telescópio de 1.0 metro.'),
  p('Nos exercícios de fotometria das Plêiades, de diagramas HR de aglomerados e de classificação, os telescópios maiores são restritos, como no VIREO. Aparece então no cartão uma caixa Solicitar tempo, com Solicitar telescópio de 1.0 metro e Solicitar telescópio de 4.0 metros. Se o tempo for concedido, você recebe um número de usos; se não, pode pedir de novo depois de alguns minutos. O de 0.4 m está sempre disponível, e os exercícios de Hubble, LSS e Objeto X deixam todos os telescópios abertos.'),
 ]),
 topic('Data, hora e local',[
  p('Relógio do observatório e acompanhamento espectral inicia e pausa o relógio do observatório e ativa ou desativa o acompanhamento.'),
  p('Relógio do local · cenário de UT fixo define a data e a hora da observação com Definir data/hora… (em UT, não na hora local). Informações do local… mostra o observatório, e Parâmetros do local… muda o local usado pelos relógios e pelo horizonte. Use a data e a hora indicadas no material do seu exercício.'),
 ]),
 topic('Instrumentos',[
  list(
   'Espectrômetro: Abrir espectrômetro na página Observatório, ou as páginas dos exercícios (Exposição de estrela, Exposição de galáxia, Levantamento LSS, Objeto X). O botão Espectrômetro no cabeçalho lista onde cada tipo de espectro é obtido.',
   'Fotômetro: Fotometria das Plêiades no cabeçalho.',
   'Exposição do céu, Exposição de estrela e Exposição de galáxia, no cabeçalho, obtêm espectros do fundo de céu, da estrela compatível do catálogo e das galáxias de Hubble.',
   'Câmeras CCD e IR: o cartão da câmera na página Observatório. Iniciar exposição obtém uma imagem; Salvar imagem (FITS) baixa a imagem. Campos sem uma lista de estrelas incluída podem consultar ao vivo o serviço de catálogos VizieR (só as coordenadas e o raio são enviados).',
   'Multi-Spec: o cartão do espectrômetro multiobjeto na página Observatório.',
   'Radiotelescópio: veja Radiotelescópio e pulsares.'),
  p('Cada instrumento tem o seu próprio botão de Ajuda. Ele mostra a ajuda do VIREO para aquele instrumento, traduzida, com Ver original (inglês); onde o painel do OpenVireo difere do painel do VIREO, o próprio painel tem uma nota web.'),
 ]),
 topic('Radiotelescópio e pulsares',[
  p('Radiotelescópio, no cabeçalho, abre o painel de controle do radiotelescópio. Comece com Iniciar exercício de pulsares, aponte para um pulsar e registre o sinal dele com o receptor. O painel tem o seu próprio menu Ajuda, com a ajuda de rádio do VIREO.'),
  p('Dados de rádio abre a análise de pulsares: meça o período e o atraso entre frequências com os cursores, no seu registro ou em um arquivo .PLR salvo. As medições registradas se perdem quando você recarrega a página, a menos que você as salve: Salvar investigação guarda o seu registro e as medições confirmadas (veja Salvar o seu trabalho).'),
 ]),
]};

const ANALYSIS={title:'Análise e resultados',topics:[
 topic('Páginas de análise',[
  list(
   'Analisador de espectros: alinhe linhas de referência com um espectro para medir o desvio para o vermelho dele e guarde os seus resultados.',
   'Classificação estelar: compare um espectro com as estrelas padrão do atlas e escolha o tipo espectral dele.',
   'Banco de dados de aglomerados: plote diagramas HR de aglomerados e ajuste a sequência principal e as isócronas.',
   'Levantamento LSS: obtenha os espectros de galáxias dos campos do levantamento. Dados do LSS: plote os desvios para o vermelho em um diagrama em cunha.',
   'Objeto X: identifique um objeto desconhecido a partir do identificador e das coordenadas dele.',
   'Estrelas variáveis: consulte uma estrela variável e plote a curva de luz dela.',
   'Dados de rádio: meça pulsares (veja Radiotelescópio e pulsares).'),
 ]),
 topic('Salvar o seu trabalho',[
  p('O OpenVireo não guarda nada em um servidor. A maior parte do seu trabalho fica nesta aba e se perde quando você a recarrega ou fecha, então salve-o como arquivo no seu computador.'),
  list(
   'Salvar investigação (no topo de cada página) baixa um arquivo com os seus espectros, medições e configurações. Restaurar investigação (JSON), no menu ao lado, carrega esse arquivo de novo mais tarde; O que um backup inclui, no mesmo menu, lista exatamente o que ele abrange.',
   'Resultados de observação (no grupo Editores de resultados) abre os seus desvios para o vermelho confirmados: Baixar texto dos resultados, Baixar CSV dos resultados (para um programa de planilha) e Imprimir resultados.',
   'Salvar investigação também guarda o seu registro de pulsar e as medições de pulsares confirmadas. Para um arquivo .CSV, use Salvar medições registradas (.CSV) em Dados de rádio; Resultados de pulsares abre um arquivo salvo para revisá-lo.',
   'As imagens das câmeras são baixadas como arquivos FITS; abra-as em Arquivos › Imagens salvas.',
   'As listas de objetos são salvas como arquivos .HTL no editor Listas de objetos originais.'),
  p('Só o tema de cores, as seções do menu que você deixou abertas, se você já viu o tour, se a tecla ? abre a ajuda, o Modo de demonstração do instrutor e o caderno de observação da classificação ficam guardados no próprio navegador.'),
 ]),
 topic('Impressão',[
  p('Alguns botões de impressão, como Imprimir resultados e Imprimir espectro, abrem diretamente a caixa de diálogo de impressão do navegador. Outros, como Imprimir imagem do céu... e Imprimir diagrama em cunha..., mostram primeiro uma prévia de impressão, cujo botão Imprimir… a abre. A caixa de diálogo de impressão do navegador também pode salvar como PDF.'),
 ]),
 topic('Concluir um exercício',[
  p('Salve a sua investigação e os arquivos de resultados de que precisar para o seu relatório e depois feche a aba do navegador. Sair do observatório, no menu Arquivo de Mover o telescópio, mostra o lembrete de fim de exercício do VIREO; uma página web não pode se fechar sozinha, então é você que fecha a aba.'),
 ]),
]};

const SITE={title:'Usar o site',topics:[
 topic('Menus, teclado e celulares',[
  list(
   'O menu agrupa todas as páginas em seções: Observatório óptico, Observatório de rádio, Análise, Editores de resultados, Arquivos e Guias dos exercícios. Clique no nome de uma seção para abri-la ou fechá-la; a seção da página em que você está se abre sozinha, e o navegador lembra as outras. No celular, o menu fica atrás do botão Menu.',
   'Ajuda fica sempre no topo da página, também no celular. Pressione a tecla ? em qualquer lugar fora de um campo de texto para abrir estes tópicos de ajuda; você pode desativar essa tecla abaixo.',
   'Ajuda › Fazer o tour pelo site mostra de novo o tour da primeira visita.',
   'Código-fonte e Relatar um problema, no pé do menu e em Ajuda, abrem a página do OpenVireo no GitHub em uma nova aba. Relatar um problema inicia uma nova issue com o nome da página em que você estava já preenchido; o GitHub pede que você faça login, e nada é enviado até você enviar lá.',
   'Tab e Shift+Tab passam de um controle a outro; Enter ou Espaço pressiona um botão.',
   'Esc fecha menus e caixas de diálogo.',
   'Os botões de direção (do telescópio e de rádio) movem enquanto ficam pressionados com o mouse, Espaço ou Enter.',
   'Os cursores do espectro se movem com as teclas de seta (Shift para passos maiores); Enter ou Espaço aplica, Esc cancela.',
   'O seletor de tema escolhe as cores Sistema, Claro ou Escuro.'),
  'Abrir os tópicos de ajuda com a tecla ?',
 ]),
 topic('Modo instrutor',[
  p('Modo instrutor…, no cabeçalho, depois de uma confirmação, abre as opções de instrutor do VIREO nesta aba do navegador: Opções de simulação óptica… no menu de Mover o telescópio e as preferências de rádio, que ficam fechadas para os alunos. Ele não tem senha, não é uma trava e não mostra respostas. Sair o desativa.'),
 ]),
 topic('A ajuda original do VIREO',[
  p('Os botões de Ajuda dentro de cada instrumento e ferramenta mostram a ajuda do próprio VIREO para aquela janela, traduzida para o português como adaptação web do OpenVireo; Ver original (inglês) mostra o texto do programa original sem alterações.'),
  p('A ajuda da janela principal do VIREO descrevia os menus do programa para Windows, que o OpenVireo substitui por páginas próprias, por isso ela não é oferecida aqui: Se você vem do VIREO (Windows) relaciona cada um desses menus com o lugar dele no OpenVireo.'),
 ]),
]};

export const WEB_HELP_PT:Translation<typeof WEB_HELP_EN>=Object.freeze({
 caption:'Ajuda do OpenVireo',
 close:'Fechar',
 navLabel:'Tópicos de ajuda',
 related:'Veja também:',
 groups:[START,OBSERVATORY,ANALYSIS,SITE],
});
