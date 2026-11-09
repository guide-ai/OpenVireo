// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's PULSRANL.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const sourceName='PULSRANL.TXT';
export const sourceSha256='9d1cb3ff7daf80cc79f9a97f0b8f13a740b41f7162ba46f3d0cb31e8ac851bf4';
export const text=`**Cargar datos de púlsares registrados**
Para cargar en la ventana de análisis de datos los datos de púlsares
registrados y guardados, selecciona «Archivo» (File)->«Cargar...»
(Load...) en el menú de análisis de datos y selecciona el archivo con
el cuadro de diálogo que aparece.  Los archivos que contienen datos de
púlsares registrados deben llevar el calificador ".PLR".

NOTA: Si accedes a la ventana de análisis de datos inmediatamente
después de registrar datos de púlsares, los últimos datos registrados
aparecerán automáticamente en la ventana de análisis de datos,
independientemente de si se han guardado o no.

**Guardar datos de púlsares registrados**
Para guardar los datos de púlsares actuales, selecciona «Archivo»
(File)->«Guardar...» (Save...) en el menú de análisis de datos.
Aparecerá un cuadro de diálogo que te permite escribir o seleccionar un
nombre para el archivo guardado.  Puedes usar el nombre que quieras; el
cuadro de diálogo sugerirá un nombre generado a partir de tus datos de
inicio de sesión.  Siempre debes usar el calificador ".PLR" en estos
archivos para evitar dificultades y confusión más adelante.

También puedes guardar los datos de púlsares actuales seleccionando
«Archivo»->«Guardar datos registrados...» (Save Recorded Data...) en el
menú principal.

**Ver las propiedades de los datos**
Para acceder a un cuadro de diálogo que muestra las propiedades de los
datos de púlsares actuales, selecciona «Archivo» (File)->
«Propiedades...» (Properties...) en el menú de análisis de datos.  Las
propiedades que muestra el cuadro de diálogo resultante incluyen:

    Identificación del objeto
    Hora de inicio de los datos (número del día juliano menos 2,400,000)
    Apertura del telescopio (metros)
    Frecuencia (MHz) y ganancia relativa de cada receptor registrado
    Número de puntos de datos (de cada receptor registrado)
    Intervalo de tiempo (ms) entre puntos de datos
    Nombre del archivo

El cuadro de diálogo de propiedades también aparece automáticamente al
cargar datos.  No puedes cambiar ninguna de las propiedades mostradas,
porque reflejan información sobre datos que ya se guardaron.

**Controles**
Los siguientes controles aparecen en el lado derecho de la ventana de
análisis de datos:

    Escala vertical - Usa los botones de escala vertical para ajustar la
    escala de cada panel de visualización.  La escala puede variar en
    factores de 2 desde un mínimo de 0.125 hasta un máximo de 8.  (Un
    factor de escala de 1 muestra los datos exactamente como se
    registraron).  Este factor afecta solo la visualización y no altera
    los datos subyacentes.

    Desplazamiento horizontal - Usa las flechas de desplazamiento
    horizontal izquierda y derecha para variar el intervalo de datos
    registrados que se muestra en los paneles.  El intervalo mostrado
    (en segundos desde el comienzo de los datos) se indica con las
    lecturas de la izquierda y de la derecha debajo de los paneles de
    visualización.

    Velocidad de desplazamiento - El control de velocidad de
    desplazamiento modifica la rapidez del desplazamiento horizontal.

    Zoom horizontal - Usa los controles de zoom «In» y «Out» para
    ampliar o comprimir el intervalo de datos registrados que se muestra
    en los paneles.  El factor de zoom tiene un rango de 0.125 a 8 en
    factores de 2.  (Un factor de zoom de 1 muestra los datos
    exactamente como se registraron).  El intervalo mostrado (en
    segundos desde el comienzo de los datos) se indica con las lecturas
    de la izquierda y de la derecha debajo de los paneles de
    visualización.
 
    Restablecer (Reset) - Al presionar el botón «Restablecer», la escala
    vertical de todos los paneles vuelve a 1, el factor de zoom a 1 y la
    velocidad de desplazamiento a 2.  Las pantallas vuelven al comienzo
    de los datos, y se borran todos los cursores y sus lecturas.

**Hacer mediciones**
Las posiciones pueden medirse en los paneles de visualización
presionando y arrastrando con el mouse.  El botón derecho del mouse
controla un cursor de «referencia» que aparece en la misma posición en
los tres paneles.  La lectura verde debajo de los paneles da la
posición del cursor de referencia en segundos desde el comienzo de los
datos.

El botón izquierdo del mouse controla un cursor vertical y uno
horizontal para cada panel.  A la derecha de cada panel están las
lecturas de los cursores de ese panel.  La posición del cursor
vertical (lectura de color cian) se da en segundos desde el comienzo
del archivo.  La posición del cursor horizontal (lectura de color
magenta) es un indicador de intensidad relativa que incluye tanto el
factor de escala vertical del panel de visualización como la ganancia
relativa aplicada cuando se registraron los datos (consulta el tema de
ayuda «Ver las propiedades de los datos»).  Para cambiar el botón
izquierdo del mouse entre cursores verticales y horizontales de cada
panel, haz clic con el mouse sobre la lectura correspondiente.

Ampliar la pantalla horizontalmente (zoom «In») puede ayudar a
determinar y medir con exactitud las posiciones de los pulsos.

**Registrar mediciones**
Usa el siguiente procedimiento para registrar tus mediciones:

    1) Haz mediciones colocando el cursor o los cursores como se
    describe en el tema de ayuda «Hacer mediciones».  Puedes hacer
    mediciones en todos los paneles de visualización activos a la vez
    si lo deseas.

    2) Selecciona «Resultados» (Results)->«Registrar las mediciones
    actuales...» (Record Current Measurements...) en el menú de
    análisis de datos.

    3) Aparecerá una serie de cuadros de diálogo que muestran las
    mediciones y propiedades que se van a registrar para cada panel
    que tenga mediciones sin registrar.  Puedes agregar un comentario
    a cada registro de medición si lo deseas.  Selecciona «Aceptar»
    (OK) para registrar la medición, o «Cancelar» (Cancel) para
    omitirla por ahora.

Cada medición que registres se agregará al final de la lista de
mediciones actual.  Consulta los temas de ayuda «Revisar las mediciones
registradas», «Guardar las mediciones registradas» y «Borrar la lista
de mediciones» para obtener información sobre cómo manejar los
registros de esta lista.

**Revisar las mediciones registradas**
Puedes revisar la lista actual de mediciones registradas en cualquier
momento, una vez que hayas comenzado a registrar mediciones.
Selecciona «Resultados» (Results)->«Revisar las mediciones
registradas...» (Review Recorded Measurements...) en el menú de
análisis de datos.  Aparecerá un cuadro de diálogo con todos los
registros actuales.  Para seleccionar un registro en particular, haz
clic en él con el mouse.  Puedes buscar los registros que contengan una
cadena de texto particular (selecciona «Buscar...» (Find...)).  Una vez
que hayas seleccionado un registro, puedes verlo y editar su campo de
comentario (selecciona «Editar...» (Edit...)), o eliminarlo de la
lista (selecciona «Eliminar» (Delete)).

Cuando termines de revisar los registros, selecciona «Aceptar» (OK) o
«Cancelar» (Cancel).  Los cambios que hayas hecho a los registros de la
lista (ediciones o eliminaciones) se descartarán si seleccionas
«Cancelar».

**Guardar las mediciones registradas**
Para guardar en un archivo tu lista actual de mediciones registradas,
selecciona «Resultados» (Results)->«Guardar las mediciones
registradas...» (Save Recorded Measurements...) en el menú de análisis
de datos.  Indica un nombre de archivo en el cuadro de diálogo que
aparece.  Los datos se guardan en un formato (valores separados por
comas) que aceptan los programas de hoja de cálculo estándar.  Debes
usar el calificador ".CSV" en cualquier archivo que crees aquí.
(Consulta el tema de ayuda «Acceder al programa de hoja de cálculo»).

Si seleccionas un nombre de archivo que ya existe, sobrescribirás los
datos existentes.  Se te advertirá de esto y tendrás la oportunidad de
cambiar tu selección si no es lo que querías.  (Consulta el tema de
ayuda «Borrar la lista de mediciones»).

**Borrar la lista de mediciones**
Normalmente la lista actual de mediciones permanece intacta, incluso
cuando se guarda en un archivo, y las nuevas mediciones se agregan al
final.  (Esto significa que puedes guardar un archivo, agregar más
mediciones y volver a guardar en el mismo archivo sin perder datos).
Si quieres crear una lista de mediciones nueva, sin registros
anteriores, selecciona «Resultados» (Results)->«Borrar la lista de
mediciones» (Clear Measurement List) en el menú de análisis de datos.

**Acceder al programa de hoja de cálculo**
Es posible que puedas acceder a un programa de hoja de cálculo para
analizar tus datos directamente desde este ejercicio.  Si la opción
está habilitada, selecciona «Resultados» (Results)->«Hoja de cálculo»
(Spreadsheet) en el menú de análisis de datos.  Si guardaste
recientemente un archivo para usarlo en la hoja de cálculo (consulta el
tema de ayuda «Guardar las mediciones registradas»), ese archivo se
cargará automáticamente cuando se abra el programa de hoja de cálculo.
Si quieres cargar tú mismo un archivo en la hoja de cálculo, recuerda
que el tipo de archivo es ".CSV".  Puede aparecer bajo el encabezado
«Archivos de texto» en el cuadro de diálogo de carga de archivos de la
hoja de cálculo.

**Imprimir la imagen de la pantalla**
La opción «Archivo» (File)->«Imprimir pantalla...» (Print Screen...) del
menú de análisis de datos te permite imprimir en cualquier momento una
imagen de la ventana de análisis de datos.  Esta imagen mostrará todos
los cursores en sus posiciones actuales y las lecturas con sus valores
actuales.  Esta función usa el servicio de impresión de Windows e
imprimirá en color si se selecciona una impresora a color.  La
impresión incluirá los nombres de inicio de sesión para la
identificación y las propiedades actuales de los datos.

**Cerrar la ventana de análisis de datos**
Para cerrar la ventana de análisis de datos y volver a la ventana
principal, selecciona «Archivo» (File)->«Salir» (Exit) en el menú de
análisis de datos, selecciona «Cerrar» (Close) en el menú del sistema
(haz clic en la casilla de la esquina superior izquierda), o haz clic en
la casilla «X» de la esquina superior derecha (solo en Windows 95).
`;
