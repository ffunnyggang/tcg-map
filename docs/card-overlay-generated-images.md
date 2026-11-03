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

## 일러스트만 확장 옵션

`illustration` 모드는 `generate_illustration` 요청으로 카드 전체 1008×1408 PNG를 전송합니다. `docs/card-illustration-prompt.txt`의 고정 프롬프트를 사용해 기존 그림의 위치·크기는 유지하고 카드 글자·기호·로고·배지·내부 프레임·외곽 테두리를 제거한 자리를 풍경으로 채우도록 요청합니다. 기존 `fullart` 프롬프트와 기본 모드는 유지합니다. 출력 품질은 보장하지 않으며 사용자가 원본과 비교해 확인합니다.

성공 결과는 같은 비공개 저장 경로에 `mode=illustration`, `prompt_version=card-illustration-only-v1`로 저장합니다. 이력 불러오기, 원본 PNG, 사각·라운드 절단선 PNG와 A4 PDF를 지원합니다. 바깥 2mm 인쇄 여백은 AI 재생성 없이 가장자리 픽셀을 연장합니다. 자동 재시도나 거절 시 다른 모드로 전환하지 않습니다.

기존 DB에는 다음 변경을 먼저 적용합니다. RLS와 권한은 변경하지 않습니다.

```sql
alter table public.overlay_generations drop constraint overlay_generations_mode_check;
alter table public.overlay_generations add constraint overlay_generations_mode_check check (mode in ('original','independent','fullart','illustration'));
```
