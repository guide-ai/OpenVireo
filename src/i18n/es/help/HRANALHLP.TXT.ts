// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's HRAnalHlp.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const sourceName='HRAnalHlp.TXT';
export const sourceSha256='3a2f0ef20fd5d89384e429783ceda62325e59a752fd076e02a2c4256143c956b';
export const text=`**Cargar datos a partir de observaciones**
Para cargar y analizar los datos fotométricos de un cúmulo que acabas
de tomar con el telescopio y el fotómetro, selecciona «Archivo»
(File)->«Cargar/graficar» (Load/Plot)->«Datos a partir de
observaciones» (Data from Observations) en el menú de la herramienta
de análisis del diagrama HR. El diagrama color-magnitud (HR) en bruto
aparecerá cuando se carguen los datos. Si guardaste datos fotométricos
de una sesión anterior, vuelve a cargarlos antes de acceder a ellos de
esta manera.

Temas relacionados:
    Temas de «Herramientas de análisis de cúmulos»
    Temas de ayuda «Editores de resultados» y «Cargar datos guardados»
      en el menú del panel de control del observatorio.

**Cargar datos de la base de datos de cúmulos**
Para cargar y analizar los datos fotométricos de cúmulos individuales
de la base de datos de VIREO, selecciona «Archivo»
(File)->«Cargar/graficar» (Load/Plot)->«Seleccionar datos de cúmulos»
(Select Cluster Data) en el menú de la herramienta de análisis del
diagrama HR. En la lista que aparece, haz clic en una entrada para
seleccionarla y luego elige «Selección» (Selection)->«Graficar» (Plot)
en el menú. También puedes hacer doble clic en una entrada de la lista
para cargar y graficar los datos.

Temas relacionados:
    Temas de «Herramientas de análisis de cúmulos»
    Cargar un cúmulo nuevo de la base de datos

**Cargar un cúmulo nuevo de la base de datos**
Al cargar un cúmulo nuevo de la base de datos se reemplazan los puntos
de datos de la vista del diagrama HR. Si se muestran la ZAMS y/o una
isócrona, no se quitarán automáticamente.

Temas relacionados:
    Cargar datos de la base de datos de cúmulos
    Quitar ZAMS e isócrona de la vista

**Mostrar la secuencia principal de edad cero**
Ajustar la secuencia principal de edad cero (ZAMS) a los datos del
cúmulo te permitirá determinar el módulo de distancia V-Mv y el exceso
de color E(B-V) del cúmulo. Para mostrar la ZAMS, selecciona
«Herramientas» (Tools)->«Secuencia principal de edad cero» (Zero Age
Main Sequence) en el menú de la herramienta de análisis del diagrama
HR. La ZAMS se mostrará inicialmente con V-Mv = 0.

Temas relacionados:
    Ajustar la secuencia principal de edad cero
    Quitar ZAMS e isócrona de la vista

**Ajustar la secuencia principal de edad cero**
Usa el control deslizante de ajuste de V-Mv, en el lado derecho de la
gráfica del diagrama HR, para ajustar la ZAMS a la secuencia principal
que muestra la gráfica del cúmulo. Ten en cuenta que la parte superior
de la secuencia principal del cúmulo habrá evolucionado alejándose de
la secuencia principal de edad cero. Cuánto se haya alejado dependerá
de la edad del cúmulo. (Ajustar una isócrona después de colocar la
ZAMS lo hará más claro). También habrá estrellas en el diagrama HR del
cúmulo que no son miembros del cúmulo, pero en la mayoría de los casos
la secuencia principal del cúmulo está lo bastante bien delineada para
permitir un ajuste bastante preciso de la ZAMS.

El control deslizante de la parte inferior de la gráfica mueve la ZAMS
lateralmente aplicando un exceso de color E(B-V) para compensar el
efecto de enrojecimiento del polvo interestelar entre el cúmulo y el
Sol. Para simplificar el proceso de ajuste, de manera predeterminada
el programa fija automáticamente E(B-V) en el valor correcto para el
cúmulo que estás estudiando, y no necesitas cambiarlo. Tu instructor
debe informarte si se cambió este valor predeterminado y si necesitas
considerar ajustar E(B-V) cuando ajustes la ZAMS.

Temas relacionados:
    Mostrar la secuencia principal de edad cero
    Agregar isócrona a la vista
    Quitar ZAMS e isócrona de la vista

**Agregar isócrona a la vista**
Ajustar la isócrona correcta a los datos del cúmulo te dirá la edad
del cúmulo y la metalicidad de sus estrellas. La isócrona mostrada usa
el ajuste de la secuencia principal de edad cero para «anclar» los
parámetros V-Mv y E(B-V), así que primero debes ajustar la ZAMS antes
de agregar una isócrona. Cuando lo hayas hecho, agrega la isócrona a
la vista seleccionando «Herramientas» (Tools)->«Isócronas...»
(Isochrones...) en el menú. El cuadro de control Parámetros de la
isócrona (Isochrone Parameters) que aparece te permitirá ajustar la
isócrona a los datos del cúmulo. (Cuando se muestra una isócrona, los
cambios en los controles deslizantes de la vista del diagrama HR que
controlan los valores de V-Mv y E(B-V) harán que la ZAMS y la isócrona
mostradas se muevan juntas).

NOTA: Las isócronas se obtienen de modelos teóricos que se
proporcionan para los valores específicos de edad y metalicidad que
cubren los controles. Los valores intermedios no están disponibles y
no siempre será posible un ajuste exacto a un cúmulo específico. La
parte inferior de la secuencia principal de la isócrona puede no
coincidir exactamente con la ZAMS. Debes intentar lograr una buena
coincidencia con la secuencia principal justo debajo del punto de
desvío, con el punto de desvío mismo y con las partes evolucionadas
del diagrama por encima y a la derecha del punto de desvío.

Temas relacionados:
    Ajustar la secuencia principal de edad cero
    Ajustar la edad de la isócrona
    Fijar la metalicidad de la isócrona
    Ajustar el color de la isócrona
    Quitar ZAMS e isócrona de la vista

**Ajustar la edad de la isócrona**
Usa el control deslizante de la parte superior del cuadro de control
Parámetros de la isócrona para ajustar la edad de la isócrona
mostrada. El control deslizante ajusta el logaritmo de la edad en años
de 7.80 a 10.25, en unidades de 0.05. Esto corresponde a edades de
cúmulos desde 63 millones hasta casi 18 mil millones de años.
(Consulta la NOTA en «Agregar isócrona a la vista»). Puede que la edad
del cúmulo que estás estudiando esté fuera del rango de las isócronas
disponibles. En ese caso concluirías que la edad del cúmulo es menor o
mayor que el límite aplicable.

Temas relacionados:
    Agregar isócrona a la vista
    Fijar la metalicidad de la isócrona
    Ajustar el color de la isócrona
    Quitar ZAMS e isócrona de la vista

**Fijar la metalicidad de la isócrona**
Se proporcionan modelos de isócronas para 6 valores de metalicidad.
(Consulta la NOTA en «Agregar isócrona a la vista»). Además del valor
solar, hay 4 modelos con metalicidad más baja y 1 con metalicidad más
alta. La mayoría de los cúmulos abiertos de la galaxia tienen
metalicidades cercanas al valor solar, y siempre debes comenzar con
ese. Si no consigues una coincidencia satisfactoria, puedes probar a
cambiar la metalicidad. (También puedes probar varios valores solo
para ver el efecto que tiene). En el cuadro de control Parámetros de
la isócrona, usa los botones de flecha pequeños en el borde derecho de
la lectura de metalicidad para mostrar los distintos valores. Para
cambiar la metalicidad de la isócrona mostrada, fija en el cuadro el
modelo que quieres y luego haz doble clic en él.

Temas relacionados:
    Agregar isócrona a la vista
    Ajustar el color de la isócrona

**Ajustar el color de la isócrona**
El control deslizante «Ajustar (B-V)» (Adjust (B-V)) del cuadro de
control Parámetros de la isócrona mueve la isócrona lateralmente en el
diagrama HR sin mover la ZAMS. Esto puede permitirte lograr un mejor
ajuste, sobre todo si tienes problemas para que la secuencia principal
de la isócrona coincida con la ZAMS. (También podrías probar a
modificar la metalicidad para corregirlo). Hasta cierto punto, el
ajuste de (B-V) imita el efecto de variaciones de metalicidad menores
que las diferencias entre los modelos.

Temas relacionados:
    Agregar isócrona a la vista
    Fijar la metalicidad de la isócrona

**Quitar ZAMS e isócrona de la vista**
Selecciona «Herramientas» (Tools)->«Borrar» (Clear) en el menú de la
herramienta de análisis del diagrama HR para quitar de la vista tanto
la ZAMS como la isócrona. También puedes quitarlas por separado
volviendo a seleccionar la opción de menú correspondiente
(«Herramientas»->«Secuencia principal de edad cero» o
«Herramientas»->«Isócronas...»). Esto probablemente sea más útil para
quitar la isócrona y dejar la ZAMS, especialmente después de cargar un
cúmulo nuevo.

Temas relacionados:
    Cargar un cúmulo nuevo de la base de datos

**Mostrar/imprimir parámetros de edad y distancia del cúmulo**
Selecciona «Herramientas» (Tools)->«Ver/imprimir parámetros»
(View/Print Parameters) en el menú de la herramienta de análisis del
diagrama HR para ver los valores de los parámetros que resultan de tu
análisis del diagrama HR del cúmulo. Selecciona «Lista» (List)->
«Imprimir» (Print) para obtener una copia impresa.
`;
