import type {LANGUAGE_CHOICE_EN} from '../../../components/LanguageChoiceMessages';
import type {Translation} from '../../maps';
/** Front PT0: Brazilian Portuguese (pt-BR) for the language selector and its reload dialog. The option names are the autonyms of src/i18n/languages.json (Front SC8). A web adaptation by OpenVireo, not CLEA's. */
export const LANGUAGE_CHOICE_PT:Translation<typeof LANGUAGE_CHOICE_EN>=Object.freeze({
 legend:'Idioma / Language',
 title:'Mudar o idioma?',
 reload:(language:string)=>`A página será recarregada em ${language}, na mesma página do site.`,
 lost:'O trabalho que está apenas na tela se perde: a posição atual do telescópio, as exposições em andamento, as medições, as janelas abertas, o modo instrutor e tudo o que você não salvou em um arquivo.',
 kept:'Os arquivos que você salvou no seu computador não são afetados; Restaurar investigação (JSON) carrega uma investigação novamente. Este navegador também mantém os seus resultados de observação confirmados e as suas preferências de exibição.',
 save:'Salvar investigação',
 saveNote:'Salvar investigação baixa primeiro um arquivo com o seu trabalho atual. Depois, mude o idioma.',
 change:'Mudar e recarregar',
 cancel:'Cancelar',
 preview:'Prévia antes do lançamento: o idioma é escolhido pelo endereço (?lang=) e não é salvo.',
 notRemembered:'Este navegador não permite que o OpenVireo guarde a escolha, então ela vale apenas para este carregamento da página.',
 originals:'Mostrar os textos do próprio VIREO em inglês',
 originalsNote:'Os textos de menus, janelas e mensagens do VIREO aparecem em inglês, exatamente como o VIREO os escreve. Os textos do próprio OpenVireo continuam no idioma escolhido. Vale a partir do próximo carregamento da página.',
 originalsNotStored:'Este navegador não permite que o OpenVireo guarde esta opção.',
});
