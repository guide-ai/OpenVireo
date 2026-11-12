import type {APP_SHELL_MESSAGES_EN} from '../../../components/AppShellMessages';
import type {Translation} from '../../maps';
/** Front PT0: Brazilian Portuguese (pt-BR) for the app shell: navigation groups, theme switch, toolbar disclosure, the page bar and the recovery notice
 * of a part of the site that cannot load. A web adaptation by OpenVireo, not CLEA's. */
export const APP_SHELL_PT:Translation<typeof APP_SHELL_MESSAGES_EN>=Object.freeze({
 theme:Object.freeze({legend:'Tema de cores',system:'Sistema',light:'Claro',dark:'Escuro'}),
 navGroups:Object.freeze({optical:'Observatório óptico',radio:'Observatório de rádio',analysis:'Análise',files:'Arquivos',guides:'Guias dos exercícios'}),
 backupHelpSummary:'O que um backup inclui',
 toolsMenu:'Menu',// the phone menu button; "Ferramentas" does not fit beside the brand and Help at 320 px
 skipToContent:'Pular para o conteúdo',
 pageBar:Object.freeze({label:'Investigação, idioma e ajuda',more:'Mais',moreName:'Mais ações da investigação'}),
 recovery:Object.freeze({
  updatedTitle:'Uma nova versão do OpenVireo foi publicada',
  updated:'Esta parte do site não pôde ser carregada porque o site foi atualizado enquanto esta página estava aberta.',
  errorTitle:'Esta parte do OpenVireo parou por causa de um erro',
  error:'Recarregar a página costuma resolver. Se acontecer de novo, anote o que você fez logo antes.',
  kept:'O restante do site e o restante do seu trabalho nesta aba continuam aqui.',
  saveFirst:'Salve primeiro a sua investigação e depois recarregue a página para continuar com a versão atual.',
  saveHow:'Recarregue a página para continuar. O trabalho que você salvou antes com Salvar investigação pode ser restaurado depois com Restaurar investigação (JSON).',
  save:'Salvar investigação',
  reload:'Recarregar a página',
 }),
});
