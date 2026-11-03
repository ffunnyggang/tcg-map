# Generated image persistence (test route)

Successful provider outputs are stored in the private `overlay-generated-images` bucket. `overlay_generations` contains the owning Auth user, mode, model/prompt version, dimensions, output-window coordinates, raw/prepared paths and timestamps. Original card uploads and masks are not retained as separate files.

The Edge Function verifies the session with project Auth and the existing overlay test-account flag. Every history lookup and prepared-image update is filtered by the authenticated owner. The table and bucket have no direct client grants. Signed image URLs expire after ten minutes; URL expiry does not delete the stored image.

- `generations`: latest twenty records belonging to the caller, no AI/quota usage.
- `load_generation`: ownership lookup, then a signed download URL.
- `save_result`: replace the prepared PNG for one owned generation, preserving its provider PNG; no new generation.

Raw outputs are saved before the generation response. Browser-composed outpainting and independent backgrounds are then stored as prepared results. Full-card results use the provider PNG directly. If persistence fails, the provider image is still returned with `storageSaved: false`; the UI asks the user to download it. No automatic AI retry is made.

For full-card printing, the existing shape/window-tolerance controls and PNG/A4 exporters use the selected full-art result after manual review. Its 63×88mm area is unchanged; edge pixels extend into the sacrificial 2mm bleed. The guide cuts the configured illustration window as in the existing overlay workflow. The separate full-art PNG download remains guide-free.

History restores output pixels and saved window coordinates, not the original photographed card. Manual review is required before export, and a fresh original upload is required before new AI generation. Provider-only backgrounds are identified as potentially uncorrected. Results generated before this feature cannot be recovered retroactively.

This remains an unlisted test feature. Account deletion removes metadata through the foreign key; private object cleanup must be included in the account-deletion workflow before public launch. No new expiry/deletion policy for image retention is introduced here.

Validation: server mocks cover owner checks, signed downloads, prepared updates, persistence failures and moderation refusal without retries. Native canvas QA verifies that the original full-card pixels remain unchanged within the 2mm bleed and that square/rounded guides and A4 PDF export work. Storage/metadata transport is exercised separately with a temporary synthetic fixture and cleaned up; no blocked image is resubmitted.
