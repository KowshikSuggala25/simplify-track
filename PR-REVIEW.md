# PR #412 review

Reviewed files: `review/TrackScreen.tsx` and `review/useTransactions.ts`.

| Priority | Merge decision | Comment |
|---|---|---|
| 1 | Block | The hook never checks `response.ok`, so API errors such as 500, 503, and 429 are parsed as successful data. The screen can then crash on `body.items`. |
| 2 | Block | `setTransactions(reset ? body.items : [...transactions, ...body.items])` closes over stale state. Fast repeated pagination requests can lose pages. Use a functional state update or serialize requests. |
| 3 | Block | The API cursor re-sends the boundary record. Appending directly creates duplicate transactions. Merge by transaction ID before rendering. |
| 4 | Block | Refresh only loads the first page and discards the rest of the year. It also never uses `/v1/transactions/changes`, so the data cannot be trusted as current. |
| 5 | Block | Network failure clears cached transactions with `setTransactions([])`, violating the offline requirement and making a temporary outage look like an empty account. |
| 6 | Let through after fixes | The error is rendered as a bare `Text` with no retry action or accessible explanation. Provide a recoverable error state. |
| 7 | Let through after fixes | `keyExtractor` uses list indexes, which causes unstable identity when pages refresh or are filtered. Use the transaction ID and a stable month key. |
| 8 | Let through after fixes | `monthTotal` reports only spending and labels it as the total. The UI should show debit and credit totals separately. |

I would not merge the PR in its current form. The production implementation in `App.tsx` addresses these issues without hiding failed requests.
