import type {VARIABLE_STARS_EN} from '../../../variables/VariableStarMessages';
import type {Translation} from '../../maps';
import {plural} from '../../plural';
/** Front ES7: Spanish (es-419) for the variable-star page's web text. A web adaptation by OpenVireo, not CLEA's. VIREO's own
 * captions (Variable Star Data, Simulated Light Curve, their menus and the print lines) are in src/core/variableStarForm.ts
 * and src/core/lightCurvePrint.ts and are translated through vireo() (originals.json). */
export const VARIABLE_STARS_ES:Translation<typeof VARIABLE_STARS_EN>=Object.freeze({
 nav:'Estrellas variables',
 title:'Estrellas variables y curvas de luz',
 scope:'Busca una estrella en el catálogo de estrellas variables de VIREO (CLEA_VStrs.dat, 31,147 registros), lee sus datos de catálogo y muestra la curva de luz que VIREO simula para ella.',
 adaptation:'Adaptación web: en VIREO estos datos son una vía del instructor (Modo de edición [Edit Mode]): GCVS en el cuadro Objeto del catálogo (Catalog Object), o Información del campo (Field Information) › Estrellas variables (Variable Stars) › Obtener los datos de la selección (Get Selection Data) en el panel de control del telescopio. Ambas existen en este sitio con el Modo de edición activado (Opciones de simulación óptica [Optical Simulation Options]); esta página además permite a cualquiera buscar directamente en el catálogo. Las ventanas Datos de la estrella variable (Variable Star Data) y Curva de luz simulada (Simulated Light Curve) siguen al original.',
 guideTitle:'Cómo se usa esta herramienta',
 guide:Object.freeze([
  'Escribe parte del nombre de una estrella (por ejemplo "del Cep" o "RR Lyr") o elige un tipo de variabilidad, y luego presiona Abrir en una fila.',
  'La ventana Datos de la estrella variable (Variable Star Data) muestra los valores del catálogo: posición, tipo, magnitud máxima, magnitud mínima (o, después de un "(", la amplitud), la época del catálogo (que VIREO dibuja como el máximo de luz, aunque en las binarias eclipsantes el catálogo da un mínimo), período, tiempo de ascenso (M-m/D) y espectro.',
  'Elige Datos (Data) › Mostrar curva de luz (Display Light Curve) para ver 1.5 ciclos de la curva de luz simulada. VIREO dibuja la época del catálogo como el máximo de luz (fase 0), sea cual sea el tipo.',
  'Usa Datos › Guardar texto (Save Text) › Tal como se muestra (As Displayed) para descargar la lista como un archivo de texto, o Imprimir (Print) para imprimirla.',
 ]),
 guideModel:'Sobre la curva: VIREO dibuja la misma curva con forma de cefeida para todos los tipos, construida solo con el máximo, el mínimo, el período y el M-m/D del catálogo (50 % cuando el catálogo no da ninguno). No tiene ruido y no es una observación. Las binarias eclipsantes y las variables irregulares no se ven realmente así.',
 loading:'Cargando el catálogo de estrellas variables…',
 loadError:'No se pudo cargar el catálogo de estrellas variables incluido, o no coincidió con su tamaño y SHA-256 registrados. Vuelve a cargar la página para intentarlo de nuevo.',
 searchTitle:'Buscar una estrella variable',
 nameLabel:'El nombre de la estrella contiene',
 typeLabel:'Tipo de variabilidad',
 allTypes:'Todos los tipos',
 typeOption:(type:string,count:number)=>`${type||'(en blanco)'} — ${count.toLocaleString('en-US')}`,
 results:(shown:number,total:number)=>total===0?'Ningún registro coincide.':shown<total?`Se muestran los primeros ${shown} de ${total.toLocaleString('en-US')} registros coincidentes, en el orden del catálogo (ascensión recta). Acota la búsqueda para ver otros.`:plural('es-419',total,{one:`${total.toLocaleString('en-US')} registro coincidente.`,other:`${total.toLocaleString('en-US')} registros coincidentes.`}),
 columns:['ID GCVS','Tipo','AR (h)','Dec (°)','Máx.','Mín. / ampl.','Período (d)',''],
 open:'Abrir',
 openLabel:(name:string)=>`Abrir ${name}`,
 noPeriod:'—',
 listTypeCodesNote:'En VIREO este elemento del menú solo cambia su propia marca de verificación; nada más la lee.',
 saveAdaptation:'Adaptación web: el texto se descarga a través de tu navegador (una línea por fila de la lista, con saltos de línea de Windows) en lugar de usar un cuadro para guardar.',
 riseDefaultedNote:'Este registro no tenía valor de M-m/D. Al abrir su curva de luz se fijó en 50 % en la memoria, como hace VIREO, así que ahora la lista muestra 0.50.',
 curveLabel:(name:string)=>`Curva de luz simulada de ${name}: magnitud en función de la fase, 1.5 ciclos desde la época del catálogo.`,
 unavailable:Object.freeze({
  'period-zero':'Sin curva: este registro no tiene período (0 días). VIREO divide entre el período y se detiene con un error de punto flotante después de dibujar los ejes, así que no se dibuja ningún punto de la curva.',
  'zero-decline-fraction':'Sin curva: el M-m/D es 100 %, así que la parte descendente de la curva tiene longitud cero y VIREO se detiene con un error de punto flotante antes de dibujarla.',
  'axis-range-zero':'Sin ventana de curva de luz: los límites del eje de la magnitud más brillante y la más débil son iguales, y VIREO divide entre su diferencia antes de mostrar la ventana.',
  'magnitude-system-empty':'El texto del sistema de magnitudes está vacío: VIREO deja de dibujar con un error después del eje de magnitud, así que no se dibujan el eje de fase ni la curva.',
  'non-finite':'Sin curva: un valor de este registro está fuera de lo que el modelo puede calcular.',
 }),
 curveAdaptation:'La gráfica conserva el diseño, los colores y las posiciones en píxeles de VIREO; las fuentes son distintas.',
 printTitle:(caption:string)=>`Imprimir — ${caption}`,
 printHelp:'Vista previa de lo que VIREO imprime en papel: la fecha y la hora (aquí en el formato de tu navegador), la línea de la mesa de laboratorio, las líneas del estudiante y de la práctica escritas en VIREO (no disponibles en este sitio, así que en su lugar va un marcador de posición), las líneas de la lista y, para la curva de luz, la gráfica. No se reproducen el diseño de página ni las fuentes. El título del trabajo de impresión de VIREO no se imprime en la página.',
 printCurveLayout:(monochrome:boolean)=>`La página de la curva de luz sigue la impresión de VIREO en la orientación que elijas aquí (VIREO usa la de la impresora): en vertical la gráfica sigue en la misma página; en horizontal VIREO agrega “(Imagen de pantalla impresa en la página siguiente)” [(Screen Image Printed on Next Page)] e imprime la gráfica en la página 2. ${monochrome?'Imprimir en color (Print in Color) está desactivado, así que la gráfica se imprime en negro sobre blanco.':'Imprimir en color (Print in Color) está activado, así que la gráfica se imprime con los colores de la pantalla.'} VIREO dibuja la gráfica encima de la línea del título; aquí se coloca debajo.`,
 printOrientation:'Orientación de la página',
 portrait:'Vertical',
 landscape:'Horizontal',
 printStudentPlaceholder:'[texto del estudiante y de la práctica escrito en VIREO: no recuperado en este sitio]',
 printButton:'Imprimir…',
 printClose:'Cerrar vista previa',
 printError:'No se puede imprimir en esta ventana del navegador.',
});
