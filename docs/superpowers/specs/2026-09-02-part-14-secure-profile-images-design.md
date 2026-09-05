# Part 14: Secure Profile Image Uploads

## Goal

Allow any authenticated user to upload, replace, and remove their own profile image. ADMIN and CSA users may additionally manage profile images for linked Agents. Store the image on the canonical user identity so the same avatar appears anywhere that person's name already appears, including Agent surfaces, deal cards, and the Team directory.

Agents without linked user accounts continue to display initials until they are credentialed. This is an accepted limitation.

## Scope

### Included

- Upload, replace, and remove a user profile image.
- Authenticated user self-service plus ADMIN/CSA management of linked Agent images.
- Durable Replit App Storage.
- Canonical persistence through the existing nullable `users.avatarUrl` field.
- Image display in Agent Detail, Agency Detail Agent roster tiles, user-profile surfaces, assigned-team/deal-card surfaces, and the Team directory wherever the person's name already renders.
- Initials fallback when no image is present or no linked user exists.
- Final regression covering Parts 1–14.

### Excluded

- Agency logos.
- Image filters or editing.
- Client-side cropping.
- SVG uploads.
- Images for Agents that do not yet have linked user accounts.

## Storage and processing

1. The authenticated browser submits an image to the API.
2. The API enforces the authorization rules below.
3. The server validates the actual file signature (magic bytes), not only the extension or declared MIME type.
4. Only PNG, JPEG, and WebP source content is accepted. SVG is always rejected.
5. The server decodes the image, applies orientation, resizes it to fit within 512×512 pixels without upscaling, and re-encodes it to a normalized safe format.
6. Re-encoding strips EXIF and other source metadata, including possible GPS data, and prevents serving malformed source bytes.
7. The normalized image is written to durable App Storage using an opaque generated object name.
8. The normalized object path is persisted to `users.avatarUrl`.
9. Replacing or removing an image deletes the prior managed avatar object after the database update succeeds. Failures must preserve the previously working avatar.

The API accepts source files up to 5 MB. The decoded image must also respect explicit pixel/dimension limits to prevent decompression-bomb resource exhaustion.

## Authorization and visibility

### Modification

- Any authenticated user may upload, replace, or remove their own avatar.
- ADMIN and CSA users may manage an Agent's avatar.
- Other authenticated users may not modify that avatar.
- Authorization is enforced server-side using the authenticated user and target user identity.

### Viewing

`avatarUrl` follows the established Part 7–8 field-exposure rule: it may project anywhere the person's name is already authorized to render.

The avatar-serving endpoint requires authentication but not object ownership. This allows authorized carriers and clients viewing deal cards to load assigned-team avatars. The endpoint must not expose private profile fields or permit unauthenticated access.

## API design

- Add an authenticated endpoint that accepts one avatar image for a target user.
- Add an authenticated endpoint that removes the target user's avatar.
- Keep upload authorization separate from generic user-profile editing so CSA access is narrowly scoped.
- Add `avatarUrl` to partner Agent list/detail projections by joining the Agent profile's linked user.
- Continue returning `avatarUrl` from existing user-profile responses.
- Return the canonical serving URL after successful upload/removal.

Errors use clear 4xx responses:

- 400 for invalid image content, disallowed format, invalid dimensions, or oversized input.
- 401 for unauthenticated requests.
- 403 for an authenticated user who cannot manage the target profile.
- 404 when the target user or linked Agent identity does not exist.
- 500 only for unexpected processing/storage failures; these must not erase a previous avatar.

## UI design

### Agent Detail

- Replace the initials-only header avatar with a shared avatar component.
- Hover/focus reveals a camera affordance only when the viewer can modify the image.
- Activating it opens the native file picker.
- Show a local circular preview and upload progress.
- Provide Replace Image and Remove Image actions.
- Show a concise inline error and retain the previous image if upload fails.

### Shared rendering

Use one shared avatar renderer with:

- Image with `object-fit: cover`.
- Initials fallback.
- Consistent accessible alternative text.
- Configurable size.

Wire it into:

- Agent Detail.
- Agent roster tiles in Agency Detail.
- Existing user profile and mini-profile surfaces.
- Deal-card/assigned-team surfaces where names already render.
- Team directory staff rows/cards.

The upload control is not shown on read-only surfaces.

## Security requirements

- Inspect magic bytes and perform a real image decode.
- Never accept or serve uploaded SVG.
- Re-encode every accepted upload before storage.
- Strip metadata through decode/re-encode.
- Limit request size, decoded dimensions, and output dimensions.
- Generate opaque server-side object names; never trust client paths.
- Require authentication for upload, removal, and avatar serving.
- Enforce self authorization, or ADMIN/CSA authorization when modifying a linked Agent.
- Set an explicit image content type and safe cache headers when serving.
- Do not leak storage bucket URLs or signed upload credentials as the persisted public value.

## Testing and acceptance

### API

- Anonymous upload/remove/read returns 401.
- Authenticated user self upload/replace/remove succeeds.
- A user modifying another user returns 403.
- ADMIN and CSA Agent-avatar management succeeds.
- Unauthorized roles return 403.
- Valid PNG, JPEG, and WebP content succeeds.
- Renamed or MIME-spoofed non-image content is rejected.
- SVG is rejected regardless of extension or MIME declaration.
- Oversized files and excessive decoded dimensions are rejected.
- Stored output is resized to at most 512 pixels, re-encoded, and contains no source EXIF metadata.
- Replacement/removal preserves consistency and cleans old managed objects safely.
- Authenticated non-owner avatar read succeeds.
- Partner Agent list/detail responses project `avatarUrl`.

### UI

- Agent Detail can upload, replace, and remove when authorized.
- Unauthorized viewers see no modification control.
- Initials remain as the fallback.
- Agency Detail Agent roster, Team directory, user profile, and deal-card/team surfaces render the same image.
- Upload pending and failure states are clear and preserve the previous avatar.
- Layout remains correct at desktop and tablet widths.

### Regression and delivery

- Run focused API and UI tests.
- Run the project baseline typecheck.
- Run source and schema checks appropriate to the change.
- Browser-verify Agent Detail, Agency Detail roster, Team directory, and a deal-card assigned-team surface.
- Confirm canonical data restoration and no disposable fixtures.
- Commit implementation as `Part 14: add secure profile image uploads`.
- Push to `origin/feature/contact-architecture`.
- Deliver one final acceptance report covering Parts 1–14, including the accepted limitation for Agents without linked users.
- STOP after the report.