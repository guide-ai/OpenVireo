// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's OBSRVHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='OBSRVHLP.TXT';
export const sourceSha256='2dcae5e678d69ed80784bb2958ed856289ff04779edd19656681288846102bd7';
export const text=`**"Acompanhamento"**
O botão "Acompanhamento" (Tracking) liga o acompanhamento sideral, que
mantém o telescópio apontado para um ponto específico do céu enquanto a
Terra gira. Quando o acompanhamento está desligado, as estrelas se
deslocam pelo campo do telescópio. O acompanhamento está desligado
quando um telescópio é acessado pela primeira vez. Os demais controles
do telescópio só ficam habilitados quando o acompanhamento está ligado.
A luz indicadora verde mostra que o acompanhamento foi ligado.

**Botões de movimento ("N","S","L","O")**
Os botões de movimento servem para mover o telescópio e apontá-lo para
um ponto (direção) específico do céu. Para mover o telescópio, pressione
e mantenha pressionado o botão correspondente. O telescópio se moverá na
velocidade definida pelo ajuste "Velocidade de movimento" (Slew Rate).
Solte o botão para parar o movimento. Em movimentos longos, o botão
continua pressionado se você deslizar o cursor para fora dele antes de
soltar o botão do mouse. Nesse caso, pare o movimento pressionando e
soltando o botão do mouse com o cursor sobre o botão ativo.

Os botões de movimento servem principalmente para fazer mudanças
relativamente pequenas na posição do telescópio e colocar os objetos na
área ativa do instrumento que está sendo usado. Para mover o telescópio
para outro campo ou objeto, use a opção de menu "Mover" (Slew).

    -Acesso pelo teclado-
    As teclas de seta do teclado numérico (as teclas "2", "4", "6" e
    "8") podem ser usadas para mover o telescópio no lugar dos botões de
    movimento. NumLock deve estar "ligado" e MouseKeys deve estar
    "desligado". (Se você usa MouseKeys, configure seu sistema para que
    MouseKeys seja ativado quando NumLock estiver "desligado".)


Tópicos relacionados:
    "Velocidade de movimento"
    "Visão"
    "Mover"

**"Velocidade de movimento"**
Este interruptor deslizante define a velocidade com que o telescópio se
move quando um botão de movimento ("N","S","L","O") é pressionado. A
velocidade dobra cada vez que o controle deslizante é movido uma posição
para a direita, até uma velocidade (relativa) máxima de 16. Da mesma
forma, a velocidade de movimento cai pela metade cada vez que o controle
deslizante é movido uma posição para a esquerda.

Tópicos relacionados:
    Interruptores deslizantes

**"Visão"**
Cada telescópio tem duas visões (ou tamanhos de campo) disponíveis. O
campo do buscador mede 2 1/2 graus de lado e serve para posicionar
estrelas e outros objetos específicos no campo do telescópio, de maior
aumento (indicado pelo quadrado vermelho no centro da visão do
buscador). O campo do telescópio mede 15 minutos de arco de lado e
mostra estrelas e outros objetos até um limite de magnitude muito mais
fraco que o do buscador. Esta visão serve para posicionar o objeto para
as observações com o instrumento selecionado.

Para mudar a visão, mova o controle deslizante para "Buscador" (Finder)
ou "Telescópio" (Telescope). Só é possível acessar os instrumentos
quando a visão do telescópio está ativa.

A área ativa do instrumento selecionado aparece contornada em vermelho
na visão do telescópio. A abertura do fotômetro é mostrada como um
círculo vermelho, enquanto a fenda do espectrômetro é indicada por um
par curto de linhas paralelas bem próximas. Nas câmeras CCD e IR, um
quadrado mostra o tamanho do campo da câmera. (Em algumas combinações de
telescópio e câmera, o campo é maior que a visão de 15 minutos de arco.
Isso é indicado por setas vermelhas apontando para fora nas bordas da
visão.)

Tópicos relacionados:
    "Instrumento"
    Interruptores deslizantes

**"Instrumento"**
Para acessar um instrumento, coloque o controle deslizante "Instrumento"
(Instrument) na posição correspondente e pressione o botão "Acessar"
(Access). Os instrumentos disponíveis para você dependem do exercício
que você está fazendo. O botão "Acessar" só fica habilitado quando a
visão está em "Telescópio" (Telescope).

Tópicos relacionados:
    "Visão"
    Interruptores deslizantes

**Interruptores deslizantes**
Vários controles dos painéis de controle do telescópio e dos
instrumentos usam interruptores deslizantes para que o usuário escolha
uma opção entre várias. Para fazer uma seleção com um interruptor
deslizante, você pode:

    A)  Colocar o cursor sobre o controle deslizante, pressionar,
        manter pressionado e arrastar o controle até a posição
        desejada, com o botão esquerdo do mouse, ou...

    B)  Colocar o cursor sobre a posição desejada no painel do controle
        deslizante e clicar com o botão esquerdo do mouse, ou...

    C)  Acesso pelo teclado: usar as teclas de seta para mover o
        controle deslizante quando o controle desejado estiver
        selecionado. (O controle selecionado aparece contornado por uma
        linha pontilhada. Use Tab e Shift-Tab para mudar a seleção.)

**"Mover"**
A opção de menu "Mover" (Slew) do painel de controle do telescópio abre
uma caixa de diálogo que permite digitar diretamente as coordenadas para
onde o telescópio deve apontar. Isso geralmente é mais rápido que usar
os botões de movimento para levar o telescópio de um objeto a outro, a
menos que os objetos estejam muito próximos no céu. Depois de definir as
coordenadas, talvez seja necessário um "ajuste fino" com os botões de
movimento para centralizar o objeto na fenda do espectrômetro, na
abertura do fotômetro ou no campo da câmera.

Tópicos relacionados:
    Botões de movimento ("N","S","L","O")

**Parâmetros do local e do telescópio**
Selecione "Arquivo" (File)->"Informações do local..." (Site
Information...) no menu do painel de controle do telescópio para obter
informações sobre o local de observação e o telescópio atuais. Os
parâmetros listados incluem a latitude, a longitude, a altitude acima do
nível do mar e o fuso horário do local. A abertura e a distância focal
do telescópio também são mostradas.

Tópicos relacionados:
    "Alterar o telescópio óptico" em "Ajuda" do painel do observatório
`;
