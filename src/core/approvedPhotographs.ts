/** The galaxy photographs approved for publication, byte-exact from CLEA_Vireo.zip program files/CLEA/VIREO/Images/Galaxies/ and
 * served from public/original/images/. Each loader checks size and SHA-256 before decoding (photographDraw.ts decodeBitmap8).
 * - Object X (user approval of 2026-10-28): the four GLIMAGES.LST associates with Object X target areas.
 * - LSS (user approval of 2026-10-30, Front F3): the five GLIMAGES.LST associates with LSS rows otherwise photographic-image;
 *   NGC4274.BMP and NGC4278.BMP are both drawn in the F1R22/F2R1/F2R2/F2R4 fields (analysis/front-re5/lss-unacquirable.md).
 * GLIMAGES.LST also names NGC4449.BMP, which is absent from the zip; the original parser drops its row. Pure data. */
export type ApprovedPhotograph=Readonly<{file:string;path:string;bytes:number;sha256:string}>;
const list=(rows:readonly (readonly [string,number,string])[]):readonly ApprovedPhotograph[]=>
 Object.freeze(rows.map(([file,bytes,sha256])=>Object.freeze({file,path:`/original/images/${file}`,bytes,sha256})));
export const OBJECT_X_PHOTOGRAPHS=list([
 ['NGC2403.BMP',75852,'d490142539a2dfaade1780d0ad73918076f15141ca6fc0f6f93ccb3f627e1394'],
 ['NGC4262.BMP',3952,'ac967f4472d20e1ff2e8ac5f5b6dc20d643fea8305f800bf7271883940559ea1'],
 ['NGC4631.BMP',53864,'0cba75c792d0aac7aa56541e958f87e3fe3e37f5893896e4fc12a84bad729d9e'],
 ['NGC4656.BMP',76016,'0c94936472f13a87e26c5156e49ae491869f47818df61c8f94b6f0249601028d']]);
export const LSS_PHOTOGRAPHS=list([
 ['NGC4150.BMP',10400,'da85f0f5de153aef4724bb30d4c5391c74c5f9803bfa6f5ba47a327014fd0eaa'],
 ['NGC4274.BMP',23456,'ce5b4de00369e06c6950538bb62cf4c30bb585affb36084385155317271cc566'],
 ['NGC4278.BMP',12340,'4ff9a09d907c878b81ddec8832f0a116f19a3e7b8ad83ee9f9e828654fdc2e7f'],
 ['NGC4314.BMP',24372,'4c0e0e4b086147029a838a8cbee29c448f4d29d58a553f09dcc9680a05646bc2'],
 ['NGC4793.BMP',6716,'6808ef6abbcf01b16e243f3c85c8ee20681b7e9080cb3d347d52cd2413b27d37']]);
/** Every approved photograph: the bitmaps a field at any pointing may draw. */
export const APPROVED_PHOTOGRAPHS:readonly ApprovedPhotograph[]=Object.freeze([...OBJECT_X_PHOTOGRAPHS,...LSS_PHOTOGRAPHS]);
