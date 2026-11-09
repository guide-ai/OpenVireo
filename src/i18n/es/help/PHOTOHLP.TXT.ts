// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's PHOTOHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const sourceName='PHOTOHLP.TXT';
export const sourceSha256='aaf7f6827f418cf1aa1e2da70185b96ecf96ffd919899d84547a8695afa42d8a';
export const text=`**Fijar el filtro**
Usa el control deslizante «Filtro» (Filter) del panel de control del
fotómetro para fijar el filtro activo. Debes tomar una lectura de cielo
con cada filtro antes de poder usarlo para medir magnitudes estelares.

Temas relacionados:
    Tomar lecturas de cielo
    Interruptores deslizantes

**Fijar los segundos de integración**
Usa el control deslizante rotulado «Segundos» (Seconds) del panel de
control del fotómetro para fijar la duración de cada integración (el
tiempo durante el cual se acumulan las cuentas de fotones cuando se toma
una lectura). Las opciones van de 0.1 segundo a 100 segundos, en
factores de 10.

Temas relacionados:
    Fijar el número de integraciones
    Tomar lecturas fotométricas
    Interruptores deslizantes

**Fijar el número de integraciones**
Usa el control deslizante rotulado «Integraciones» (Integrations) del
panel de control del fotómetro para fijar el número de integraciones que
forman una lectura completa. Las opciones van de 1 a 5.

Temas relacionados:
    Fijar los segundos de integración
    Tomar lecturas fotométricas
    Interruptores deslizantes

**Fijar el tamaño de la apertura**
Para fijar el tamaño de la apertura del fotómetro, selecciona
«Apertura» (Aperture) en el menú del panel de control del fotómetro.
Aparecerá un cuadro de control pequeño con un control deslizante que
sirve para cambiar el tamaño de la apertura. El botón rotulado
«Predeterminado» (Default) devuelve la apertura a su tamaño
predeterminado. Debes usar el tamaño de apertura predeterminado siempre
que sea posible. Algunas situaciones en las que podrías necesitar
cambiar la apertura son:

    1)  Un objeto extendido, como una galaxia, es demasiado grande para
        caber en la apertura predeterminada.

    2)  Las estrellas de un cúmulo están tan cerca unas de otras que se
        necesita una apertura más pequeña para aislar estrellas
        individuales y evitar la contaminación de las lecturas.

    3)  Puedes obtener lecturas de cielo más precisas con tiempos de
        integración más cortos si usas una apertura más grande. Si lo
        haces, asegúrate de que no haya estrellas en la apertura que
        contaminen las lecturas de cielo.

    NOTA: Si cambias el tamaño de la apertura después de tomar lecturas
    de cielo, las cuentas medias de cielo por segundo se escalarán
    automáticamente al nuevo tamaño de apertura para determinar las
    magnitudes.

Temas relacionados:
    Galaxias y otras fuentes extendidas
    Tomar lecturas de cielo

**Fijar el tipo de lectura**
El interruptor «Lectura» (Reading) del panel de control del fotómetro
sirve para especificar cómo se interpreta y se registra la lectura.
Comprueba que este interruptor esté en la posición correcta antes de
presionar el botón «Iniciar» (Start) para comenzar una lectura. Si tomas
una lectura de una estrella u otro objeto con el interruptor «Lectura»
en «Cielo» (Sky), reemplazarás tu lectura de cielo actual
(presumiblemente correcta) por una no válida que incluye el objeto. Si
esto ocurre, tendrás que alejarte del objeto y tomar una lectura de
cielo válida antes de continuar.

    NOTA: Es posible que el interruptor «Lectura» no aparezca en el
    panel de control del fotómetro en el ejercicio «Fotometría
    fotoeléctrica de cúmulos» (Photoelectric Photometry of Clusters).
    En ese caso, el programa detecta automáticamente la presencia o
    ausencia de un objeto en la apertura y procesa la lectura en
    consecuencia.

**Tomar lecturas de cielo**
Debes tomar una lectura de cielo a través de cada filtro antes de poder
medir el brillo de los objetos a través de ese filtro. Un conjunto de
lecturas de cielo es suficiente mientras sigas usando el mismo
telescopio. Si cambias de telescopio, debes tomar un conjunto nuevo de
lecturas de cielo, incluso si vuelves a un telescopio que ya usaste.
Toma las lecturas de cielo de la siguiente manera:

    1)  Desde el panel de control del telescopio, asegúrate de que la
        vista esté en «Telescopio» (Telescope) y usa los botones «NSEW»
        para colocar el telescopio de modo que no haya ninguna estrella
        dentro del círculo rojo de la apertura ni justo al lado de él.
        Si hay suficiente cielo despejado en el encuadre, puedes
        aumentar la precisión de tus mediciones del cielo aumentando el
        tamaño de la apertura.

    2)  Accede a los controles del fotómetro o vuelve a ellos. Si el
        interruptor «Lectura» (Reading) está visible, asegúrate de que
        esté en «Cielo» (Sky). Si no aparece ningún interruptor
        «Lectura», el cuadro rotulado «Objeto» (Object) debería decir
        «Cielo» si el telescopio está bien colocado, .

    3)  Pon el filtro en el color deseado. (Si ya se tomó una lectura de
        cielo con un filtro determinado, el cuadro rotulado «Cielo
        medio» (Mean Sky) contendrá las cuentas medias de cielo por
        segundo de ese filtro. De lo contrario, el dato indicará
        «¡SIN CIELO!» (NO SKY!).)

    4)  Fija el tiempo de integración en 10 segundos y el número de
        integraciones en 5.

    5)  Presiona «Iniciar» (Start) y espera a que aparezcan las
        lecturas. Verás las cuentas en bruto a medida que se completa
        cada integración. Cuando la lectura esté completada, la cuenta
        media de cielo en ese color aparecerá en el cuadro rotulado
        «Cuentas medias de cielo/s» (Mean Sky Counts/Sec).

    6)  Repite el procedimiento con cada filtro que vayas a usar.

    7)  Selecciona «Archivo» (File)->«Datos» (Data)->«Registrar/Revisar»
        (Record/Review) en el menú del fotómetro para guardar las
        lecturas de cielo. (Es posible que no necesites hacerlo si el
        programa está configurado para calcular automáticamente las
        magnitudes estelares por ti. Si calculas tú las magnitudes a
        partir de las cuentas de fotones, DEBES registrar las lecturas
        de cielo.)

Temas relacionados:
    Fijar el tamaño de la apertura
    Fijar el tipo de lectura
    Otros temas de ayuda en «Usar el fotómetro».

**Estrellas y otras fuentes puntuales**
Debes tomar lecturas de cielo antes de poder tomar mediciones
fotométricas de estrellas y otros objetos. Cuando hayas completado las
mediciones del cielo, toma lecturas fotométricas de fuentes puntuales de
la siguiente manera:

    1)  Desde el panel de control del telescopio, centra aproximadamente
        la estrella en el cuadrado rojo de la vista «Buscador» (Finder).
        Cambia a la vista «Telescopio» (Telescope) y centra con
        precisión la estrella en el círculo rojo de la apertura. (La
        apertura debe estar en el tamaño predeterminado.) Si la estrella
        tiene una compañera cercana, asegúrate de mantener la compañera
        fuera del círculo de la apertura. En ese caso, es posible que la
        estrella que estás midiendo no quede bien centrada. Otra opción
        es usar una apertura más pequeña para evitar la contaminación de
        la estrella cercana.

    2)  Vuelve al panel de control del fotómetro. ASEGÚRATE de que el
        interruptor «Lectura» (Reading) esté en «Objeto» (Object). Si el
        interruptor «Lectura» no aparece, el cuadro rotulado «Objeto»
        puede contener alguna identificación de la estrella u otro
        objeto que estás midiendo. No debe decir «Cielo» (Sky).

    3)  Pon el filtro en el color deseado. (Si el cuadro «Cuentas medias
        de cielo» (Mean Sky Counts) indica «¡SIN CIELO!» (NO SKY!), no
        puedes tomar una medición en ese color. Vuelve a los controles
        del telescopio, saca la estrella del círculo rojo de la
        apertura, vuelve a los controles del fotómetro y toma la lectura
        de cielo.)

    4)  Fija el tiempo de integración y el número de integraciones
        deseados. (Quizá sea necesario algo de prueba y error;
        consulta el paso 5 más abajo.)

    5)  Presiona el botón «Iniciar» (Start) de la integración y espera a
        que aparezcan las lecturas. Verás las cuentas en bruto a medida
        que se completa cada integración. Cuando la lectura esté
        completada, las cuentas medias por segundo, la relación
        señal/ruido (S/N) y la magnitud calculada aparecerán en los
        cuadros rotulados. Para obtener la mayor precisión, tus lecturas
        deben reflejar relaciones señal/ruido de 100 o más. Si obtienes
        una S/N menor, debes aumentar el tiempo de integración, el
        número de integraciones o ambos, y tomar una lectura nueva (no
        registres la anterior). (Si tu S/N es REALMENTE baja, quizá
        necesites usar un telescopio más grande para obtener una
        fotometría precisa.) Si tu S/N es muy alta (> ~500), quizá
        quieras reducir el tiempo de integración, el número de
        integraciones o ambos en las siguientes estrellas de magnitud
        parecida, para ahorrar tiempo.

    6)  Repite las lecturas con cada filtro que estés usando. Ten en
        cuenta que la mayoría de las estrellas se ven más débiles en el
        azul (B), y más débiles aún en el ultravioleta (U), que en el
        visual (V). Esto se debe a los efectos combinados de la
        temperatura estelar y el enrojecimiento interestelar. Quizá
        tengas que aumentar el tiempo de integración y el número de
        integraciones; revisa siempre la relación señal/ruido.

    7)  Selecciona «Archivo» (File)->«Datos» (Data)->«Registrar/Revisar»
        (Record/Review) en el menú para guardar las lecturas
        fotométricas. ¡SI VUELVES A LA PANTALLA PRINCIPAL SIN REGISTRAR
        LAS LECTURAS, LAS PERDERÁS Y TENDRÁS QUE REPETIR LAS
        MEDICIONES!

Temas relacionados:
    Fijar el tamaño de la apertura
    Fijar el tipo de lectura
    Otros temas de ayuda en «Usar el fotómetro».
    Temas del menú «Ayuda» del panel de control del telescopio.

**Galaxias y otras fuentes extendidas**
En general, la técnica para tomar mediciones fotométricas de galaxias y
otras fuentes extendidas es la misma que para las estrellas, salvo que
en el caso de las galaxias debes fijar la apertura lo bastante grande
para abarcar todo el objeto. Esto trae varias complicaciones:

    1)  La extensión real de una galaxia puede ser bastante mayor de lo
        que parece, de modo que las lecturas de magnitud pueden depender
        del tamaño de la apertura, aunque la apertura más pequeña
        parezca contener toda la imagen.

    2)  En las galaxias grandes, puede ser imposible incluir todo el
        objeto en la apertura sin incluir varias estrellas cercanas, lo
        que obviamente afectará la lectura. Las lecturas pueden
        corregirse, pero el proceso es algo tedioso (consulta el n.º 4
        más abajo).

    3)  Para lograr precisión al medir las magnitudes de galaxias,
        debes (si es posible) tomar tus lecturas de cielo con una
        apertura grande. No tiene que ser tan grande como la apertura
        necesaria para incluir toda la galaxia, pero las lecturas de
        cielo tomadas con una apertura tan pequeña como la
        predeterminada pueden ser muy imprecisas al escalarlas a una
        apertura grande.

    4)  Para eliminar los efectos de las estrellas incluidas, debes
        medir sus magnitudes una por una y luego quitarlas de la
        magnitud medida de la galaxia. Para hacerlo con precisión,
        necesitarás tomar lecturas de cielo (que incluyan el fondo de la
        galaxia) en la vecindad inmediata de cada estrella. Para esto
        debes usar una apertura pequeña, y probablemente tendrás que
        tomar conjuntos separados de lecturas de cielo para cada
        estrella que midas. Recuerda también que no puedes sumar ni
        restar magnitudes algebraicamente, sino que debes usar la
        fórmula de las magnitudes: m1 - m2 = -2.5*Log(f1/f2).

Temas relacionados:
    Fijar el tamaño de la apertura
    Estrellas y otras fuentes puntuales
    Tomar lecturas de cielo

**Registrar las lecturas**
Para registrar las mediciones fotométricas que tomaste, selecciona
«Archivo» (File)->«Datos» (Data)->«Registrar/Revisar» (Record/Review) en
el menú del panel de control del fotómetro. Aparecerá un panel de datos
con información sobre el objeto, la hora de la observación y las
lecturas que tomaste. Puedes escribir las notas o los comentarios que
quieras registrar en el cuadro rotulado «Comentarios» (Remarks).
Presiona «Aceptar» (OK) para registrar todos los datos. (No necesitas
escribir nada en el cuadro «Tipo esp.» (Sp. Type).)

Normalmente no necesitas registrar los datos de cada color (filtro) a
medida que los tomas. Espera hasta haber medido la estrella (o el cielo)
en todos los colores deseados. (Cada vez que registras datos creas un
registro separado, aunque contenga datos de un solo color. Solo podrías
necesitar hacerlo si requieres una temporización muy precisa para
estudios de variabilidad.) Ten en cuenta que los registros llevan la
fecha juliana con 6 decimales (alrededor de 0.1 segundo). Es la hora en
que se completó la última medición que tomaste (sin importar el filtro).

    NOTA: Registrar tus lecturas de esta manera las guarda internamente
    para su procesamiento posterior, pero NO las escribe en un archivo.
    Para hacerlo, debes volver al panel de control del observatorio y
    seleccionar «Herramientas» (Tools)->«Editores de resultados»
    (Results Editors)->«Resultados de observación» (Observational
    Results)->«Mostrar/imprimir/guardar...» (Display/Print/Save...) en
    el menú.

Temas relacionados:
    Tema de ayuda «Editores de resultados» del menú del observatorio.

**Volver a la ventana del telescopio**
Debes completar tus mediciones fotométricas de la estrella en todos los
colores (filtros) necesarios y registrar tus mediciones antes de volver
a la ventana del telescopio. Selecciona «Archivo» (File)->«Salir del
fotómetro» (Exit Photometer) en el menú del panel de control del
fotómetro (o presiona el botón «X» de la esquina superior derecha). Se
te advertirá y tendrás la oportunidad de cancelar el regreso si no
registraste todos los datos que tomaste. Cuando vuelvas a la ventana del
telescopio, tus datos registrados de la estrella con la que estuviste
trabajando se colocan en una lista en la memoria, pero no se guardan en
un archivo.

Temas relacionados:
    Registrar las lecturas
`;
