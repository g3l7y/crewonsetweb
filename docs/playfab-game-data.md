# Almanac data from Crew On Set

The website reads the signed-in player's existing PlayFab User Data using
`Client/GetUserData`, without filtering to a fixed list of keys. No game save
format or additional programmer-maintained website fields are required.

Game source reviewed: `mcccelvin/crew-on-set`, commit
`f4090f7ec1dd45d212327117516812b62274e8df`.

| Existing game data | Website use |
| --- | --- |
| `production_logs` | Dedicated production records, including phase scores, feedback and budget |
| `CrewCareer_v1_<id>` / `values` | Named career checkpoints; `SaveDeleted = 1` excludes a deleted career |
| `Analytics.Career.v1` | Completed attempts in older career checkpoints |
| `Analytics.Career.v1.Count` and numbered chunks | Reassembled production history from larger checkpoints |
| Attempt `productionLog` | Native Unity result snapshot, including contract, client and detailed feedback |
| Attempt `pre`, `camera`, `lighting`, `post`, `score`, `grade`, transactions | Existing recorded scores and budget breakdown; camera + lighting is the game's production score |
| `achievements` | Stored titles, descriptions, progress, unlock state and dates, without renaming |
| `Profile.Career.v1`, `AchivProg_*`, `AchivDone_*` | Career achievement progress using the exact definitions from `CareerProfileProgress.cs` |

Career achievements remain separate for each career. Their save format has no
unlock timestamps, so the website does not supply dates. Access to Level 1 does
not imply completion of Level 1 or unlock any website-created knowledge content.

Dedicated records and career snapshots are combined by submission ID. Dedicated
records take priority, while extra career details are retained. Only closed
attempts are production logs. Missing scores, contract names and dates remain
absent; the website does not manufacture results from a current-level counter.

Malformed history and failed requests produce an error state. A successful empty
response is shown separately, with a reminder to check the game account and cloud
sync. Refresh buttons and periodic refetches pick up newly synced records.

Regression coverage is in `src/lib/playfab/game-data.test.ts`: chunked history,
native snapshots, deduplication, deleted careers, incomplete chunks, missing
metadata, original achievement wording, career milestones and unfiltered fetches.
