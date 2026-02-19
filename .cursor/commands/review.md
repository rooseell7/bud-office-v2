Run a safe review of current changes.

1) Show git diff summary (files changed + why).
2) Identify risk areas (Sheet, auth, env, deployment).
3) Run: lint + typecheck + build (use project scripts).
4) If tests exist: run the minimal relevant test suite.
5) Output: checklist results + next actions.
