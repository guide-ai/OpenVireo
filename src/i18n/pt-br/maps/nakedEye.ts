import type {NAKED_EYE_MESSAGES_EN} from '../../../observatory/FieldInfoMessages';
import type {Translation} from '../../maps';
/** Front PT1: Brazilian Portuguese (pt-BR) for the naked-eye sky through the open dome (Naked Eye Star). A web adaptation by OpenVireo, not CLEA's. */
export const NAKED_EYE_PT:Translation<typeof NAKED_EYE_MESSAGES_EN>=Object.freeze({
 eyebrow:'VIREO · Cúpula aberta',title:'Céu a olho nu',
 help:'As estrelas brilhantes (V ≤ 5.5) que você veria a olho nu pela cúpula aberta, como o VIREO as desenha: cerca de 31° de largura e 40° de altura, centradas a 45° acima do horizonte, na direção para a qual o telescópio aponta. Clique com o botão direito em uma estrela (ou mova o cursor com as setas do teclado e pressione Enter) para ver os dados dela.',
 skyLabel:'Céu a olho nu pela cúpula. Clique com o botão direito em uma estrela, ou use as setas do teclado e Enter, para abrir Estrela a olho nu (Naked Eye Star).',
 loading:'Carregando o arquivo de estrelas a olho nu…',
 fileError:'Não foi possível carregar o arquivo de estrelas a olho nu (NkdEye.dat), ou ele não correspondeu ao tamanho e ao SHA-256 registrados.',
 caption:(site:string,utc:string,count:number)=>`${site} · ${utc} UT (o momento em que a cúpula foi aberta; feche e reabra a cúpula para redesenhar) · ${count} ${count===1?'estrela visível':'estrelas visíveis'}.`,
 adaptation:'Adaptação web: as estrelas são desenhadas como discos de acordo com o nível de brilho do VIREO, em vez de seus sprites de estrelas, e as portinholas da cúpula não são desenhadas. As posições, a região visível (incluindo a peculiaridade do VIREO que descarta muitas estrelas logo a oeste da linha central quando se olha para o sul) e a seleção com o clique do botão direito seguem o original.',
 showAtCursor:'Mostrar a estrela no cursor',
 tapAdaptation:'Adaptação web para telas sensíveis ao toque: toque no céu para mover o cursor (+) e depois pressione “Mostrar a estrela no cursor”. Um toque sozinho não abre a estrela, assim como um clique com o botão esquerdo não faz nada no VIREO.',
 magNote:'Como no VIREO, é possível digitar a Mag. V, mas nada é salvo.',
});
