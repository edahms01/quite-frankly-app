# Phase Brief Template

Reusable skeleton for every Quite Frankly Mobile App phase brief. Fill in the bracketed fields, keep the section order — Code should be able to open any single brief cold and know exactly where it is, without needing the rest of the conversation history.

---

```
## Project context
- **Project**: Quite Frankly Mobile App — React Native iOS/Android app for
  the *Quite Frankly* podcast (quitefrankly.tv). Distinct from
  QuiteFranklyOS (separate web portal repo).
- **Repo**: ~/Desktop/Claude/quite-frankly-mobile-app
  (github.com/edahms01/quite-frankly-app if pushed)
- **Start here**: Read CLAUDE.md in full before anything else — it's the
  entry point and links to every other doc (plan, component map,
  frontend prep, theme.js).
- **This brief**: Phase [N] of 8 — [Phase Name]. [One-line goal.]
- **Depends on**: Phase [N-1] complete and its QA passed.
  [If N=1: "Nothing — this is the first phase."]

## Do
[Numbered steps for this phase.]

## Don't
[Explicit scope boundaries — what belongs to a later phase, so Code
doesn't drift ahead or invent scope.]

## QA
[Checklist specific to this phase's output. Expect pass/fail per item
back, not a summary. For phases with multiple similar units of work
(e.g. building many screens), break QA into sub-phase checkpoints
rather than one pass at the very end — see quite-frankly-app-plan.md's
QA framework notes for why.]

## Report back
[What Code should tell Eric when the phase is done — decisions made,
deviations from the docs, QA results, anything that needs a human call
before the next phase starts.]
```
