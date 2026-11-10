// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's SPECHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='SPECHLP.TXT';
export const sourceSha256='e085a513389cd65a7726260daf6607b8c277be6e6a2a46222a8fd5bb90fcee79';
export const text=`**Definir a faixa de comprimentos de onda**
Você pode mudar a faixa de comprimentos de onda registrada pelo
espectrômetro, dentro da faixa máxima de 3500 a 7400 angstroms.  (Seu
instrutor deve dizer se há algum motivo para você fazer isso.)  Para
mudar a faixa de comprimentos de onda, selecione "Arquivo"
(File)->"Preferências" (Preferences)->"Faixa espectral" (Spectral
Range) no menu do painel de controle do espectrômetro.  Use os
controles deslizantes para mudar os valores mínimo e/ou máximo.  O
botão "Padrão" (Default) restaura os valores para a faixa ideal para a
classificação espectral.  Observe que você perderá qualquer espectro
que tenha obtido e não tenha salvo quando mudar a faixa de comprimentos
de onda.

**Iniciar/retomar a contagem**
Pressione o botão de integração "Iniciar" (Go) do espectrômetro para
começar ou continuar a integração do espectro.  Você verá o espectro
ganhar uma forma reconhecível à medida que as contagens se acumulam em
cada um dos 500 canais do espectrômetro.  (A exibição é sempre
normalizada pela maior leitura de qualquer canal, de modo que, com o
passar do tempo, você vê o ruído diminuir em vez de ver as contagens
subirem.)  A contagem total de fótons atual, o tempo de integração, a
contagem média por canal e a razão sinal/ruído são exibidos abaixo do
gráfico.  Em alguns exercícios, também são exibidos a identificação do
objeto e a magnitude aparente.

**Parar a contagem**
Ao pressionar o botão de integração "Parar" (Stop), a integração é
pausada.  A exibição é redesenhada com linhas ligando as leituras dos
canais adjacentes, para maior clareza.  Você pode parar e retomar
quantas vezes quiser; a integração sempre continua de onde parou.  (Você
só pode "perder" um espectro se fechar o painel de controle do
espectrômetro sem salvá-lo.)

**Imprimir o espectro**
Para imprimir o espectro atual, selecione "Arquivo" (File)->"Dados"
(Data)->"Imprimir espectro..." (Print Spectrum...) no menu do painel de
controle do espectrômetro.  Aparecerá o formulário padrão de opções de
impressão do Windows.  (Seu instrutor pode dar informações adicionais
sobre como configurar e direcionar a impressão.)  O espectro é
impresso como aparece na tela, junto com um cabeçalho de identificação.

**Salvar o espectro para análise**
Você não pode medir nem classificar um espectro que obteve a menos que
o salve.  Quando achar que a razão sinal/ruído é alta o bastante para
uma análise precisa (veja abaixo), pare a contagem e selecione "Arquivo"
(File)->"Dados" (Data)->"Salvar espectro..." (Save Spectrum...) no menu
do painel de controle do espectrômetro.  Um nome de arquivo é gerado a
partir do nome ou da identificação do objeto (extensão .CSP).  Você
precisará confirmar o nome e o caminho do arquivo.  (Em geral, não mude
o caminho, a menos que receba essa instrução.)  Se já existir um arquivo
com esse nome, você será avisado antes de o arquivo existente ser
sobrescrito.

Uma razão sinal/ruído em torno de 100 é recomendada para uma
classificação precisa de estrelas, mas valores menores podem bastar
para alguns tipos espectrais.  Uma razão sinal/ruído de apenas 10 pode
ser suficiente para determinar a velocidade radial (Z) de algumas
galáxias.  Se você não tiver certeza de que o espectro que está obtendo
é suficiente e talvez queira voltar ao painel de controle do
espectrômetro e continuar a integrá-lo, use a técnica a seguir:

    1)  Salve o espectro.

    2)  NÃO feche o painel de controle do espectrômetro.  Se quiser,
        você pode minimizá-lo pela caixa "_" no canto superior direito,
        mas isso não é necessário.

    3)  Selecione a ferramenta de classificação ou de medição em
        "Ferramentas" (Tools) no menu do painel de controle do
        observatório.  Carregue o arquivo que você acabou de salvar e
        tente classificá-lo ou medi-lo.

    4)  Se o espectro tiver ruído demais para uma análise precisa, você
        pode continuar a integrá-lo.  Volte ao painel de controle do
        espectrômetro e pressione "Iniciar".  Ao terminar, você terá de
        salvá-lo de novo (pode sobrescrever a versão antiga) e
        carregá-lo outra vez na ferramenta de análise.

Tópicos relacionados:
    Fechar o painel de controle do espectrômetro
    Acessar a ferramenta de classificação
    Acessar a ferramenta de medição de espectros

**Fechar o painel de controle do espectrômetro**
Para fechar o painel de controle do espectrômetro e voltar ao painel de
controle do telescópio, selecione "Arquivo" (File)->"Sair do
espectrômetro" (Exit Spectrometer) no menu ou use a caixa "X" do canto
superior direito.  Se você fechar o espectrômetro, não poderá voltar e
continuar integrando um espectro de onde parou, embora possa começar de
novo com a mesma estrela.  Se você não tiver salvado o espectro atual,
receberá um aviso e terá a chance de salvá-lo antes de o painel de
controle do espectrômetro ser fechado.

Tópicos relacionados:
    Salvar o espectro para análise

**Acessar a ferramenta de classificação**
Para classificar espectros, você precisa abrir a ferramenta de
classificação.  Selecione "Ferramentas" (Tools)->"Ferramenta de
classificação espectral" (Spectral Classification Tool) no menu do
painel de controle do observatório, e a ferramenta de classificação
aparecerá.  Não é necessário abrir nem fechar o painel de controle do
telescópio antes de abrir a ferramenta de classificação.

Tópicos relacionados:
    Salvar o espectro para análise
    Tópicos em "Ajuda" no menu da ferramenta de classificação.

**Acessar a ferramenta de medição de espectros**
Para medir a posição das linhas espectrais e determinar a velocidade
radial (Z), você precisa abrir a ferramenta de medição de espectros.
Selecione "Ferramentas" (Tools)->"Ferramenta de medição de espectros"
(Spectrum Measuring Tool) no menu do painel de controle do observatório,
e a ferramenta de medição aparecerá.  Não é necessário abrir nem fechar
o painel de controle do telescópio antes de abrir a ferramenta de
medição de espectros.

Tópicos relacionados:
    Salvar o espectro para análise
    Tópicos em "Ajuda" no menu da ferramenta de medição de espectros.
`;
