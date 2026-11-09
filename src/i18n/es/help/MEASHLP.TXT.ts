// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's MEASHLP.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const sourceName='MEASHLP.TXT';
export const sourceSha256='e9f20545e1ff580439f45af3fd2e9aff0b64b1cd4edab467d07e8de1813577ac';
export const text=`**Cargar espectro para medición**
Para cargar un espectro para medirlo, selecciona «Archivo»
(File)->«Datos» (Data)->«Cargar espectro guardado...» (Load Saved
Spectrum...) en el menú de la herramienta de medición y elige el
archivo de espectro que quieres cargar.

Temas relacionados:
    «Guardar espectro para análisis» en «Ayuda» del espectrómetro.

**Medir rasgos espectrales individuales**
Puedes medir la posición y la intensidad relativa de rasgos
espectrales individuales en un espectro mostrado. Mantén presionado el
botón izquierdo del mouse mientras colocas el cursor en forma de cruz
sobre el rasgo que quieres medir. La posición del cursor se muestra en
lecturas en la parte inferior de la pantalla, convertida en longitud
de onda e intensidad relativa. Cuando sueltas el botón del mouse,
aparece en la pantalla una línea vertical en la posición de la
longitud de onda y una línea horizontal corta en el nivel de
intensidad. Puedes ajustar la posición de estas líneas con las teclas
de flecha del teclado numérico para mejorar tus mediciones antes de
registrarlas. También puedes mover las líneas hasta el siguiente rasgo
que quieres medir manteniendo presionada una tecla de flecha (ver
abajo).

    -Acceso con el teclado-
    Las teclas de flecha del teclado numérico (teclas «2», «4», «6»,
    «8») se pueden usar para colocar las líneas de medición en lugar
    del mouse. NumLock debe estar «activado» y MouseKeys
    «desactivado». (Si usas MouseKeys, configura tu sistema para que
    MouseKeys se active cuando NumLock esté «desactivado»). Si las
    líneas de medición no se ven, presiona la tecla de flecha derecha
    («6») y las líneas aparecerán desde la izquierda de la pantalla.

Véase también:
    Cargar espectro de comparación
    Medir con espectro de comparación
    Registrar mediciones

**Cargar espectro de comparación**
Para cargar un espectro de comparación, selecciona «Espectro de
comparación» (Comparison Spectrum)->«Seleccionar» (Select) en el menú
de la herramienta de medición y elige un conjunto de líneas de la
lista que aparece. Las líneas de comparación aparecerán en la pantalla
y se habilitará el control deslizante. Puedes cargar tantos conjuntos
de líneas como quieras. Todas las líneas seleccionadas se mostrarán
hasta que se borre el espectro de comparación.

Véase también:
    Medir con espectro de comparación
    Identificar líneas de comparación
    Borrar espectro de comparación

**Medir con espectro de comparación**
Puedes medir el corrimiento Doppler de un espectro frente a un
espectro de comparación de muchas líneas. Simplemente carga un
espectro de comparación (ten en cuenta que se puede cargar más de un
conjunto de líneas) y usa el control deslizante para mover la
comparación hasta que coincida con las líneas espectrales del espectro
del objeto. El valor de Z correspondiente al corrimiento del espectro
de comparación se muestra debajo del control deslizante. Ten en cuenta
lo siguiente:

    1)  Es posible que no consigas un ajuste exacto en todas las
        líneas. Tendrás que decidir con tu criterio cuál es el mejor
        ajuste general.

    2)  Tus mediciones serán más precisas si amplías el espectro. Sin
        embargo, esto puede hacer imposible ver todas las líneas al
        mismo tiempo. (Consulta los temas de ayuda indicados abajo).

    3)  Puede que te parezca más preciso medir las líneas
        individualmente. (Consulta el tema de ayuda «Medir rasgos
        espectrales individuales»). Puedes usar el espectro de
        comparación para identificar las líneas, pero tendrás que
        registrar tus resultados y calcular un promedio de Z por tu
        cuenta. El valor que aparezca en la lectura de Z no será
        válido.

Véase también:
    Cargar espectro de comparación
    Identificar líneas de comparación
    Borrar espectro de comparación
    Ampliar/recorrer espectro
    Fijar sensibilidad del control deslizante
    Recentrar el control deslizante
    Registrar mediciones
    Rasgos espectrales individuales

**Identificar líneas de comparación**
Para identificar una línea del espectro de comparación, coloca el
cursor del mouse cerca de la línea en la pantalla y presiona el botón
derecho del mouse. El cuadro que aparece mostrará el ID de la línea,
las longitudes de onda en reposo y desplazada, y la categoría de la
fuente de la línea.

Véase también:
    Cargar espectro de comparación
    Medir con espectro de comparación

**Borrar espectro de comparación**
Para borrar el espectro de comparación de la pantalla, selecciona
«Espectro de comparación» (Comparison Spectrum)->«Borrar» (Clear) en
el menú de la herramienta de medición. Todas las líneas de comparación
se quitarán de la pantalla.

**Registrar mediciones**
Para registrar el valor de Z que has medido, selecciona «Archivo»
(File)->«Datos» (Data)->«Registrar mediciones...» (Record
Measurements...). Si mediste con el control deslizante del espectro de
comparación, el valor de Z de la lectura ya estará escrito en el
formulario. Si estás midiendo las líneas individualmente, el valor
escrito no será correcto y tendrás que reemplazarlo con tu promedio
calculado.

Cuando presionas «Aceptar» (OK), la información que escribiste se
coloca en una lista, pero no se guarda en un archivo. Para revisar,
imprimir o guardar tus resultados en un archivo, selecciona
«Herramientas» (Tools)->«Editores de resultados» (Results
Editors)->«Resultados de observación» (Observational
Results)->«Mostrar/imprimir/guardar...» (Display/Print/Save...) en el
menú del panel de control del observatorio.

Véase también:
    Medir con espectro de comparación
    Medir rasgos espectrales individuales
    «Editores de resultados» en «Ayuda» del panel del observatorio.

**Ampliar/recorrer espectro**
Para ampliar un espectro que estás midiendo, presiona el botón
«Ampliar» (Zoom). Aparecerá un cuadro con controles deslizantes que te
permite fijar el rango de longitudes de onda mostrado en la ventana de
medición. Los controles deslizantes cambian las longitudes de onda en
pasos de 100 Angstroms. El botón «Restablecer» (Reset) devuelve la
pantalla al rango de longitudes de onda original (completo).

Cuando una pantalla está ampliada, se habilitan las flechas de
recorrido que están debajo del botón de ampliación. Úsalas para
cambiar la parte visible del espectro. Al igual que los controles
deslizantes, operan en pasos de 100 Angstroms.

Ampliar el espectro permite determinar Z con más precisión, ya que la
pixelación más fina da un paso más pequeño en la colocación de la
línea de medición y/o del espectro de comparación. La desventaja al
medir con un espectro de comparación es que quizá no todas las líneas
sean visibles al mismo tiempo para determinar el mejor ajuste general.

Temas relacionados:
    Medir con espectro de comparación
    Medir líneas espectrales individuales

**Fijar sensibilidad del control deslizante**
El interruptor «Fino» (Fine)/«Grueso» (Coarse) que está sobre el
control deslizante del espectro de comparación controla la
sensibilidad del control deslizante. Usa la opción «Grueso» solo
cuando necesites mover el espectro de comparación una distancia larga.

Temas relacionados:
    Recentrar el control deslizante
    Medir con espectro de comparación

**Recentrar el control deslizante**
Si llegas al extremo del control deslizante del espectro de
comparación y necesitas mover más el espectro de comparación, presiona
el botón pequeño a la derecha de la lectura de Z para recentrar el
control deslizante.

Temas relacionados:
    Fijar sensibilidad del control deslizante
    Medir con espectro de comparación

**Cerrar la ventana de medición**
Para cerrar la ventana de la herramienta de medición y volver al panel
de control del observatorio, selecciona «Archivo» (File)->«Salir de
Medición de espectros» (Exit Spectrum Measuring) en el menú, o
presiona el cuadro «X» de la esquina superior derecha.
`;
