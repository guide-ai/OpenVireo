// Front PT-HELP [W]: OpenVireo's Brazilian Portuguese (pt-BR) web adaptation of VIREO's CAMHLP.TXT. Not CLEA's text: the original bytes,
// hashes and provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Portuguese chunk.
export const language='pt-BR';
export const sourceName='CAMHLP.TXT';
export const sourceSha256='bf4976da1b1f976613646e10c954b95039e646f3362004cafb242da4572155b8';
export const text=`**Definir a exposição**
Para definir a exposição da câmera:

    1)  Digite um valor (pode ser inteiro ou decimal) na caixa
        "Exposição" (Exposure).

    2)  Coloque o interruptor deslizante em "Segundos" (Seconds) ou em
        "Minutos" (Minutes), conforme necessário.

Tópicos relacionados:
    Fazer uma exposição

**Definir o filtro**
Use o interruptor deslizante de filtros para definir o filtro da
câmera. A posição rotulada "NF" significa "sem filtro".

    NOTA: Devido às limitações de tamanho do arquivo de dados, na câmera
    infravermelha (IR) só está disponível o filtro "J". O controle
    deslizante não se moverá para as posições "H" e "K".

Tópicos relacionados:
    Fazer uma exposição

**Definir o ganho**
O "ganho" é o número de "impactos" de fótons (elétrons) em um pixel do
CCD necessários para registrar 1 unidade na imagem gravada. Você pode
definir o ganho com o interruptor deslizante rotulado "Ganho" (Gain).
Normalmente, você pode deixar o ganho em 1, a menos que seu instrutor
indique outra coisa.

Tópicos relacionados:
    Fazer uma exposição

**Fazer uma exposição**
Para fazer uma exposição com as câmeras CCD e IR:

    1)  Defina o tempo de exposição. Um tempo de exposição de 1-2
        minutos deve ser suficiente para a maioria das atividades.

    2)  Defina o filtro. A menos que haja uma instrução específica em
        contrário, use a opção "NF" (sem filtro) para as imagens CCD e
        o filtro "J" para as imagens IR.

    3)  Deixe o ganho em 1, a menos que haja outra instrução.

    4)  Pressione o botão "Iniciar" (Start). A câmera passará por uma
        inicialização e depois abrirá o obturador para começar a
        exposição. Os indicadores "Status da câmera" (Camera Status) e
        "Temporizador de exposição" (Exposure Timer) mostrarão o
        andamento da exposição. Quando o tempo de exposição indicado for
        atingido, o obturador se fechará e a imagem que você acabou de
        fazer aparecerá na tela. (Você não precisa usar o botão "Parar"
        (Stop), a menos que queira cancelar a exposição porque cometeu
        um erro, como definir uma exposição de 90 minutos quando queria
        90 segundos.)

    5)  Se a imagem for satisfatória (o campo e a exposição estão
        corretos), salve-a para análise.

Tópicos relacionados:
    Definir a exposição
    Definir o filtro
    Definir o ganho
    Exibição da imagem
    Salvar a imagem

**Salvar a imagem**
Para salvar uma imagem que você acabou de fazer, selecione "Arquivo"
(File)->"Salvar imagem" (Save Image) no menu do painel de controle da
câmera. O sistema criará um nome de arquivo, geralmente baseado no ID do
objeto mais próximo do centro do campo. Talvez você queira trocá-lo por
algo relacionado ao exercício que está fazendo ou mais significativo
para você. As imagens são salvas no formato FITS (extensão de arquivo
padrão ".FIT").

    NOTA: Se você fechar a janela de controle da câmera ou iniciar uma
    nova exposição sem salvar a imagem anterior, ela será perdida. Você
    será avisado se tentar fazer isso.

Tópicos relacionados:
    Analisar as imagens

**Analisar as imagens**
Os módulos do VIREO disponíveis para ver e analisar imagens CCD
incluem o módulo de astrometria e o módulo de processamento de imagens
(DS9). Depois de fazer e salvar todas as imagens necessárias, selecione
"Ferramentas" (Tools)->(módulo) no menu do painel de controle do
observatório e carregue as imagens. O módulo de análise deve acessar o
diretório correto; lembre-se de que a extensão de arquivo é ".FIT".

Tópicos relacionados:
    Tópicos de "Ferramentas" no menu "Ajuda" do painel do observatório.

**Parâmetros da câmera**
Para acessar as informações e os parâmetros do detector CCD que você
está usando, selecione "Arquivo" (File)->"Informações..."
(Information...) no menu do painel de controle da câmera.

**Exibição da imagem**

**Fechar a câmera CCD**
Para fechar o painel de controle da câmera CCD e voltar ao painel de
controle do telescópio, selecione "Arquivo" (File)->"Sair da câmera CCD"
(Exit CCD Camera) no menu ou use a caixa "X" no canto superior direito.
Se você não salvou a última imagem que fez, será avisado e terá a
oportunidade de salvá-la. Se você fechar a câmera sem salvar a imagem,
ela será perdida.

Tópicos relacionados:
    Salvar a imagem
`;
