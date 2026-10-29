# Simplify Track

React Native / Expo implementation of the Simplify Money Track assignment.

## Run it

1. Start the mock API:

   ```powershell
   cd track-api-mock
   node server.js
   ```

2. Install and start the Expo app:

   ```powershell
   npm install
   npm start
   ```

The default API URL is set for the Android emulator in [`src/config.ts`](./src/config.ts). For iOS, use `http://localhost:4010`. For a physical phone, use your computer's LAN IP.

## What is included

- Month-by-month transaction list with spend and income totals
- Merchant search
- Transaction detail sheet
- Cursor pagination with duplicate boundary protection
- Pull-to-refresh using the incremental changes endpoint
- AsyncStorage cache and an offline read-only fallback
- Assignment write-up files and PR review in this repository

The video and resume links are deliberately sample placeholders in [`SUBMISSION.md`](./SUBMISSION.md).

## Expo authentication token

Do not put an Expo token in `App.tsx`, `src/config.ts`, `app.json`, `.env`, or any committed file. The token is for the Expo/EAS CLI, not for the mobile app runtime.

For one PowerShell session, set it before running EAS commands:

```powershell
$env:EXPO_TOKEN = "paste-your-token-here"
npx eas-cli whoami
```

For EAS builds, add it as a secret instead:

```powershell
npx eas-cli secret:create --name EXPO_TOKEN --scope project
```

Paste the token only when the CLI prompts you. For GitHub Actions or another CI provider, create a masked secret named `EXPO_TOKEN`. Never send the token in chat or commit it to this project.

The mock API does not require an API key. Its URL is configured in [`src/config.ts`](./src/config.ts).
