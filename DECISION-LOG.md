# Decision log

## 1. Expo instead of bare React Native

I chose Expo because this task is about a working phone experience, not native build configuration. It gives a reviewer a faster path to run the app while keeping the code portable. A bare app would add setup cost without improving this screen.

## 2. One screen plus a detail sheet

The main job is scanning a year of transactions. I kept navigation shallow: the list is the primary screen and a bottom sheet exposes the full row. This preserves context when a user closes details.

## 3. Month headers are data rows

I render month summaries inside the same `FlatList` as transactions. That keeps one virtualized scroll surface instead of nesting a list inside each month. The trade-off is a small row-union type, which is easier to reason about than nested scrolling.

## 4. Search filters the local cache

Merchant search is local and immediate. The dataset is one user's year and is already downloaded for the Track screen, so a remote search request would add latency and introduce another failure mode.

## 5. Cursor pagination is deduplicated by ID

The API deliberately re-sends the boundary record in a subsequent page. A naive append makes the UI lie. I merge into a map keyed by transaction ID and sort by occurrence time after each page.

## 6. Refresh uses the changes endpoint

A refresh should not silently throw away previously loaded pages. When a sync token exists, I apply additions, updates, and deletions from `/changes`; a failed incremental request falls back to a full refresh.

## 7. Offline mode is cache-first after the first successful load

AsyncStorage stores transactions, accounts, and the sync token. If the network fails, the last known data remains visible with an offline banner. I do not invent a successful sync timestamp.

## 8. API errors are visible

Non-2xx responses become errors instead of being parsed as normal JSON. The app preserves cached content where possible and provides a retry state when there is no data.

## 9. Money stays in minor units until formatting

Calculations use integer minor units to avoid avoidable floating-point drift. Conversion to rupees happens only at the presentation boundary.

## 10. Stretch scope

I prioritized correctness, offline behavior, and the full interaction loop over charts and animations. With more time I would add performance measurements on a mid-range Android device and a small category summary.
