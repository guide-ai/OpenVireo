import type {SOUND_MESSAGES_EN} from '../../../sound/SoundMessages';
import type {Translation} from '../../maps';
/** Front PT1: Brazilian Portuguese (pt-BR) for the observatory Sound Effects option. A web adaptation by OpenVireo, not CLEA's. */
export const SOUND_PT:Translation<typeof SOUND_MESSAGES_EN>=Object.freeze({
 title:'Efeitos sonoros',
 toggle:'Efeitos sonoros (os sons da cúpula e do telescópio do VIREO)',
 hint:'Som para a cúpula, o movimento etc.',
 note:'Desativado, a menos que você o ative, e apenas durante esta visita. Nada é baixado enquanto estiver desativado; ao ativá-lo, o som do motor é preparado e os outros são carregados na primeira vez em que forem necessários. No VIREO, esta era uma opção de instrutor, ativada por padrão. A porta da cúpula toca enquanto abre ou fecha e, em seguida, toca um de oito sons finais; um movimento manual toca o servo, e um movimento para coordenadas toca o motor. Vários destes efeitos de 1992–93 podem vir de uma coleção de terceiros que o CLEA incluiu.',
 loading:'Carregando o som…',
 failed:'Os recursos de som do VIREO não estão disponíveis: este navegador não conseguiu carregar ou reproduzir o som, então os Efeitos sonoros (Sound Effects) foram desativados novamente.',
 channel:{dome:'Som da cúpula',telescope:'Som do telescópio'},
});
