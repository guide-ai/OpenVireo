// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's MEASHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='MEASHLP.TXT';
export const sourceSha256='e9f20545e1ff580439f45af3fd2e9aff0b64b1cd4edab467d07e8de1813577ac';
export const text=`**Carregar espectro para medição**
Para carregar um espectro para medição, selecione "Arquivo"
(File)->"Dados" (Data)->"Carregar espectro salvo..." (Load Saved
Spectrum...) no menu da ferramenta de medição e escolha o arquivo de
espectro que deseja carregar.

Tópicos relacionados:
    "Salvar espectro para análise" no menu "Ajuda" (Help) do
    espectrômetro.

**Medir características espectrais individuais**
Você pode medir a posição e a intensidade relativa de características
espectrais individuais em um espectro exibido. Pressione e mantenha
pressionado o botão esquerdo do mouse enquanto posiciona o cursor em
cruz sobre a característica que deseja medir. A posição do cursor
aparece em leituras na parte de baixo da tela, convertida em
comprimento de onda e intensidade relativa. Quando você solta o botão
do mouse, uma linha vertical aparece na tela na posição do
comprimento de onda e uma linha horizontal curta aparece no nível da
intensidade. Você pode ajustar a posição dessas linhas com as teclas
de seta do teclado numérico para melhorar suas medições antes de
registrá-las. Você também pode mover as linhas até a próxima
característica que deseja medir pressionando e mantendo pressionada
uma tecla de seta (veja abaixo).

    -Acesso pelo teclado-
    As teclas de seta do teclado numérico (teclas "2", "4", "6", "8")
    podem ser usadas para posicionar as linhas de medição no lugar do
    mouse. NumLock deve estar "ligado" e MouseKeys "desligado". (Se
    você usa MouseKeys, configure o sistema para que MouseKeys seja
    ativado quando NumLock estiver "desligado".) Se as linhas de
    medição não estiverem visíveis, pressione a tecla de seta para a
    direita ("6") e as linhas aparecerão a partir da esquerda da
    exibição.

Veja também:
    Carregar espectro de comparação
    Medir com espectro de comparação
    Registrar medições

**Carregar espectro de comparação**
Para carregar um espectro de comparação, selecione "Espectro de
comparação" (Comparison Spectrum)->"Selecionar" (Select) no menu da
ferramenta de medição e escolha um conjunto de linhas na lista que
aparece. As linhas de comparação aparecem na exibição e o controle
deslizante é habilitado. Você pode carregar quantos conjuntos de
linhas quiser. Todas as linhas selecionadas ficam na exibição até que
o espectro de comparação seja limpo.

Veja também:
    Medir com espectro de comparação
    Identificar linhas de comparação
    Limpar espectro de comparação

**Medir com espectro de comparação**
Você pode medir o desvio Doppler de um espectro em relação a um
espectro de comparação com muitas linhas. Basta carregar um espectro
de comparação (observe que mais de um conjunto de linhas pode ser
carregado) e usar o controle deslizante para mover a comparação até
que ela coincida com as linhas espectrais do espectro do objeto. O
valor de Z correspondente ao deslocamento do espectro de comparação
aparece abaixo do controle deslizante. Observe o seguinte:

    1)  Talvez você não consiga um ajuste exato em todas as linhas.
        Você terá de decidir por conta própria qual é o melhor ajuste
        geral.

    2)  Suas medições serão mais precisas se você ampliar o espectro.
        Isso pode, porém, tornar impossível ver todas as linhas ao
        mesmo tempo. (Veja os tópicos de ajuda listados abaixo.)

    3)  Você pode achar mais preciso medir as linhas individualmente.
        (Veja o tópico de ajuda "Medir características espectrais
        individuais".) Você pode usar o espectro de comparação para
        identificar as linhas, mas terá de registrar seus resultados e
        calcular um Z médio fora do programa. Qualquer valor que
        apareça na leitura de Z não será válido.

Veja também:
    Carregar espectro de comparação
    Identificar linhas de comparação
    Limpar espectro de comparação
    Zoom/deslocamento do espectro
    Definir sensibilidade do controle deslizante
    Recentralizar o controle deslizante
    Registrar medições
    Características espectrais individuais

**Identificar linhas de comparação**
Para identificar uma linha do espectro de comparação, coloque o cursor
do mouse perto da linha na exibição e pressione o botão direito do
mouse. A caixa que aparece mostra o ID da linha, os comprimentos de
onda de repouso e deslocado e a categoria da fonte da linha.

Veja também:
    Carregar espectro de comparação
    Medir com espectro de comparação

**Limpar espectro de comparação**
Para limpar o espectro de comparação da exibição, selecione "Espectro
de comparação" (Comparison Spectrum)->"Limpar" (Clear) no menu da
ferramenta de medição. Todas as linhas de comparação são removidas da
exibição.

**Registrar medições**
Para registrar o valor de Z que você mediu, selecione "Arquivo"
(File)->"Dados" (Data)->"Registrar medições..." (Record
Measurements...). Se você mediu com o controle deslizante do espectro
de comparação, o valor de Z da leitura já estará digitado no
formulário. Se você está medindo as linhas individualmente, o valor
digitado não estará correto e você terá de substituí-lo pela média
que calculou.

Quando você pressiona "OK", as informações digitadas são colocadas em
uma lista, mas não são salvas em um arquivo. Para revisar, imprimir ou
salvar seus resultados em um arquivo, selecione "Ferramentas"
(Tools)->"Editores de resultados" (Results Editors)->"Resultados de
observação" (Observational Results)->"Exibir/imprimir/salvar..."
(Display/Print/Save...) no menu do painel de controle do observatório.

Veja também:
    Medir com espectro de comparação
    Medir características espectrais individuais
    "Editores de resultados" no menu "Ajuda" (Help) do painel de
    controle do observatório.

**Zoom/deslocamento do espectro**
Para ampliar um espectro que você está medindo, pressione o botão
"Zoom". Aparece uma caixa com controles deslizantes que permite
definir a faixa de comprimentos de onda exibida na janela de medição.
Os controles deslizantes mudam os comprimentos de onda em passos de
100 Angstroms. O botão "Redefinir" (Reset) devolve a exibição à faixa
de comprimentos de onda original (completa).

Quando a exibição está ampliada, as setas de deslocamento abaixo do
botão de zoom são habilitadas. Use-as para mudar a parte visível do
espectro. Como os controles deslizantes, elas operam em passos de 100
Angstroms.

Ampliar o espectro permite determinar Z com mais precisão, pois a
pixelização mais fina dá um passo menor no posicionamento da linha de
medição e/ou do espectro de comparação. A desvantagem ao medir com um
espectro de comparação é que talvez nem todas as linhas fiquem
visíveis ao mesmo tempo para determinar o melhor ajuste geral.

Tópicos relacionados:
    Medir com espectro de comparação
    Medir linhas espectrais individuais

**Definir sensibilidade do controle deslizante**
O interruptor "Fino" (Fine)/"Grosso" (Coarse) acima do controle
deslizante do espectro de comparação controla a sensibilidade do
controle deslizante. Use o ajuste "Grosso" somente quando precisar
mover o espectro de comparação por uma distância longa.

Tópicos relacionados:
    Recentralizar o controle deslizante
    Medir com espectro de comparação

**Recentralizar o controle deslizante**
Se você chegar ao fim do controle deslizante do espectro de comparação
e precisar mover mais o espectro de comparação, pressione o botão
pequeno à direita da leitura de Z para recentralizar o controle
deslizante.

Tópicos relacionados:
    Definir sensibilidade do controle deslizante
    Medir com espectro de comparação

**Fechar a janela de medição**
Para fechar a janela da ferramenta de medição e voltar ao painel de
controle do observatório, selecione "Arquivo" (File)->"Sair da
medição de espectros" (Exit Spectrum Measuring) no menu ou pressione a
caixa "X" no canto superior direito.
`;
