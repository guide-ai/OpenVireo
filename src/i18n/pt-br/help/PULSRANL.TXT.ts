// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's PULSRANL.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='PULSRANL.TXT';
export const sourceSha256='9d1cb3ff7daf80cc79f9a97f0b8f13a740b41f7162ba46f3d0cb31e8ac851bf4';
export const text=`**Carregar dados de pulsares registrados**
Para carregar na janela de análise de dados os dados de pulsares
registrados e salvos, selecione "Arquivo" (File)->"Carregar..."
(Load...) no menu de análise de dados e escolha o arquivo na caixa de
diálogo que aparece.  Os arquivos que contêm dados de pulsares
registrados devem ter a extensão ".PLR".

NOTA: Se você abrir a janela de análise de dados logo depois de
registrar dados de pulsares, os últimos dados registrados aparecerão
automaticamente na janela de análise de dados, estejam ou não salvos.

**Salvar dados de pulsares registrados**
Para salvar os dados de pulsares atuais, selecione "Arquivo"
(File)->"Salvar..." (Save...) no menu de análise de dados.  Uma caixa
de diálogo aparecerá para você digitar ou escolher um nome para o
arquivo salvo.  Você pode usar o nome que quiser; a caixa de diálogo
vai sugerir um nome gerado a partir dos seus dados de login.  Use
sempre a extensão ".PLR" nesses arquivos, para evitar dificuldades e
confusão mais tarde.

Você também pode salvar os dados de pulsares atuais escolhendo
"Arquivo"->"Salvar dados registrados..." (Save Recorded Data...) no
menu principal.

**Ver as propriedades dos dados**
Para abrir uma caixa de diálogo com as propriedades dos dados de
pulsares atuais, selecione "Arquivo" (File)->"Propriedades..."
(Properties...) no menu de análise de dados.  As propriedades mostradas
na caixa de diálogo incluem:

    Identificação do objeto
    Hora de início dos dados (número do dia juliano menos 2 400 000)
    Abertura do telescópio (metros)
    Frequência (MHz) e ganho relativo de cada receptor registrado
    Número de pontos de dados (de cada receptor registrado)
    Intervalo de tempo (ms) entre os pontos de dados
    Nome do arquivo

A caixa de diálogo de propriedades também aparece automaticamente
quando os dados são carregados.  Você não pode alterar nenhuma das
propriedades mostradas, pois elas refletem informações sobre dados que
já foram salvos.

**Controles**
Os controles a seguir aparecem no lado direito da janela de análise de
dados:

    Escala vertical (Vertical Scale) - Use os botões de escala vertical
    para ajustar a escala de cada painel de exibição.  A escala pode
    variar em fatores de 2, de um mínimo de 0.125 a um máximo de 8.  (Um
    fator de escala igual a 1 exibe os dados exatamente como foram
    registrados.)  Esse fator afeta apenas a exibição e não altera os
    dados subjacentes.

    Deslocamento horizontal (Horizontal Pan) - Use as setas de
    deslocamento horizontal para a esquerda e para a direita para variar
    o intervalo dos dados registrados exibido nos painéis.  O intervalo
    exibido (em segundos desde o início dos dados) é indicado pelas
    leituras à esquerda e à direita, abaixo dos painéis de exibição.

    Taxa de deslocamento (Pan Rate) - O controle da taxa de
    deslocamento altera a velocidade do deslocamento horizontal.

    Zoom horizontal (Horizontal Zoom) - Use os controles de zoom
    "Aumentar zoom" (In) e "Reduzir zoom" (Out) para ampliar ou
    comprimir o intervalo dos dados registrados exibido nos painéis.  O
    fator de zoom varia de 0.125 a 8, em fatores de 2.  (Um fator de
    zoom igual a 1 exibe os dados exatamente como foram registrados.)  O
    intervalo exibido (em segundos desde o início dos dados) é indicado
    pelas leituras à esquerda e à direita, abaixo dos painéis de
    exibição.

    Redefinir (Reset) - Ao pressionar o botão "Redefinir", a escala
    vertical de todos os painéis volta a 1, o fator de zoom volta a 1 e
    a taxa de deslocamento volta a 2.  As exibições voltam ao início dos
    dados, e todos os cursores e suas leituras são apagados.

**Fazer medições**
Você pode medir posições nos painéis de exibição pressionando e
arrastando com o mouse.  O botão direito do mouse controla um cursor de
"referência" que aparece na mesma posição nos três painéis.  A leitura
verde abaixo dos painéis informa a posição do cursor de referência, em
segundos desde o início dos dados.

O botão esquerdo do mouse controla um cursor vertical e um cursor
horizontal para cada painel.  À direita de cada painel ficam as
leituras dos cursores desse painel.  A posição do cursor vertical
(leitura em ciano) é dada em segundos desde o início do arquivo.  A
posição do cursor horizontal (leitura em magenta) é um indicador de
intensidade relativa que inclui tanto o fator de escala vertical do
painel de exibição quanto o ganho relativo aplicado quando os dados
foram registrados (veja o tópico de ajuda "Ver as propriedades dos
dados").  Para alternar o botão esquerdo do mouse entre os cursores
vertical e horizontal de cada painel, clique com o mouse na leitura
correspondente.

Ampliar a exibição na horizontal (zoom "Aumentar zoom") pode ajudar a
determinar e medir com exatidão a posição dos pulsos.

**Registrar medições**
Use o procedimento a seguir para registrar suas medições:

    1) Faça as medições posicionando o cursor ou os cursores como
    descrito no tópico de ajuda "Fazer medições".  Se quiser, você pode
    fazer medições em todos os painéis de exibição ativos nesse
    momento.

    2) Selecione "Resultados" (Results)->"Registrar medições atuais..."
    (Record Current Measurements...) no menu de análise de dados.

    3) Uma série de caixas de diálogo aparecerá, mostrando as medições e
    as propriedades a registrar para cada painel que tenha medições
    ainda não registradas.  Se quiser, você pode acrescentar um
    comentário a cada registro de medição.  Selecione "OK" para
    registrar a medição ou "Cancelar" (Cancel) para ignorá-la por
    enquanto.

Cada medição que você registrar será acrescentada ao final da lista de
medições atual.  Veja os tópicos de ajuda "Revisar medições
registradas", "Salvar medições registradas" e "Limpar a lista de
medições" para saber como lidar com os registros dessa lista.

**Revisar medições registradas**
Você pode revisar a lista atual de medições registradas a qualquer
momento, depois de começar a registrar medições.  Selecione
"Resultados" (Results)->"Revisar medições registradas..." (Review
Recorded Measurements...) no menu de análise de dados.  Aparecerá uma
caixa de diálogo com todos os registros atuais.  Para selecionar um
registro, clique nele com o mouse.  Você pode procurar os registros que
contêm um determinado texto (selecione "Localizar..." (Find...)).
Depois de selecionar um registro, você pode visualizá-lo e editar o
campo de comentário (selecione "Editar..." (Edit...)) ou excluí-lo da
lista (selecione "Excluir" (Delete)).

Quando terminar de revisar os registros, selecione "OK" ou "Cancelar".
Todas as alterações feitas nos registros da lista (edições ou
exclusões) serão descartadas se você selecionar "Cancelar".

**Salvar medições registradas**
Para salvar em um arquivo a sua lista atual de medições registradas,
selecione "Resultados" (Results)->"Salvar medições registradas..."
(Save Recorded Measurements...) no menu de análise de dados.  Informe
um nome de arquivo na caixa de diálogo que aparece.  Os dados são
salvos em um formato (valores separados por vírgulas) aceito pelos
programas de planilha comuns.  Use a extensão ".CSV" em todos os
arquivos que você criar aqui.  (Veja o tópico de ajuda "Acessar o
programa de planilha".)

Se você escolher um nome de arquivo que já existe, vai sobrescrever os
dados existentes.  Você receberá um aviso e terá a chance de mudar sua
escolha, caso não seja essa a sua intenção.  (Veja o tópico de ajuda
"Limpar a lista de medições".)

**Limpar a lista de medições**
Normalmente, a lista atual de medições permanece intacta, mesmo quando
é salva em um arquivo, e as novas medições são acrescentadas a ela.
(Isso significa que você pode salvar um arquivo, acrescentar mais
medições e salvar de novo no mesmo arquivo sem perder dados.)  Se você
quiser criar uma nova lista de medições, sem nenhum registro anterior,
selecione "Resultados" (Results)->"Limpar lista de medições" (Clear
Measurement List) no menu de análise de dados.

**Acessar o programa de planilha**
Talvez você consiga abrir um programa de planilha para analisar seus
dados diretamente a partir deste exercício.  Se a opção estiver
habilitada, selecione "Resultados" (Results)->"Planilha" (Spreadsheet)
no menu de análise de dados.  Se você salvou recentemente um arquivo
para usar na planilha (veja o tópico de ajuda "Salvar medições
registradas"), esse arquivo será carregado automaticamente quando o
programa de planilha abrir.  Se você quiser carregar um arquivo na
planilha por conta própria, lembre-se de que o tipo de arquivo é
".CSV".  Você pode encontrá-lo sob o título "Arquivos de texto" na
caixa de diálogo de carregamento de arquivos da planilha.

**Imprimir a imagem da tela**
A opção "Arquivo" (File)->"Imprimir tela..." (Print Screen...) do menu
de análise de dados permite imprimir, a qualquer momento, uma imagem da
janela de análise de dados.  Essa imagem mostra todos os cursores em
suas posições atuais e as leituras com seus valores atuais.  Este
recurso usa o serviço de impressão do Windows e imprime em cores se uma
impressora colorida estiver selecionada.  A impressão inclui os nomes
de login para identificação e as propriedades atuais dos dados.

**Fechar a janela de análise de dados**
Para fechar a janela de análise de dados e voltar à janela principal,
selecione "Arquivo" (File)->"Sair" (Exit) no menu de análise de dados,
selecione "Fechar" (Close) no menu do sistema (clique na caixa do canto
superior esquerdo) ou clique na caixa "X" do canto superior direito
(somente no Windows 95).
`;
