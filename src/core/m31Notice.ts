/** Front C7 [D]: 0x53b848's MessageBox (text 0x53b8ec, caption 0x53b938, MB_OK|MB_ICONEXCLAMATION 0x30), shown each time VIREO's
 * telescope painter 0x53b390 runs over a field with NGC 224 (which it then leaves unpainted). [W] OpenVireo shows it as a notice
 * that does not block the page. A module of its own so the page shell can show it without loading the field engine. Pure. */
export const M31_NOTICE=Object.freeze({caption:'Image Too Large!',text:"M31 Image Too Large to Load!\r\n\r\nSorry about that. (We're working on it.)",
 adaptation:'VIREO shows this as a message box each time it draws this field; M31 itself is not drawn, the rest of the field is.'});
