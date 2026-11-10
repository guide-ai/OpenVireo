import type {OBJECT_X_GUIDE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front PT6: Brazilian Portuguese (pt-BR) for the E08 guide. A web adaptation by OpenVireo, not CLEA's. The observatory names it
 * quotes are the Portuguese of the observatory's own buttons (PT1: Digite as coordenadas, Apontar para as coordenadas, Campo de
 * visão › Telescópio · 15′, Mover para o objeto selecionado). */
export const OBJECT_X_GUIDE_PT:Translation<typeof OBJECT_X_GUIDE_EN>=Object.freeze({
 eyebrow:'Guia do exercício E08',title:'Em busca do Objeto X',
 intro:'Você recebe apenas um identificador e coordenadas. Use os instrumentos para decidir que tipo de objeto ele é e depois revele a identidade dele. As etapas se atualizam enquanto você trabalha; nada julga sua resposta antes da revelação.',
 counts:(done,total,images)=>`${done} de ${total} etapas · ${images} imagens do seu objeto`,
 done:'(concluída)',todo:'(a fazer)',
 steps:Object.freeze({
  target:['Obtenha seu objeto','Na página do Objeto X, digite seu ID e escolha ou receba um código de objeto.'],
  clock:['Defina a data e a hora','Defina o relógio do observatório; o exercício original começa em 2009-06-01 às 04:00 UT.'],
  list:['Construa a lista de asteroides','A lista de asteroides observáveis para essa data é construída quando você define o relógio, de modo que suas imagens os incluam; reconstrua-a apenas depois de mudar o arquivo de órbitas ou a magnitude limite.'],
  image:['Obtenha imagens do campo','Copie as coordenadas para o observatório, abra a cúpula, abra Digite as coordenadas e clique em Apontar para as coordenadas (não em Mover para o objeto selecionado), escolha Campo de visão › Telescópio · 15′, ative o acompanhamento e obtenha uma imagem CCD (sem filtro e com 2 minutos, um objeto fraco fica mais fácil de ver).'],
  repeat:['Obtenha outra imagem mais tarde','Obtenha uma segunda imagem do mesmo campo 30–60 minutos depois: digite o horário posterior na página do Objeto X e clique em Definir o relógio do observatório; depois volte ao observatório. Um objeto rápido deixa um rastro curto durante uma exposição longa. Em uma noite posterior, a lista de asteroides é reconstruída para a nova data quando você define o relógio, e um asteroide rápido próximo da Terra (mais de 2° por dia) terá saído do campo: procure-o em torno da posição inicial.'],
  measure:['Compare por piscagem e meça','Compare as duas imagens por piscagem. Se algo se moveu, meça-o nas duas para obter a velocidade e a direção. Objetos fora do Sistema Solar não se movem.'],
  classify:['Decida o que é','Se nada se moveu, escute se há pulsos com o radiotelescópio e obtenha um espectro (Espectrômetro ou Multi-Spec na página do Objeto X) para distinguir uma estrela, uma galáxia e um quasar; você pode salvá-lo como .SSP e classificá-lo.'],
  describe:['Descreva suas evidências','Escreva o que você viu com cada instrumento.'],
  reveal:['Revele a identidade','Revele o objeto e compare-o com a sua resposta.'],
  save:['Salve sua investigação','Use Salvar investigação na barra de ferramentas; guarde também os arquivos FITS das suas imagens.'],
 }),
 progress:'Seu progresso',go:'Ir para o Objeto X',goObservatory:'Ir para o observatório',
 close:'Fechar o guia do Objeto X',return:'Voltar',
});
