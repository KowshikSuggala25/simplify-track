# Submission checklist


- **Walkthrough video (max 5 minutes):** `https://drive.google.com/drive/folders/1dR-_xJ257kuWi_lcmeyH6d9WJ5i0LmXU?usp=drive_link`
- **Resume:** `https://drive.google.com/drive/folders/13A-mEAyxscfPe4B6TMmbIRn2uWBgSVkD?usp=drive_link`
- **Android build (APK):** [Expo EAS build](https://expo.dev/accounts/kowshik_25/projects/simplify-track/builds/7adf3c09-e440-4114-8e87-177630d6beea)


## Evidence screenshots

Task 0 evidence captured from the local implementation:

- [Task 0 one-pager](./TASK-0-ONE-PAGER.md)
- [Track screen](./task-0-track-screen.png)
- [Transaction details](./task-0-transaction-detail.png)

The older layout references remain available as [sample Track list](./sample-track-screen.png)
and [sample transaction details](./sample-transaction-detail.png).

Replace them with screenshots captured from your own device after using the real Simplify Money app.

## Expo token

Do not paste an Expo token into this document or into the app. Set it in PowerShell only for the current session:

```powershell
$env:EXPO_TOKEN = "paste-your-token-here"
npx eas-cli whoami
```

For EAS/CI, store it as a masked secret named `EXPO_TOKEN`. The mock API in this project does not need an API key.

To create another shareable Android APK from an authenticated terminal:

```powershell
npx eas-cli build --platform android --profile preview
```


## Task 0

- [ ] Download the Simplify Money app, complete profile, and capture real feedback.
- [ ] Refer it to three friends.
- [x] Add the Task 0 one-pager and implementation screenshots.
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

