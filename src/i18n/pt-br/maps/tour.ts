import type {TOUR_EN} from '../../../help/tour';
import type {Translation} from '../../maps';
/** Front PT0: Brazilian Portuguese (pt-BR) for the first-visit tour. A web adaptation by OpenVireo, not CLEA's. */
export const TOUR_PT:Translation<typeof TOUR_EN>=Object.freeze({
 label:'Tour pelo OpenVireo',
 progress:(n:number,of:number)=>`Passo ${n} de ${of}`,
 next:'Avançar',back:'Voltar',skip:'Pular o tour',done:'Começar a explorar',
 firstLook:'Dar uma primeira olhada (cerca de 3 min)',chooseLab:'Escolher uma prática',
 steps:Object.freeze({
  welcome:Object.freeze({title:'Boas-vindas ao OpenVireo',
   text:'O OpenVireo é um observatório virtual para exercícios de astronomia, reconstruído no navegador a partir do VIREO do Project CLEA. Este tour rápido mostra onde fica cada coisa. Leva menos de um minuto.'}),
  save:Object.freeze({title:'Salve o seu trabalho como arquivo',
   text:'O seu trabalho fica nesta aba do navegador até você salvá-lo. Salvar investigação, no alto de cada página, baixa um arquivo; Restaurar investigação (JSON), no menu ao lado, o carrega novamente mais tarde.'}),
  help:Object.freeze({title:'A ajuda está sempre aqui',
   text:'Abra Ajuda para ver os tópicos de ajuda, ou pressione a tecla ? em qualquer lugar fora de um campo de texto. Você pode refazer este tour pelo menu Ajuda.'}),
  start:Object.freeze({title:'Como você quer começar?',
   text:'Dê uma primeira olhada de três minutos no céu ou escolha uma das sete práticas; cada prática tem um guia que acompanha você. Todas as páginas estão no menu; no celular, ele fica no botão Menu.'}),
 }),
});
