import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front PT0: Brazilian Portuguese (pt-BR) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_PT:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Tour pelo OpenVireo',
 progress:(n:number,of:number)=>`Passo ${n} de ${of}`,
 next:'Avançar',back:'Voltar',skip:'Pular o tour',done:'Começar a explorar',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Boas-vindas ao OpenVireo',
   text:'O OpenVireo é um observatório virtual para exercícios de astronomia, reconstruído no navegador a partir do VIREO do Project CLEA. Este tour rápido mostra onde fica cada coisa. Leva menos de um minuto.'}),
  sections:Object.freeze({title:'Todas as páginas estão no menu',
   text:'As páginas são agrupadas em seções: os observatórios óptico e de rádio, as ferramentas de análise, os resultados e os arquivos. Clique no nome de uma seção para abri-la ou fechá-la. No celular, o menu fica no botão Menu.'}),
  guides:Object.freeze({title:'Vai fazer um exercício? Comece pelo guia dele',
   text:'Cada exercício tem um guia que lista todos os passos, marca o que você já fez e leva você até a página certa.'}),
  observatory:Object.freeze({title:'Ou explore o céu livremente',
   text:'Na página Observatório: abra a cúpula, escolha um objeto e aponte o telescópio. Depois ligue o acompanhamento e use um instrumento.'}),
  save:Object.freeze({title:'Salve o seu trabalho como arquivo',
   text:'O seu trabalho fica nesta aba do navegador até você salvá-lo. Salvar investigação, no alto de cada página, baixa um arquivo; Restaurar investigação (JSON), no menu ao lado, o carrega novamente mais tarde.'}),
  help:Object.freeze({title:'A ajuda está sempre aqui',
   text:'Abra Ajuda para ver os tópicos de ajuda, ou pressione a tecla ? em qualquer lugar fora de um campo de texto. Você pode refazer este tour pelo menu Ajuda.'}),
 }),
});
