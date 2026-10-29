# Submission checklist

## Links to replace

Replace the two sample URLs below with your uploaded Drive links:

- **Walkthrough video (max 5 minutes):** `https://drive.google.com/file/d/REPLACE_WITH_VIDEO_ID/view`
- **Resume:** `https://drive.google.com/file/d/REPLACE_WITH_RESUME_ID/view`

### Exact replacement location

Open [`SUBMISSION.md`](./SUBMISSION.md) and replace only the values on the two lines above. The app's code does not contain these links, so no rebuild is needed just to update the submission document.

## Sample screenshots

These are generated screenshots of this implementation for layout reference. They are not a substitute for the real-app screenshots required by Tasks 0 and 1:

- [Sample Track list](./sample-track-screen.png)
- [Sample transaction details](./sample-transaction-detail.png)

Replace them with screenshots captured from your own device after using the real Simplify Money app.

## Expo token

Do not paste an Expo token into this document or into the app. Set it in PowerShell only for the current session:

```powershell
$env:EXPO_TOKEN = "paste-your-token-here"
npx eas-cli whoami
```

For EAS/CI, store it as a masked secret named `EXPO_TOKEN`. The mock API in this project does not need an API key.

## Task 0

- [ ] Download the Simplify Money app, complete profile, and capture feedback.
- [ ] Refer it to three friends.
- [ ] Add the honest feedback one-pager and screenshots here.
- [ ] Follow Simplify Money on LinkedIn, Instagram, and YouTube.

## Task 1

See [`TASK-1-TEARDOWN.md`](./TASK-1-TEARDOWN.md). Replace sample observations with real screenshots and device notes.

## Task 2

Implemented in [`App.tsx`](./App.tsx), using the cloned API in [`track-api-mock/`](./track-api-mock/).

## Task 3

See [`PR-REVIEW.md`](./PR-REVIEW.md).

## AI disclosure

AI tools used: Copilot SDK in VS Code for code scaffolding, API-shape review, and targeted debugging. I verified the mock API contract and reviewed the generated implementation rather than accepting it unchanged.

Concrete correction: an initial straightforward pagination approach would append each API page directly. The API intentionally repeats its cursor boundary record, so I changed the implementation to merge by transaction ID. That is the important difference between plausible output and the behavior required by this API.

## What is unfinished

- Task 0 requires real app usage, referrals, and feedback from real people; those cannot be truthfully completed from code.
- The Task 1 screenshots and device measurements must be captured by the applicant.
- The performance stretch task has not been measured on a physical mid-range Android.
