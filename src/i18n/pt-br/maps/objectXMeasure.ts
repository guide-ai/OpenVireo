import type {OBJECT_X_MEASURE_EN} from '../../../objectx/ObjectXMessages';
import type {Translation} from '../../maps';
/** Front PT6: Brazilian Portuguese (pt-BR) for the E08 position-measuring tool (blink, centroids, plate solution, motion). A web
 * adaptation by OpenVireo, not CLEA's. Nothing here names or describes a target. */
export const OBJECT_X_MEASURE_PT:Translation<typeof OBJECT_X_MEASURE_EN>=Object.freeze({
 title:'Medir posições',
 intro:'Compare duas imagens por piscagem para encontrar o que se moveu e depois clique em uma fonte para medi-la. Para uma solução astrométrica, marque pelo menos três estrelas de referência com coordenadas de catálogo em uma imagem, ou use as coordenadas de imagem escritas no cabeçalho dela.',
 adaptation:'Adaptação web: o programa original envia as imagens para o CLEA Astrometry Toolkit, um programa externo de astrometria. Esta ferramenta segue o guia do usuário desse programa (o pixel mais brilhante a menos de 8 pixels, pesos ao cubo, seis constantes de placa) e não é uma migração dele.',
 frame:(n,label)=>`Imagem ${n}: ${label}`,noFrames:'Nenhuma imagem carregada.',
 blinkStart:'Iniciar a piscagem',blinkStop:'Parar a piscagem',blinkInterval:'Intervalo da piscagem (ms)',showFrame:'Mostrar imagem',
 roleTarget:'Alvo',roleReference:'Estrela de referência',roleLegend:'A próxima marca é',
 refRa:'AR do catálogo (h m s)',refDec:'Dec do catálogo (° ′ ″)',refInvalid:'Digite a AR da estrela de referência como h m s e a Dec como ° ′ ″.',
 cursor:(x,y)=>`Cursor x ${x}, y ${y}`,measure:'Medir no cursor',viewport:'Imagem; as setas movem o cursor e Enter faz a medição',
 keyboardHelp:'As setas movem o cursor um pixel por vez (com Shift: dez). Enter ou a barra de espaço fazem a medição.',
 rangeLow:'Corte inferior',rangeHigh:'Corte superior',
 rangeNote:'Os cortes definem ao mesmo tempo o contraste da exibição e os pesos do centroide (padrão da versão web: o inferior no nível do céu, a mediana da imagem; o superior em 50 % da faixa da imagem). Se Medir no cursor não encontrar nenhuma fonte acima do corte inferior, reduza o corte inferior ou faça uma exposição mais longa.',
 blinkAligned:'A piscagem está alinhada pelas duas primeiras estrelas de referência de cada imagem.',
 blinkRaw:'A piscagem alterna as imagens brutas (supõe-se o mesmo apontamento); marque duas estrelas de referência em cada imagem para alinhá-las.',
 plateTitle:'Soluções astrométricas',plateFrame:(n,refs)=>`Imagem ${n}: ${refs} estrelas de referência`,plateNone:(n,refs)=>`Imagem ${n}: ${refs} estrelas de referência (são necessárias pelo menos 3)`,
 plateDegenerate:n=>`Imagem ${n}: as estrelas de referência estão quase alinhadas.`,plateRms:(rms,scale)=>`rms ${rms}″, escala ${scale}″/pixel`,colResidual:'Resíduo (″)',
 table:'Medições',colFrame:'Imagem',colRole:'Marca',colX:'x',colY:'y',colRa:'AR',colDec:'Dec',colUt:'UT',colMethod:'Solução',remove:'Remover',
 notSolved:'sem solução',methodPlate:'constantes de placa',methodWcs:'WCS do cabeçalho',
 motion:(rate,pa,arcsec,hours)=>`Movimento: ${rate}″/h em direção ao ângulo de posição ${pa}° (${arcsec}″ em ${hours} h).`,
 motionNone:'Meça o alvo em duas imagens feitas em horários diferentes para obter o movimento dele.',
 errors:Object.freeze({bounds:'O cursor está fora da imagem.',range:'O corte inferior deve ser menor que o corte superior.','no-signal':'Nenhuma fonte acima do corte inferior perto do cursor.',references:'Há marcas demais; remova algumas antes.',degenerate:'As estrelas de referência estão quase alinhadas; escolha outras.',wcs:'Esta imagem não tem um cabeçalho de coordenadas utilizável.',time:'As duas imagens têm o mesmo horário.'}),
});
