# AI DEVELOPMENT RULES

Applies to any AI assistant working in this repository.

## Core rules

1. Read existing code before editing.
2. Read PROJECT.md before major changes. It is the source of truth.
3. Do not rewrite unrelated files.
4. Prefer existing dependencies.
5. Explain major changes.
6. Do not expose secrets.
7. Validate external input.
8. Do not invent test results.
9. Keep components and functions focused.
10. Preserve working features.
11. Use synthetic telecom data in examples.
12. Update README when setup changes.
13. Make one logical change at a time.
14. Before risky changes, recommend a Git checkpoint.
15. Distinguish GENERATED, RUN, TESTED, and VERIFIED.

## Evidence states

Never describe work with a state you have not reached.

| State | Means |
|---|---|
| GENERATED | Code was written. Nothing has been executed. |
| RUN | The code executed without crashing. Behaviour unconfirmed. |
| TESTED | A specific case was exercised and the observed output recorded. |
| VERIFIED | Acceptance criteria checked, including at least one negative case. |

Never claim:

- the application works without running it
- an API works without calling it
- a deployment succeeded without opening it
- a security issue is fixed without retesting it

If a step could not be executed, say so plainly and name the blocker.

## Project-specific rules

16. This project runs on **Next.js 16**. Its APIs differ from earlier versions.
    Read `node_modules/next/dist/docs/` before writing framework code — do not
    write App Router code from memory. See AGENTS.md.
17. SQL lives only in `lib/db/`. Route handlers and components never contain SQL.
18. All SQL uses bound parameters. Never interpolate a request value into a query.
19. Every query parameter is validated in `lib/validation.ts` against an
    allowlist before it reaches the database.
20. The scoring function lives only in `lib/model/`. Replacing it must not
    require touching any component.
21. Predicted values and historical actuals must stay visibly distinct in the UI.
    Never label a prediction as measured history.
22. Show model confidence wherever a churn probability is displayed.
23. Arabic RTL is the interface language. Keep technical terms in Latin script
    where that is how staff read them: Churn, Customer ID, AUC, CSV.
24. No colour may be declared only inside a media query or a theme block; define
    every colour as a token in the base scope first.
25. Do not add a charting, state-management, or component library. Charts are
    hand-built inline SVG. Adding a dependency requires a note in PROJECT.md.
