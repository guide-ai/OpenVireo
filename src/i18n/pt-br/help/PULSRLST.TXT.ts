// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's PULSRLST.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='PULSRLST.TXT';
export const sourceSha256='51df0d67752ffa73d661e33751905db3af359e723062c70eb25883b947c79bb8';
export const text=`**Localizar um pulsar na lista**
Tanto os nomes B1950 quanto os J2000 dos pulsares são mantidos na
lista (os pulsares descobertos mais recentemente podem não ter um nome
B1950).  Para localizar um pulsar pelo nome:

    o  Selecione "Arquivo" (File)->"Localizar pulsar..." (Find
       Pulsar...) no menu de "Parâmetros do pulsar" (Pulsar
       Parameters).
    o  Digite o nome do pulsar na caixa.
    o  Selecione o tipo de nome.
    o  Pressione "OK".

Você pode usar um nome parcial, desde que ele comece pelo início do
nome.  (Exemplo: pesquise por "045" e depois use os botões "Próximo"
(Next) e "Anterior" (Prev) para encontrar o que você quer.)  Como os
nomes dos pulsares são criados a partir de suas posições, você pode
usar essa técnica para encontrar um pulsar cuja ascensão reta você
conhece.  Todas as pesquisas começam pelo início da lista, não pelo
registro atual.

**Alterar a data - calcular o período**
O período atual é obtido a partir da data de observação atual, do
parâmetro PDot e do parâmetro PEpoch.  Para calcular o período em uma
data diferente:

    o  Edite o valor da data juliana no campo chamado "Data (MJD)"
       (Date (MJD)).
    o  Pressione o botão "Atualizar" (Update) para recalcular o
       período.
    o  Para voltar à data de observação atual, pressione "Redefinir"
       (Reset).

Como alternativa, você pode alterar a data de observação atual no
formato de data normal.  Para isso:

    o  Selecione "Arquivo" (File)->"Definir data/hora..." (Date/Time...)
       no menu do painel de controle do telescópio.  (Você não precisa
       fechar a janela "Parâmetros do pulsar" (Pulsar Parameters) para
       fazer isso.  Basta movê-la para o lado ou minimizá-la.)
    o  Digite a data e a hora desejadas nas caixas correspondentes.
    o  Pressione "OK".
    o  Volte à janela "Parâmetros do pulsar".  Talvez você queira
       pressionar "Redefinir" para garantir que a nova data seja
       usada.  (Isso deve acontecer automaticamente quando a janela é
       acessada de novo.)

**Alterar a densidade eletrônica - calcular a distância**
A distância derivada é calculada a partir do parâmetro "Dispersão"
(Dispersion) e da densidade eletrônica.  Para ver o efeito das
alterações na densidade eletrônica sobre a distância calculada:

    o  Edite o valor da densidade eletrônica no campo chamado
       "Densidade eletrônica" (Electron Density).
    o  Pressione o botão "Atualizar" (Update) para recalcular a
       distância.

**Voltar aos valores atuais**
O botão "Redefinir" (Reset) devolve a tela à data e hora de observação
atuais e à densidade eletrônica padrão de 0.03.  Como o relógio está
sempre em andamento, sempre haverá uma pequena mudança na data juliana
(JD) quando você fizer isso, mas as magnitudes dos valores de PDot são
tão pequenas que isso normalmente não terá efeito perceptível sobre o
período.

**Selecionar pulsares para estudo**
Ao escolher os pulsares que os alunos vão observar, os instrutores
devem selecionar da lista objetos que tenham densidades de fluxo
registradas nas três frequências (400, 600 e 1400 MHz).  Tenha em mente
também que é difícil detectar pulsos com o instrumento e os fatores de
ganho padrão se a densidade de fluxo for menor que 10.0.  Para
trabalhar com os pulsares mais fracos, aumente a abertura do telescópio
e/ou o "Fator de ganho base" (Base Gain Factor) nas "Opções" (Options).
`;
