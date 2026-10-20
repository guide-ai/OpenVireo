# Read-only native observation DAT inspection

Classification includes **Inspect saved observation DAT**. It reads candidate144-byte observational records,shows their stored numerical metadata and encoding,and downloads the exact imported bytes unchanged. It does not generate a native file from the browser notebook,modify imported records,fill a pupil response,compute a velocity or admit a claimed object as a verified catalog/acquired source.

**A matching headerless layout is not authentication.** `.DAT` is also used for unrelated CLEA files. Inspect only files whose source/context you understand. Unknown display kinds,type codes,nonfinite/unsupported numeric encodings and empty candidates remain explicitly unverified. The inspector is separate from the web notebook,its persisted deletion recovery,acquisition,legacy JSON/CSV and all grading/measurement state.

## Try locally

1. Open `http://127.0.0.1:5173/#classification`. Scroll to **Inspect saved observation DAT** and click **Inspect observation DAT file**. Choose a saved observational-results DAT you own. Browser limit:1000records/144000bytes.
2. For a reproducible layout check only,use repository `tests/fixtures/observation-results-synthetic.dat`. Its432bytes/3records are **synthetic format vectors,not observations or output from the original writer**. The siblingJSON records provenance/SHA. It exercises ordinary fields,padding,signed zero,full Extended range and noncanonical encodings;do not use its values as astronomical data.
3. The file name,SHA and count identify the bytes read. Choose **Candidate observation record**. Review object/text/type claims,photometry kind and ten numerical fields. Record1of the synthetic fixture shows raw time1000.5,RA5.5h,Dec−6.25°,Z0.125 and the stored velocity37474.05859375km/s. These are controlled format inputs,not a scientific example.
4. Expand **Stored encoding details** to see width,sign bit,byte offset,original little-endian hex and exact binary expression. Record2demonstrates−0,Extended1×2^-16445and a pseudo-denormal;record3demonstrates unknown kind/type,NaN/infinity and unsupported Extended. They are preserved,not executed as operands or promoted to valid measurements.
5. **Download unchanged DAT bytes**,reimport and compare SHA. Every byte,including unused short-string padding and NaN payloads,is preserved. This is copying an owned input,not evidence of original-writer equivalence.
6. Try a partial record,over-limit file or short-string length beyond15/36. Reading rejects the whole candidate and keeps the previous inspected file and notebook. **Cancel DAT read**,source/file/investigation activity and navigation invalidate late reads. The previous inspection remains while the view stays mounted. Reload requires reimport;no old session restore reconstructs an inspected DAT.

No new original resource is included. The synthetic test fixture is clearly marked and is not part of the1279original-resource manifest. Existing notebook-v1,legacy investigation/classification JSON/CSV,manual answers,confirmed histories and deletion Undo remain unchanged.

## Recovered layout and units

| Offset | Bytes | Stored field | Inspection interpretation |
|---|---:|---|---|
|0x00|16|ShortString15 object|Unverified identifier claim;original ACP unknown|
|0x10|8|Native time Double|Native day-count word;**not labelled raw JD**|
|0x18|10|RA Extended|Stored hours|
|0x22|10|Dec Extended|Stored degrees|
|0x2c/0x36/0x40/0x4a/0x54|10each|U/B/V/R/I Extended|Kind0mean counts/s;kind1magnitudes;other kinds unresolved|
|0x5e|1|Photometry kind|Unsigned0/1with recovered labels;other values retained|
|0x5f|4|Spectral code|Signedint32;generic known-code display only,no correctness grade|
|0x63|4|Redshift Z Single|Dimensionless stored claim;no velocity derived|
|0x67|4|Velocity V Single|km/s stored claim;no validation grade or recomputation|
|0x6b|37|ShortString36 remarks|Claimed text,not executable HTML|

[Hashed provenance](NATIVE-OBSERVATION-RESULTS-PROVENANCE.json) binds field accesses,compiler fields,record-size reader/writer,complete numeric activation/confirmation/date/coordinate bodies and unit labels to original executable SHA256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`. Source bytes,credits and uncertainties are retained. Original execution/emulation is prohibited and was not used.

**Time-word correction:** earlier notes called+0x10“JDdouble”from the form caption. Actual activation passes the storedDouble through date-object assignment0x487b64and JD formatting0x488188. Getter0x487bcc adds object+0x2aand runtime global0x5bad48. That global is initialized in0x5ac748with1721424.5,with a conditional runtime correction693594;neither the active host branch nor the date-object offset/UTC context is stored in this144-byte record. The inspector therefore shows the raw timeword and does **no JD,MJD,calendar or UTC conversion**. Existing raw research captures remain unchanged;the prior interpretation is corrected explicitly in repository provenance.

The native numeric dialog compares zero then leaves the field blank. Zero can be unset or a genuine value,such as RA0orDec0. The inspector retains zero and sign and does not choose an interpretation. Original velocity activation can writeC*z under a runtime option,and OK validates a nonempty velocity after textual writes;these side effects and full FPU/zero/locale conditions are not performed here.

## Representation and deliberate bounds

The decoder inspects integer bit fields of little-endian Single32,Double64and Extended80. Canonical finite values are represented exactly as a signed integer times a power of two. It renders an exact decimal only within a declared bounded policy:at most96fractional places,positive binary power<=256and120integer digits. Otherwise the exact binary expression remains available,so a small Extended subnormal is not silently rounded to binary64zero. Signed zero,raw infinity/NaN payloads,pseudo-denormals and unsupported Extended are classified and retained;exceptional/noncanonical encodings are never evaluated as operands. [Intel SDMVol1§4.8and§8.2.2](https://www.intel.com/content/dam/www/public/us/en/documents/manuals/64-ia-32-architectures-software-developer-vol-1-manual.pdf) is the format reference. Bit decoding and bounded mathematical rendering do not reproduce x87 instruction execution,precision control,rounding state,exceptions or native formatting.

Object/remarks lengths are checked before display. Text uses explicit Windows-1252 with control/undefined bytes escaped;the original machine ACP cannot be inferred. No text/numeric field is re-encoded for download. Parsed data are immutable and bound privately to owned original bytes;an arbitrary constructed object cannot request a reconstructed DAT.

The original typed-read helper checks bytesRead against0x90and reports IOerror100on a short record. Its list loader can append earlier rows before a later error. The browser's whole-file validation and atomic replacement are a safety adaptation. No captured application header authenticates a file and no physical coordinate/photometry truth test is invented.

No original writer-output specimen within the admitted noncatalog DAT size/layout was found in the available local tree. That is not proof about all possible files. Current evidence supports this conservative inspection,not full native editable import/merge/export or a reconstructed writer. Missing ownership of notebook numerical values,date/UTC runtime state,full velocity/locale/FPU validation,text codec,edition/classroom/source-specific rights and original runtime/output witnesses remain open. All64primary acceptance statuses unchanged;project partial. External review remains on the explicit human hold,0new attempts,no substitute or deployment. This increment is validated locally before any further push.
