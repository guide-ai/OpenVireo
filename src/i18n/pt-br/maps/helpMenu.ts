import type {HELP_MENU_EN} from '../../../help/HelpMessages';
import type {Translation} from '../../maps';
/** Front PT0: Brazilian Portuguese (pt-BR) for OpenVireo's own text in the Help menus. VIREO's menu captions (Help, Topics..., Websites…)
 * are originals (originals.json). A web adaptation by OpenVireo, not CLEA's. */
export const HELP_MENU_PT:Translation<typeof HELP_MENU_EN>=Object.freeze({
 newTab:'(abre em uma nova aba)',
 noEquivalent:(original:string)=>`— O VIREO abria ${original}. Esse site não existe mais e não há uma página equivalente, então nenhum link é oferecido.`,
 websitesNote:'O VIREO abria estas páginas em uma nova janela do navegador. Aqui elas abrem em uma nova aba somente quando você clica nelas, e nada é enviado. Dois dos endereços do VIREO não existem mais: o 2MASS (xena.harvard.edu) abre a página atual do 2MASS no IRSA (NASA/IPAC), e o NVO (www.us-vo.org) abre a página do seu sucessor, o NAVO da NASA (NASA Astronomical Virtual Observatories, os observatórios virtuais astronômicos da NASA).',
 reminderLoading:'Carregando o lembrete do VIREO…',
 reminderError:'Não foi possível carregar o arquivo de lembrete do VIREO (Reminder.obs), ou ele não correspondeu ao tamanho e ao SHA-256 registrados.',
 ok:'OK',cancel:'Cancelar',close:'Fechar',yes:'Sim',no:'Não',
 menuName:Object.freeze({main:'Menu Ajuda do observatório',radio:'Menu Ajuda do radiotelescópio'}),
 radioOff:'O menu Ajuda de rádio do VIREO (Tópicos..., Sobre este exercício...) fica no painel de controle do radiotelescópio, que abre quando você liga o telescópio.',
 reminderErrorQuestion:'Então o VIREO pergunta, no lugar dele:',
 exitDone:'Você terminou o exercício. Uma página web não consegue se fechar sozinha: salve o seu trabalho e depois feche esta aba do navegador quando quiser.',
 siteAbout:'Sobre o OpenVireo e a privacidade',
 webTopics:'Tópicos de ajuda…',
 tour:'Fazer o tour pelo site',
 shortcutKey:'?',
 buttonNames:Object.freeze({
  'OBSRVHLP.LST':'Ajuda dos controles do telescópio','PHOTOHLP.LST':'Ajuda do fotômetro','CAMHLP.LST':'Ajuda da câmera','SPECHLP.LST':'Ajuda do espectrômetro',
  'CLASSHLP.LST':'Ajuda da classificação espectral','MEASHLP.LST':'Ajuda da medição de espectros','HRANALHLP.LST':'Ajuda do diagrama HR','VARTYPEHLP.LST':'Ajuda dos tipos de estrelas variáveis',
  'WDGPLTHLP.LST':'Ajuda do diagrama em cunha','PLSANHLP.LST':'Ajuda da análise de pulsares','PLSLSHLP.LST':'Ajuda dos parâmetros de pulsares','MLTSPHLP.LST':'Ajuda do espectrômetro multiobjeto',
  'SPLSTHLP.LST':'Ajuda da lista de espectros multiobjeto',
 }),
 exitNote:'O VIREO mostra este lembrete quando você sai do observatório durante um exercício (depois de Executar exercício, Run Exercise); caso contrário, ele apenas pergunta se você quer sair. O OpenVireo não tem as etapas Fazer login (Log In) nem Executar exercício, então o observatório é sempre um exercício em andamento. No VIREO, OK ou Sim (Yes) encerram o programa; Cancelar (Cancel) ou Não (No) o mantêm aberto.',
});
