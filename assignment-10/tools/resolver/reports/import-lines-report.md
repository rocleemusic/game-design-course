# import-lines report

Generated 2026-08-11T08:12:45.620Z by `tools/resolver/scripts/import-lines.mjs` (--write).

## Totals

| | count |
|---|---|
| line files parsed | 30 |
| scenes constructed | 30 |
| choice nodes | 188 |
| options | 401 |
| content lines (slots) | 1430 |
| — `action` | 313 |
| — `dialogue` | 851 |
| — `object` | 61 |
| — `player_line` | 205 |
| blocking errors | 0 |
| warnings | 10 |
| inferences | 798 |

## Per file

| file | scene | soul | tables | slots | nodes | options | gated nodes | entry_gate |
|---|---|---|---|---|---|---|---|---|
| ilsa-forge-short-C1.md | SC-T4-07 | ilsa | 18 | 40 | 5 | 11 | 0 | — |
| ilsa-forge-short-C2.md | SC-T4-08 | ilsa | 24 | 50 | 7 | 14 | 1 | `played(SC-T4-07)` |
| ilsa-forge-short-C3.md | SC-T4-09 | ilsa | 27 | 55 | 8 | 17 | 2 | `played(SC-T4-08)` |
| ilsa-forge-short-C4.md | SC-T4-10 | ilsa | 20 | 38 | 6 | 12 | 2 | `played(SC-T4-09)` |
| ilsa-kin-no-show-C1.md | SC-T4-03 | ilsa | 23 | 48 | 6 | 13 | 0 | — |
| ilsa-kin-no-show-C2.md | SC-T4-04 | ilsa | 24 | 47 | 7 | 14 | 2 | `played(SC-T4-03)` |
| ilsa-kin-no-show-C3.md | SC-T4-05 | ilsa | 17 | 35 | 5 | 10 | 2 | `played(SC-T4-03)` |
| ilsa-kin-no-show-C4.md | SC-T4-06 | ilsa | 16 | 27 | 4 | 8 | 2 | `played(SC-T4-04) && played(SC-T4-05)` |
| ilsa-not-family-C1.md | SC-T4-11 | ilsa | 19 | 41 | 5 | 11 | 0 | — |
| ilsa-not-family-C2.md | SC-T4-12 | ilsa | 26 | 52 | 7 | 16 | 1 | `played(SC-T4-11)` |
| ilsa-not-family-C3.md | SC-T4-13 | ilsa | 22 | 40 | 6 | 13 | 2 | `played(SC-T4-12)` |
| mara-said-out-loud-C1.md | SC-T2-24 | mara | 18 | 36 | 5 | 11 | 0 | `played(SC-T2-14)` |
| mara-said-out-loud-C2.md | SC-T2-25 | mara | 25 | 46 | 7 | 15 | 2 | `played(SC-T2-24)` |
| mara-set-for-two-C1.md | SC-T2-12 | mara | 23 | 48 | 6 | 13 | 0 | — |
| mara-set-for-two-C2.md | SC-T2-13 | mara | 31 | 59 | 9 | 19 | 1 | `played(SC-T2-12)` |
| mara-set-for-two-C3.md | SC-T2-14 | mara | 18 | 36 | 5 | 11 | 2 | `played(SC-T2-13)` |
| mara-tonic-frost-C1.md | SC-T2-22 | mara | 19 | 36 | 5 | 11 | 0 | — |
| mara-tonic-frost-C2.md | SC-F1-03 | mara | 29 | 50 | 8 | 17 | 1 | `played(SC-T2-22)` |
| mara-tonic-frost-C3.md | SC-T2-23 | mara | 25 | 44 | 7 | 15 | 2 | `played(SC-F1-03)` |
| toby-feast-short-C1.md | SC-T2-15 | toby | 23 | 53 | 6 | 13 | 0 | — |
| toby-feast-short-C2.md | SC-T2-16 | toby | 28 | 70 | 8 | 17 | 3 | `played(SC-T2-15)` |
| toby-feast-short-C3.md | SC-T2-17 | toby | 31 | 72 | 9 | 19 | 2 | `played(SC-T2-16)` |
| toby-feast-short-C4.md | SC-T2-18 | toby | 17 | 45 | 5 | 11 | 2 | `played(SC-T2-17)` |
| toby-kept-and-returned-C1.md | SC-T2-19 | toby | 25 | 58 | 7 | 15 | 1 | — |
| toby-kept-and-returned-C2.md | SC-T2-20 | mara | 19 | 39 | 5 | 11 | 1 | `played(SC-T2-19)` |
| toby-kept-and-returned-C3.md | SC-T2-21 | toby | 27 | 49 | 8 | 17 | 2 | `played(SC-T2-20)` |
| toby-the-shelf-C1.md | SC-T2-08 | toby | 21 | 56 | 6 | 13 | 1 | — |
| toby-the-shelf-C2.md | SC-T2-09 | toby | 25 | 65 | 7 | 14 | 1 | `played(SC-T2-08) && knows(shelf_seen)` |
| toby-the-shelf-C3.md | SC-T2-10 | toby | 13 | 41 | 4 | 9 | 2 | `played(SC-T2-09)` |
| toby-the-shelf-C4.md | SC-T2-11 | toby | 17 | 54 | 5 | 11 | 4 | `played(SC-T2-10) && knows(shelf_named)` |

## Blocking errors (0)

_none._

## Warnings (10)

- **mara-set-for-two-C2.md** — line 113: `L-CH-T2-13-3-a-1-s` is 67 words, over the dialogue ceiling of 40 — content defect unless it is this file's sanctioned long run
- **toby-feast-short-C1.md** — line 58: `L-CH-T2-15-2-s` is 63 words, over the dialogue ceiling of 40 — content defect unless it is this file's sanctioned long run
- **toby-the-shelf-C1.md** — line 101: `L-CH-T2-08-3-a-p` is 16 words, over the player_line ceiling of 12 — content defect unless it is this file's sanctioned long run
- **toby-the-shelf-C2.md** — line 171: option CH-T2-09-4-a is STRUCK OUT in the source ("Option `-a` — asks whether the giver knows *(spoken · records Trust)* ") — imported anyway rather than silently dropping authored slots; PENDING ROC
- **toby-the-shelf-C2.md** — line 182: option CH-T2-09-4-b is STRUCK OUT in the source ("Option `-b` — stacks the finished order for pickup *(deed · Collect · ") — imported anyway rather than silently dropping authored slots; PENDING ROC
- **toby-the-shelf-C2.md** — line 143: `L-CH-T2-09-3-a-p` is 16 words, over the player_line ceiling of 12 — content defect unless it is this file's sanctioned long run
- **toby-the-shelf-C3.md** — front matter carries NO incoming-states / gating line — nothing could be cross-checked against the node gates parsed from the headings
- **toby-the-shelf-C3.md** — CH-T2-10-3: grandfathered variant selectors `-both`, `-repaid` — pre-2026-08-09 scheme, accepted, not to be minted again (id-label-convention.md)
- **toby-the-shelf-C4.md** — line 66: `L-CH-T2-11-1-c-r1` names its speaker inside the `text` cell ("marta:") — a schema defect; lifted to speaker_id and the prefix stripped
- **toby-the-shelf-C4.md** — SC-T2-11: the file's front-matter **ENTRY GATE** line reads ["knows(shelf_named)"] but the authoritative table says ["played(SC-T2-10)","knows(shelf_named)"]. The TABLE was applied. Worth a look — one of the two is stale.

## Inferred — divert (6)

- **ilsa-forge-short-C4.md** — CH-T4-10-4-a: rejoin=divert -> CH-T4-10-6, read from the node heading
- **ilsa-forge-short-C4.md** — CH-T4-10-4-b: rejoin=divert -> CH-T4-10-6, read from the node heading
- **mara-set-for-two-C1.md** — CH-T2-12-5-c: rejoin=divert -> CH-T2-12-6, read from the option heading
- **mara-tonic-frost-C2.md** — CH-F1-03-3-c: rejoin=divert -> CH-F1-03-6, read from the option heading
- **toby-kept-and-returned-C2.md** — CH-T2-20-3-a: rejoin=divert -> CH-T2-20-5, read from the option heading
- **toby-the-shelf-C2.md** — CH-T2-09-3-a: rejoin=divert -> CH-T2-09-6, read from the option heading

## Inferred — entry_gate (30)

- **ilsa-forge-short-C1.md** — SC-T4-07: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **ilsa-forge-short-C2.md** — SC-T4-08: entry_gate ["played(SC-T4-07)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-forge-short-C3.md** — SC-T4-09: entry_gate ["played(SC-T4-08)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-forge-short-C4.md** — SC-T4-10: entry_gate ["played(SC-T4-09)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-kin-no-show-C1.md** — SC-T4-03: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **ilsa-kin-no-show-C2.md** — SC-T4-04: entry_gate ["played(SC-T4-03)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-kin-no-show-C3.md** — SC-T4-05: entry_gate ["played(SC-T4-03)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-kin-no-show-C4.md** — SC-T4-06: entry_gate ["played(SC-T4-04)","played(SC-T4-05)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-not-family-C1.md** — SC-T4-11: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **ilsa-not-family-C2.md** — SC-T4-12: entry_gate ["played(SC-T4-11)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **ilsa-not-family-C3.md** — SC-T4-13: entry_gate ["played(SC-T4-12)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **mara-said-out-loud-C1.md** — SC-T2-24: entry_gate ["played(SC-T2-14)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **mara-said-out-loud-C2.md** — SC-T2-25: entry_gate ["played(SC-T2-24)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **mara-set-for-two-C1.md** — SC-T2-12: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **mara-set-for-two-C2.md** — SC-T2-13: entry_gate ["played(SC-T2-12)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **mara-set-for-two-C3.md** — SC-T2-14: entry_gate ["played(SC-T2-13)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **mara-tonic-frost-C1.md** — SC-T2-22: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **mara-tonic-frost-C2.md** — SC-F1-03: entry_gate ["played(SC-T2-22)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **mara-tonic-frost-C3.md** — SC-T2-23: entry_gate ["played(SC-F1-03)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-feast-short-C1.md** — SC-T2-15: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **toby-feast-short-C2.md** — SC-T2-16: entry_gate ["played(SC-T2-15)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-feast-short-C3.md** — SC-T2-17: entry_gate ["played(SC-T2-16)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-feast-short-C4.md** — SC-T2-18: entry_gate ["played(SC-T2-17)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-kept-and-returned-C1.md** — SC-T2-19: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **toby-kept-and-returned-C2.md** — SC-T2-20: entry_gate ["played(SC-T2-19)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-kept-and-returned-C3.md** — SC-T2-21: entry_gate ["played(SC-T2-20)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-the-shelf-C1.md** — SC-T2-08: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)
- **toby-the-shelf-C2.md** — SC-T2-09: entry_gate ["played(SC-T2-08)","knows(shelf_seen)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-the-shelf-C3.md** — SC-T2-10: entry_gate ["played(SC-T2-09)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)
- **toby-the-shelf-C4.md** — SC-T2-11: entry_gate ["played(SC-T2-10)","knows(shelf_named)"] APPLIED from the authoritative ENTRY_GATES table (--entry-gates)

## Inferred — gate (41)

- **ilsa-forge-short-C2.md** — CH-T4-08-2: availability_conditions += `knows(heat_shortfall_seen)` — read from the node heading: "`CH-T4-08-2` — the second gap, made up out of her own shop again *(gated `knows(heat_shortfall_seen)`; unset, the node auto-skips)*"
- **ilsa-forge-short-C3.md** — CH-T4-09-2: availability_conditions += `knows(heat_shortfall_seen)` — read from the node heading: "`CH-T4-09-2` — the rebuilt fire running for work that has stopped *(gated `knows(heat_shortfall_seen)`; unset, the node auto-skips)*"
- **ilsa-forge-short-C3.md** — CH-T4-09-5: availability_conditions += `knows(sheet_giving_only)` — read from the node heading: "`CH-T4-09-5` — the sheet still up while the work waits *(gated `knows(sheet_giving_only)`; unset, the node auto-skips; set-up is the placed "
- **ilsa-forge-short-C4.md** — CH-T4-10-2: availability_conditions += `knows(ore_short_named)` — read from the node heading: "`CH-T4-10-2` — the joint where the work stopped, checked last *(gated `knows(ore_short_named)`; unset, the node auto-skips; neutral to both "
- **ilsa-forge-short-C4.md** — CH-T4-10-4: availability_conditions += `knows(ore_sourced)` — read from the node heading: "`CH-T4-10-4` — the piece has its substance *(gated `knows(ore_sourced)`; both options `divert` → `CH-T4-10-6`; the divert side's weight beat"
- **ilsa-kin-no-show-C2.md** — CH-T4-04-2: availability_conditions += `knows(bench_end_taken)` — read from the node heading: "`CH-T4-04-2` — the day worked from inside the standing place *(gated `knows(bench_end_taken)`; unset, the node auto-skips)*"
- **ilsa-kin-no-show-C2.md** — CH-T4-04-5: availability_conditions += `knows(cover_witnessed)` — read from the node heading: "`CH-T4-04-5` — the same move at a different size *(gated `knows(cover_witnessed)`; unset, the node auto-skips; set-up is the object slot — n"
- **ilsa-kin-no-show-C3.md** — CH-T4-05-2: availability_conditions += `knows(bench_end_taken)` — read from the node heading: "`CH-T4-05-2` — the standing place inside the changed plan *(gated `knows(bench_end_taken)`; unset, the node auto-skips)*"
- **ilsa-kin-no-show-C3.md** — CH-T4-05-4: availability_conditions += `knows(absence_witnessed)` — read from the node heading: "`CH-T4-05-4` — the done work against the day nobody came *(gated `knows(absence_witnessed)`; unset, the node auto-skips; set-up is the objec"
- **ilsa-kin-no-show-C4.md** — CH-T4-06-2: availability_conditions += `knows(absence_witnessed)` — read from the node heading: "`CH-T4-06-2` — the count against the day he didn't come *(gated `knows(absence_witnessed)`; unset, the node auto-skips)*"
- **ilsa-kin-no-show-C4.md** — CH-T4-06-3: availability_conditions += `knows(cover_witnessed)` — read from the node heading: "`CH-T4-06-3` — the count against the covered part *(gated `knows(cover_witnessed)`; unset, the node auto-skips)*"
- **ilsa-not-family-C2.md** — CH-T4-12-2: availability_conditions += `knows(pip_place_seen)` — read from the node heading: "`CH-T4-12-2` — the laid bench read with the order known *(gated `knows(pip_place_seen)`; unset, the node auto-skips to its gather)*"
- **ilsa-not-family-C3.md** — CH-T4-13-2: availability_conditions += `knows(pip_place_seen)` — read from the node heading: "`CH-T4-13-2` — the boy's place, back in the standing order *(gated `knows(pip_place_seen)`; unset, the node auto-skips to its gather)*"
- **ilsa-not-family-C3.md** — CH-T4-13-3: availability_conditions += `knows(guest_place_last)` — read from the node heading: "`CH-T4-13-3` — the added place has not been cleared *(the conversation's weight beat — rule 19; no spoken set-up; gated `knows(guest_place_l"
- **mara-said-out-loud-C2.md** — CH-T2-25-3: availability_conditions += `knows(stayed_through_it)` — read from the node heading: "`CH-T2-25-3` — the bench work the player took a hand in, still unfinished *(gated `knows(stayed_through_it)`; auto-skips to its gather when "
- **mara-said-out-loud-C2.md** — CH-T2-25-4: availability_conditions += `knows(bex_answered)` — read from the node heading: "`CH-T2-25-4` — a second putting-to-him *(gated `knows(bex_answered)`; auto-skips to its gather when false)*"
- **mara-set-for-two-C2.md** — CH-T2-13-5: availability_conditions += `knows(tending_seen)` — read from the node heading: "`CH-T2-13-5` — the corner in the same look as the drawer *(gated `knows(tending_seen)`; auto-skips to its gather when false)*"
- **mara-set-for-two-C3.md** — CH-T2-14-3: availability_conditions += `knows(provenance_heard)` — read from the node heading: "`CH-T2-14-3` — the drawer with one thing in it that has a name *(gated `knows(provenance_heard)`; auto-skips to its gather when false)*"
- **mara-set-for-two-C3.md** — CH-T2-14-4: availability_conditions += `knows(helped_tend)` — read from the node heading: "`CH-T2-14-4` — she hands over the deeper job: the corner itself *(gated `knows(helped_tend)`; auto-skips to its gather when false)*"
- **mara-tonic-frost-C2.md** — CH-F1-03-5: availability_conditions += `knows(frost_date_known)` — read from the node heading: "`CH-F1-03-5` — the minutes read against the date the player holds *(gated `knows(frost_date_known)`)*"
- **mara-tonic-frost-C3.md** — CH-T2-23-3: availability_conditions += `knows(drift_seen)` — read from the node heading: "`CH-T2-23-3` — the mended carry back at the stall *(gated `knows(drift_seen)`)*"
- **mara-tonic-frost-C3.md** — CH-T2-23-4: availability_conditions += `knows(herbs_carried)` — read from the node heading: "`CH-T2-23-4` — the herbs the player carried down, now in the jars *(gated `knows(herbs_carried)`)*"
- **toby-feast-short-C2.md** — CH-T2-16-5: availability_conditions += `bond_band(toby) = low` — read from the node heading: "`CH-T2-16-5` — low band: the ledger stays pointed outward *(plays only at `bond_band(toby) = low`)*"
- **toby-feast-short-C2.md** — CH-T2-16-6: availability_conditions += `bond_band(toby) = mid` — read from the node heading: "`CH-T2-16-6` — mid band: the accounting opened, every row someone else's *(plays only at `bond_band(toby) = mid`)*"
- **toby-feast-short-C2.md** — CH-T2-16-7: availability_conditions += `bond_band(toby) = high` — read from the node heading: "`CH-T2-16-7` — high band: he answers, then covers it in the same breath *(plays only at `bond_band(toby) = high`)*"
- **toby-feast-short-C3.md** — CH-T2-17-3: availability_conditions += `knows(count_is_turnout)` — read from the node heading: "`CH-T2-17-3` — asked to bake for who is confirmed, he does not cut the number *(gated `knows(count_is_turnout)` — auto-skips to the gather w"
- **toby-feast-short-C3.md** — CH-T2-17-4: availability_conditions += `knows(starter_owed)` — read from the node heading: "`CH-T2-17-4` — the loan comes off the top, before his own gap *(gated `knows(starter_owed)` — auto-skips to the gather when false)*"
- **toby-feast-short-C4.md** — CH-T2-18-2: availability_conditions += `knows(sum_wont_close)` — read from the node heading: "`CH-T2-18-2` — counting never closed it *(gated `knows(sum_wont_close)` — auto-skips when false)*"
- **toby-feast-short-C4.md** — CH-T2-18-3: availability_conditions += `knows(starter_owed)` — read from the node heading: "`CH-T2-18-3` — the return is bigger than the loan *(gated `knows(starter_owed)`, non-divert path — auto-skips when false)*"
- **toby-kept-and-returned-C1.md** — CH-T2-19-5: availability_conditions += `knows(shirt_shed)` — read from the node heading: "`CH-T2-19-5` — the pile is what nobody claimed, his shirt in it *(gated `knows(shirt_shed)`)*"
- **toby-kept-and-returned-C2.md** — CH-T2-20-4: availability_conditions += `knows(shirt_shed)` — read from the node heading: "`CH-T2-20-4` — this one was set down, not lost *(gated `knows(shirt_shed)`)*"
- **toby-kept-and-returned-C3.md** — CH-T2-21-3: availability_conditions += `knows(shirt_shed)` — read from the node heading: "`CH-T2-21-3` — it went into the pile and came back out *(gated `knows(shirt_shed)`)*"
- **toby-kept-and-returned-C3.md** — CH-T2-21-4: availability_conditions += `knows(collar_name_known)` — read from the node heading: "`CH-T2-21-4` — she mended around the name *(gated `knows(collar_name_known)`)*"
- **toby-the-shelf-C1.md** — CH-T2-08-4: availability_conditions += `knows(shelf_seen)` — read from the node heading: "`CH-T2-08-4` — the shelf acknowledged *(gated `knows(shelf_seen)`)*"
- **toby-the-shelf-C2.md** — CH-T2-09-3: availability_conditions += `knows(shelf_seen)` — read from the prose under the node heading: "**Deep state only** — gated `knows(shelf_seen)`. Auto-skips in fallback; no fallback variant, per the content block. Option `-a` diverts to "
- **toby-the-shelf-C3.md** — CH-T2-10-2: availability_conditions += `knows(shelf_seen)` — read from the prose under the node heading: "Gated `knows(shelf_seen)`. Auto-skips otherwise. Reference only, nothing new passes. `O-SC-T2-10-2` sits on the gate edge and plays before t"
- **toby-the-shelf-C3.md** — CH-T2-10-3: availability_conditions += `knows(repaid_seen)` — read from the prose under the node heading: "Gated `knows(repaid_seen)`. Auto-skips otherwise. **The set-up plays differently by incoming state**; both variants are below and the option"
- **toby-the-shelf-C4.md** — CH-T2-11-2: availability_conditions += `bond_band(toby) = low` — read from the node heading: "`CH-T2-11-2` — he handles it as accounts · gate `bond_band(toby) = low`"
- **toby-the-shelf-C4.md** — CH-T2-11-3: availability_conditions += `bond_band(toby) = mid` — read from the node heading: "`CH-T2-11-3` — he goes flat, finds a task, stays in the room · gate `bond_band(toby) = mid`"
- **toby-the-shelf-C4.md** — CH-T2-11-4: availability_conditions += `bond_band(toby) = high` — read from the node heading: "`CH-T2-11-4` — the reach starts and does not finish · gate `bond_band(toby) = high`"
- **toby-the-shelf-C4.md** — CH-T2-11-5: availability_conditions += `knows(gave_unowed)` — read from the prose under the node heading: "**Gate:** `knows(gave_unowed)`. Plays in the **deep** state only. Auto-skips in **fallback**, which ends the conversation at the band node o"

## Inferred — gate-crosscheck (16)

- **ilsa-forge-short-C2.md** — front matter names node(s) 2 positionally; gates parsed from headings land on node(s) 2 — agree
- **ilsa-forge-short-C3.md** — front matter names node(s) 2, 5 positionally; gates parsed from headings land on node(s) 2, 5 — agree
- **ilsa-forge-short-C4.md** — front matter names node(s) 2, 4 positionally; gates parsed from headings land on node(s) 2, 4 — agree
- **ilsa-kin-no-show-C2.md** — front matter names node(s) 2, 5 positionally; gates parsed from headings land on node(s) 2, 5 — agree
- **ilsa-kin-no-show-C3.md** — front matter names node(s) 2, 4, 4 positionally; gates parsed from headings land on node(s) 2, 4 — agree
- **ilsa-kin-no-show-C4.md** — front matter names node(s) 2, 3 positionally; gates parsed from headings land on node(s) 2, 3 — agree
- **ilsa-not-family-C2.md** — front matter names node(s) 2 positionally; gates parsed from headings land on node(s) 2 — agree
- **ilsa-not-family-C3.md** — front matter names node(s) 3, 2 positionally; gates parsed from headings land on node(s) 2, 3 — agree
- **mara-said-out-loud-C2.md** — front matter names node(s) 3, 4 positionally; gates parsed from headings land on node(s) 3, 4 — agree
- **mara-set-for-two-C2.md** — front matter names node(s) 5, 5 positionally; gates parsed from headings land on node(s) 5 — agree
- **mara-set-for-two-C3.md** — front matter names node(s) 3, 4 positionally; gates parsed from headings land on node(s) 3, 4 — agree
- **mara-tonic-frost-C2.md** — front matter names node(s) 5, 5 positionally; gates parsed from headings land on node(s) 5 — agree
- **mara-tonic-frost-C3.md** — front matter names node(s) 3, 4 positionally; gates parsed from headings land on node(s) 3, 4 — agree
- **toby-kept-and-returned-C1.md** — front matter names node(s) 5 positionally; gates parsed from headings land on node(s) 5 — agree
- **toby-the-shelf-C1.md** — front matter names node(s) 4 positionally; gates parsed from headings land on node(s) 4 — agree
- **toby-the-shelf-C2.md** — front matter names node(s) 3 positionally; gates parsed from headings land on node(s) 3 — agree

## Inferred — gather_line (4)

- **toby-the-shelf-C1.md** — CH-T2-08-1: gather_line `A-SC-T2-08-2` preserved from the graph — no line file states a gather line
- **toby-the-shelf-C1.md** — CH-T2-08-2: gather_line `O-SC-T2-08-3` preserved from the graph — no line file states a gather line
- **toby-the-shelf-C2.md** — CH-T2-09-1: gather_line `A-SC-T2-09-2` preserved from the graph — no line file states a gather line
- **toby-the-shelf-C2.md** — CH-T2-09-5: gather_line `O-SC-T2-09-5` preserved from the graph — no line file states a gather line

## Inferred — note (166)

- **ilsa-forge-short-C1.md** — CH-T4-07-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C1.md** — CH-T4-07-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C1.md** — CH-T4-07-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C1.md** — CH-T4-07-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C1.md** — CH-T4-07-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-3-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C2.md** — CH-T4-08-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-7: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C3.md** — CH-T4-09-8: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C4.md** — CH-T4-10-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C4.md** — CH-T4-10-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C4.md** — CH-T4-10-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C4.md** — CH-T4-10-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C4.md** — CH-T4-10-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-forge-short-C4.md** — CH-T4-10-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C1.md** — CH-T4-03-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C1.md** — CH-T4-03-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C1.md** — CH-T4-03-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C1.md** — CH-T4-03-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C1.md** — CH-T4-03-4-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C1.md** — CH-T4-03-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-4-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C2.md** — CH-T4-04-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C3.md** — CH-T4-05-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C3.md** — CH-T4-05-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C3.md** — CH-T4-05-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C3.md** — CH-T4-05-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C3.md** — CH-T4-05-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C4.md** — CH-T4-06-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C4.md** — CH-T4-06-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C4.md** — CH-T4-06-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-kin-no-show-C4.md** — CH-T4-06-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C1.md** — CH-T4-11-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C1.md** — CH-T4-11-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C1.md** — CH-T4-11-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C1.md** — CH-T4-11-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C1.md** — CH-T4-11-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-4-b-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C2.md** — CH-T4-12-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C3.md** — CH-T4-13-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C3.md** — CH-T4-13-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C3.md** — CH-T4-13-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C3.md** — CH-T4-13-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C3.md** — CH-T4-13-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **ilsa-not-family-C3.md** — CH-T4-13-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C1.md** — CH-T2-24-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C1.md** — CH-T2-24-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C1.md** — CH-T2-24-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C1.md** — CH-T2-24-3-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C1.md** — CH-T2-24-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-2-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-said-out-loud-C2.md** — CH-T2-25-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C1.md** — CH-T2-12-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C1.md** — CH-T2-12-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C1.md** — CH-T2-12-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C1.md** — CH-T2-12-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C1.md** — CH-T2-12-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C1.md** — CH-T2-12-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-3-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-3-a-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C2.md** — CH-T2-13-7: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C3.md** — CH-T2-14-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C3.md** — CH-T2-14-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C3.md** — CH-T2-14-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C3.md** — CH-T2-14-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-set-for-two-C3.md** — CH-T2-14-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C1.md** — CH-T2-22-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C1.md** — CH-T2-22-1-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C1.md** — CH-T2-22-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C1.md** — CH-T2-22-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C1.md** — CH-T2-22-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b-1-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C2.md** — CH-F1-03-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-5-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **mara-tonic-frost-C3.md** — CH-T2-23-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C1.md** — CH-T2-15-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C1.md** — CH-T2-15-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C1.md** — CH-T2-15-2-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C1.md** — CH-T2-15-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C1.md** — CH-T2-15-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C1.md** — CH-T2-15-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-7: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C2.md** — CH-T2-16-8: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-1-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-1-a-1-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C3.md** — CH-T2-17-7: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C4.md** — CH-T2-18-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C4.md** — CH-T2-18-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C4.md** — CH-T2-18-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C4.md** — CH-T2-18-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-feast-short-C4.md** — CH-T2-18-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-4-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C1.md** — CH-T2-19-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C2.md** — CH-T2-20-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C2.md** — CH-T2-20-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C2.md** — CH-T2-20-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C2.md** — CH-T2-20-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C2.md** — CH-T2-20-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-2: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a-1-a-1: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-3: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-4: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-5: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does
- **toby-kept-and-returned-C3.md** — CH-T2-21-6: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does

## Inferred — option (392)

- **ilsa-forge-short-C1.md** — CH-T4-07-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C1.md** — CH-T4-07-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-3-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-3-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C2.md** — CH-T4-08-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-7-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-7-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-8-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C3.md** — CH-T4-09-8-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-forge-short-C4.md** — CH-T4-10-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-4-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-4-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C1.md** — CH-T4-03-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-4-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-4-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C2.md** — CH-T4-04-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C3.md** — CH-T4-05-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-kin-no-show-C4.md** — CH-T4-06-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C1.md** — CH-T4-11-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-4-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-4-b-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-4-b-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C2.md** — CH-T4-12-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **ilsa-not-family-C3.md** — CH-T4-13-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-3-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-3-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-3-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C1.md** — CH-T2-24-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-2-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-2-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-2-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-said-out-loud-C2.md** — CH-T2-25-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-5-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C1.md** — CH-T2-12-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-a-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-3-a-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-7-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C2.md** — CH-T2-13-7-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-set-for-two-C3.md** — CH-T2-14-5-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-1-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-1-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C1.md** — CH-T2-22-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b-1-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-3-b-1-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C2.md** — CH-F1-03-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-5-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-5-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **mara-tonic-frost-C3.md** — CH-T2-23-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-2-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-2-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-3-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C1.md** — CH-T2-15-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-4-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-7-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-7-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-8-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C2.md** — CH-T2-16-8-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-1-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-1-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-1-a-1-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-1-a-1-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-3-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-7-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C3.md** — CH-T2-17-7-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-4-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-feast-short-C4.md** — CH-T2-18-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-3-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-4-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-4-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C1.md** — CH-T2-19-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-2-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C2.md** — CH-T2-20-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a-1-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-2-a-1-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-5-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-6-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-kept-and-returned-C3.md** — CH-T2-21-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-1-b: no verb_family named in the heading — kept the graph's `Use`
- **toby-the-shelf-C1.md** — CH-T2-08-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-2-a: no verb_family named in the heading — kept the graph's `Use`
- **toby-the-shelf-C1.md** — CH-T2-08-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-3-b: no verb_family named in the heading — kept the graph's `Collect`
- **toby-the-shelf-C1.md** — CH-T2-08-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-4-b: no verb_family named in the heading — kept the graph's `Use`
- **toby-the-shelf-C1.md** — CH-T2-08-4-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C1.md** — CH-T2-08-4-a-1-b: no verb_family named in the heading — kept the graph's `Collect`
- **toby-the-shelf-C1.md** — CH-T2-08-5-a: no verb_family named in the heading — kept the graph's `Collect`
- **toby-the-shelf-C1.md** — CH-T2-08-5-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-1-a: no verb_family named in the heading — kept the graph's `Collect`
- **toby-the-shelf-C2.md** — CH-T2-09-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-2-b: no verb_family named in the heading — kept the graph's `Collect`
- **toby-the-shelf-C2.md** — CH-T2-09-2-a-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-2-a-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-3-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-4-b: no verb_family named in the heading — kept the graph's `Collect`
- **toby-the-shelf-C2.md** — CH-T2-09-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C2.md** — CH-T2-09-5-b: no verb_family named in the heading — kept the graph's `Use`
- **toby-the-shelf-C2.md** — CH-T2-09-6-a: no verb_family named in the heading — kept the graph's `Use`
- **toby-the-shelf-C2.md** — CH-T2-09-6-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-1-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-1-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-1-c: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-2-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-2-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-3-a: no verb_family named in the heading — kept the graph's `Use`
- **toby-the-shelf-C4.md** — CH-T2-11-3-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-4-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-4-b: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-5-a: no verb_family named in the heading — kept the graph's `Converse`
- **toby-the-shelf-C4.md** — CH-T2-11-5-b: no verb_family named in the heading — kept the graph's `Converse`

## Inferred — run-slot (4)

- **mara-said-out-loud-C1.md** — `A-CH-T2-24-3-a-1-r` names node CH-T2-24-3-a-1 but no option; attached to CH-T2-24-3-a-1-a's response run by the section it is printed in (line 120, heading line 112) — POSITIONAL, verify
- **mara-said-out-loud-C2.md** — `A-CH-T2-25-2-a-1-r` names node CH-T2-25-2-a-1 but no option; attached to CH-T2-25-2-a-1-b's response run by the section it is printed in (line 97, heading line 92) — POSITIONAL, verify
- **mara-tonic-frost-C2.md** — `A-CH-F1-03-3-b-1-a-1-r` names node CH-F1-03-3-b-1-a-1 but no option; attached to CH-F1-03-3-b-1-a-1-b's response run by the section it is printed in (line 148, heading line 140) — POSITIONAL, verify
- **toby-the-shelf-C2.md** — `A-CH-T2-09-2-a-1-r` names node CH-T2-09-2-a-1 but no option; attached to CH-T2-09-2-a-1-b's response run by the section it is printed in (line 123, heading line 113) — POSITIONAL, verify

## Inferred — speaker (126)

- **ilsa-not-family-C1.md** — `O-SC-T4-11-1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-c-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-c-r1` -> `pip`, read from the "Pip — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C1.md** — `L-CH-T4-11-1-c-r2` -> `pip`, read from the "Pip — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C1.md** — `A-SC-T4-11-2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-2-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-2-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-2-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-2-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-2-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-2-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `O-SC-T4-11-3` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-3-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-3-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-3-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-3-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-3-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-3-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `A-CH-T4-11-4-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-4-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `A-CH-T4-11-4-a-r` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-4-a-r3` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-4-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-4-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-5-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-5-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-5-a-r2` -> `pip`, read from the "Pip — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C1.md** — `L-CH-T4-11-5-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-5-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — `L-CH-T4-11-5-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks in node 1 option `-c` and node 5 op…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C1.md** — CH-T4-11-5-a: heading declares speakers POSITIONALLY ("second response spoken by pip") — not applied from the heading; the per-row speaker markings were used instead
- **ilsa-not-family-C2.md** — no default-speaker declaration; defaulted every unmarked `dialogue` slot to the file's soul `ilsa`
- **ilsa-not-family-C2.md** — `O-SC-T4-12-1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `A-CH-T4-12-1-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-s` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-b-r1` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-c-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-1-c-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-2-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-2-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-2-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-2-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-2-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `A-CH-T4-12-3-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-3-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `A-CH-T4-12-3-a-r` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-3-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `A-CH-T4-12-4-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-s` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-a-r1` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-b-r1` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-c-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-c-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-c-r2` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-b-1-s` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-b-1-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-b-1-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-b-1-b-r1` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-4-b-1-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `O-SC-T4-12-5` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-5-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-5-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-5-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-5-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-5-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-5-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-6-s` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-6-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-6-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — `L-CH-T4-12-6-b-r1` -> `juno`, read from the "Juno — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C2.md** — `L-CH-T4-12-6-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: marked per section — the argument's spoken side is Juno's throughout; Ilsa's side is where …") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C2.md** — CH-T4-12-1-b: heading declares speakers POSITIONALLY ("first response spoken by juno") — not applied from the heading; the per-row speaker markings were used instead
- **ilsa-not-family-C2.md** — CH-T4-12-4-a: heading declares speakers POSITIONALLY ("first response spoken by juno") — not applied from the heading; the per-row speaker markings were used instead
- **ilsa-not-family-C2.md** — CH-T4-12-4-c: heading declares speakers POSITIONALLY ("first response spoken by ilsa") — not applied from the heading; the per-row speaker markings were used instead
- **ilsa-not-family-C2.md** — CH-T4-12-4-b-1-b: heading declares speakers POSITIONALLY ("first response spoken by juno") — not applied from the heading; the per-row speaker markings were used instead
- **ilsa-not-family-C2.md** — CH-T4-12-6-b: heading declares speakers POSITIONALLY ("first response spoken by juno") — not applied from the heading; the per-row speaker markings were used instead
- **ilsa-not-family-C3.md** — `O-SC-T4-13-1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-c-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-1-c-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-2-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-2-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-2-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-2-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-2-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `O-CH-T4-13-3-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-3-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-3-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `A-SC-T4-13-4` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-4-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-4-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-4-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-4-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-4-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-4-b-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `A-CH-T4-13-5-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-5-s` -> `pip`, read from the "Pip — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C3.md** — `L-CH-T4-13-5-a-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-5-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-5-b-r1` -> `pip`, read from the "Pip — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C3.md** — `L-CH-T4-13-5-b-r2` -> `pip`, read from the "Pip — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is `*(name)*`)
- **ilsa-not-family-C3.md** — `L-CH-T4-13-6-s` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-6-a-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-6-a-r2` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-6-b-act` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **ilsa-not-family-C3.md** — `L-CH-T4-13-6-b-r1` -> `ilsa` by the file's default; this file states its exceptions in PROSE ("Dialogue speakers: `ilsa` unless a section note says otherwise. Pip speaks node 5's set-up and option `-b` res…") so any non-default speaker here is NOT machine-derivable and needs a human pass
- **toby-kept-and-returned-C3.md** — no default-speaker declaration; defaulted every unmarked `dialogue` slot to the file's soul `toby`
- **toby-the-shelf-C2.md** — no default-speaker declaration; defaulted every unmarked `dialogue` slot to the file's soul `toby`
- **toby-the-shelf-C3.md** — no default-speaker declaration; defaulted every unmarked `dialogue` slot to the file's soul `toby`
- **toby-the-shelf-C4.md** — no default-speaker declaration; defaulted every unmarked `dialogue` slot to the file's soul `toby`

## Inferred — variant (4)

- **ilsa-forge-short-C4.md** — CH-T4-10-6: path_variants { L-CH-T4-10-6-s-norm -> L-CH-T4-10-6-s-div } from the `-norm`/`-div` set-up pair
- **toby-the-shelf-C2.md** — CH-T2-09-6: path_variants { L-CH-T2-09-6-a-r1-norm -> L-CH-T2-09-6-a-r1-div } — the `-div` text rides its `-norm` sibling rather than taking a slot of its own
- **toby-the-shelf-C2.md** — CH-T2-09-6: path_variants { L-CH-T2-09-6-b-p-norm -> L-CH-T2-09-6-b-p-div } — the `-div` text rides its `-norm` sibling rather than taking a slot of its own
- **toby-the-shelf-C2.md** — CH-T2-09-6: path_variants { L-CH-T2-09-6-s-norm -> L-CH-T2-09-6-s-div } from the `-norm`/`-div` set-up pair

## Inferred — wiring (9)

- **ilsa-kin-no-show-C4.md** — `O-SC-T4-06-5`: its id implies CH-T4-06-5, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C1.md** — `O-SC-T2-08-1`: its id implies CH-T2-08-1, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C1.md** — `A-SC-T2-08-2`: its id implies CH-T2-08-2, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C1.md** — `O-SC-T2-08-3`: its id implies CH-T2-08-3, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C2.md** — `O-SC-T2-09-1`: its id implies CH-T2-09-1, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C2.md** — `A-SC-T2-09-2`: its id implies CH-T2-09-2, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C2.md** — `O-SC-T2-09-5`: its id implies CH-T2-09-5, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT
- **toby-the-shelf-C2.md** — `A-CH-T2-09-6-s`: its id implies CH-T2-09-6, but the graph wires it to CH-T2-09-3 / CH-T2-09-3-a — the graph's wiring KEPT
- **toby-the-shelf-C4.md** — `O-SC-T2-11-1`: its id implies CH-T2-11-1, but the graph wires it to the scene (no choice_id — usually a gather_line) — the graph's wiring KEPT

