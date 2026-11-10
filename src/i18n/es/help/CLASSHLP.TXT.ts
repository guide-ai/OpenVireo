// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's CLASSHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const language='es-419';
export const sourceName='CLASSHLP.TXT';
export const sourceSha256='9a3a70c11f5cfc024552e6b70db59953b16f40cafeea09a8d06974859a26a3b7';
export const text=`**Cargar espectro**
Para cargar un espectro para clasificarlo:

    1)  Selecciona «Archivo» (File)->«Espectros desconocidos» (Unknown
        Spectra) en el menú de la ventana de clasificación.

    2)  Elige una opción del submenú que aparece:

        «Espectros guardados (*.CSP...)» (Saved Spectra (*.CSP...))
            Elige de una lista de espectros tomados y guardados para
            clasificarlos como parte de este ejercicio. Para
            seleccionar, haz doble clic en el nombre del archivo o
            mueve el cursor al nombre del archivo y presiona «Abrir»
            (Open).

        «Lista de programa» (Program List)
            Elige de una lista de estrellas del programa para este
            ejercicio. Normalmente comenzarás con la primera estrella
            de la lista. Para seleccionar una estrella de la lista,
            haz doble clic en el ID de la estrella o mueve el cursor a
            la estrella deseada y selecciona «Archivo»->«Abrir
            selección» (Open Selection) en el menú.

        «Siguiente en la lista» (Next On List)
            Carga el siguiente espectro de la lista del programa sin
            mostrar la lista. («Lista de programa» debe haberse
            seleccionado antes).

El espectro seleccionado se carga y se muestra en el centro del área
de visualización de espectros.

**Cargar espectros estándar**
Para cargar espectros estándar para compararlos:

    1)  Selecciona «Archivo» (File)->«Atlas de espectros estándar...»
        (Atlas of Standard Spectra...) en el menú de la ventana de
        clasificación.

    2)  Elige un atlas de la lista que aparece. Normalmente comenzarás
        con la secuencia principal para establecer una clase de
        temperatura antes de considerar la luminosidad. Para
        seleccionar, haz doble clic en la descripción del atlas o
        mueve el cursor al atlas deseado y selecciona
        «Archivo»->«Abrir selección» (Open Selection) en el menú.

    3)  La lista de estándares del atlas aparecerá en el panel verde
        azulado «Estándares» (Standards), a la derecha de la ventana
        de clasificación. Observa que el espectro resaltado se
        muestra arriba del desconocido en el área de visualización,
        mientras que la siguiente entrada del atlas se muestra debajo
        del desconocido.

    4)  Usa las teclas de flecha o haz clic en las entradas de la
        lista de estándares para recorrer el atlas. Observa los
        cambios progresivos de los espectros a medida que cambia la
        temperatura estelar. Busca en el atlas un espectro que
        coincida lo más posible con el desconocido. Puede que tengas
        que revisar la luminosidad (cargar otro atlas) para obtener la
        coincidencia más cercana.

**Medir y marcar rasgos espectrales**
Para medir la longitud de onda y la intensidad de un rasgo espectral:

    Con el cursor sobre la pantalla del espectro, mantén presionado el
    botón izquierdo del mouse: el cursor cambia de una flecha a una
    cruz. Al mover el cursor dentro del área de visualización del
    espectro, la lectura de la longitud de onda y de la intensidad
    relativa en el cursor se muestra en la parte inferior de la
    ventana. Cuando hayas colocado el cursor en el punto que quieres
    medir, suelta el botón del mouse. Las lecturas no cambiarán hasta
    que vuelvas a presionar el botón izquierdo del mouse.

        NOTA:  Si el espectro se muestra como una traza de intensidad
        (consulta el tema de ayuda «Configurar visualización»), la
        posición vertical (coordenada Y) del cursor determina la
        medición de la intensidad. Si la pantalla está en modo «Foto»
        (Photo), se muestra la intensidad «bajo» el cursor (en la
        coordenada horizontal o X).

    Cuando sueltas el botón del mouse, el cursor vuelve a su forma
    normal y la posición medida se marca en la pantalla con una línea
    roja vertical que cruza los espectros desconocido y estándar en la
    posición de la longitud de onda. Una pequeña línea horizontal
    indica la posición de la intensidad. También puedes marcar una
    línea haciendo doble clic en su entrada de la tabla de líneas
    espectrales. Puedes «afinar» la posición de las líneas con las
    teclas de flecha del teclado numérico (ver abajo).

    -Acceso con el teclado-
    Las teclas de flecha del teclado numérico (teclas «2», «4», «6»,
    «8») se pueden usar para colocar las líneas de medición en lugar
    del mouse. NumLock debe estar «activado» y MouseKeys
    «desactivado». (Si usas MouseKeys, configura tu sistema para que
    MouseKeys se active cuando NumLock esté «desactivado»). Si las
    líneas de medición no se ven, presiona la tecla de flecha derecha
    («6») y las líneas aparecerán desde la izquierda de la pantalla.

Temas relacionados:
    Tabla de líneas espectrales y ayuda
    Configurar visualización

**Controles**
Los siguientes controles están en el lado derecho de la ventana de
clasificación:

    «Acercar» (Zoom In) (punta de flecha hacia arriba):
        Amplía los espectros mostrados por un factor de 2, hasta un
        máximo de 16 veces la visualización original. Si hay un rasgo
        marcado, el zoom intenta centrarlo en la visualización
        ampliada. Si no hay ninguna línea marcada, la longitud de onda
        del centro de la visualización sigue siendo la misma.

    «Alejar» (Zoom Out) (punta de flecha hacia abajo):
        Disminuye la ampliación de los espectros mostrados por un
        factor de 2, hasta la ampliación original (1X). Si hay una
        línea marcada, el zoom intenta mantenerla centrada en la
        visualización.

    Flechas de desplazamiento (puntas de flecha izquierda y derecha):
        Usa los controles de flecha izquierda y derecha para recorrer
        los espectros ampliados.

    Botón «Restablecer» (Reset):
        Devuelve la visualización a las imágenes originales (1X).

**Tabla de líneas espectrales y ayuda**
La tabla de líneas espectrales ayuda a identificar rasgos espectrales
por longitud de onda e incluye una función de ayuda que da información
sobre el significado y el uso de cada línea tabulada en la
clasificación de espectros estelares.

Para cargar la tabla de líneas espectrales, selecciona «Archivo»
(File)->«Tabla de líneas espectrales» (Spectral Line Table) en el menú
de clasificación. Cuando aparezca la tabla, puedes moverla a un lugar
conveniente de la pantalla. (Coloca el cursor en la barra de título de
la parte superior. Mantén presionado el botón izquierdo del mouse y
arrastra la ventana).

Características de la tabla de líneas espectrales:

    -Seguimiento del cursor-
        Cuando se mantiene presionado el botón izquierdo del mouse con
        el cursor en cualquier parte de la pantalla del espectro, se
        resalta en la tabla de líneas espectrales la entrada con la
        longitud de onda más cercana a la posición del cursor. La
        tabla se desplaza para seguir al cursor cuando se mueve el
        mouse con el botón izquierdo presionado.

            PRECAUCIÓN: Hay que usar el buen juicio al aceptar las
            identificaciones de líneas de la tabla, ya que la longitud
            de onda es el único criterio: no se tienen en cuenta la
            temperatura, la luminosidad, etc. Por ejemplo, las líneas
            de hierro (Fe) no aparecen en estrellas de tipo temprano,
            las líneas de helio (He) no aparecen en estrellas de tipo
            tardío, etc.

    -Marcar la posición de la línea-
        Al hacer clic con el botón izquierdo del mouse en una entrada
        de la tabla de líneas espectrales, se resalta la entrada y la
        posición de la línea se marca en la pantalla del espectro.

    -Ayuda-
        Cuando se hace doble clic con el botón izquierdo del mouse en
        una entrada de la tabla de líneas espectrales, se resalta la
        entrada, se marca la línea como arriba y aparece una ventana
        de ayuda con información sobre la línea seleccionada. Una vez
        abierta, la ventana de ayuda seguirá «rastreando» las
        selecciones de la tabla (sin hacer doble clic) hasta que se
        cierre.

Temas relacionados:
    Medir y marcar rasgos espectrales

**Configurar visualización**
Las opciones que afectan la apariencia y el funcionamiento de la
ventana de clasificación están disponibles en la selección de menú
«Archivo» (File)->«Ver» (Display).

    «Archivo»->«Ver»
        Fija el formato de la visualización del espectro. Están
        disponibles las siguientes opciones:

        «Mostrar diferencia (Est - Desc)»
        (Show Difference (Std - Unkn))
            Cuando se selecciona esta opción, el espectro estándar
            inferior se reemplaza por una visualización que muestra la
            diferencia punto por punto entre el espectro estándar
            superior y el desconocido. Es una ayuda muy útil para la
            clasificación espectral.

        «Traza de intensidad» (Intensity Trace)
            Muestra los espectros como gráficas de intensidad relativa
            frente a longitud de onda (predeterminado).

        «Escala de grises "Foto"» (Grayscale "Photo")
            Convierte las intensidades relativas en niveles de gris
            para imitar una imagen fotográfica (positiva).

        «Comb. (Foto y traza)» (Comb. (Photo & Trace))
            Muestra el desconocido en ambos modos. Un estándar se
            muestra como «Foto».

        «Invertir pantallas en escala de grises»
        (Reverse Grayscale Displays)
            Invierte la conversión de intensidades a niveles de gris
            para imitar una imagen fotográfica negativa.


**Medir anchos equivalentes**
El «ancho equivalente» de una línea espectral es una cantidad
calculada que mide con precisión la intensidad de la línea. Si
intentas clasificar un espectro estelar con mucha exactitud y no estás
seguro de las intensidades relativas de rasgos importantes, la
medición del ancho equivalente puede ayudarte. Para medir el ancho
equivalente de un rasgo espectral:

    1)  Acerca la visualización hasta un aumento que permita
        identificar y marcar con claridad los «hombros» de la línea.

    2)  Selecciona «Ancho equivalente de la línea...» (Line Equivalent
        Width...) en el menú de clasificación. Aparecerá un cuadro con
        instrucciones para completar el proceso de cálculo del ancho
        equivalente (un resumen de los pasos 3 a 5 siguientes).

    3)  Marca el centro aproximado de la línea en la pantalla del
        espectro con el botón izquierdo del mouse, ya sea en la
        pantalla misma o en la entrada de la línea en la tabla.

    4)  Marca la longitud de onda y la intensidad de ambos hombros de
        la línea haciendo clic con el botón derecho del mouse, con el
        cursor en cada hombro por turno. La posición vertical del
        cursor debe indicar el nivel del continuo a cada lado de la
        línea. Si lo hiciste correctamente, los extremos de la línea
        quedarán delimitados por un cuadro azul, con el marcador rojo
        de posición de la línea pasando por algún punto cerca de su
        centro. Si quieres cambiar una posición, simplemente mueve el
        cursor a la nueva posición y haz clic de nuevo con el botón
        derecho. También puedes volver a colocar el marcador del
        centro de la línea haciendo clic con el botón izquierdo.

    5)  Cuando el rasgo esté correctamente delimitado, presiona
        «Aceptar» (OK) en el cuadro de instrucciones. Se mostrarán el
        ancho equivalente calculado, así como las longitudes de onda y
        las intensidades en el centro marcado de la línea y en los
        hombros.

Temas relacionados:
    Medir y marcar rasgos espectrales
    Tabla de líneas espectrales y ayuda

**Guardar, revisar y analizar resultados**
Cuando hayas clasificado un espectro a tu satisfacción, selecciona
«Resultados de clasificación» (Classification Results) en el menú y
registra tu clasificación en el cuadro llamado «Tipo esp.» (Sp. Type)
del formulario que aparece. También puedes anotar cualquier
incertidumbre o rasgo inusual del espectro en el cuadro «Comentarios»
(Remarks). Cuando presionas «Aceptar» (OK), la información que
escribiste se coloca en una lista, pero no se guarda en un archivo.
Para revisar, imprimir o guardar tus resultados en un archivo,
selecciona «Herramientas» (Tools)->«Editores de resultados» (Results
Editors)->«Resultados de observación» (Observational Results)->
«Mostrar/imprimir/guardar» (Display/Print/Save) en el menú del panel
de control del observatorio.

Temas relacionados:
    «Editores de resultados» en el menú «Ayuda» del panel de control
    del observatorio.

**Fijar rango de longitudes de onda**
Puedes cambiar el rango de longitudes de onda visible en la ventana de
clasificación, dentro del rango máximo de 3500 a 7400 angstroms. Para
cambiar el rango de longitudes de onda, selecciona «Archivo»
(File)->«Ver» (Display)->«Rango espectral» (Spectral Range) en el menú
del panel de control de clasificación. Usa los controles deslizantes
para cambiar los valores mínimo y/o máximo. El botón «Predeterminado»
(Default) devuelve los valores al rango óptimo para la clasificación
espectral. Ten en cuenta que si amplías el rango, puedes exceder los
límites del espectro que estás clasificando.

**Cerrar la ventana de clasificación**
Para cerrar la ventana de clasificación y volver al panel de control
del observatorio, selecciona «Archivo» (File)->«Salir de Clasificar
espectros» (Exit Classify Spectra) en el menú, o presiona el cuadro
«X» de la esquina superior derecha.
`;
