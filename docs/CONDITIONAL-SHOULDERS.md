# Conditional shoulder editing and held-gesture geometry

The existing manual feature cursor now revalidates marked shoulders when the learner re-marks the center, using the recovered **right-first, then left** order. It no longer clears every shoulder unconditionally. With **Mark center** selected, left mouse marks the center and right mouse marks a continuum shoulder; the primary-button shoulder tool remains available for touch/keyboard. No new renderer or persistent format is added.

Held gestures now capture the SVG screen transform. A changed transform, relevant scroll, resize, window blur, source, draft, tool, capture or visibility cannot commit a stale point at release. These changes complete a bounded editing flow in the separately source-bound measurement plot; they do not reproduce the full native shared-comparison/photo/pixel context.

## Original evidence

[Provenance](CONDITIONAL-SHOULDERS-PROVENANCE.json) pins executable SHA-256 `781bc9704b4674038267834a9ed21d502c455378d8fc9eb15a1653e20c52c54c`, six fragment byte/listing hashes, evidence IDs, the existing complete feature-width dossier and original help/manual/license/resource hashes. Captures remain outside web source. No original execution, instruction emulation or new original asset is used.

| Evidence | Recovered meaning |
|---|---|
| VIREO-SHOULDER-COND-01, `0x5096dc..0x50974b` | Store the newly selected center X/Y. Call the shared guard on the existing right candidate, clearing its X/Y on failure; then call it on the left candidate against the updated state. The complete routine/stack cleanup remains in the existing feature-width dossier. |
| VIREO-SHOULDER-COND-02, `0x509c50..0x509cf4` | Require the candidate Y in the center's125px panel and candidate X in0..500. For present positive-X shoulders, require center strictly below the right X and strictly above the left X. Both constraints are checked for each candidate. |
| VIREO-SHOULDER-COND-03, `0x509994..0x509b1c` | Require an existing center/same-panel candidate; select left/right by X relative to center and retain manually chosen trace-height continuum. SEH/string cleanup is distinguished from the state transition. |
| VIREO-SHOULDER-COND-04, `0x5094cc..0x509624`; CLASSHLP192–225 | Left marks/reads center; the measurement non-left branch handles shoulders and held updates. The help specifically describes the right button. The port admits right only and leaves middle unhandled. |
| VIREO-SHOULDER-COND-05/06, `0x507814..0x5078b3` / `0x509eac..0x509f24` | Native plot left0, width500,125px panels; subtract plot left and derive intensity from the selected panel baseline. These are not the browser's860×250 plotting dimensions. |

The order matters. With valid shoulders L/R and a new center C, the continuous-wavelength adapter yields:

| New center | Surviving marks |
|---|---|
| `L < C < R` | Both, with their original input strings unchanged. |
| `C >= R` and `C > L` | Left only. |
| `C <= L` | Neither: the old left constraint first invalidates the right, then the left fails. |

This is a shared, ordered predicate rather than two independent side filters. Complete valid pairs stand for present markers in the single explicitly selected source. Malformed/incomplete, out-of-profile or nonpositive-continuum pairs do not become inferred positions. Equality fails the strict comparison. Confirmed width records remain untouched.

## Browser boundaries

The existing3900–4500Å, positive-continuum≤1, continuous-wavelength/six-decimal draft policy remains. The native guard uses integer pixels and positive-X marker sentinels. This port applies its recovered constraint/order to the existing logical wavelength input, without claiming identical500-pixel rounding, sentinel, Extended/x87 or GDI behavior. When native X/Y invalidates, the browser clears the corresponding draft wavelength/intensity pair; it does **not** claim that native Extended wavelength/intensity fields were zeroed. Boundary/manual numeric input remains governed by the existing browser domain.

Only an explicit cursor-center transaction performs this revalidation. Numeric text can still be edited partially without being erased while typing; calculation retains its existing strict region checks. Marking an equal-center or zero-height shoulder remains rejected under the established finite guards rather than exposing native unsafe branches.

Native callbacks update on down/held movement; browser marks remain preview-only until a validated release. With **Mark center**, the captured mouse action chooses center for left and shoulder for right. **Mark continuum shoulder** keeps primary-button touch/keyboard support. **Inspect cursor** does not consume the browser context menu. Context-menu events alone never write a draft. No source-flux snapping, continuum fit or class answer is supplied.

The held transaction binds source through the existing selected-source component ID/hash/role key, plus draft strings, chosen tool/button, pointer ID/capture and screen transform. Unrelated pointer cancellation does not abort the primary mark; a changed actual geometry or inactive context does. A queued scroll event with unchanged transform does not reinterpret the point. Browser layout/focus/resize protection is an explicit adaptation, not an original VCL scheduler claim.

The integrator, source sampling, source-plus-sky addition, counts/seeds, classification, grade and JSON/CSV contracts are unchanged. Practice unknowns retain existing saved input records; reference/imported/acquired regions/results remain temporary under [selected-source width](SELECTED-SOURCE-WIDTH.md). Its known stopping-test accuracy limits remain in force.

## Try the flow locally

1. Open `http://127.0.0.1:5173/#classification`. Under **Manual equivalent width**, choose the actual **Equivalent-width source**, then expand **Mark a feature on the curve**.
2. Select **Mark center**. Left-click an interior center, then right-click each continuum shoulder. Heights are your manual continuum choices. For an interaction trial only, use center≈4150Å and shoulders≈4100/4200Å at≈0.99; these are not prescribed scientific line boundaries.
3. Left-click≈4175Å: both shoulder fields/markers remain. Left-click≈4300Å: the right pair clears while the left remains. Re-mark a right shoulder≈4350Å, then left-click≈4000Å: both clear according to the recovered order.
4. Re-mark a valid region and **Calculate equivalent width**. Cancel/Escape adds no record; only a converged original-practice **Save width measurement** creates an existing-format input record. Editing the center does not rewrite an older record. Other source results remain temporary.
5. Hold a marking gesture, then scroll the plot, resize or leave the window before release: no point is committed. Changing source or editing numeric draft text during a held gesture also prevents that pending point from being applied to another context.
6. On touch/keyboard, use **Mark center** and **Mark continuum shoulder** buttons. Arrows move a preview, Enter/Space commits the selected tool. Re-marking the center inside the bracket keeps it. Inspect mode retains the normal browser context menu.
7. Save/reload/restore to confirm the same legacy practice fields/records and source isolation. Gesture/action/geometry state is never serialized, and no classification answer is filled.

Full shared-comparison/photo-pane geometry, integer-pixel/sentinel projection, native pan/zoom marker lifecycle, wider domains, native formatting/result files/grades/runtime/edition and classroom acceptance remain open. [Validation](CONDITIONAL-SHOULDERS-VALIDATION.md) records the exact bounded checks. External review is still held; no attempt, push or deployment.
