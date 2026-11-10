import type {ENGINE_VIEW_EN} from '../../../SpectrumEngineMessages';
import type {Translation} from '../../maps';
/** Front PT2: Brazilian Portuguese (pt-BR) for the measuring engine's web strings (zoom window, pan and readout). A web adaptation by OpenVireo, not CLEA's. */
export const ENGINE_VIEW_PT:Translation<typeof ENGINE_VIEW_EN>=Object.freeze({
 panLeft:'Mover a janela 100 Å para a esquerda',
 panRight:'Mover a janela 100 Å para a direita',
 readoutEmpty:'Arraste no gráfico, ou foque nele e use as teclas de seta, para ler um comprimento de onda.',
 nearest:'Linha de comparação mais próxima',
 nearestNone:'Nenhuma linha de comparação a menos de 100 Å do cursor.',
 nearestFound:(label:string,shifted:string)=>`Linha de comparação mais próxima: ${label} em ${shifted} Å.`,
 plotHelp:'Gráfico do espectro. Arraste, ou use as teclas de seta, para mover o cursor; clique com o botão direito ou pressione N para ver a linha de comparação mais próxima.',
 window:(min:string,max:string)=>`Janela ${min}–${max} Å`,
 fullViewNote:'As visões completa e H/K são ajustes predefinidos da versão web; Zoom e as setas se aplicam à visão normal.',
 note:'Como no VIREO, o Zoom escolhe uma janela em passos de 100 Å a partir do início do espectro carregado e primeiro incorpora o controle de z à sua base (como Recentralizar); as setas movem a janela 100 Å e podem ultrapassar suas extremidades em menos de 100 Å; a leitura mostra o comprimento de onda observado sob o cursor e a altura do cursor no eixo do gráfico, não o valor do espectro.',
});
