// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's SPECHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const language='es-419';
export const sourceName='SPECHLP.TXT';
export const sourceSha256='e085a513389cd65a7726260daf6607b8c277be6e6a2a46222a8fd5bb90fcee79';
export const text=`**Fijar rango de longitudes de onda**
Puedes cambiar el rango de longitudes de onda que registra el
espectrómetro, dentro del rango máximo de 3500 a 7400 angstroms. (Tu
instructor debería decirte si hay alguna razón por la que podrías
querer hacerlo). Para cambiar el rango de longitudes de onda,
selecciona «Archivo» (File)->«Preferencias» (Preferences)->«Rango
espectral» (Spectral Range) en el menú del panel de control del
espectrómetro. Usa los controles deslizantes para cambiar los valores
mínimo y/o máximo. El botón «Predeterminado» (Default) devuelve los
valores al rango óptimo para la clasificación espectral. Ten en cuenta
que perderás cualquier espectro que hayas tomado pero no guardado
cuando cambies el rango de longitudes de onda.

**Iniciar/reanudar la cuenta**
Presiona el botón de integración «Comenzar» (Go) del espectrómetro
para comenzar o continuar la integración del espectro. Verás que el
espectro empieza a tomar una forma reconocible a medida que se
acumulan las cuentas en cada uno de los 500 canales del espectrómetro.
(La pantalla siempre se normaliza a la lectura más alta de cualquier
canal, de modo que con el paso del tiempo ves disminuir el ruido en
lugar de ver subir las cuentas). La cuenta total de fotones actual, el
tiempo de integración, la cuenta promedio por canal y la relación
señal/ruido se muestran debajo de la gráfica. En algunos ejercicios
también se muestran la identificación del objeto y la magnitud
aparente.

**Detener la cuenta**
Al presionar el botón de integración «Detener» (Stop), la integración
se pausa. La pantalla se vuelve a dibujar con líneas que unen las
lecturas de canales adyacentes para mayor claridad. Puedes detener y
reanudar tantas veces como quieras; la integración siempre continúa
desde donde quedó. (No puedes «perder» un espectro a menos que cierres
el panel de control del espectrómetro sin guardarlo).

**Imprimir espectro**
Para imprimir el espectro actual, selecciona «Archivo» (File)->«Datos»
(Data)->«Imprimir espectro...» (Print Spectrum...) en el menú del
panel de control del espectrómetro. Aparecerá el formulario estándar
de opciones de impresión de Windows. (Tu instructor puede darte
información adicional sobre cómo configurar y dirigir tu impresión).
El espectro se imprime tal como aparece en la pantalla, junto con un
encabezado con información de identificación.

**Guardar espectro para análisis**
No puedes medir ni clasificar un espectro que hayas tomado a menos que
lo guardes. Cuando consideres que la relación señal/ruido es
suficientemente alta para un análisis preciso (ver abajo), detén la
cuenta y selecciona «Archivo» (File)->«Datos» (Data)->«Guardar
espectro...» (Save Spectrum...) en el menú del panel de control del
espectrómetro. Se genera un nombre de archivo a partir del nombre o ID
del objeto (extensión .CSP). Se te pedirá que verifiques el nombre y
la ruta del archivo. (En general, no debes cambiar la ruta a menos que
se te indique). Si ya existe un archivo con ese nombre, se te avisará
antes de sobrescribir el archivo existente.

Se recomienda una relación señal/ruido de alrededor de 100 para una
clasificación precisa de estrellas, pero valores más bajos pueden
bastar para algunos tipos espectrales. Una relación señal/ruido de
apenas 10 puede ser suficiente para determinar la velocidad radial (Z)
de algunas galaxias. Si no estás seguro de que el espectro que estás
tomando sea suficiente, y quizá quieras volver al panel de control del
espectrómetro y seguir integrándolo, usa la siguiente técnica:

    1)  Guarda el espectro.

    2)  NO cierres el panel de control del espectrómetro. Si quieres,
        puedes minimizar el panel de control del espectrómetro con el
        cuadro «_» de la esquina superior derecha, pero no es
        necesario.

    3)  Selecciona la herramienta de clasificación o de medición en
        «Herramientas» (Tools) del menú del panel de control del
        observatorio. Carga el archivo que acabas de guardar e intenta
        clasificarlo o medirlo.

    4)  Si el espectro tiene demasiado ruido para un análisis preciso,
        puedes seguir integrándolo. Vuelve al panel de control del
        espectrómetro y presiona «Comenzar» (Go). Cuando termines,
        tendrás que guardarlo de nuevo (puedes sobrescribir la versión
        anterior) y volver a cargarlo en la herramienta de análisis.

Temas relacionados:
    Cerrar el panel de control del espectrómetro
    Acceder a la herramienta de clasificación
    Acceder a la herramienta de medición de espectros

**Cerrar el panel de control del espectrómetro**
Para cerrar el panel de control del espectrómetro y volver al panel de
control del telescopio, selecciona «Archivo» (File)->«Salir del
espectrómetro» (Exit Spectrometer) en el menú o usa el cuadro «X» de
la esquina superior derecha. Si cierras el espectrómetro, no podrás
volver y continuar integrando un espectro desde donde lo dejaste,
aunque sí puedes empezar de nuevo con la misma estrella. Si no has
guardado tu espectro actual, se te avisará y tendrás la oportunidad de
hacerlo antes de que se cierre el panel de control del espectrómetro.

Temas relacionados:
    Guardar espectro para análisis

**Acceder a la herramienta de clasificación**
Para clasificar espectros, debes acceder a la herramienta de
clasificación. Selecciona «Herramientas» (Tools)->«Herramienta de
clasificación espectral» (Spectral Classification Tool) en el menú del
panel de control del observatorio y aparecerá la herramienta de
clasificación. No es necesario acceder al panel de control del
telescopio ni cerrarlo antes de acceder a la herramienta de
clasificación.

Temas relacionados:
    Guardar espectro para análisis
    Temas de «Ayuda» en el menú de la herramienta de clasificación.

**Acceder a la herramienta de medición de espectros**
Para medir la posición de líneas espectrales y determinar la velocidad
radial (Z), debes acceder a la herramienta de medición de espectros.
Selecciona «Herramientas» (Tools)->«Herramienta de medición de
espectros» (Spectrum Measuring Tool) en el menú del panel de control
del observatorio y aparecerá la herramienta de medición. No es
necesario acceder al panel de control del telescopio ni cerrarlo antes
de acceder a la herramienta de medición de espectros.

Temas relacionados:
    Guardar espectro para análisis
    Temas de «Ayuda» en el menú de la herramienta de medición de
    espectros.
`;
