// Front ES-HELP [W]: OpenVireo's Spanish (es-419) web adaptation of VIREO's PULSRLST.TXT. Not CLEA's text: the original bytes, hashes and
// provenance are unchanged (public/original). Loaded only by the help viewer, never with the main Spanish chunk.
export const language='es-419';
export const sourceName='PULSRLST.TXT';
export const sourceSha256='51df0d67752ffa73d661e33751905db3af359e723062c70eb25883b947c79bb8';
export const text=`**Buscar un púlsar en la lista**
Tanto los nombres B1950 como los J2000 de los púlsares se mantienen en
la lista (es posible que los púlsares descubiertos más recientemente no
tengan un nombre B1950).  Para buscar un púlsar por nombre:

    o  Selecciona «Archivo» (File)->«Buscar púlsar...» (Find Pulsar...)
       en el menú de «Parámetros de púlsares» (Pulsar Parameters).
    o  Escribe el nombre del púlsar en el cuadro.
    o  Selecciona el tipo de nombre.
    o  Presiona «Aceptar» (OK).

Puedes usar un nombre parcial, siempre que comience desde el principio.
(Ejemplo: busca «045» y luego usa los botones «Siguiente» (Next) y
«Anterior» (Prev) para encontrar el que quieres).  Como los nombres de
los púlsares se crean a partir de sus posiciones, puedes usar esta
técnica para encontrar un púlsar cuya ascensión recta conozcas.  Todas
las búsquedas comienzan al principio de la lista, no en el registro
actual.

**Cambiar la fecha - calcular el período**
El período actual se obtiene a partir de la fecha de observación
actual, el parámetro PDot y el parámetro PEpoch.  Para calcular el
período en una fecha diferente:

    o  Edita el valor de la fecha juliana en el campo con la etiqueta
       «Fecha (MJD)» (Date (MJD)).
    o  Presiona el botón «Actualizar» (Update) para recalcular el
       período.
    o  Para volver a la fecha de observación actual, presiona
       «Restablecer» (Reset).

Alternativamente, puedes cambiar la fecha de observación actual en el
formato de fecha normal.  Para hacerlo:

    o  Selecciona «Archivo» (File)->«Fecha/hora...» (Date/Time...) en el
       menú del panel de control del telescopio.  (No tienes que cerrar
       la ventana «Parámetros de púlsares» (Pulsar Parameters) para
       hacerlo.  Solo muévela a un lado o minimízala).
    o  Escribe la fecha y hora deseadas en los cuadros correspondientes.
    o  Presiona «Aceptar» (Ok).
    o  Vuelve a la ventana «Parámetros de púlsares».  Quizá quieras
       presionar «Restablecer» para asegurarte de que se aplique la
       nueva fecha.  (Esto debería ocurrir automáticamente cuando se
       vuelve a acceder a la ventana).

**Cambiar la densidad electrónica - calcular la distancia**
La distancia derivada se calcula a partir del parámetro «Dispersión»
(Dispersion) y de la densidad electrónica.  Para ver el efecto de los
cambios en la densidad electrónica sobre la distancia calculada:

    o  Edita el valor de la densidad electrónica en el campo con la
       etiqueta «Densidad electrónica» (Electron Density).
    o  Presiona el botón «Actualizar» (Update) para recalcular la
       distancia.

**Volver a los valores actuales**
El botón «Restablecer» (Reset) devolverá la pantalla a la fecha y hora
de observación actuales y a la densidad electrónica predeterminada de
0.03.  Como el reloj siempre está en marcha, siempre habrá un pequeño
cambio en la fecha juliana (JD) al hacer esto, pero las magnitudes de
los valores de PDot son tan pequeñas que esto normalmente no tendrá un
efecto notable sobre el período.

**Seleccionar púlsares para estudiar**
Al seleccionar los púlsares que observarán los estudiantes, los
instructores deben elegir de la lista objetos que tengan densidades de
flujo registradas en las tres frecuencias (400, 600 y 1400 MHz).
Además, ten en cuenta que es difícil detectar pulsos con el instrumento
y los factores de ganancia predeterminados si la densidad de flujo es
menor de 10.0.  Para trabajar con los púlsares más tenues, aumenta la
apertura del telescopio y/o el «Factor de ganancia base» (Base Gain
Factor) en las «Opciones» (Options).
`;
