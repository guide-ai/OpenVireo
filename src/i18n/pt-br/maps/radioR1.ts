import type {RADIO_R1_MESSAGES_EN} from '../../../components/RadioR1Messages';
import type {Translation} from '../../maps';
/** Front PT5: Brazilian Portuguese (pt-BR) for the Front R1 radio web texts. A web adaptation by OpenVireo, not CLEA's. */
export const RADIO_R1_PT:Translation<typeof RADIO_R1_MESSAGES_EN>=Object.freeze({
 saveDataNote:"Arquivo (File) ▸ Salvar dados registrados... (Save Recorded Data) do VIREO (SvRcData1Click 0x567f70) executa o mesmo salvamento que Salvar (Save) da Análise de pulsares; fica habilitado enquanto existem dados registrados. Aqui, ele abre a Análise de pulsares, cujo Salvar verificado grava o registro (adaptação web).",
 optionEffectsTitle:"O que estas configurações do VIREO fazem (exibidas com seus valores compilados; não são editáveis aqui):",
 optionEffects:Object.freeze([
  "Plotar posições de pulsares (Plot Pulsar Positions; desativado): desenha os pulsares do catálogo no mapa do céu de rádio.",
  "Gravar arquivo da lista de objetos (Write Hot List File; desativado): exibe Mover ▸ Lista de objetos ▸ Salvar lista atualizada....",
  "Pos. exata para a lista de objetos (Exact Pos for Hot List; desativado): Adicionar o objeto atual à lista (Add Current Item to List) armazena a posição do pulsar no catálogo em vez do apontamento.",
  "Recursos de som (Sound Features; ativado): o receptor toca o som do pulso quando existe um dispositivo de som.",
  "Modo de teste (Test Mode; desativado): uma configuração do instrutor; Definir coordenadas (Set Coordinates) move o telescópio instantaneamente.",
  "Identificação do pulsar (Pulsar Identification; Usar nome B1950): dá nome ao título do receptor, ao cabeçalho do registro e às entradas de Adicionar o objeto atual à lista.",
  "Tipo de telescópio (Telescope Type; Totalmente direcionável): só a opção Somente trânsito (Transit Only) altera o comportamento do VIREO; Arecibo não tem código próprio e se comporta como Totalmente direcionável.",
 ]),
 findNote:"Localizar (Find) percorre cada linha armazenada (o texto do original de cada medição, como escrito por Registrar [Record]) desde o início ou depois da linha selecionada, sem diferenciar maiúsculas de minúsculas e sem voltar ao começo ao chegar ao fim, como no VIREO. Como o VIREO, ele lembra sua última pesquisa em minúsculas. Adaptação web: o texto armazenado é deste site; pode diferir do texto do VIREO no final do nome do arquivo (o navegador não informa a pasta) e, raramente, no último dígito de um número. A pesquisa lembrada dura enquanto esta página estiver aberta.",
 saveDataOff:"Nada registrado ainda: o VIREO mantém este item desabilitado até que a análise contenha dados registrados.",
});
