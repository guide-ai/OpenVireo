# Project naming and existing local saved files

The project, UI, package, component, exported filenames and own JSON format/policy identifiers use **OpenVireo**. Attribution to the original **Project CLEA / VIREO**, source addresses, original artifact hashes and scientific uncertainty remain. The physical project directory and loopback preview service are unchanged. Published Git history is preserved; this correction applies to the current versioned tree.

New exports use current project markers. Existing local saved JSON is admitted through a bounded metadata migration before each strict schema/proof/replay validator. Only `format`, `policy`, `policyId` and fields ending in `Policy` are projected. A small allowlist of known saved producer signatures supports previously written files without retaining the retired literal in source. Those signatures identify metadata; they are not authentication or scientific evidence. Unrecognized producer markers still fail the existing schemas. Traversal is limited to 64 levels and 2 million nodes; existing UTF-8, file-size, event, shape, domain and source-proof bounds remain.

Acquisition identities remain stable. The hash representation uses the producer metadata bound by the unchanged scientific source policy; current exports still carry current project markers. This preserves `acquisition_id`, acquired spectrum filenames, archive references, classification links and measurement origins without re-keying pupil data. Five regression cases cover a stored star, all three galaxies and a linked investigation; all five fail with the pre-fix migration and pass after the correction. These are web saved-file compatibility checks, not native writer oracles.

Numeric values, counts, seeds/RNG, timing, selected catalog IDs, measured entries, manual fits/interpretations, notes and imported text are not renamed. Only changed metadata paths are copied. Scientific resource files remain unchanged and excluded from Git; the runtime projects their presentation policy markers without rewriting their bytes or hashes. No original resource is added to make a public checkout build.

Payload budgets remain unchanged. The wire size permits only the actual one-byte growth at each admitted producer field (at most 4096 bytes for a full file). A raw photometer journal has exactly two such fields, so its original 131072-byte payload has a 131074-byte wire ceiling. An actual valid earlier journal at exactly 131072 bytes imports, preserves notes/readings/RNG and re-exports at 131074 bytes; a further payload byte is rejected. Traversal failures map to the existing typed domain errors. Immutable imported resources share a cached metadata projection; parsed mutable files do not. Existing test-port environment settings remain recognized.

The original saved snapshots and their hashes remain separate witnesses. Current re-export intentionally has a different producer header, so tests compare its exact metadata projection and independently verify the captured original hashes and scientific snapshots. The five P01 scientific CSV hashes remain fixed; the session regression hash changes for its current header. Existing raw/full version numbers and scientific proof hashes are unchanged. This is a current product naming correction, not an assertion that an earlier named project was a legacy system.

Manual check at the existing preview after integration:

1. Open `http://127.0.0.1:5173/#observatory`; verify title and product name.
2. Restore a saved investigation, verify its measurements and settings, then **Save investigation**. The download filename and format/policy markers use OpenVireo.
3. Reload and restore that export; save again and verify stable output. An invalid proof must reject atomically and retain confirmed work.

The separate arrival refinement is not part of this naming commit. [Validation and review resolutions](PROJECT-NAMING-VALIDATION.md) record the exact snapshots and limitations. No native CLEA execution, new acquisition model, dataset redistribution or deployment is introduced.
