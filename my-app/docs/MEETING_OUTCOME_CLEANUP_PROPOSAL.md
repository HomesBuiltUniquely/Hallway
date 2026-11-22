# Meeting outcome backlog — cleanup proposal (approval required)

**No data changes have been run.** This document is for your sign-off only.

## What the backlog is

Rows in `DesignMod.lead_meetings` where:

- `meeting_status <> 'cancelled'`
- `progress` is still `scheduled` or `in_progress`
- IST slot end + 90m duration + 4h buffer has passed
- Designer has not recorded **Meeting Successful** (`completed`) or **Never happened** (`meeting_never_happened`)

Hallway now shows only the last **14 days** (counted) plus one **uncounted** older summary line.

## Proposed cleanup options (pick one or combine)

### Option A — Manager review (recommended first)

- Export audit via `auditMeetingOutcomeBacklog` (per-designer age buckets).
- Design managers close or correct rows in Meeting Management (no bulk SQL).

### Option B — Bulk “outcome not recorded” (new enum value)

- Requires **reversible migration** adding e.g. `progress = 'outcome_not_recorded'` (or use existing `meeting_never_happened` with reason code).
- One-time script for meetings **> 90 days** old only, **pilot hub** first.
- **Risk:** affects incentive / meeting-count reports if they count open progress.

### Option C — Test / junk exclusion

- Tag leads or meetings with `source=test` or name matches `%test%` — exclude from Hallway only (already partially done for celebrations).
- **Risk:** low if applied only to known test PIDs.

### Option D — Reconcile UI vs DB

- Many May rows may show “Successful” in UI while `progress` stayed `scheduled` (no background refresh on Hallway DB read).
- Run Design’s existing `refreshOpenMeetingProgress` job against production, then re-audit counts before any bulk close.

## Approval checklist

- [ ] Dry-run audit counts reviewed
- [ ] Incentives / XP team confirms impact
- [ ] Pilot hub selected (if Option B/C)
- [ ] Rollback script attached to migration