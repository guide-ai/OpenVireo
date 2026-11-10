import type {SPECTRAL_RANGE_EN} from '../../../SpectralRangeMessages';
import type {Translation} from '../../maps';
/** Front PT2: Brazilian Portuguese (pt-BR) for the spectrometer range web strings (Front S). A web adaptation by OpenVireo, not CLEA's. */
export const SPECTRAL_RANGE_PT:Translation<typeof SPECTRAL_RANGE_EN>=Object.freeze({
 current:(min:string,max:string)=>`Faixa do espectrômetro: ${min}–${max} Å (600 canais).`,
 note:'Como no VIREO, OK inicia uma exposição nova na faixa nova (a atual é descartada); Cancelar (Cancel) mantém a faixa, e Padrão (Default) restaura 3700–4700 Å. Fora da cobertura do modelo (abaixo de 3510 Å), a fonte não dá contagens, como no VIREO. Como no VIREO, a faixa é um único ajuste compartilhado pelas rotas do espectrômetro de estrelas, céu, galáxias de Hubble, LSS, Objeto X e de campo, e pela classificação estelar; uma exposição existente mantém a faixa em que foi feita [W], e restaurar um arquivo de sessão torna a faixa dele a atual [W]. Qualquer faixa do diálogo pode ser usada para espectros de estrelas, galáxias, QSO e céu nessas rotas e no Multi-Spec; uma galáxia cujo espectro não alcança uma faixa, ou uma fonte brilhante demais nela para o telescópio, informa isso. O Objeto X só aceita as faixas em que cada alvo se comporta como em 3700–4700 Å [W].',
 objectXNote:'Como no VIREO, OK inicia o espectrômetro de novo na faixa nova (um espectro não salvo é descartado); Cancelar (Cancel) mantém a faixa, e Padrão (Default) restaura 3700–4700 Å. A faixa é um único ajuste compartilhado com as demais rotas do espectrômetro. Nesta versão web, o Objeto X só aceita as faixas em que cada alvo do Objeto X pode ser observado exatamente como em 3700–4700 Å; qualquer outra faixa dá a mesma mensagem para todos os alvos [W].',
 skyNote:'A fonte do céu não depende da faixa (o ramo do céu do VIREO em 0x50df64 e Iniciar [Go] em 0x50f4da não leem nenhuma), então só mudam os comprimentos de onda dos 600 canais.',
 notWitnessed:'Esta faixa espectral não pode ser usada aqui nesta versão web; defina a faixa de novo em 3700–4700 Å (Padrão) para observar.',
 multiSpecRange:(min:string,max:string)=>`O Multi-Spec lê a faixa do espectrômetro (${min}–${max} Å), que não pode ser usada aqui nesta versão web; defina-a de novo em 3700–4700 Å para obter espectros.`,
 unavailable:'Esta faixa não pode ser observada para esta estrela nesta versão web.',
 slider:(edge:string)=>`Controle deslizante: ${edge}`,
 locked:'Faixa espectral… (Spectral Range) está desativada: Permitir alteração pelo usuário (Allow User Change) não está marcado nas Opções de simulação óptica (Optical Simulation Options), na aba Espectrômetro, como no VIREO. Essas opções abrem no modo instrutor.',
});
