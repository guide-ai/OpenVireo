// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's PULSRHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const language='es-419';
export const sourceName='PULSRHLP.TXT';
export const sourceSha256='3a6b8e727be8340095a284ad8dbe4e075613b2d081d83e93537a901a6c8377fc';
export const text=`**Controles del radiotelescopio**
Los siguientes botones se usan para operar el radiotelescopio.  Están
ubicados en el panel de control del telescopio.  Según los ajustes que
haya elegido tu instructor, el movimiento puede estar limitado por el
horizonte local y posiblemente por otras limitaciones del telescopio.

    «Seguimiento» (Tracking) - Este botón activa el seguimiento
    sidéreo, que permite que el telescopio permanezca apuntado a un
    punto particular del cielo mientras la Tierra gira.  Cuando el
    seguimiento está desactivado, los objetos celestes se desplazan
    por el campo del telescopio, como lo indica la lectura cambiante de
    la ascensión recta.  El seguimiento está desactivado cuando se
    accede al telescopio por primera vez.  NOTA: si el telescopio es un
    instrumento de tránsito meridiano, el botón «Seguimiento» no
    aparecerá en el panel de control.

    «Velocidad de movimiento» (Slew Rate) - Este par de botones se usa
    para fijar la velocidad con que se mueve el telescopio cuando se
    presiona un botón de movimiento (N, S, E, W).  La velocidad se
    puede variar en factores de diez dentro de un rango bastante
    amplio.

    Botones de movimiento («N», «S», «E», «W») - Los botones de
    movimiento se usan para mover el telescopio y apuntarlo a un punto
    (dirección) particular del cielo.  Para mover el telescopio,
    presiona y mantén presionado el botón correspondiente.  El
    telescopio se moverá a una velocidad determinada por el ajuste de
    la velocidad de movimiento.  Suelta el botón para detener el
    movimiento.  En los movimientos largos, el botón permanecerá
    presionado si deslizas el cursor fuera de él antes de soltar el
    botón del mouse.  En ese caso, detén el movimiento presionando y
    soltando el botón del mouse con el cursor sobre el botón de
    movimiento activo.  NOTA: si el telescopio es un instrumento de
    tránsito meridiano, los botones «E» y «W» no aparecerán en el
    panel de control.

    «Receptor» (Receiver) - Presiona este botón para acceder al primer
    receptor, o receptor «maestro».

Temas relacionados:
    Fijar coordenadas
    Comentarios sobre el movimiento del telescopio
    Usar los receptores

**Fijar coordenadas**
Para escribir directamente las coordenadas a las que quieres apuntar el
telescopio, selecciona «Mover» (Slew)->«Fijar coordenadas...» (Set
Coordinates...) en el menú del panel de control del radiotelescopio y
escribe las coordenadas en el formulario que aparece.  Esto suele ser
más rápido que usar los botones de movimiento para llevar el telescopio
de un objeto a otro, a menos que los objetos estén muy cerca entre sí
en el cielo.  NOTA: si el telescopio es un instrumento de tránsito
meridiano, esta función moverá el telescopio solo en declinación.

Temas relacionados:
    Controles del radiotelescopio
    Comentarios sobre el movimiento del telescopio

**Comentarios sobre el movimiento del telescopio**
La porción del cielo accesible para un telescopio en un momento dado
está limitada por varios factores.  En la realidad, ningún telescopio,
óptico o de radio, puede «ver» por debajo del horizonte local.  Si así
está configurado, el telescopio de este ejercicio no podrá moverse por
debajo de una altitud que está varios grados por encima del horizonte
geográfico «verdadero».

Además, muchos radiotelescopios están restringidos por su diseño a
regiones limitadas del cielo sobre ellos.  El más común de estos es el
telescopio de tránsito meridiano, que solo puede moverse en declinación
y debe esperar a que la rotación de la Tierra lleve el objeto que se
observa a través del campo de visión.  Otro tipo de restricción es el
que ejemplifica la antena de 1000 pies de Arecibo, que solo puede
apuntarse a objetos que estén a pocos grados del cenit local.  Este
programa puede configurarse para simular cualquiera de estas
restricciones de movimiento; tu instructor te informará si se ha hecho
así.  Si el programa está configurado para simular un instrumento de
tránsito meridiano, los botones «Seguimiento» (Tracking), «E» y «W» no
aparecerán en el panel de control, y las funciones «Fijar coordenadas»
(Set Coordinates) y «Lista de objetos» (Hot List) moverán el telescopio
solo en declinación.

A diferencia de los telescopios ópticos, los radiotelescopios pueden
usarse tanto de día como de noche, así que la solución más fácil para
observar objetos que están actualmente fuera del rango accesible del
telescopio (en ascensión recta) es esperar unas horas o, con este
programa, cambiar la fecha y hora simuladas.

Para simplificar este ejercicio, tu instructor puede configurar el
programa para que ignore todas las restricciones de movimiento y se
mueva a cualquier parte del cielo en cualquier momento.  Se te
informará si ese es el caso.

Véase también:
    «Fijar la fecha y la hora de observación»

**Seleccionar un objeto de la «Lista de objetos»**
Para mover el telescopio a un elemento de la lista de objetos,
selecciona «Mover» (Slew)->«Lista de objetos» (Hot List)->
«Ver/seleccionar de la lista...» (View/Select from List...) en el menú
del panel de control del radiotelescopio.  Cuando aparezca la lista,
haz clic en la entrada deseada para resaltarla.  Presiona «Aceptar»
(OK) y el telescopio se moverá al objeto.  (El programa puede
configurarse para permitir el movimiento solo hacia objetos que estén
sobre el horizonte del instrumento y dentro de su rango de movimiento).
Si el telescopio es un instrumento de tránsito meridiano, la función
«Lista de objetos» moverá el telescopio solo en declinación.

Véase también:
    «Comentarios sobre el movimiento del telescopio»

**Agregar un objeto a la «Lista de objetos»**
Puedes agregar objetos interesantes a la lista de objetos para que sea
fácil volver a ellos más tarde y observarlos de nuevo.  Para agregar un
objeto, apunta con precisión el telescopio hacia él y accede a un
receptor para verificar que ubicaste un púlsar.  Luego, selecciona
«Mover» (Slew)->«Lista de objetos» (Hot List) ->«Agregar el objeto
actual a la lista...» (Add Current Item to List...) en el menú del panel
de control del radiotelescopio.  En el formulario que aparece, puedes
agregar un comentario que te ayude a identificar el objeto o a recordar
por qué es de interés.  (También puedes cambiar la identificación y la
posición para agregar un objeto que no esté actualmente en el campo del
telescopio).  Cuando hayas completado la entrada, presiona «Aceptar»
(OK) para agregarla a la lista.  (Si creas una entrada incorrecta por
error, consulta el tema de ayuda «Quitar un objeto de la "Lista de
objetos"».)

**Quitar un objeto de la «Lista de objetos»**
Para quitar una entrada de la lista de objetos, selecciona «Mover»
(Slew)->«Lista de objetos» (Hot List)-> «Ver/seleccionar de la
lista...» (View/Select from List...) en el menú del panel de control del
radiotelescopio.  Cuando aparezca la lista, haz clic en la entrada
deseada para resaltarla y luego presiona el botón «Eliminar» (Delete).
Se te pedirá que confirmes la eliminación antes de quitar la entrada de
la lista.  Cuando termines, puedes presionar «Cancelar» (Cancel) para
cerrar la lista de objetos si no quieres mover el telescopio a ninguno
de los objetos restantes de la lista.

**Fijar la fecha y la hora de observación**
Para fijar la fecha y la hora «actuales» del telescopio, cierra el panel
de control del radiotelescopio y luego selecciona «Archivo» (File)->
«Fijar fecha/hora de observación e ID...» (Set Observation Date/Time,
ID...) en el menú del panel de control del observatorio.

Temas relacionados:
    «Fijar fecha y hora» en el menú «Ayuda» (Help) del panel de control
    del observatorio.

**Analizar datos de púlsares**
Para analizar los datos de púlsares que tomaste y registraste,
selecciona «Herramientas» (Tools)->«Herramienta de análisis de
radiopúlsares» (Radio Pulsar Analysis Tool) en el menú del panel
de control del observatorio.

Temas relacionados:
    Recibir señales
    Registrar señales
    Medir las señales recibidas
    Temas de «Ayuda» (Help) del menú de la herramienta de análisis de
    púlsares.

**Cerrar el panel de control del radiotelescopio**
Para cerrar el panel de control del radiotelescopio, selecciona
«Archivo» (File)->«Salir» (Exit) en el menú, o usa cualquiera de las
funciones estándar de Windows (menú del sistema o botón «X») para
cerrar la ventana.  Se te recordará cualquier dato sin guardar y tendrás
la oportunidad de guardarlo antes de que se cierre el telescopio.

**Acceder a los receptores**
Para acceder al receptor principal, o «maestro», presiona el botón
«Receptor» (Receiver) en el panel de control del radiotelescopio.  Una
vez que aparezca la ventana del receptor maestro, se puede acceder a
hasta dos canales adicionales, o receptores «esclavos», presionando el
botón «Agregar canal» (Add Channel) en el panel del receptor maestro.

**Controles del receptor**
Los siguientes controles se usan para operar los receptores.  Ten en
cuenta que algunos de los controles están ubicados solo en el receptor
principal, o «maestro».  Durante la recepción, los controles Segundos
horizontales, Agregar canal y Registrar están deshabilitados.  Durante
el registro, todos los controles, excepto Modo del receptor, Alinear
receptores y Volumen, están deshabilitados.

    Frecuencia del receptor (Receiver Frequency) - Este control fija la
    frecuencia del receptor.  Cada clic en el botón con flecha
    correspondiente aumenta o disminuye la frecuencia en la cantidad
    (MHz) determinada por el control de incremento de frecuencia.  La
    frecuencia puede fijarse en valores entre 400.00 y 1400.00 MHz.  El
    control de frecuencia del receptor aparece en todos los receptores
    y se deshabilita durante el registro.

    Incremento de frecuencia (Frequency Increment) - Este control fija
    el incremento del control de frecuencia del receptor.  El
    incremento puede variar entre 0.01 y 100 MHz en factores de diez.
    El control de frecuencia del receptor aparece en todos los
    receptores y se deshabilita durante el registro.

    Ganancia vertical (Vertical Gain) - Este control fija la
    amplificación que el receptor aplica a la señal.  Esto afecta tanto
    la «altura» de la señal en la pantalla como la intensidad de la
    señal registrada.  La ganancia vertical puede variar entre 0.125 y
    8.0 (unidades arbitrarias) en factores de dos.  El control de
    ganancia vertical aparece en todos los receptores y se deshabilita
    durante el registro.

    Segundos horizontales (Horizontal Seconds) - Este control fija la
    escala de tiempo de la señal recibida.  Además de establecer la
    escala horizontal de la pantalla y de la señal registrada, este
    control modifica la «constante de tiempo» o tiempo efectivo de
    integración del receptor.  Así, fijar los segundos horizontales en
    un valor más alto ayudará a detectar señales débiles al aumentar la
    relación señal a ruido, mientras que los valores más bajos hacen
    visibles las formas de los pulsos y permiten medir con más
    exactitud las posiciones de los pulsos.  Los segundos horizontales
    pueden variar entre 0.5 y 16.0 en factores de dos.  Este control
    afecta a todos los receptores abiertos, por lo que aparece solo en
    el receptor principal (aunque la lectura aparece en todos los
    receptores).  El control de segundos horizontales está deshabilitado
    tanto durante la recepción como durante el registro.

    Agregar canal (Add Channel) - Al presionar este botón se abre un
    receptor secundario, o «esclavo».  La frecuencia y la ganancia
    vertical de los receptores secundarios pueden fijarse de forma
    independiente; todos los demás parámetros y controles los establece
    el receptor principal.  Se puede agregar un máximo de dos
    receptores secundarios.  El control «Agregar canal» está
    deshabilitado tanto durante la recepción como durante el registro.
    Los receptores secundarios pueden cerrarse sin cerrar el receptor
    principal, pero se aplican ciertas restricciones; consulta el tema
    de ayuda «Cerrar los receptores».

    Alinear receptores (Align Receivers) - Este botón activa («Sí»
    (Yes)) y desactiva («No») la alineación de los receptores.
    Cuando la alineación está desactivada, todos los receptores
    abiertos pueden moverse y colocarse de forma independiente en
    cualquier lugar de la pantalla.  Cuando la alineación está
    activada, los receptores se colocan en una pila debajo del receptor
    principal y lo «siguen» cada vez que este se mueve.  Los receptores
    secundarios no pueden moverse de forma independiente cuando la
    alineación está activada.  Este control siempre está habilitado.

    Modo del receptor (Receiver Mode) - Este botón se usa para iniciar
    y detener los receptores.  Cuando el modo se fija en «Recibir»
    (Receive), todos los receptores abiertos comienzan a mostrar las
    señales recibidas.  El registro también comienza si el interruptor
    de registro está en «Encendido» (On), y se escuchan sonidos si la
    computadora está debidamente equipada y los efectos de sonido están
    habilitados.  Para detener la recepción o el registro, presiona
    de nuevo el botón Modo del receptor para cambiar el modo a
    «Detener» (Stop).
    La recepción, el registro y el sonido se detendrán entonces cuando
    la pantalla llegue al final del panel actual.  (Consulta también el
    tema de ayuda «Registrar señales»).

    Interruptor de registro (Record Switch) - Este botón activa y
    desactiva el registro de señales.  Este botón solo está habilitado
    cuando el modo del receptor es «Detener» (véase arriba).  Consulta
    el tema de ayuda «Registrar señales» para obtener más información.

    Control de volumen (Volume Control) - Este control aparecerá solo
    en el receptor principal si la computadora está debidamente
    equipada para reproducir sonido y las funciones de sonido de este
    programa se han habilitado.  Úsalo para controlar el volumen del
    sonido durante la recepción y el registro.  Consulta el tema de
    ayuda «Sonidos» para obtener más información.

**Recibir señales**
Para recibir señales de púlsares, apunta con precisión el telescopio a
la posición del púlsar.  El seguimiento del telescopio debe estar
activado.  (Si usas un telescopio de tránsito meridiano, consulta la
nota más abajo).  Una vez que el telescopio haya dejado de moverse,
accede al receptor.  Para comenzar a recibir una señal, presiona el
botón «Modo» (Mode).  Para detener, presiona de nuevo el botón
«Modo»; la recepción se detendrá al final de la pantalla actual.  Ten
en cuenta que mientras se reciben señales puedes cambiar la frecuencia
y la ganancia vertical de forma individual para cada receptor activo.
Cuando la recepción está detenida puedes, además, abrir nuevos canales
de receptor, ajustar la escala de tiempo (segundos horizontales) y
activar el registro de datos.

Debes ajustar cada receptor de modo que los pulsos se vean claramente.
Si las señales están enterradas en el ruido, puede ayudar aumentar los
segundos horizontales; esto aumentará la relación señal a ruido.  Usa
la ganancia vertical para ajustar la altura de los pulsos; los pulsos
deben verse claramente, pero no deben llegar al borde superior de la
pantalla ni quedar recortados por él.

NOTA: Para un telescopio de tránsito meridiano, debes elegir una hora
de observación en la que el púlsar esté justo al este del meridiano del
telescopio.  Coloca con precisión la declinación del telescopio y
comienza a recibir.  A medida que el púlsar entre en el haz del
telescopio, empezarás a recibir los pulsos.  Se harán más intensos,
luego comenzarán a debilitarse y finalmente desaparecerán a medida que
el movimiento de la Tierra lleve el haz del telescopio más allá del
objeto.  Debes hacer todas tus observaciones, incluido el registro de
la señal, durante el breve tiempo en que el púlsar está en el haz.

Temas relacionados:
    Controles del radiotelescopio
    Comentarios sobre el movimiento del telescopio
    Acceder a los receptores
    Controles del receptor

**Registrar señales**
Para registrar las señales recibidas de un púlsar, realiza primero los
pasos descritos en el tema de ayuda «Recibir señales».  Cuando hayas
ajustado todos los receptores para obtener pulsos claros y fácilmente
identificables, detén la recepción, presiona el botón «Registrar»
(Record) para activar el registro y comienza a recibir de nuevo.  Todo
lo que veas en las pantallas de los receptores se registrará, hasta un
máximo de 4 pantallas completas (de 2 a 64 segundos, según el ajuste
de los segundos horizontales).  Para detener el registro, presiona el
botón «Modo» (Mode) para detener la recepción (pero nunca se
registrarán más de las primeras cuatro pantallas).

Las señales registradas pueden medirse con la herramienta de análisis
de radiopúlsares y/o guardarse para analizarlas más tarde.

Temas relacionados:
    Guardar las señales recibidas
    Analizar datos de púlsares

**Sonidos**
Si tu computadora está debidamente equipada y las funciones de sonido
del programa están habilitadas, escucharás los sonidos de los pulsos y
del ruido de fondo cuando se estén recibiendo señales.  Puedes ajustar
el volumen del sonido con el control de volumen del receptor
principal.  El sonido reflejará con exactitud el período y la
intensidad de la señal del púlsar que se observa.

El sonido estará, en general, sincronizado con la pantalla del receptor
principal.  Sin embargo, como el sonido y el video en las PC están
controlados por subsistemas completamente separados e independientes,
es posible que el sonido y el video se «desincronicen».  Esto
probablemente solo se notará en púlsares con períodos mayores de
aproximadamente 1/2 segundo.  Detener y reiniciar el receptor puede
volver a sincronizar el sonido y el video.

**Medir las señales recibidas**
Las señales recibidas pueden medirse directamente en la pantalla del
receptor, una vez que la recepción se haya detenido.  Presiona y
arrastra con el botón izquierdo del mouse para crear y mover un cursor
vertical en la pantalla de cada receptor.  La posición del cursor,
dada en segundos desde el borde izquierdo de la pantalla, aparece en la
parte superior izquierda de cada pantalla.  Si presionas y arrastras
con el botón derecho del mouse, crearás y moverás un único cursor de
«referencia» que aparece en la misma posición en todas las pantallas
de receptor abiertas.  Su lectura aparece en la parte superior derecha
de todas las pantallas.

Con este método estás limitado a mediciones de una sola pantalla
(intervalo de tiempo) de datos.  Para intervalos de tiempo más largos,
mediciones más exactas (con zoom y desplazamiento) y funciones de
registro de mediciones, debes registrar los datos del receptor y usar
la herramienta de análisis de radiopúlsares.

Temas relacionados:
    Registrar señales
    Guardar las señales recibidas
    Analizar datos de púlsares

**Guardar las señales recibidas**
Las señales registradas se conservan en la RAM.  En ese estado pueden
pasarse directamente a la herramienta de análisis de datos, pero si no
piensas hacerlo de inmediato, o necesitas un registro «permanente» por
cualquier otro motivo, debes guardar estos datos en un archivo.  (Las
señales registradas en la RAM se borran la próxima vez que se inicia un
registro).  Cuando terminas de registrar una señal se te da la
oportunidad de guardarla de inmediato o de transferirla de inmediato a
la ventana de análisis de datos.  Si no guardas en ese momento, puedes
guardar más tarde seleccionando «Archivo» (File)->«Guardar datos
registrados...» (Save Recorded Data...) en el menú de control del
radiotelescopio, o «Archivo»->«Guardar...» (Save...) en el menú de la
herramienta de análisis de datos.

Cuando eliges guardar el archivo, aparece un formulario que te permite
escribir o seleccionar un nombre para el archivo guardado.  Puedes
usar el nombre que quieras; el programa sugerirá un nombre generado a
partir de tus datos de inicio de sesión.  Siempre debes usar la
extensión ".PLR" en estos archivos para evitar dificultades y
confusión más adelante.

**Cerrar los receptores**
Las ventanas de los receptores se cierran mediante el menú del sistema
(haz clic en el pequeño cuadro de la esquina superior izquierda de la
ventana del receptor y luego selecciona «Cerrar» (Close)) o el botón
«X» de la esquina superior derecha de la ventana.  Al cerrar la ventana
del receptor maestro se cierran todas las ventanas de receptor
abiertas.  Los receptores esclavos pueden cerrarse individualmente,
pero deben cerrarse en el orden inverso al de su creación (es decir,
cierra primero el último receptor creado).
`;
