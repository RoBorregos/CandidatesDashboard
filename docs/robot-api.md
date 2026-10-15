# Robot API

Read-only HTTP API the robot assistant uses to look up candidates' interview
times and teams' round schedules. Names arrive through speech-to-text, so every
search is fuzzy and returns ids that are guaranteed to exist.

- Base URL: `https://<vercel-domain>/api/robot`
- Every response is JSON with `cache-control: no-store`, so the data is always current.
- Code: `src/app/api/robot/`, `src/server/robot.ts`, `src/lib/name-match.ts`.

## Authentication

Every request sends:

```
Authorization: Bearer <ROBOT_API_KEY>
```

- `401 {"error":"Unauthorized"}`: the key is missing or wrong.
- `503 {"error":"Robot API disabled"}`: the server has no `ROBOT_API_KEY` set.

The key lives in Vercel → Project → Settings → Environment Variables
(Production). It needs at least 32 characters, e.g. `openssl rand -hex 32`.

## Common query parameters

- `edition` (optional, default `2026`): the competition edition. Pass the same value to a search and to the detail call that follows it.
- `lang` (optional, `es` default or `en`): language of the human-readable strings: `local` times, `areaLabel`, and round slot names (`Pista A` → `Track A`). Enum fields (`track`, `area`) are never translated.

## Recommended flow

1. At startup, call `GET /ping` to check the URL and the key.
2. Transcribe the name and call `GET /candidates/search?name=<text>`.
3. If `exact` is `true`, use `matches[0].id` and go to step 6.
4. If `matches` is empty, the name wasn't understood. Ask the person to repeat it.
5. Otherwise, ask for the team and repeat the search with `&team=<text>`. If there's still more than one match, show `matches` (name + team) and let the person pick.
6. Call `GET /candidates/{id}` and give the JSON to the LLM along with the question.

Teams can also be queried directly with `GET /teams/search` → `GET /teams/{id}`.

## How fuzzy matching works

Shared by every `search` endpoint:

- Case, accents and punctuation are ignored. `de`, `del`, `la`, `las`, `los` and `y` are skipped.
- Number words become digits: "equipo tres", "team three" and "Equipo 3" are all the same.
- Spanish sound-alikes count as equal: v/b, z/s/soft c, ll/y, silent h, qu/k/hard c, soft g/j, x/j. "Balería Casares" matches "Valeria Cázares".
- Partial names and word order are fine. "Luis Rosales" matches "Luis Ángel Rosales Salazar".
- Words the transcription split or merged still match. "Delagarza" matches "de la Garza".
- `score` runs from 0 to 1, rounded to 2 decimals. Results are sorted best first.
- Results scoring below `0.6` are dropped, so `matches` can be `[]`. Never read `matches[0]` without checking.
- `exact` is `true` only when every word said appears, accents aside, in exactly one name. In that case `matches` holds just that one result, with `score: 1`. If several names contain the words (e.g. only "Luis"), `exact` is `false` and you get up to `limit` of the closest.

---

## `GET /ping`

Validates the key.

Response `200`:

```json
{ "ok": true, "edition": 2026 }
```

---

## `GET /candidates/search`

Query parameters:

- `name` (required): the transcribed name.
- `team` (optional): the transcribed team name, matched fuzzily. It limits the search to the members of the best-matching team.
- `track` (optional): `BEGINNER` (principiantes) or `ADVANCED`, case-insensitive. An unrecognized value is ignored and all tracks are searched.
- `limit` (optional, default `3`, clamped 1–10).
- `edition`.

Response `200`:

```json
{
  "query": "luis rosalez",
  "team": { "id": "clt9…", "name": "Los Robotines", "score": 0.94 },
  "exact": false,
  "matches": [
    { "id": "clx8a…", "name": "Luis Ángel Rosales Salazar", "team": "Los Robotines", "score": 1 },
    { "id": "clx8b…", "name": "Luisa Morales Treviño", "team": "Los Robotines", "score": 0.76 }
  ]
}
```

- `team`: present only when the `team` parameter was sent. It's the best team match, or `null` if there are no teams.
- When `team` was sent and its score is below `0.6`, the response carries `"matches": []` and the people aren't searched. Ask for the team again.
- `matches[].id`: pass it to `/candidates/{id}`.
- `matches[].team`: string or `null`. Useful for telling similar names apart.

Errors: `400 {"error":"Missing name"}`.

---

## `GET /candidates/{id}`

Query parameters: `edition`, `lang`.

Response `200` (`lang=en`):

```json
{
  "timezone": "America/Monterrey",
  "name": "Luis Ángel Rosales Salazar",
  "track": "BEGINNER",
  "challenge": null,
  "teamId": "clt9…",
  "team": "Los Robotines",
  "interview": {
    "at": "2026-10-15T16:30:00.000Z",
    "local": "Thursday, October 15 at 10:30 AM",
    "area": "PROGRAMMING",
    "areaLabel": "Programming",
    "interviewer": "Fernando",
    "location": null
  },
  "rounds": [
    {
      "round": 1,
      "challenges": [
        { "track": "Track A", "at": "2026-10-17T15:00:00.000Z", "local": "Saturday, October 17 at 9:00 AM", "location": null }
      ]
    }
  ]
}
```

- `track`: `BEGINNER` | `ADVANCED`.
- `challenge`: string or `null`. The challenge chosen on the advanced track, usually `null` for beginners.
- `teamId`, `team`: the team on the person's dashboard account (`/team` page). `null` if they have no team, never signed into the dashboard, or their team was deactivated by an admin. `teamId` works with `/teams/{id}`.
- `interview`: `null` if no interview is scheduled yet, or if the candidate never signed into the dashboard.
  - `at`: ISO 8601 UTC.
  - `local`: already in `timezone`, ready to say. With `lang=es` it looks like `"jueves 15 de oct, 10:30"`.
  - `area`: `MECHANICS` | `ELECTRONICS` | `PROGRAMMING` | `null`. `areaLabel` is the same value translated, or `null`.
  - `interviewer`: string or `null`.
  - `location`: always `null` for now (see Pending).
- `rounds`: only the rounds admins have already **revealed**, sorted by number. `[]` means there's no team or nothing has been published yet.
  - `challenges[]`: one slot per track, sorted by time. `track` is the slot name (`Pista A` / `Track A`). `at`, `local` and `location` follow the same format as the interview.

Errors: `404 {"error":"Candidate not found"}`.

---

## `GET /teams/search`

Query parameters: `name` (required), `limit` (default `3`, 1–10), `edition`.
It only searches active teams that have non-rejected members in the edition.

Response `200`:

```json
{
  "query": "robotines",
  "exact": true,
  "matches": [{ "id": "clt9…", "name": "Los Robotines", "score": 1, "memberCount": 4 }]
}
```

Errors: `400 {"error":"Missing name"}`.

---

## `GET /teams/{id}`

Query parameters: `edition`, `lang`.

Response `200`:

```json
{
  "timezone": "America/Monterrey",
  "name": "Los Robotines",
  "track": "BEGINNER",
  "challenge": null,
  "members": [
    { "id": "clx8a…", "name": "Luis Ángel Rosales Salazar", "interview": { "at": "…", "local": "…", "area": "PROGRAMMING", "areaLabel": "…", "interviewer": "…", "location": null } },
    { "id": "clx8d…", "name": "Ana Torres", "interview": null }
  ],
  "rounds": [ { "round": 1, "challenges": [ { "track": "Pista A", "at": "…", "local": "…", "location": null } ] } ]
}
```

- `members[].id` works with `/candidates/{id}`. `interview` has the same shape as there.
- `rounds` has the same shape and visibility rules as in `/candidates/{id}`.

Errors: `404 {"error":"Team not found"}` (also returned when the team is inactive or has no members in that edition).

---

## Notes for the LLM prompt

- Answer only from the JSON. If `interview` is `null`, say it isn't scheduled yet. If `rounds` is `[]`, say the rounds haven't been published. Never make up times or places.
- Use `local` exactly as it comes. It's already in Monterrey time and in the requested language.
- No email or phone numbers are returned.
- Rejected candidates are never returned: searches skip them and `/candidates/{id}` answers `404`.

## Pending

- `location`: the dashboard doesn't store a room for interviews or rounds yet, so the field always comes back `null`. Once it exists, it'll be filled in without changing the response's shape.

## Example

```bash
curl -H "Authorization: Bearer $ROBOT_API_KEY" "$ROBOT_API_URL/ping"
curl -H "Authorization: Bearer $ROBOT_API_KEY" \
  "$ROBOT_API_URL/candidates/search?name=luis%20rosalez&team=robotines&track=BEGINNER"
curl -H "Authorization: Bearer $ROBOT_API_KEY" "$ROBOT_API_URL/candidates/clx8a…?lang=en"
```

`ROBOT_API_URL` = `https://<vercel-domain>/api/robot`.
