# Correcting fields in an owned observation DAT

The saved-observation inspector can now correct an existing imported record's object label,remarks and optional packed spectral-type code. It preserves the supplied file's other records,raw time/coordinate/photometry/redshift/velocity bytes,kind and unused text tails. It does not create a native file from the web notebook or invent missing observation metadata. A matching layout is still not proof of origin,physical truth or a correct classification.

At http://127.0.0.1:5173/#classification:

1. **Inspect native observation DAT** and select a file record. Use **Edit selected DAT text fields**.
2. Change a label(up to15printableWindows-1252bytes) or remarks(up to36). Cancel/Escape and reopen:unconfirmed work is discarded;the file stays exact.
3. To change its categorical spectral code,explicitly enable **Replace stored spectral type code manually** and enter your own type(up to12bytes). The replacement code is previewed. An old displayed label may not round-trip to the original int32;leave replacement off to preserve it. No type is supplied from a catalog or graded.
4. **Confirm DAT text changes** validates every changed field and hashes a separate edited copy before committing. Unsupported Unicode,unsafe colon-only type or hash failure keeps the prior file and entered fields. Only explicit changes are written;unchanged escaped/control text and unknown codes remain opaque.
5. **Download unchanged DAT bytes** always saves the original input. **Download edited DAT copy** saves the confirmed copy under an edited filename. Reimporting it verifies its structure and digest in the same inspector. Original-application acceptance is not claimed without an original writer/runtime witness.
6. **Undo last DAT text edit** restores the previous exact byte snapshot,one level. **Restore original DAT bytes** requires confirmation and can first export the edited copy. Choosing another valid file also reviews replacement if edited work exists;invalid reads or Cancel retain both copy and Undo.

Edits are held only in memory. Save the edited copy before reloading. Existing investigation/classification JSON/CSV and notebook/recovery files remain unchanged and do not contain this file. Editing a label does not retarget its coordinates or infer a source identity;the file never gains acquired/practice authority. Source/context/file activity cancels pending dialogs and late hash/read operations cannot commit into another context.

## Recovered contract and limits

[Provenance](NATIVE-OWNED-RECORD-EDITS-PROVENANCE.json) pins executableSHA781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c. Complete native OK handler0x54b02c..0x54b22b writes objectShortString+0(max15),remarks+0x6b(max36) and packed type signedint32+0x5f. The bound copy helper0x403c5c..0x403c75 writes a length and used bytes;unused tails are not shown cleared. The full runtime Move implementation and existing typed-record/file writers are captured with byte/listing hashes;the writer transfers existing144-byte records. No original code was executed or emulated.

The browser patches only these explicit fields of privately owned input,then reparses/hashes the result. It does not regenerate a record or numerically encode its stored fields. Sparse edits,strict printableWindows-1252,rejecting rather than truncating,atomic confirmation,one-level exact Undo and safe replacement are explicit browser policies. Native machine ACP,full activation/locale/order,conditional velocity/C*z/FPU checks and runtime behavior remain unported. Native OK always visits its text/type controls and may then validate velocity;this bounded patch operation does not claim that full modal side-effect equivalence.

No native writer-output specimen or runtime-open oracle is available. Existing-byte preservation plus independent byte controls establish the implemented structural policy,not original binary/runtime/scientific equivalence. Notebook→DAT creation still lacks owned time/position/photometry/velocity metadata and remains blocked. No padding is invented,no rawtime→JD conversion,acquisition/noise/integrator change or answer key is added. Existing1279resource bytes/credits/source-specific uncertainty remain unchanged. All64primary statuses remain unchanged;OpenVireo is partial. See[validation](NATIVE-OWNED-RECORD-EDITS-VALIDATION.md).

[DAT and Program List review corrections](DAT-AND-PROGRAM-REVIEW-FIXES.md) add field-specific consent for escaped raw text, cancel cross-dialog late reads and restore useful keyboard focus. Native numerical fields, converter/record formats, notebook persistence and scientific acceptance remain unchanged.
