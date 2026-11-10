// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's CLASSHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='CLASSHLP.TXT';
export const sourceSha256='9a3a70c11f5cfc024552e6b70db59953b16f40cafeea09a8d06974859a26a3b7';
export const text=`**Carregar espectro**
Para carregar um espectro para classificação:

    1)  Selecione "Arquivo" (File)->"Espectros desconhecidos" (Unknown
        Spectra) no menu da janela de classificação.

    2)  Escolha uma opção do submenu que aparece:

        "Espectros salvos (*.CSP...)" (Saved Spectra (*.CSP...))
            Escolha em uma lista de espectros obtidos e salvos para
            classificação como parte deste exercício. Para escolher,
            clique duas vezes no nome do arquivo ou mova o cursor até
            o nome do arquivo e pressione "Abrir" (Open).

        "Lista do programa" (Program List)
            Escolha em uma lista de estrelas do programa deste
            exercício. Normalmente você começa pela primeira estrela
            da lista. Para escolher uma estrela da lista, clique duas
            vezes no ID da estrela ou mova o cursor até a estrela
            desejada e selecione "Arquivo"->"Abrir seleção" (Open
            Selection) no menu.

        "Próximo da lista" (Next On List)
            Carrega o próximo espectro da lista do programa sem exibir
            a lista. ("Lista do programa" deve ter sido selecionada
            antes.)

O espectro selecionado é carregado e exibido no centro da área de
exibição de espectros.

**Carregar espectros padrão**
Para carregar espectros padrão para comparação:

    1)  Selecione "Arquivo" (File)->"Atlas de espectros padrão..."
        (Atlas of Standard Spectra...) no menu da janela de
        classificação.

    2)  Escolha um atlas na lista que aparece. Normalmente você começa
        pela sequência principal, para estabelecer uma classe de
        temperatura antes de considerar a luminosidade. Para escolher,
        clique duas vezes na descrição do atlas ou mova o cursor até o
        atlas desejado e selecione "Arquivo"->"Abrir seleção" (Open
        Selection) no menu.

    3)  A lista de padrões do atlas aparece na exibição azul-petróleo
        "Padrões" (Standards), à direita da janela de classificação.
        Observe que o espectro destacado é exibido acima do
        desconhecido na área de exibição, enquanto a próxima entrada
        do atlas é exibida abaixo do desconhecido.

    4)  Use as teclas de seta ou clique nas entradas da lista de
        padrões para percorrer o atlas. Observe as mudanças
        progressivas dos espectros conforme a temperatura estelar
        muda. Procure no atlas o espectro que mais se parece com o
        desconhecido. Talvez você precise verificar a luminosidade
        (carregar outro atlas) para obter a correspondência mais
        próxima.

**Medir e marcar características espectrais**
Para medir o comprimento de onda e a intensidade de uma característica
espectral:

    Com o cursor sobre a exibição do espectro, pressione e mantenha
    pressionado o botão esquerdo do mouse: o cursor muda de uma seta
    para uma cruz. Ao mover o cursor dentro da área de exibição do
    espectro, a leitura do comprimento de onda e da intensidade
    relativa no cursor aparece na parte de baixo da janela. Quando
    você tiver posicionado o cursor no ponto que deseja medir, solte o
    botão do mouse. As leituras não mudam até que você pressione o
    botão esquerdo do mouse novamente.

        OBSERVAÇÃO:  Se o espectro estiver exibido como um traçado de
        intensidade (veja o tópico de ajuda "Configurar a exibição"),
        a posição vertical (coordenada Y) do cursor determina a
        medição da intensidade. Se a exibição estiver no modo "Foto"
        (Photo), aparece a intensidade "sob" o cursor (na coordenada
        horizontal ou X).

    Quando você solta o botão do mouse, o cursor volta ao formato
    normal e a posição medida é marcada na tela por uma linha
    vertical vermelha que atravessa os espectros desconhecido e padrão
    na posição do comprimento de onda. Uma pequena linha horizontal
    indica a posição da intensidade. Você também pode marcar uma linha
    clicando duas vezes na entrada dela na tabela de linhas
    espectrais. Você pode "ajustar" a posição das linhas com as
    teclas de seta do teclado numérico (veja abaixo).

    -Acesso pelo teclado-
    As teclas de seta do teclado numérico (teclas "2", "4", "6", "8")
    podem ser usadas para posicionar as linhas de medição no lugar do
    mouse. NumLock deve estar "ligado" e MouseKeys "desligado". (Se
    você usa MouseKeys, configure o sistema para que MouseKeys seja
    ativado quando NumLock estiver "desligado".) Se as linhas de
    medição não estiverem visíveis, pressione a tecla de seta para a
    direita ("6") e as linhas aparecerão a partir da esquerda da
    exibição.

Tópicos relacionados:
    Tabela de linhas espectrais e ajuda
    Configurar a exibição

**Controles**
Os controles a seguir ficam no lado direito da janela de
classificação:

    Aproximar (Zoom In) (ponta de seta para cima):
        Amplia os espectros exibidos por um fator de 2, até um máximo
        de 16 vezes a exibição original. Se uma característica estiver
        marcada, o zoom tenta centralizá-la na exibição ampliada. Se
        nenhuma linha estiver marcada, o comprimento de onda do centro
        da exibição permanece o mesmo.

    Afastar (Zoom Out) (ponta de seta para baixo):
        Diminui a ampliação dos espectros exibidos por um fator de 2,
        até a ampliação original (1X). Se uma linha estiver marcada, o
        zoom tenta mantê-la centralizada na exibição.

    Setas de deslocamento (pontas de seta para a esquerda e para a
    direita):
        Use os controles de seta para a esquerda e para a direita para
        percorrer os espectros ampliados.

    Botão "Redefinir" (Reset):
        Devolve a exibição às imagens originais (1X).

**Tabela de linhas espectrais e ajuda**
A tabela de linhas espectrais ajuda a identificar características
espectrais pelo comprimento de onda e inclui um recurso de ajuda que
fornece informações sobre o significado e o uso de cada linha
tabulada na classificação de espectros estelares.

Para carregar a tabela de linhas espectrais, selecione "Arquivo"
(File)->"Tabela de linhas espectrais" (Spectral Line Table) no menu de
classificação. Quando a tabela aparecer, você pode movê-la para um
lugar conveniente da tela. (Coloque o cursor na barra de título na
parte de cima. Pressione e mantenha pressionado o botão esquerdo do
mouse e arraste a janela.)

Recursos da tabela de linhas espectrais:

    -Acompanhamento do cursor-
        Quando o botão esquerdo do mouse é mantido pressionado com o
        cursor em qualquer ponto da exibição do espectro, a entrada
        com o comprimento de onda mais próximo da posição do cursor é
        destacada na tabela de linhas espectrais. A tabela rola para
        acompanhar o cursor quando o mouse é movido com o botão
        esquerdo pressionado.

            CUIDADO: É preciso usar bom senso ao aceitar as
            identificações de linhas da tabela, pois o comprimento de
            onda é o único critério: temperatura, luminosidade etc.
            não são levadas em conta. Por exemplo, linhas de ferro
            (Fe) não aparecem em estrelas de tipo precoce, linhas de
            hélio (He) não aparecem em estrelas de tipo tardio etc.

    -Marcar a posição da linha-
        Clicar com o botão esquerdo do mouse em uma entrada da tabela
        de linhas espectrais destaca a entrada e marca a posição da
        linha na exibição do espectro.

    -Ajuda-
        Quando se clica duas vezes com o botão esquerdo do mouse em
        uma entrada da tabela de linhas espectrais, a entrada é
        destacada, a linha é marcada como acima e aparece uma janela
        de ajuda com informações sobre a linha selecionada. Depois de
        aberta, a janela de ajuda continua a "acompanhar" as seleções
        da tabela (sem clique duplo) até ser fechada.

Tópicos relacionados:
    Medir e marcar características espectrais

**Configurar a exibição**
As opções que afetam a aparência e o funcionamento da janela de
classificação estão disponíveis na seleção de menu "Arquivo"
(File)->"Exibir" (Display).

    "Arquivo"->"Exibir"
        Define o formato da exibição do espectro. Estas opções estão
        disponíveis:

        "Mostrar diferença (Pad - Desc)"
        (Show Difference (Std - Unkn))
            Quando esta opção é selecionada, o espectro padrão
            inferior é substituído por uma exibição que mostra a
            diferença ponto a ponto entre o espectro padrão superior e
            o desconhecido. É uma ajuda muito útil para a
            classificação espectral.

        "Traçado de intensidade" (Intensity Trace)
            Exibe os espectros como gráficos de intensidade relativa
            em função do comprimento de onda (padrão).

        "Tons de cinza "Foto"" (Grayscale "Photo")
            Converte as intensidades relativas em tons de cinza para
            imitar uma imagem fotográfica (positiva).

        "Comb. (Foto e traçado)" (Comb. (Photo & Trace))
            Exibe o desconhecido nos dois modos. Um padrão é exibido
            como "Foto".

        "Inverter exibições em tons de cinza"
        (Reverse Grayscale Displays)
            Inverte a conversão de intensidades em tons de cinza
            para imitar uma imagem fotográfica negativa.


**Medir larguras equivalentes**
A "largura equivalente" de uma linha espectral é uma grandeza
calculada que mede com precisão a intensidade da linha. Se você está
tentando classificar um espectro estelar com muita exatidão e tem
dúvidas sobre as intensidades relativas de características
importantes, a medida da largura equivalente pode ajudar. Para medir a
largura equivalente de uma característica espectral:

    1)  Aproxime a exibição até uma ampliação que permita identificar
        e marcar com clareza os "ombros" da linha.

    2)  Selecione "Largura equivalente da linha..." (Line Equivalent
        Width...) no menu de classificação. Aparece uma caixa com as
        instruções para concluir o cálculo da largura equivalente (um
        resumo dos passos 3 a 5 abaixo).

    3)  Marque o centro aproximado da linha na exibição do espectro
        usando o botão esquerdo do mouse, seja na própria exibição ou
        na entrada da linha na tabela.

    4)  Marque o comprimento de onda e a intensidade dos dois ombros
        da linha clicando com o botão direito do mouse, com o cursor
        em cada ombro, um de cada vez. A posição vertical do cursor
        deve indicar o nível do contínuo de cada lado da linha. Se
        você fez isso corretamente, os limites da linha ficam
        delineados por uma caixa azul, com o marcador vermelho da
        posição da linha passando perto do centro dela. Se quiser
        mudar uma posição, basta mover o cursor para a nova posição e
        clicar novamente com o botão direito. Você também pode
        reposicionar o marcador do centro da linha clicando com o
        botão esquerdo.

    5)  Quando a característica estiver corretamente delineada,
        pressione "OK" na caixa de instruções. Aparecem a largura
        equivalente calculada, assim como os comprimentos de onda e as
        intensidades no centro marcado da linha e nos ombros.

Tópicos relacionados:
    Medir e marcar características espectrais
    Tabela de linhas espectrais e ajuda

**Salvar, revisar e analisar resultados**
Quando você tiver classificado um espectro a seu contento, selecione
"Resultados da classificação" (Classification Results) no menu e
registre sua classificação na caixa chamada "Tipo esp." (Sp. Type) do
formulário que aparece. Você também pode anotar quaisquer incertezas
ou características incomuns do espectro na caixa "Comentários"
(Remarks). Quando você pressiona "OK", as informações digitadas são
colocadas em uma lista, mas não são salvas em um arquivo. Para
revisar, imprimir ou salvar seus resultados em um arquivo, selecione
"Ferramentas" (Tools)->"Editores de resultados" (Results
Editors)->"Resultados de observação" (Observational
Results)->"Exibir/imprimir/salvar" (Display/Print/Save) no menu do
painel de controle do observatório.

Tópicos relacionados:
    "Editores de resultados" no menu "Ajuda" do painel de controle do
    observatório.

**Definir faixa de comprimento de onda**
Você pode mudar a faixa de comprimentos de onda visível na janela de
classificação, dentro do máximo de 3500 a 7400 Angstroms. Para mudar
a faixa de comprimentos de onda, selecione "Arquivo" (File)->"Exibir"
(Display)->"Faixa espectral" (Spectral Range) no menu do painel de
controle de classificação. Use os controles deslizantes para mudar os
valores mínimo e/ou máximo. O botão "Padrão" (Default) devolve os
valores à faixa ideal para a classificação espectral. Observe que, se
você ampliar a faixa, poderá ultrapassar os limites do espectro que
está classificando.

**Fechar a janela de classificação**
Para fechar a janela de classificação e voltar ao painel de controle
do observatório, selecione "Arquivo" (File)->"Sair de Classificar
espectros" (Exit Classify Spectra) no menu ou pressione a caixa "X" no
canto superior direito.
`;
