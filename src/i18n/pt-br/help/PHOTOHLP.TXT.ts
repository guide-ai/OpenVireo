// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's PHOTOHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='PHOTOHLP.TXT';
export const sourceSha256='aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a';
export const text=`**Definir o filtro**
Use o controle deslizante "Filtro" (Filter) do painel de controle do
fotômetro para definir o filtro ativo. Você deve fazer uma leitura do
céu com cada filtro antes de poder usá-lo para medir magnitudes
estelares.

Tópicos relacionados:
    Fazer leituras do céu
    Interruptores deslizantes

**Definir os segundos de integração**
Use o controle deslizante rotulado "Segundos" (Seconds) do painel de
controle do fotômetro para definir a duração de cada integração (o
tempo durante o qual as contagens de fótons se acumulam quando uma
leitura é feita). As opções vão de 0.1 segundo a 100 segundos, em
fatores de 10.

Tópicos relacionados:
    Definir o número de integrações
    Fazer leituras fotométricas
    Interruptores deslizantes

**Definir o número de integrações**
Use o controle deslizante rotulado "Integrações" (Integrations) do
painel de controle do fotômetro para definir o número de integrações que
formam uma leitura completa. As opções vão de 1 a 5.

Tópicos relacionados:
    Definir os segundos de integração
    Fazer leituras fotométricas
    Interruptores deslizantes

**Definir o tamanho da abertura**
Para definir o tamanho da abertura do fotômetro, selecione "Abertura"
(Aperture) no menu do painel de controle do fotômetro. Aparecerá uma
pequena caixa de controle com um controle deslizante que permite mudar
o tamanho da abertura. O botão rotulado "Padrão" (Default) devolve a
abertura ao seu tamanho padrão. Você deve usar o tamanho de abertura
padrão sempre que possível. Algumas situações em que talvez você precise
mudar a abertura são:

    1)  Um objeto extenso, como uma galáxia, é grande demais para caber
        na abertura padrão.

    2)  As estrelas de um aglomerado estão tão próximas umas das outras
        que é preciso uma abertura menor para isolar estrelas
        individuais e evitar a contaminação das leituras.

    3)  Você pode obter leituras do céu mais precisas com tempos de
        integração mais curtos usando uma abertura maior. Se fizer
        isso, certifique-se de que não haja estrelas na abertura
        contaminando as leituras do céu.

    OBSERVAÇÃO: Se você mudar o tamanho da abertura depois de fazer as
    leituras do céu, as contagens médias do céu por segundo serão
    automaticamente reescaladas para o novo tamanho de abertura na
    determinação das magnitudes.

Tópicos relacionados:
    Galáxias e outras fontes estendidas
    Fazer leituras do céu

**Definir o tipo de leitura**
O interruptor "Leitura" (Reading) do painel de controle do fotômetro
serve para especificar como a leitura é interpretada e registrada.
Confira se este interruptor está na posição correta antes de pressionar
o botão "Iniciar" (Start) para começar uma leitura. Se você fizer uma
leitura de uma estrela ou de outro objeto com o interruptor "Leitura" em
"Céu" (Sky), vai substituir sua leitura do céu atual (presumivelmente
correta) por uma inválida, que inclui o objeto. Se isso acontecer, você
terá de se afastar do objeto e fazer uma leitura do céu válida antes de
continuar.

    OBSERVAÇÃO: É possível que o interruptor "Leitura" não apareça no
    painel de controle do fotômetro no exercício "Fotometria
    fotoelétrica de aglomerados" (Photoelectric Photometry of Clusters).
    Nesse caso, o programa detecta automaticamente a presença ou a
    ausência de um objeto na abertura e processa a leitura de acordo.

**Fazer leituras do céu**
Você deve fazer uma leitura do céu através de cada filtro antes de poder
medir o brilho dos objetos através desse filtro. Um conjunto de leituras
do céu é suficiente enquanto você continuar usando o mesmo telescópio.
Se você trocar de telescópio, deve fazer um novo conjunto de leituras do
céu, mesmo que esteja voltando a um telescópio que já usou. Faça as
leituras do céu da seguinte maneira:

    1)  No painel de controle do telescópio, certifique-se de que a
        visão esteja em "Telescópio" (Telescope) e use os botões "NSLO"
        para posicionar o telescópio de modo que não haja nenhuma
        estrela dentro do círculo vermelho da abertura nem logo ao lado
        dele. Se houver céu aberto suficiente no quadro, você pode
        aumentar a precisão das suas medições do céu aumentando o
        tamanho da abertura.

    2)  Acesse os controles do fotômetro ou volte a eles. Se o
        interruptor "Leitura" (Reading) estiver visível, certifique-se
        de que esteja em "Céu" (Sky). Se nenhum interruptor "Leitura"
        aparecer, a caixa rotulada "Objeto" (Object) deve dizer "Céu" se
        o telescópio estiver bem posicionado, .

    3)  Coloque o filtro na cor desejada. (Se já foi feita uma leitura
        do céu com um determinado filtro, a caixa rotulada "Céu médio"
        (Mean Sky) conterá as contagens médias do céu por segundo desse
        filtro. Caso contrário, o campo indicará "SEM CÉU!" (NO SKY!).)

    4)  Defina o tempo de integração em 10 segundos e o número de
        integrações em 5.

    5)  Pressione "Iniciar" (Start) e aguarde as leituras aparecerem.
        Você verá as contagens brutas à medida que cada integração for
        concluída. Quando a leitura estiver completa, a contagem média
        do céu nessa cor aparecerá na caixa rotulada "Contagens médias
        do céu/s" (Mean Sky Counts/Sec).

    6)  Repita o procedimento para cada filtro que você for usar.

    7)  Selecione "Arquivo" (File)->"Dados" (Data)->"Registrar/revisar"
        (Record/Review) no menu do fotômetro para salvar as leituras do
        céu. (Talvez você não precise fazer isso se o programa estiver
        configurado para calcular automaticamente as magnitudes
        estelares para você. Se você calcula as magnitudes por conta
        própria a partir das contagens de fótons, você DEVE registrar as
        leituras do céu.)

Tópicos relacionados:
    Definir o tamanho da abertura
    Definir o tipo de leitura
    Outros tópicos de ajuda em "Usar o fotômetro".

**Estrelas e outras fontes puntiformes**
Você deve fazer leituras do céu antes de poder fazer medições
fotométricas de estrelas e de outros objetos. Depois de concluir as
medições do céu, faça leituras fotométricas de fontes puntiformes da
seguinte maneira:

    1)  No painel de controle do telescópio, centralize
        aproximadamente a estrela no quadrado vermelho da visão
        "Buscador" (Finder). Mude para a visão "Telescópio" (Telescope)
        e centralize com precisão a estrela no círculo vermelho da
        abertura. (A abertura deve estar no tamanho padrão.) Se a
        estrela tiver uma companheira próxima, mantenha a companheira
        fora do círculo da abertura. Nesse caso, a estrela que você está
        medindo pode não ficar bem centralizada. Outra opção é usar uma
        abertura menor para evitar a contaminação pela estrela próxima.

    2)  Volte ao painel de controle do fotômetro. CERTIFIQUE-SE de que o
        interruptor "Leitura" (Reading) esteja em "Objeto" (Object). Se
        o interruptor "Leitura" não aparecer, a caixa rotulada "Objeto"
        pode conter alguma identificação da estrela ou de outro objeto
        que você está medindo. Ela não deve dizer "Céu" (Sky).

    3)  Coloque o filtro na cor desejada. (Se a caixa "Contagens médias
        do céu" (Mean Sky Counts) indicar "SEM CÉU!" (NO SKY!), você
        não pode fazer uma medição nessa cor. Volte aos controles do
        telescópio, tire a estrela do círculo vermelho da abertura,
        volte aos controles do fotômetro e faça a leitura do céu.)

    4)  Defina o tempo de integração e o número de integrações
        desejados. (Pode ser necessário um pouco de tentativa e erro;
        veja o passo 5 abaixo.)

    5)  Pressione o botão "Iniciar" (Start) da integração e aguarde as
        leituras aparecerem. Você verá as contagens brutas à medida que
        cada integração for concluída. Quando a leitura estiver
        completa, as contagens médias por segundo, a razão sinal-ruído
        (S/N) e a magnitude calculada aparecerão nas caixas rotuladas.
        Para obter a maior precisão, suas leituras devem refletir razões
        sinal-ruído de 100 ou mais. Se você obtiver uma S/N menor, deve
        aumentar o tempo de integração, o número de integrações ou
        ambos, e fazer uma nova leitura (não registre a anterior). (Se
        sua S/N for REALMENTE baixa, talvez seja preciso usar um
        telescópio maior para obter uma fotometria precisa.) Se sua S/N
        for muito alta (> ~500), talvez você queira reduzir o tempo de
        integração, o número de integrações ou ambos nas próximas
        estrelas de magnitude parecida, para economizar tempo.

    6)  Repita as leituras para cada filtro que estiver usando. Note que
        a maioria das estrelas parece mais fraca no azul (B), e mais
        fraca ainda no ultravioleta (U), do que no visual (V). Isso se
        deve aos efeitos combinados da temperatura estelar e do
        avermelhamento interestelar. Talvez você precise aumentar o
        tempo de integração e o número de integrações; confira sempre a
        razão sinal-ruído.

    7)  Selecione "Arquivo" (File)->"Dados" (Data)->"Registrar/revisar"
        (Record/Review) no menu para salvar as leituras fotométricas.
        SE VOCÊ VOLTAR À TELA PRINCIPAL SEM REGISTRAR AS LEITURAS, VAI
        PERDÊ-LAS E TERÁ DE REPETIR AS MEDIÇÕES!

Tópicos relacionados:
    Definir o tamanho da abertura
    Definir o tipo de leitura
    Outros tópicos de ajuda em "Usar o fotômetro".
    Tópicos do menu "Ajuda" do painel de controle do telescópio.

**Galáxias e outras fontes estendidas**
Em geral, a técnica para fazer medições fotométricas de galáxias e de
outras fontes estendidas é a mesma das estrelas, exceto que, no caso das
galáxias, você deve definir a abertura grande o bastante para abranger
todo o objeto. Isso traz várias complicações:

    1)  A extensão real de uma galáxia pode ser bem maior do que parece,
        de modo que as leituras de magnitude podem depender do tamanho
        da abertura, mesmo que a abertura menor pareça conter toda a
        imagem.

    2)  Em galáxias grandes, pode ser impossível incluir todo o objeto
        na abertura sem incluir várias estrelas próximas, o que
        obviamente afetará a leitura. As leituras podem ser corrigidas,
        mas o processo é um tanto trabalhoso (veja o n. 4 abaixo).

    3)  Para obter precisão ao medir as magnitudes de galáxias, você
        deve (se possível) fazer suas leituras do céu com uma abertura
        grande. Ela não precisa ser tão grande quanto a abertura
        necessária para incluir toda a galáxia, mas as leituras do céu
        feitas com uma abertura tão pequena quanto a padrão podem ser
        muito imprecisas quando reescaladas para uma abertura grande.

    4)  Para eliminar os efeitos das estrelas incluídas, você deve medir
        individualmente as magnitudes delas e depois removê-las da
        magnitude medida da galáxia. Para fazer isso com precisão, você
        precisará fazer leituras do céu (incluindo o fundo da galáxia)
        na vizinhança imediata de cada estrela. Para isso, use uma
        abertura pequena; provavelmente você terá de fazer conjuntos
        separados de leituras do céu para cada estrela que medir.
        Lembre-se também de que não é possível somar nem subtrair
        magnitudes algebricamente: é preciso usar a fórmula das
        magnitudes: m1 - m2 = -2.5*Log(f1/f2).

Tópicos relacionados:
    Definir o tamanho da abertura
    Estrelas e outras fontes puntiformes
    Fazer leituras do céu

**Registrar as leituras**
Para registrar as medições fotométricas que você fez, selecione
"Arquivo" (File)->"Dados" (Data)->"Registrar/revisar" (Record/Review) no
menu do painel de controle do fotômetro. Aparecerá um painel de dados
com informações sobre o objeto, a hora da observação e as leituras que
você fez. Você pode digitar as anotações ou os comentários que quiser
registrar na caixa rotulada "Comentários" (Remarks). Pressione "OK" para
registrar todos os dados. (Você não precisa preencher a caixa "Tipo
esp." (Sp. Type).)

Normalmente, você não precisa registrar os dados de cada cor (filtro) à
medida que os obtém. Espere até ter medido a estrela (ou o céu) em todas
as cores desejadas. (Cada vez que você registra dados, cria um registro
separado, mesmo que ele contenha dados de uma só cor. Talvez você só
precise fazer isso se exigir uma temporização muito precisa em estudos
de variabilidade.) Note que os registros recebem a data juliana com 6
casas decimais (cerca de 0.1 segundo). Esse é o instante em que foi
concluída a última medição que você fez (independentemente do filtro).

    OBSERVAÇÃO: Registrar suas leituras dessa maneira as salva
    internamente para processamento posterior, mas NÃO as grava em um
    arquivo. Para isso, você deve voltar ao painel de controle do
    observatório e selecionar "Ferramentas" (Tools)->"Editores de
    resultados" (Results Editors)->"Resultados de observação"
    (Observational Results)->"Exibir/imprimir/salvar..."
    (Display/Print/Save...) no menu.

Tópicos relacionados:
    Tópico de ajuda "Editores de resultados" no menu do observatório.

**Voltar à janela do telescópio**
Você deve concluir suas medições fotométricas da estrela em todas as
cores (filtros) necessárias e registrar suas medições antes de voltar à
janela do telescópio. Selecione "Arquivo" (File)->"Sair do fotômetro"
(Exit Photometer) no menu do painel de controle do fotômetro (ou
pressione o botão "X" no canto superior direito). Você será avisado e
terá a chance de cancelar a volta se não tiver registrado todos os dados
que obteve. Quando você voltar à janela do telescópio, seus dados
registrados da estrela com a qual estava trabalhando são colocados em
uma lista na memória, mas não são salvos em um arquivo.

Tópicos relacionados:
    Registrar as leituras
`;
