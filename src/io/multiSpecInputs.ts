// Front M: loads and checks every input of the Multi-Spec (core/multiSpecSpectrum.ts, core/fieldEngine.ts evaluateFieldView).
// Runs inside the Worker io/multiSpecWorker.ts in the browser and in process under tests. It reuses the Object X spectrometer
// inputs (io/objectXSpectrometerInputs.ts: Object X packs with their recorded digests, CLEA_GLX.DAT, CLEA_QSO.DAT, QSOSpect.dat,
// GLIMAGES.LST photographs, JSPEC2.SPI, GLXYSP.LST), the LSS packs (io/lssPack.ts) and the Hubble engine packs (digests recorded
// in data/hubble/engine-targets.json), and adds the 48 already bundled jspect2 templates (decision D2: no new resources; a template
// outside this table is typed 'spectrum-template-unapproved') and, on demand, the bundled own galaxy spectra GLXYSP.LST names.
// Every file is checked for its recorded size and SHA-256. Nothing is persisted or sent anywhere.
import coma from '../../data/hubble/engine-coma.json';
import bootes from '../../data/hubble/engine-bootes.json';
import engineTargets from '../../data/hubble/engine-targets.json';
import galaxySource from '../../data/hubble/galaxy-source.json';
import {decodeFieldPack,type FieldPack} from '../core/fieldPack';
import {catalogRecords} from '../core/catalogObject';
import {glxyspLookup,type FieldOptions,type FieldPopulation,type FieldTelescope,type FieldVariableTime} from '../core/fieldEngine';
import {starTemplateSpectrum} from '../core/starTemplates';
import {parseLibrarySpectrum} from '../core/spectrum';
import type {UniformSpectrum} from '../core/acquisition';
import {OBJECT_X_SPECTRUM_ROWS,type ObjectXSpectrometerInputs} from '../core/objectXSpectrometer';
import type {MultiSpecContext,MultiSpecSelection} from '../core/multiSpecSpectrum';
import type {LssFieldNumber} from '../core/lssFields';
import {loadObjectXSpectrometerInputs,packDigest,browserObjectXResources,type ObjectXSpectrometerResources} from './objectXSpectrometerInputs';
import {resourceSha256} from './boundedResource';

export class MultiSpecInputError extends Error{constructor(readonly code:'pack'|'resource'){super(`Multi-Spec inputs: ${code}`);this.name='MultiSpecInputError';}}
const T=(file:string,path:string,sha256:string)=>Object.freeze({file,path,bytes:55980,sha256});
/** Every jspect2 template already bundled byte-identically (public/original/classification under the 1279-resource approval, and
 * A0000046.SP under the 2026-10-27 group-1 approval), plus the 67 jspect2 templates approved on 2026-10-28 for Multi-Spec
 * (data/multispec/template-requirements.json); SHA-256 of the jspect2 originals (template-inventory.json, Front M plan §9). */
export const MULTISPEC_STAR_TEMPLATES=Object.freeze([
 T('A0000001.SP','/original/classification/A0000001.SP','6311f2dab943fd9a790f8be36f50900661e1ff3224528c0a6391f67c2310e6f0'),
 T('A0000002.SP','/original/spectra/jspect2/A0000002.SP','0a4c14affe07fe1a431f9bb0225b6fd9f18b1f0ef110bb136598e189d6633c57'),
 T('A0000004.SP','/original/classification/A0000004.SP','f501cd73bfc43a15aeb27eea672ac3c69bdb5830b7a48b475f05f4ec046749be'),
 T('A0000006.SP','/original/classification/A0000006.SP','7265bfb181f27e8b8a8b7384725c662f2dc9f8d2c866fbb7aebb3774dd53cf97'),
 T('A0000011.SP','/original/classification/A0000011.SP','0b68a7d9502bdd794c03b9bc35023143abf563d52851325898f2e522e2bca006'),
 T('A0000013.SP','/original/classification/A0000013.SP','5960f7700c327252a6215476fd62635a57b6deca7a2d40010f362f262e744298'),
 T('A0000014.SP','/original/classification/A0000014.SP','6a5ee6362deab2059d100789c4fd0c49372b2360f898c469932b2d00b0dd5328'),
 T('A0000015.SP','/original/classification/A0000015.SP','cc4e0ec889f8829081534b1852e348ce5486bf5c8aa94e13e8f0cfda139ed4af'),
 T('A0000017.SP','/original/classification/A0000017.SP','efe769a8c81ec029f0aea41acfdc09417aec06301aaea9a819290d5187efbb6e'),
 T('A0000018.SP','/original/classification/A0000018.SP','ee65da16e6884d93af66df7c6285664c9dddde3cf1e747c4638af6a36711698a'),
 T('A0000019.SP','/original/classification/A0000019.SP','b04ce24eb2b61ede4504d5d62b13b69150bc1aef12ebd70c838711738c6423f8'),
 T('A0000021.SP','/original/classification/A0000021.SP','0bdf4fa2f810014e38f8f0a8a1d9a3685ab4fe570d3ebcd69c36ed7cc19d9d3a'),
 T('A0000024.SP','/original/classification/A0000024.SP','4e108b1ed6db32aac6c280b34b39d097c1089f56db593cb2c67801e6459980d8'),
 T('A0000025.SP','/original/classification/A0000025.SP','3df49866bfabd9ee5d3a8109f1f8e65095d24f39427c0adb61e7f99e2e2c76c0'),
 T('A0000026.SP','/original/classification/A0000026.SP','e0862f86857313a3b8ecd240d9c7bf134b526481fde6e5c885299c7ae8948dd2'),
 T('A0000027.SP','/original/classification/A0000027.SP','eac85c6e1140ca5b91e1e77e7b188d0e14d7a1121550660b5f3c83ee1f4e1ffc'),
 T('A0000029.SP','/original/spectra/jspect2/A0000029.SP','50364b1a2adbf10bf5da6dcc455b61f4c279f4d1075f0d52c27e488e6b8c183b'),
 T('A0000030.SP','/original/classification/A0000030.SP','7c631037192d1c4e5713f359b3b65af210af0efcc0ceb1411d4b034f8cf631f8'),
 T('A0000031.SP','/original/classification/A0000031.SP','a680b8dc806458110bed4db3d61a8d72caf53a37fc9fac94c0f7edd57fe7b93b'),
 T('A0000032.SP','/original/classification/A0000032.SP','4e12734393d94b906fcbd3035b46f209f22de07ebc5df9a9aaddba2fb9ea4bd6'),
 T('A0000033.SP','/original/classification/A0000033.SP','0026b06905657a02d03084182076ec3de806c0d6a8005dc850a767a072ba350a'),
 T('A0000034.SP','/original/classification/A0000034.SP','c04874efa960b10df3931c6b81899f8607387e1d722fc4c69178d70117672a9d'),
 T('A0000035.SP','/original/spectra/jspect2/A0000035.SP','7cc4df7d47c5e61b2fb6f02c0803a976279dd078b075c5fa7d12d08d01cecf22'),
 T('A0000037.SP','/original/spectra/jspect2/A0000037.SP','cabfa61dbcc62e6d7b5c12a4473437d0b6b502b3d5ea458590b5b0b5b8d2f135'),
 T('A0000040.SP','/original/classification/A0000040.SP','108987ce781ef6cf91d49702c407fefd206a2d3f309b46bc8f15e531cf06ca25'),
 T('A0000043.SP','/original/classification/A0000043.SP','1feab8938f6f92918ee06384f50e3aa8dd5b6b9c92d43e5bd6d084094b63a00d'),
 T('A0000044.SP','/original/classification/A0000044.SP','6d49365b7b52266afd3477df21f30c123d89f5d1cf0771f2c6264487c37800c4'),
 T('A0000045.SP','/original/classification/A0000045.SP','65d6501e6e715a86861409703d720f01bd6fe8000dc68fe252f6f5111998a5d7'),
 T('A0000046.SP','/original/spectra/jspect2/A0000046.SP','ed50d12a757da8eb063188e6f2da3c7e7842a68b21c4eb4e35c5a1cff654414c'),
 T('A0000047.SP','/original/spectra/jspect2/A0000047.SP','72e2eb5305eef5fbaa1ac9474b4c94231df74fab797cbd01a089242ad42ef600'),
 T('A0000048.SP','/original/classification/A0000048.SP','e84d7fe32c8111849c07dcc26a17d8b626de809dbd062de40bb6ab5f00391d9a'),
 T('A0000049.SP','/original/classification/A0000049.SP','a26f5bf43520aa0228c108f9870f06f989e708756021d36c5bc9f507ea702220'),
 T('A0000050.SP','/original/spectra/jspect2/A0000050.SP','104aac9e0e680a8b3e052d91f8ee57f149186f1301198ebd7ac54aab5061091e'),
 T('A0000052.SP','/original/classification/A0000052.SP','3214b6c401c865bd0b6a2e7e8e175aae88dd2999512a97606be86c4d5828f897'),
 T('A0000053.SP','/original/classification/A0000053.SP','0767e98bb8d9ddd547f03617f4df519ade729b3a99a8434f6864b74d1a6160af'),
 T('A0000054.SP','/original/classification/A0000054.SP','0577be73298b29e5dcc347387d6fb18175825181c09e98b23c8e5d879d6f3419'),
 T('A0000055.SP','/original/classification/A0000055.SP','3ef2cbdacfb0aacb3c07e9c0e95bf69198a1653722bec4cb0bb66bad10856011'),
 T('A0000056.SP','/original/classification/A0000056.SP','41214387eb8ff27c65bd04e6cad5f8938a5534d99809d5b24b0409ef0d3a2f1f'),
 T('A0000057.SP','/original/classification/A0000057.SP','7d0ef80a736d2b6afaa888c1981df0608368c78006c445d7c8ff473d658d97c8'),
 T('A0000058.SP','/original/spectra/jspect2/A0000058.SP','59f90731a0fd28c3b4b840ca1d7c15895499c9227cadee4197af39cbb3ba313d'),
 T('A0000059.SP','/original/spectra/jspect2/A0000059.SP','4e125cba48da63c8e8e2f8d46617845230f95a43ddc07eccf9d4ca4e21b07016'),
 T('A0000060.SP','/original/classification/A0000060.SP','b0370205f94133550ce41f5e86430851ad3795658610e89702c1245ea77a35ae'),
 T('A0000061.SP','/original/spectra/jspect2/A0000061.SP','f810b4d030b57adfe48f3443cd19adb3ef5296bd5455d79cd33a3abbb846f45b'),
 T('A0000063.SP','/original/spectra/jspect2/A0000063.SP','fb7a5650f41c7543f8eded1dbe15e2555d2409247549b0abf4e094af3f0e7557'),
 T('A0000064.SP','/original/classification/A0000064.SP','f4ddbb2fd7cdeea1d8d658a8603c7ac66571f7fa3d86e40df09be45f536d99fe'),
 T('A0000065.SP','/original/spectra/jspect2/A0000065.SP','84fe731dddb94171d57ec93b86e588459f5f6973f3eda2484e9c7542e37448f1'),
 T('A0000066.SP','/original/spectra/jspect2/A0000066.SP','6578ce4c29cb78706a1401b1e3abecfdcb967a37f1163531ceefc1146f0c46ba'),
 T('A0000068.SP','/original/spectra/jspect2/A0000068.SP','a28bd076c30fa174aa972380c6b8cdadfafcd8297bde67b89b8b09c6bc181685'),
 T('A0000070.SP','/original/spectra/jspect2/A0000070.SP','2c2afae5975fb8dbb2f5c7af66e4624e39d16b75cfe2f654dbf5b1c908133f96'),
 T('A0000071.SP','/original/spectra/jspect2/A0000071.SP','f5761da40410198be92b543df9a51afce08ba60e68876e95802cea3574017c71'),
 T('A0000073.SP','/original/spectra/jspect2/A0000073.SP','6cc257f0bb36570a39d2fabae2cb36cfc406d426b4788d07bca59ead781e76e0'),
 T('A0000074.SP','/original/spectra/jspect2/A0000074.SP','9134445fad5e4533e17cf608cb28aabfc4bf477d3adca4302cdeedc84356d947'),
 T('A0000075.SP','/original/spectra/jspect2/A0000075.SP','aa5ca7d4f993fb9ec1d61ca6ae09d5b383dc28bd9c1692f68084cc6e6518c349'),
 T('A0000076.SP','/original/spectra/jspect2/A0000076.SP','e47fe06a69e4d4ea8a817f119718adad20fd3b584b4dac8197e11ec15f6528dd'),
 T('A0000077.SP','/original/classification/A0000077.SP','f781f314d52bd414c1e2e4de0d961884386456b0e9aa486c866168c72edaab98'),
 T('A0000078.SP','/original/spectra/jspect2/A0000078.SP','ebb8236b9ecd011012495e40dfc9be92288003c6698c297afb251c6c2a91dc98'),
 T('A0000079.SP','/original/spectra/jspect2/A0000079.SP','75542bd72030090a7b7b12eb8a0d6c3ed81667db73134dcc2cbd6d886d15aa42'),
 T('A0000080.SP','/original/spectra/jspect2/A0000080.SP','68cde6b9035bd4d292fa25005e0a7ab5a50ee723d68338dc36fa7a55552e4d74'),
 T('A0000081.SP','/original/spectra/jspect2/A0000081.SP','c0dd6c83c42314c6ca0a0398a18c7b1108d359b37e50dd364b1c60dd6f8300b2'),
 T('A0000082.SP','/original/classification/A0000082.SP','33ee96f008d6faa52112ea52230ff03cda2a5729bb12d3045ae65505d99546b4'),
 T('A0000083.SP','/original/spectra/jspect2/A0000083.SP','7dae1067cffceee9754e182bd72fb337226e57ae52e709fddaa63a55be975881'),
 T('A0000084.SP','/original/spectra/jspect2/A0000084.SP','9b7834b6241710aad0e8e8fdc9c5d9e9926d37bf7fe6d320bfa4b1c4778a91c5'),
 T('A0000085.SP','/original/spectra/jspect2/A0000085.SP','50484037cfca39ddec24ddfe0205ecf9a314bb9d9f875a6ed18e9c35956440ab'),
 T('A0000086.SP','/original/spectra/jspect2/A0000086.SP','a42127ef72150c367fc3616c140906fcd6f37be2c09b7cbe427847dacc8fb871'),
 T('A0000088.SP','/original/classification/A0000088.SP','b2f13a503d2b45d5f5f07004fc4b1c07a2402419a567b7aa811dfaddcd56ccc5'),
 T('A0000089.SP','/original/spectra/jspect2/A0000089.SP','58cac06b1b1ecb88b840db2b599086f72687113659924dde672c78b768790c65'),
 T('A0000090.SP','/original/spectra/jspect2/A0000090.SP','52e7e0c13240f91950215425e6d1e6105c6a3cc71f5241f4be95a9cfb6bb4e35'),
 T('A0000091.SP','/original/spectra/jspect2/A0000091.SP','a2c6b7180f04138d9ae8402a9745023e4fd2214d7e40aab4c055ad70aab5ae05'),
 T('A0000094.SP','/original/spectra/jspect2/A0000094.SP','c40ac4ed57543fcfba3c0c8dbdf25e8202c9e68af5ee2ba3764fde3488dbd1d1'),
 T('A0000095.SP','/original/spectra/jspect2/A0000095.SP','64e9acbceda8c3388aa30b0feccd38608437c0d30135295dd333ef5b41e800c7'),
 T('A0000096.SP','/original/spectra/jspect2/A0000096.SP','a8fbeb2c05002073444cf2eee147558c5010ad5ffa54b42e5c8c40caaa9157ec'),
 T('A0000097.SP','/original/classification/A0000097.SP','c977ba8778bafea3150a7da69b6670d86c1e92f29df77101d0e42fc607b61f5a'),
 T('A0000098.SP','/original/spectra/jspect2/A0000098.SP','2a379a2785b0816f6bbe74a2c7bd577baf8f17a668c2f71cdd0ecab494f50d73'),
 T('A0000100.SP','/original/spectra/jspect2/A0000100.SP','a4b87e9600cf69f0c3187898198035f15d253c2a2d54b93b292ee3648a83d36c'),
 T('A0000101.SP','/original/spectra/jspect2/A0000101.SP','e96a3592cc823bad483eba33bf1281ce80d2f05ee875ed1f7d660e8238fd7bde'),
 T('A0000102.SP','/original/spectra/jspect2/A0000102.SP','2e9ae8c33e572cb1bdc0dc1a168704f78b1782828010f73892d8cb22744bb96e'),
 T('A0000103.SP','/original/classification/A0000103.SP','2dadd3939bb0066a42bd534a78149f301f1fa7c32f8797cf1c0919a0e6c29dd6'),
 T('A0000104.SP','/original/spectra/jspect2/A0000104.SP','410b7811b7776068f8af838896320cd67b0783b76a0eff1b9c68539cc3800da2'),
 T('A0000108.SP','/original/classification/A0000108.SP','4ac005400174e9359ff1bac94b07714f2e22fe9c7a07325df0752e32cfe9ef52'),
 T('A0000109.SP','/original/spectra/jspect2/A0000109.SP','2737e2453c8b770375bfc22e63a33fac5e7e6022e5621fda946ef26fb1415872'),
 T('A0000110.SP','/original/spectra/jspect2/A0000110.SP','75634c0db759f7b78869478b47fe62bc687232cf634a1b731383b6d7317079fa'),
 T('A0000112.SP','/original/classification/A0000112.SP','f1d44e527637c035148615020ad37586fcc04d54fab510d2d8bf92cc5a7e1134'),
 T('A0000114.SP','/original/spectra/jspect2/A0000114.SP','bda479718ccd73098458bc6e2d35d2b3752ca5dcc5b22a3a12cf615fa70e5c5e'),
 T('A0000119.SP','/original/classification/A0000119.SP','0bff0de62c825769c6b22901ecbda6c964ebf587a5422ab07cd1269a1c73dac9'),
 T('A0000120.SP','/original/spectra/jspect2/A0000120.SP','f1c853d3e37582ea5b8416162a9d4f237d9988fca67492784d0d5539f8d1246e'),
 T('A0000121.SP','/original/spectra/jspect2/A0000121.SP','4bd3ef9e7516a1ecdc7557d58ce1546e6af3f52cfb662e77a0469ec1461abbd0'),
 T('A0000123.SP','/original/spectra/jspect2/A0000123.SP','cd59bdf19741bdacc195bd571a4136716c56202f913fc2ab586bbbfa1b60b2c6'),
 T('A0000125.SP','/original/spectra/jspect2/A0000125.SP','a1ad16623af6c8dae8b5f9b55d5757f38c5b65e5138d050557bafe3770c2435f'),
 T('A0000128.SP','/original/spectra/jspect2/A0000128.SP','be5ab21ff8bc882543eb3a396279fea417050ab5774f93f5a7a8bf5d9c863013'),
 T('A0000129.SP','/original/classification/A0000129.SP','e0ed186b268f634ebc7a979088584142e99732b2f358c55cf871646bbcf20694'),
 T('A0000130.SP','/original/spectra/jspect2/A0000130.SP','9576ecd7969522ac7dedc19e68696bdb8671f3042d80e76d872eb2e256eaa6c0'),
 T('A0000131.SP','/original/spectra/jspect2/A0000131.SP','f5ba63b278bce5919d8d4e7ee74d5d679cbca2b730d4d2693c7cbdebd885e673'),
 T('A0000133.SP','/original/spectra/jspect2/A0000133.SP','4eb87c014b198891f97b53fd0f1db95a90216dbf79e2d1ecc862ec68b3f9455f'),
 T('A0000134.SP','/original/spectra/jspect2/A0000134.SP','2f9bc5a192e709ab057f4cbfff79fa257f981250f8fea1341f0dc97e90086c03'),
 T('A0000135.SP','/original/spectra/jspect2/A0000135.SP','70afca61053a4d2cc9fc898f89535e9828bcd697250ba2c81c53331a7d7d5591'),
 T('A0000136.SP','/original/spectra/jspect2/A0000136.SP','a7750f02e3a8e2198f280ae8d619af08a4996d8c9d3c3792af13aa962565da12'),
 T('A0000137.SP','/original/classification/A0000137.SP','0131393c099fbbf6e437f316953fcdbe9ea1fc2cc9f096375e0453213c142bc3'),
 T('A0000138.SP','/original/spectra/jspect2/A0000138.SP','0a5c18555a54e94131c1016181ca97374cb81afa98469ae4817450d36c83cc86'),
 T('A0000139.SP','/original/spectra/jspect2/A0000139.SP','f9d2588397484525024a27c63ba1b1e4acf6bf43cc4991d5773dcddd8dc94aad'),
 T('A0000140.SP','/original/spectra/jspect2/A0000140.SP','a96e79702e755ecddddf98a2102c2cd6e276e20f56283da47c83862c48e9b055'),
 T('A0000141.SP','/original/spectra/jspect2/A0000141.SP','06db89e6663aad02dafdb6451f940d2ce3637303cd419120285166867c9d817a'),
 T('A0000142.SP','/original/spectra/jspect2/A0000142.SP','171b3ad6f9e77dae5ad7a615b607f75b932d3e842728ba0bde0bef5f31e86d76'),
 T('A0000143.SP','/original/classification/A0000143.SP','52f142d849d5b8e069c87592dd71db03c9bf34dff23c96f5f3dbb756c40a020d'),
 T('A0000144.SP','/original/spectra/jspect2/A0000144.SP','eb0506ca270860fb1efe3f8ff61705d20abe3de96a6ae2868e4c02fb09255984'),
 T('A0000145.SP','/original/spectra/jspect2/A0000145.SP','c8795374d747483e36e6d38ca0f956d636dc510074a3de6def3f9e2a51c635d5'),
 T('A0000146.SP','/original/classification/A0000146.SP','a564082b77910d4669e583d978b522506850dc540d9cd2273e0107cb374c0fc6'),
 T('A0000147.SP','/original/spectra/jspect2/A0000147.SP','7a57506f7356cb92d9bbda3d1cfc9bbb4b0ff57fe03510280a987fa9cb33378a'),
 T('A0000148.SP','/original/spectra/jspect2/A0000148.SP','3e855fd201de1b11d08b0e8c5212ead29c9076188bb36910d10ef5fd301b76af'),
 T('A0000149.SP','/original/spectra/jspect2/A0000149.SP','a3e8d50cc8b2466a508cc8b0a9677e97c656fe6855306cc4594b85cb286a1a6c'),
 T('A0000150.SP','/original/spectra/jspect2/A0000150.SP','9520c2548d43fd1bb09471cb0c2d8599b8ad0861ff2fc89b7466c79dae396c1f'),
 T('A0000152.SP','/original/classification/A0000152.SP','406143e087518eb2faae5ac9f03b4daa282feb8edd88f928f24d3c5170b224cb'),
 T('A0000156.SP','/original/spectra/jspect2/A0000156.SP','b82dac1d8c23a2a5179ef2aecc4ca88be582e9f0dbe5121b6485bb837e90ecdd'),
 T('A0000157.SP','/original/spectra/jspect2/A0000157.SP','2f1fc49e91d00c24e816939803b4a5a31a33bbdf6714e3c9c1eee2249a9506a0'),
 T('A0000158.SP','/original/spectra/jspect2/A0000158.SP','30db73376168545653085bb1eb5db3e1e30034b016391cbe9a807fa194714bba'),
 T('A0000159.SP','/original/spectra/jspect2/A0000159.SP','e65ba3bb153e134ea6fb536372adf59a2b1f35ba9e5822c154da494fbc07d40e'),
]);
const G=(file:string,bytes:number,sha256:string)=>Object.freeze({file,path:`/original/spectra/${file}`,bytes,sha256});
/** The bundled own galaxy spectra GLXYSP.LST names (0x55eb64); NGC4670.SP and the other listed files are not bundled, so a
 * fibre that needs one is typed 'spectrum-mapping'. */
export const MULTISPEC_GALAXY_SPECTRA=Object.freeze([
 G('NGC1832.SP',27616,'1672bda5d29e873682762ab5520eaa0a6fb0b572544b71bc41c3d1988b3226bf'),G('NGC2775.SP',27616,'c351191a19b964ba533bc6f7bfa9b9e6d16357a49959b9d4b965d7f086850175'),
 G('NGC2903.SP',27616,'10e2dbab0047a403c52fbd82cbd5ba9ae4b70c18267a0022a0f4cd795c8a2bab'),G('NGC3034.SP',27616,'fbda64779c9ff30aba4ea8598ca4fe63ed6005baa7c2fd0608a2b9108e13662a'),
 G('NGC3077.SP',27616,'5d722e32fcf50208cc9498416d28e50fec1cb430f5033b959d6f6140b4f42f7a'),G('NGC3147.SP',27616,'ed11bc5f62f533e9fdbacce7a93f3006bf5d2f63b75dd6dfd0b1b48d00b952ab'),
 G('NGC3245.SP',27616,'e6d472f29b4cccaf326259a18615431297dc67c2c0accbf43dd71c669561148f'),G('NGC3368.SP',27616,'be8541033b966924bb307a94c0d7491fc166c6226701822e3752715f3a6b7219'),
 G('NGC3379.SP',27616,'da6c6e4b862f422ed98a20d5e951537ba329ac0c76f1fae1c1e2bf33979bae23'),G('NGC3623.SP',27616,'1660ae9f39b25ee9fda075e8d99c22492d8c590abde50c77442bb5515771c85a'),
 G('NGC3627.SP',27616,'06ebf74e9cf292ebb0021539d14b09eb2b96c9ca6c760119b04dcd9a6a144d40'),G('NGC4262.SP',27616,'f26683c9b84fa039c8bbc1ff615a422a7d30e655a872b29f975fb764f2adfa7a'),
 G('NGC4449.SP',27617,'04bf5a4ce4c96b8069a5063a6638a1f14d96f4e93dc315f1bb684bf24bff1da9'),G('NGC4472.SP',27616,'bb03fccb29a2851a8ac78aec6b4757b77eb834f92bee3a4fe8f07e234bab65ad'),
 G('NGC4631.SP',27616,'d333d4a709457869315a2dcefdf0908033c65c40ed623c2554f8f341326bcad8'),G('NGC4750.SP',27616,'14838c700d5fd9700108bc82186820a4ef06b1bd34acd057d2152bd18cb6d03c'),
 G('NGC4889.SP',27616,'d48f79640fa5d70d947388968bccb41beabf9ea8ea95c51ca877c381da101e39'),G('NGC5195.SP',27616,'bc9ef5013a9cdeb605808301e5209a1e21bd7b8844e0e8ca0536e83fd5fdcf21'),
 G('NGC5248.SP',27616,'4c36e909479f981f1a19a4397d46ab17467fc3e55824fc7c68b722f347be8b3d'),G('NGC5866.SP',27616,'4066a6d5cb958ed591c462d394a77c311fe0cd924c36cecdeef710ee6eb4f530'),
 G('NGC6181.SP',27616,'675f7df102251ea07dfbbbed6e560e25d004f2033cc8fc58751fada6e820c899'),G('NGC6643.SP',27616,'0c3b5029702407f51aec0a70a8d9e0f42c9c6af432af693923c12d7c69f3bb83'),
]);

/** The bundled fields a Multi-Spec view can be built from. Object X packs are named by their ObjectX.HTL row (never by target). */
export type MultiSpecPackId=`lss-field-0${LssFieldNumber}`|'hubble-engine-coma'|'hubble-engine-bootes'|`objectx-row-${number}`;
export type MultiSpecFieldRequest=Readonly<{pack:MultiSpecPackId;pointing:Readonly<{ra:number;dec:number}>;telescope:FieldTelescope;variableTime?:FieldVariableTime}>;
export type MultiSpecResources=ObjectXSpectrometerResources;
export type MultiSpecInputs=Readonly<{objectX:ObjectXSpectrometerInputs;starTemplates:ReadonlyMap<string,UniformSpectrum>;galaxyTemplate:MultiSpecContext['galaxyTemplate'];
 /** Hash-checked on demand (file → samples). */
 galaxySpectrum:(file:string)=>Promise<readonly Readonly<{wavelength:number;intensity:number}>[]|null>;
 pack:(id:MultiSpecPackId)=>Promise<FieldPack>}>;
const latin1=(b:Uint8Array)=>{let t='';for(const x of b)t+=String.fromCharCode(x);return t;};
const HUBBLE_PACKS:Readonly<Record<string,unknown>>={'hubble-engine-coma':coma,'hubble-engine-bootes':bootes};
export async function loadMultiSpecInputs(r:MultiSpecResources):Promise<MultiSpecInputs>{
 const checked=async(path:string,bytes:number,sha256:string)=>{const b=await r.file(path,bytes);if(b.byteLength!==bytes||await resourceSha256(b.slice().buffer as ArrayBuffer)!==sha256)throw new MultiSpecInputError('resource');return b;};
 const objectX=await loadObjectXSpectrometerInputs(r);
 const starTemplates=new Map<string,UniformSpectrum>();
 await Promise.all(MULTISPEC_STAR_TEMPLATES.map(async t=>{starTemplates.set(t.file,starTemplateSpectrum(latin1(await checked(t.path,t.bytes,t.sha256))));}));
 const spectra=new Map<string,Promise<readonly Readonly<{wavelength:number;intensity:number}>[]>>();
 const galaxySpectrum=async(file:string)=>{
  const known=objectX.galaxySpectra.get(file);if(known)return known;
  const g=MULTISPEC_GALAXY_SPECTRA.find(x=>x.file===file);if(!g)return null;
  let p=spectra.get(file);if(!p){p=checked(g.path,g.bytes,g.sha256).then(b=>parseLibrarySpectrum(latin1(b)));spectra.set(file,p);p.catch(()=>spectra.delete(file));}
  return p;
 };
 const packs=new Map<string,Promise<FieldPack>>();
 const pack=(id:MultiSpecPackId):Promise<FieldPack>=>{
  let p=packs.get(id);if(p)return p;
  p=(async()=>{
   const lss=/^lss-field-0([1-9])$/.exec(id);
   if(lss){const {loadLssPack}=await import('./lssPack');return loadLssPack(Number(lss[1]) as LssFieldNumber);}
   const row=/^objectx-row-(\d{1,2})$/.exec(id);
   if(row){const r=OBJECT_X_SPECTRUM_ROWS.find(x=>x.row===Number(row[1]));const pk=r&&objectX.packs.get(r.pack);if(!pk)throw new MultiSpecInputError('pack');return pk;}
   const raw=HUBBLE_PACKS[id],rec=(engineTargets.packs as Record<string,{sha256:string}>)[id];
   if(!raw||!rec||await packDigest(raw)!==rec.sha256)throw new MultiSpecInputError('pack');
   const d=decodeFieldPack(raw);if(d.id!==id)throw new MultiSpecInputError('pack');return d;
  })();
  packs.set(id,p);p.catch(()=>packs.delete(id));return p;
 };
 return Object.freeze({objectX,starTemplates,galaxySpectrum,pack,galaxyTemplate:Object.freeze({file:galaxySource.file,samples:galaxySource.samples.map(([wavelength,intensity])=>Object.freeze({wavelength,intensity}))})});
}
/** The field options each family's certified population uses (only the population-affecting ones matter for the view). */
export function multiSpecFieldOptions(inputs:MultiSpecInputs,request:MultiSpecFieldRequest):FieldOptions{
 const vt=request.variableTime?{variableTime:request.variableTime}:{};
 // LSS fields: the recovered QSO merge on the bundled catalogue, as Field Information certifies them (Multi-Spec reaches LSS
 // pointings only in Edit Mode or mode 0; the LSS route's own 'gate' mode concerns its slit spectrometer).
 if(request.pack.startsWith('lss-field-'))return {qso:'merge',qsoCatalog:inputs.objectX.qsoCatalog,...vt};
 if(request.pack.startsWith('objectx-row-'))return {variableDispatch:'recovered',photographs:inputs.objectX.photographs,qso:'merge',qsoCatalog:inputs.objectX.qsoCatalog,...vt};
 const rec=engineTargets.targets.find(t=>t.pack===request.pack&&t.pointing.ra===request.pointing.ra&&t.pointing.dec===request.pointing.dec) as {variables?:string}|undefined;
 return {qso:'merge',qsoCatalog:inputs.objectX.qsoCatalog,...(rec?.variables==='outside-view'?{variables:'outside-view' as const}:{}),...vt};
}
/** The fibre context of a field: its galaxy list with the record names, and the own spectra the given selections need. */
export async function multiSpecContext(inputs:MultiSpecInputs,population:FieldPopulation,telescope:FieldTelescope,selections:readonly MultiSpecSelection[]):Promise<MultiSpecContext>{
 const names=catalogRecords(population).galaxies,galaxies=population.galaxies.map((galaxy,i)=>Object.freeze({name:names[i].id,galaxy}));
 const galaxySpectra=new Map<string,readonly Readonly<{wavelength:number;intensity:number}>[]>();
 for(const s of selections){
  if(s.type!==1)continue;
  const g=galaxies.find(x=>x.name.slice(0,24)===s.name),file=g&&glxyspLookup(inputs.objectX.glxyspLines,g.galaxy.id);
  if(file&&!galaxySpectra.has(file)){const samples=await inputs.galaxySpectrum(file);if(samples)galaxySpectra.set(file,samples);}
 }
 return Object.freeze({telescope,starIndex:inputs.objectX.starIndex,starTemplates:inputs.starTemplates,galaxies:Object.freeze(galaxies),glxyspLines:inputs.objectX.glxyspLines,
  galaxySpectra,galaxyTemplate:inputs.galaxyTemplate,qsoSpectrum:inputs.objectX.qsoSpectrum});
}
export function browserMultiSpecResources():MultiSpecResources{return browserObjectXResources();}
