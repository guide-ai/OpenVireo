// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's PULSRHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='PULSRHLP.TXT';
export const sourceSha256='3a6b8e727be8340095a284ad8dbe4e075613b2d081d83e93537a901a6c8377fc';
export const text=`**Controles do radiotelescópio**
Os botões a seguir são usados para operar o radiotelescópio.  Eles
ficam no painel de controle do telescópio.  Dependendo das
configurações escolhidas pelo seu instrutor, o movimento pode ser
limitado pelo horizonte local e possivelmente por outras limitações do
telescópio.

    "Acompanhamento" (Tracking) - Este botão liga o acompanhamento
    sideral, que permite ao telescópio permanecer apontado para um
    ponto específico do céu enquanto a Terra gira.  Com o
    acompanhamento desligado, os objetos celestes se deslocam pelo
    campo do telescópio, como indica a leitura variável da ascensão
    reta.  O acompanhamento está desligado quando o telescópio é
    acessado pela primeira vez.  NOTA: se o telescópio for um
    instrumento de trânsito meridiano, o botão "Acompanhamento" não
    aparecerá no painel de controle.

    "Velocidade de movimento" (Slew Rate) - Este par de botões é usado
    para definir a velocidade com que o telescópio se move quando um
    botão de movimento (N, S, L, O) é pressionado.  A velocidade pode
    ser variada em fatores de dez dentro de uma faixa bastante ampla.

    Botões de movimento ("N", "S", "L", "O") - Os botões de movimento
    são usados para mover o telescópio e apontá-lo para um ponto
    (direção) específico do céu.  Para mover o telescópio, pressione e
    mantenha pressionado o botão correspondente.  O telescópio se
    moverá a uma velocidade determinada pelo ajuste da velocidade de
    movimento.  Solte o botão para interromper o movimento.  Em
    movimentos longos, o botão permanecerá pressionado se você deslizar
    o cursor para fora dele antes de soltar o botão do mouse.  Nesse
    caso, interrompa o movimento pressionando e soltando o botão do
    mouse com o cursor sobre o botão de movimento ativo.  NOTA: se o
    telescópio for um instrumento de trânsito meridiano, os botões "L"
    e "O" não aparecerão no painel de controle.

    "Receptor" (Receiver) - Pressione este botão para acessar o
    primeiro receptor, ou receptor principal ("master").

Tópicos relacionados:
    Definir coordenadas
    Comentários sobre o movimento do telescópio
    Usar os receptores

**Definir coordenadas**
Para digitar diretamente as coordenadas de apontamento desejadas para o
telescópio, selecione "Mover" (Slew)->"Definir coordenadas..." (Set
Coordinates...) no menu do painel de controle do radiotelescópio e
digite as coordenadas no formulário que aparecer.  Em geral, isso é
mais rápido do que usar os botões de movimento para levar o telescópio
de um objeto a outro, a menos que os objetos estejam muito próximos no
céu.  NOTA: se o telescópio for um instrumento de trânsito meridiano,
este recurso moverá o telescópio somente em declinação.

Tópicos relacionados:
    Controles do radiotelescópio
    Comentários sobre o movimento do telescópio

**Comentários sobre o movimento do telescópio**
A parte do céu acessível a um telescópio em um dado momento é limitada
por vários fatores.  Na realidade, nenhum telescópio, óptico ou de
rádio, consegue "ver" abaixo do horizonte local.  Se estiver
configurado assim, o telescópio deste exercício não poderá se mover
abaixo de uma altitude que fica vários graus acima do horizonte
geográfico "verdadeiro".

Além disso, muitos radiotelescópios são restritos, por seu projeto, a
regiões limitadas do céu sobre eles.  O mais comum deles é o
telescópio de trânsito meridiano, que só pode se mover em declinação e
precisa esperar que a rotação da Terra leve o objeto observado pelo
campo de visão.  Outro tipo de restrição é exemplificado pela antena
de 1000 pés de Arecibo, que só pode ser apontada para objetos a poucos
graus do zênite local.  Este programa pode ser configurado para
simular qualquer uma dessas restrições de movimento; seu instrutor
informará se isso foi feito.  Se o programa estiver configurado para
simular um instrumento de trânsito meridiano, os botões
"Acompanhamento" (Tracking), "L" e "O" não aparecerão no painel de
controle, e os recursos "Definir coordenadas" (Set Coordinates) e
"Lista de objetos" (Hot List) moverão o telescópio somente em
declinação.

Ao contrário dos telescópios ópticos, os radiotelescópios podem ser
usados tanto de dia quanto de noite; por isso, a solução mais fácil
para observar objetos que estão fora da faixa acessível do telescópio
(em ascensão reta) é esperar algumas horas ou, com este programa,
alterar a data e a hora simuladas.

Para simplificar este exercício, seu instrutor pode configurar o
programa para ignorar todas as restrições de movimento e mover o
telescópio para qualquer parte do céu a qualquer momento.  Você será
informado se esse for o caso.

Veja também:
    "Definir a data e a hora de observação"

**Selecionar um objeto da "Lista de objetos"**
Para mover o telescópio para um item da lista de objetos, selecione
"Mover" (Slew)->"Lista de objetos" (Hot List)->"Ver/selecionar da
lista..." (View/Select from List...) no menu do painel de controle do
radiotelescópio.  Quando a lista aparecer, clique na entrada desejada
para destacá-la.  Pressione "OK" e o telescópio se moverá para o
objeto.  (O programa pode ser configurado para permitir o movimento
somente para objetos que estejam acima do horizonte do instrumento e
dentro de sua faixa de movimento.)  Se o telescópio for um instrumento
de trânsito meridiano, o recurso "Lista de objetos" moverá o
telescópio somente em declinação.

Veja também:
    "Comentários sobre o movimento do telescópio"

**Adicionar um objeto à "Lista de objetos"**
Você pode adicionar objetos interessantes à lista de objetos para
facilitar o retorno a eles mais tarde, para novas observações.  Para
adicionar um objeto, aponte o telescópio com precisão para ele e acesse
um receptor para verificar que você localizou um pulsar.  Em seguida,
selecione "Mover" (Slew)->"Lista de objetos" (Hot List)->"Adicionar o
objeto atual à lista..." (Add Current Item to List...) no menu do
painel de controle do radiotelescópio.  No formulário que aparecer,
você pode adicionar um comentário que ajude a identificar o objeto ou
a lembrar por que ele é de interesse.  (Você também pode alterar a
identificação e a posição para adicionar um objeto que não esteja no
campo do telescópio no momento.)  Quando terminar a entrada, pressione
"OK" para adicioná-la à lista.  (Se você criar uma entrada incorreta
por engano, veja o tópico de ajuda "Remover um objeto da "Lista de
objetos"".)

**Remover um objeto da "Lista de objetos"**
Para remover uma entrada da lista de objetos, selecione "Mover" (Slew)
->"Lista de objetos" (Hot List)->"Ver/selecionar da lista..."
(View/Select from List...) no menu do painel de controle do
radiotelescópio.  Quando a lista aparecer, clique na entrada desejada
para destacá-la e depois pressione o botão "Excluir" (Delete).  Será
pedido que você confirme a exclusão antes de a entrada ser removida da
lista.  Ao terminar, você pode pressionar "Cancelar" (Cancel) para
fechar a lista de objetos, se não quiser mover o telescópio para
nenhum dos objetos restantes.

**Definir a data e a hora de observação**
Para definir a data e a hora "atuais" do telescópio, feche o painel de
controle do radiotelescópio e depois selecione "Arquivo" (File)
->"Definir data/hora de observação e ID..." (Set Observation Date/Time,
ID...) no menu do painel de controle do observatório.

Tópicos relacionados:
    "Definir data e hora" no menu "Ajuda" do painel de controle do
    observatório.

**Analisar dados de pulsares**
Para analisar os dados de pulsares que você obteve e registrou,
selecione "Ferramentas" (Tools)->"Ferramenta de análise de
radiopulsares" (Radio Pulsar Analysis Tool) no menu do painel de
controle do observatório.

Tópicos relacionados:
    Receber sinais
    Registrar sinais
    Medir os sinais recebidos
    Tópicos de "Ajuda" (Help) no menu da ferramenta de análise de
    pulsares.

**Fechar o painel de controle do radiotelescópio**
Para fechar o painel de controle do radiotelescópio, selecione
"Arquivo" (File)->"Sair" (Exit) no menu, ou use qualquer um dos
recursos padrão do Windows (menu do sistema ou botão "X") para fechar a
janela.  Você será lembrado de quaisquer dados não salvos e terá a
chance de salvá-los antes que o telescópio seja fechado.

**Acessar os receptores**
Para acessar o receptor principal ("master"), pressione o botão
"Receptor" (Receiver) no painel de controle do radiotelescópio.  Depois
que a janela do receptor principal aparecer, até dois canais
adicionais, ou receptores secundários ("slave"), podem ser acessados
pressionando o botão "Adicionar canal" (Add Channel) no painel do
receptor principal.

**Controles do receptor**
Os controles a seguir são usados para operar os receptores.  Observe
que alguns dos controles ficam somente no receptor principal.  Durante
a recepção, os controles Segundos horizontais, Adicionar canal e
Registrar ficam desabilitados.  Durante o registro, todos os controles,
exceto Modo do receptor, Alinhar receptores e Volume, ficam
desabilitados.

    Frequência do receptor (Receiver Frequency) - Este controle define a
    frequência do receptor.  Cada clique no botão com seta
    correspondente aumenta ou diminui a frequência na quantidade (MHz)
    determinada pelo controle de incremento de frequência.  A
    frequência pode ser definida em valores entre 400.00 e 1400.00 MHz.
    O controle de frequência do receptor aparece em todos os receptores
    e fica desabilitado durante o registro.

    Incremento de frequência (Frequency Increment) - Este controle
    define o incremento do controle de frequência do receptor.  O
    incremento pode variar entre 0.01 e 100 MHz, em fatores de dez.  O
    controle de frequência do receptor aparece em todos os receptores e
    fica desabilitado durante o registro.

    Ganho vertical (Vertical Gain) - Este controle define a
    amplificação aplicada ao sinal pelo receptor.  Isso afeta tanto a
    "altura" do sinal na tela quanto a intensidade do sinal registrado.
    O ganho vertical pode variar entre 0.125 e 8.0 (unidades
    arbitrárias), em fatores de dois.  O controle de ganho vertical
    aparece em todos os receptores e fica desabilitado durante o
    registro.

    Segundos horizontais (Horizontal Seconds) - Este controle define a
    escala de tempo do sinal recebido.  Além de estabelecer a escala
    horizontal da tela e do sinal registrado, ele altera a "constante
    de tempo", ou tempo efetivo de integração, do receptor.  Assim,
    definir os segundos horizontais com um valor maior ajuda a detectar
    sinais fracos, por aumentar a razão sinal-ruído, enquanto valores
    menores deixam visíveis as formas dos pulsos e permitem medir com
    mais exatidão as posições dos pulsos.  Os segundos horizontais
    podem variar entre 0.5 e 16.0, em fatores de dois.  Este controle
    afeta todos os receptores abertos; por isso ele aparece somente no
    receptor principal (embora a leitura apareça em todos os
    receptores).  O controle de segundos horizontais fica desabilitado
    tanto durante a recepção quanto durante o registro.

    Adicionar canal (Add Channel) - Pressionar este botão abre um
    receptor secundário ("slave").  A frequência e o ganho vertical dos
    receptores secundários podem ser definidos de forma independente;
    todos os outros parâmetros e controles são estabelecidos pelo
    receptor principal.  Podem ser adicionados no máximo dois
    receptores secundários.  O controle "Adicionar canal" fica
    desabilitado tanto durante a recepção quanto durante o registro.  Os
    receptores secundários podem ser fechados sem fechar o receptor
    principal, mas valem certas restrições; veja o tópico de ajuda
    "Fechar os receptores".

    Alinhar receptores (Align Receivers) - Este botão liga ("Sim")
    (Yes) e desliga ("Não") (No) o alinhamento dos receptores.  Com o
    alinhamento desligado, todos os receptores abertos podem ser
    movidos e posicionados de forma independente, em qualquer lugar da
    tela.  Com o alinhamento ligado, os receptores se posicionam em uma
    pilha abaixo do receptor principal e o "seguem" sempre que ele é
    movido.  Os receptores secundários não podem ser movidos de forma
    independente quando o alinhamento está ligado.  Este controle está
    sempre habilitado.

    Modo do receptor (Receiver Mode) - Este botão é usado para iniciar
    e parar os receptores.  Quando o modo é definido como "Receber"
    (Receive), todos os receptores abertos começam a exibir os sinais
    recebidos.  O registro também começa se o interruptor de registro
    estiver "Ligado" (On), e os sons são ouvidos se o computador estiver
    devidamente equipado e os efeitos sonoros estiverem habilitados.
    Para interromper a recepção e o registro, pressione o botão Modo do
    receptor de novo para mudar o modo para "Parar" (Stop).  A recepção,
    o registro e o som então terminarão quando a tela chegar ao fim do
    painel atual.  (Veja também o tópico de ajuda "Registrar sinais".)

    Interruptor de registro (Record Switch) - Este botão liga e desliga
    o registro de sinais.  Ele só fica habilitado quando o modo do
    receptor é "Parar" (veja acima).  Veja o tópico de ajuda "Registrar
    sinais" para mais informações.

    Controle de volume (Volume Control) - Este controle aparecerá
    somente no receptor principal se o computador estiver devidamente
    equipado para reproduzir som e os recursos de som deste programa
    tiverem sido habilitados.  Use-o para controlar o volume do som
    durante a recepção e o registro.  Veja o tópico de ajuda "Sons" para
    mais informações.

**Receber sinais**
Para receber sinais de pulsares, aponte o telescópio com precisão para
a posição do pulsar.  O acompanhamento do telescópio deve estar
ligado.  (Se você estiver usando um telescópio de trânsito meridiano,
veja a nota abaixo.)  Quando o telescópio tiver parado de se mover,
acesse o receptor.  Para começar a receber um sinal, pressione o botão
"Modo" (Mode).  Para parar, pressione o botão "Modo" de novo; a
recepção vai parar no fim da tela atual.  Observe que, enquanto os
sinais estão sendo recebidos, você pode alterar a frequência e o ganho
vertical individualmente para cada receptor ativo.  Com a recepção
parada, você pode também abrir novos canais de receptor, ajustar a
escala de tempo (segundos horizontais) e ativar o registro dos dados.

Você deve ajustar cada receptor de modo que os pulsos fiquem
claramente visíveis.  Se os sinais estiverem soterrados no ruído, pode
ajudar aumentar os segundos horizontais; isso aumentará a razão
sinal-ruído.  Use o ganho vertical para ajustar a altura dos pulsos; os
pulsos devem ficar claramente visíveis, mas não devem chegar ao topo da
tela nem ser cortados por ele.

NOTA: Para um telescópio de trânsito meridiano, você deve escolher um
horário de observação em que o pulsar esteja logo a leste do meridiano
do telescópio.  Posicione com precisão a declinação do telescópio e
comece a receber.  Quando o pulsar entrar no feixe do telescópio, você
começará a receber os pulsos.  Eles ficarão mais intensos, depois
começarão a enfraquecer e por fim desaparecerão, conforme o movimento
da Terra levar o feixe do telescópio para além do objeto.  Você deve
fazer todas as suas observações, inclusive o registro do sinal, durante
o curto período em que o pulsar está no feixe.

Tópicos relacionados:
    Controles do radiotelescópio
    Comentários sobre o movimento do telescópio
    Acessar os receptores
    Controles do receptor

**Registrar sinais**
Para registrar os sinais recebidos de um pulsar, execute primeiro os
passos descritos no tópico de ajuda "Receber sinais".  Quando você
tiver ajustado todos os receptores para obter pulsos claros e
facilmente identificáveis, pare a recepção, pressione o botão
"Registrar" (Record) para ligar o registro e comece a receber de novo.
Tudo o que você vir nas telas dos receptores será registrado, até um
máximo de 4 telas completas (de 2 a 64 segundos, conforme o ajuste dos
segundos horizontais).  Para interromper o registro, pressione o botão
"Modo" (Mode) para parar a recepção (mas nunca será registrado mais do
que as quatro primeiras telas).

Os sinais registrados podem ser medidos com a ferramenta de análise de
radiopulsares e/ou salvos para análise posterior.

Tópicos relacionados:
    Salvar os sinais recebidos
    Analisar dados de pulsares

**Sons**
Se o seu computador estiver devidamente equipado e os recursos de som
do programa estiverem habilitados, você ouvirá os sons dos pulsos e do
ruído de fundo enquanto os sinais estiverem sendo recebidos.  Você pode
ajustar o volume do som com o controle de volume do receptor
principal.  O som refletirá com exatidão o período e a intensidade do
sinal do pulsar que está sendo observado.

O som estará, em geral, sincronizado com a tela do receptor principal.
No entanto, como o som e o vídeo nos PCs são controlados por
subsistemas completamente separados e independentes, é possível que o
som e o vídeo fiquem "dessincronizados".  Isso provavelmente só será
perceptível em pulsares com períodos maiores que cerca de 1/2 segundo.
Parar e reiniciar o receptor pode sincronizar o som e o vídeo de novo.

**Medir os sinais recebidos**
Os sinais recebidos podem ser medidos diretamente na tela do receptor,
depois que a recepção tiver parado.  Pressione e arraste com o botão
esquerdo do mouse para criar e mover um cursor vertical na tela de cada
receptor.  A posição do cursor, dada em segundos a partir da borda
esquerda da tela, aparece no canto superior esquerdo de cada tela.  Se
você pressionar e arrastar com o botão direito do mouse, criará e
moverá um único cursor de "referência" que aparece na mesma posição em
todas as telas de receptor abertas.  Sua leitura aparece no canto
superior direito de todas as telas.

Por esse método, você fica limitado a medições de apenas uma tela
(intervalo de tempo) de dados.  Para intervalos de tempo mais longos,
medições mais exatas (com zoom e deslocamento) e recursos de registro
de medições, você deve registrar os dados do receptor e usar a
ferramenta de análise de radiopulsares.

Tópicos relacionados:
    Registrar sinais
    Salvar os sinais recebidos
    Analisar dados de pulsares

**Salvar os sinais recebidos**
Os sinais registrados ficam na memória RAM.  Nesse estado, eles podem
ser passados diretamente para a ferramenta de análise de dados, mas se
você não pretende fazer isso imediatamente, ou precisa de um registro
"permanente" por qualquer outro motivo, deve salvar esses dados em um
arquivo.  (Os sinais registrados na RAM são apagados na próxima vez em
que um registro for iniciado.)  Quando você termina de registrar um
sinal, tem a chance de salvá-lo imediatamente ou de transferi-lo
imediatamente para a janela de análise de dados.  Se você não salvar
nesse momento, pode salvar depois selecionando "Arquivo" (File)
->"Salvar dados registrados..." (Save Recorded Data...) no menu de
controle do radiotelescópio, ou "Arquivo"->"Salvar..." (Save...) no
menu da ferramenta de análise de dados.

Quando você opta por salvar o arquivo, aparece um formulário que
permite digitar ou selecionar um nome para o arquivo salvo.  Você pode
usar o nome que quiser; o programa sugerirá um nome gerado a partir das
suas informações de login.  Você deve sempre usar o qualificador ".PLR"
nesses arquivos, para evitar dificuldades e confusão mais tarde.

**Fechar os receptores**
As janelas dos receptores são fechadas pelo menu do sistema (clique na
pequena caixa no canto superior esquerdo da janela do receptor e depois
selecione "Fechar" (Close)) ou pela caixa "X" no canto superior direito
da janela.  Fechar a janela do receptor principal fecha todas as janelas
de receptor abertas.  Os receptores secundários podem ser fechados
individualmente, mas devem ser fechados na ordem inversa à de sua
criação (ou seja, feche primeiro o último receptor criado).
`;
