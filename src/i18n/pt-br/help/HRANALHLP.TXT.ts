// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's HRAnalHlp.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='HRAnalHlp.TXT';
export const sourceSha256='3a2f0ef20fd5d89384e429783ceda62325e59a752fd076e02a2c4256143c956b';
export const text=`**Carregar dados a partir das observações**
Para carregar e analisar os dados fotométricos de um aglomerado que
você acabou de obter com o telescópio e o fotômetro, selecione
"Arquivo" (File)->"Carregar/plotar" (Load/Plot)->"Dados a partir das
observações" (Data from Observations) no menu da ferramenta de análise
do diagrama HR. O diagrama cor-magnitude (HR) bruto aparecerá quando
os dados forem carregados. Se você salvou dados fotométricos de uma
sessão anterior, recarregue-os antes de acessá-los dessa maneira.

Tópicos relacionados:
    Tópicos de "Ferramentas de análise de aglomerados"
    Tópicos de ajuda "Editores de resultados" e "Carregar dados
      salvos" no menu do painel de controle do observatório.

**Carregar dados do banco de dados de aglomerados**
Para carregar e analisar os dados fotométricos de aglomerados
individuais do banco de dados do VIREO, selecione "Arquivo"
(File)->"Carregar/plotar" (Load/Plot)->"Selecionar dados de
aglomerados" (Select Cluster Data) no menu da ferramenta de análise do
diagrama HR. Na lista que aparece, clique em uma entrada para
selecioná-la e depois escolha "Seleção" (Selection)->"Plotar" (Plot)
no menu. Como alternativa, dê um clique duplo em uma entrada da lista
para carregar e plotar os dados.

Tópicos relacionados:
    Tópicos de "Ferramentas de análise de aglomerados"
    Carregar novo aglomerado do banco de dados

**Carregar novo aglomerado do banco de dados**
Ao carregar um novo aglomerado do banco de dados, os pontos de dados
da exibição do diagrama HR são substituídos. Se a ZAMS e/ou uma
isócrona estiverem exibidas, elas não serão removidas automaticamente.

Tópicos relacionados:
    Carregar dados do banco de dados de aglomerados
    Remover ZAMS e isócrona da exibição

**Exibir a sequência principal de idade zero**
Ajustar a sequência principal de idade zero (ZAMS) aos dados do
aglomerado permitirá que você determine o módulo de distância V-Mv e o
excesso de cor E(B-V) do aglomerado. Para exibir a ZAMS, selecione
"Ferramentas" (Tools)->"Sequência principal de idade zero" (Zero Age
Main Sequence) no menu da ferramenta de análise do diagrama HR. A ZAMS
será exibida inicialmente com V-Mv = 0.

Tópicos relacionados:
    Ajustar a sequência principal de idade zero
    Remover ZAMS e isócrona da exibição

**Ajustar a sequência principal de idade zero**
Use o controle deslizante de ajuste de V-Mv, no lado direito do
gráfico do diagrama HR, para ajustar a ZAMS à sequência principal
mostrada pelo gráfico do aglomerado. Lembre-se de que a parte superior
da sequência principal do aglomerado terá evoluído para longe da
sequência principal de idade zero. O quanto isso ocorreu dependerá da
idade do aglomerado. (Ajustar uma isócrona depois de posicionar a ZAMS
deixará isso mais claro.) Também haverá, no diagrama HR do aglomerado,
estrelas que não são membros dele, mas, na maioria dos casos, a
sequência principal do aglomerado é delineada bem o bastante para
permitir um ajuste razoavelmente preciso da ZAMS.

O controle deslizante na parte inferior do gráfico desloca a ZAMS
lateralmente, aplicando um excesso de cor E(B-V) para compensar o
efeito de avermelhamento causado pela poeira interestelar entre o
aglomerado e o Sol. Para simplificar o processo de ajuste, por padrão
o programa define automaticamente E(B-V) com o valor correto para o
aglomerado que você está estudando, e você não precisa alterá-lo. Seu
instrutor deve avisar se esse padrão foi alterado e se você precisa
considerar o ajuste de E(B-V) ao ajustar a ZAMS.

Tópicos relacionados:
    Exibir a sequência principal de idade zero
    Adicionar isócrona à exibição
    Remover ZAMS e isócrona da exibição

**Adicionar isócrona à exibição**
Ajustar a isócrona correta aos dados do aglomerado informará a idade
do aglomerado e a metalicidade de suas estrelas. A exibição da
isócrona usa o ajuste da sequência principal de idade zero para
"ancorar" os parâmetros V-Mv e E(B-V); por isso, você deve primeiro
ajustar a ZAMS antes de adicionar uma isócrona. Depois de fazer isso,
adicione a isócrona à exibição selecionando "Ferramentas"
(Tools)->"Isócronas..." (Isochrones...) no menu. A caixa de controle
Parâmetros da isócrona (Isochrone Parameters) que aparece permitirá
ajustar a isócrona aos dados do aglomerado. (Quando uma isócrona está
exibida, as alterações nos controles deslizantes da exibição do
diagrama HR que controlam os valores de V-Mv e E(B-V) farão a ZAMS e a
isócrona exibidas se moverem juntas.)

NOTA: As isócronas são obtidas de modelos teóricos fornecidos para os
valores específicos de idade e metalicidade que os controles cobrem.
Valores intermediários não estão disponíveis, e nem sempre será
possível um ajuste exato a um aglomerado específico. A parte inferior
da sequência principal da isócrona pode não coincidir exatamente com a
ZAMS. Você deve tentar obter uma boa correspondência com a sequência
principal logo abaixo do ponto de saída, com o próprio ponto de saída
e com as partes evoluídas do diagrama acima e à direita do ponto de
saída.

Tópicos relacionados:
    Ajustar a sequência principal de idade zero
    Ajustar a idade da isócrona
    Definir a metalicidade da isócrona
    Ajustar a cor da isócrona
    Remover ZAMS e isócrona da exibição

**Ajustar a idade da isócrona**
Use o controle deslizante na parte superior da caixa de controle
Parâmetros da isócrona para ajustar a idade da isócrona exibida. O
controle deslizante ajusta o logaritmo da idade em anos de 7.80 a
10.25, em passos de 0.05. Isso corresponde a idades de aglomerados de
63 milhões a quase 18 bilhões de anos. (Veja a NOTA em "Adicionar
isócrona à exibição".) Pode ser que a idade do aglomerado que você
está estudando esteja fora da faixa das isócronas disponíveis. Nesse
caso, você concluiria que a idade do aglomerado é menor ou maior que o
limite aplicável.

Tópicos relacionados:
    Adicionar isócrona à exibição
    Definir a metalicidade da isócrona
    Ajustar a cor da isócrona
    Remover ZAMS e isócrona da exibição

**Definir a metalicidade da isócrona**
Modelos de isócronas são fornecidos para 6 valores de metalicidade.
(Veja a NOTA em "Adicionar isócrona à exibição".) Além do valor solar,
há 4 modelos com metalicidade mais baixa e 1 com metalicidade mais
alta. A maioria dos aglomerados abertos da galáxia tem metalicidades
próximas do valor solar, e você deve sempre começar por esse valor. Se
não conseguir uma correspondência satisfatória, você pode tentar mudar
a metalicidade. (Você também pode experimentar vários valores só para
ver o efeito que eles têm.) Na caixa de controle Parâmetros da
isócrona, use os pequenos botões de seta na borda direita do indicador
de metalicidade para exibir os diferentes valores. Para mudar a
metalicidade da isócrona exibida, defina na caixa o modelo desejado e
depois dê um clique duplo nele.

Tópicos relacionados:
    Adicionar isócrona à exibição
    Ajustar a cor da isócrona

**Ajustar a cor da isócrona**
O controle deslizante "Ajustar (B-V)" (Adjust (B-V)) da caixa de
controle Parâmetros da isócrona (Isochrone Parameters) desloca a
isócrona lateralmente no diagrama HR sem mover a ZAMS. Isso pode
permitir um ajuste melhor, sobretudo se você estiver com dificuldade
para fazer a sequência principal da isócrona coincidir com a ZAMS.
(Você também pode tentar alterar a metalicidade para corrigir isso.)
Até certo ponto, o ajuste de (B-V) imita o efeito de variações de
metalicidade menores que as diferenças entre os modelos.

Tópicos relacionados:
    Adicionar isócrona à exibição
    Definir a metalicidade da isócrona

**Remover ZAMS e isócrona da exibição**
Selecione "Ferramentas" (Tools)->"Limpar" (Clear) no menu da
ferramenta de análise do diagrama HR para remover da exibição tanto a
ZAMS quanto a isócrona. Você também pode removê-las separadamente
selecionando de novo a opção de menu correspondente
("Ferramentas"->"Sequência principal de idade zero" ou
"Ferramentas"->"Isócronas..."). Isso provavelmente é mais útil para
remover a isócrona e manter a ZAMS, especialmente depois de carregar
um novo aglomerado.

Tópicos relacionados:
    Carregar novo aglomerado do banco de dados

**Exibir/imprimir parâmetros de idade e distância do aglomerado**
Selecione "Ferramentas" (Tools)->"Ver/imprimir parâmetros" (View/Print
Parameters) no menu da ferramenta de análise do diagrama HR para ver
os valores dos parâmetros resultantes da sua análise do diagrama HR do
aglomerado. Selecione "Lista" (List)->"Imprimir" (Print) para obter
uma cópia impressa.
`;
