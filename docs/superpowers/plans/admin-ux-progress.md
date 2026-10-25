# SDD ledger — plan: docs/superpowers/plans/2026-10-24-administrativo-ux.md

Execution: inline, design and plan approved by user.
Isolation: managed worktree admin-ux from HEAD; existing user edits remain in original checkout.
Pre-flight: tasks 3–7 consume Field, FormSection, TaskLayout and FormActions from tasks 1–2. Preserve legacy Field and ActionForm signatures to avoid migration conflicts.
Ruling: use installed dependencies through a junction; no reinstall needed. npm/npx launcher is broken, invoke bundled npm CLI through node.
Ruling: preserve native details for progressive sections, matching existing history and preview controls. This keeps every field mounted and enables native validation to reveal ancestors without replacing Radix primitives.
Ruling: portable PowerShell bookkeeping replaces bash-only task scripts; this ledger records the same task boundaries. No separate commits until verification/review of shared changes, to keep the migration atomic.
Task 1: implemented — required markers, error association, native invalid focus, sections; 4 tests plus existing product/kit tests passed.
Task 2: implemented — task layout, sticky actions, contextual Sheet, theme context; focus/discard and shell tests passed.
Task 3: implemented — products/kit progressive grouping, compact cost summary, gallery requirements; catalog and existing product/kit tests passed.
Task 4: implemented — quote/sale draft summary, customer contextual editor, collapsible histories; draft and conflict tests passed.
Task 5: implemented — production/planning/stock summaries and progressive sections, conditional reason, preserved command handlers; operation tests passed.
Task 6: implemented — finance task context and specific action labels, calculator details, profitability history; finance tests passed.
Task 7: implemented — configuration contextual editors, descriptive actions, field errors, appearance progressive sections, dashboard priorities first; configuration tests passed.
Task 8: complete — production builds (webpack locally and Turbopack Docker), typecheck and lint passed. Browser QA covered desktop, mobile, theme and discard flows. All 446 unit assertions passed in separate interface/domain runs; mixed Vitest execution still has a transport recursion issue, recorded as a limitation rather than hidden.
Verification: baseline 431 assertions / 112 files passed, but Node 24 undici emitted ERR_INVALID_STATE in product-request.test.ts. After initial migration: 443 assertions / 119 files passed with same preexisting error. Do not claim a green full suite.
Review: independent reviewer found 3 P2 issues (header discard, dirty state after programmatic close, negative-stock reason). Added reproductions, observed failures, fixed and reran: 9 targeted tests passed. Reviewer confirmed fixes with no concrete residual issue.
Browser: actual components served through fixture-only Vite harness, no database or API writes. Desktop 1366×768 inspected; mobile 390 px measured without horizontal page overflow. Remaining: wide viewport, reflow, final theme/focus checks.
Ruling: do not run database integration tests without the dedicated localhost:55432/b2t_test database. Its setup truncates tables and intentionally rejects any other destination. No API/domain changes are part of this work.

Final browser checks: 1920×1080 finance; light/dark themes; actual header-X discard protection; 683×384 available-area reflow with field entry and visible actions. No page-width overflow. Not a native browser-zoom measurement.
Ruling: fix the preexisting Node 24 multipart producer error in test preparation only; encode FormData before creating Request, preserving multipart bytes and no Content-Length. Five upload tests passed without unhandled errors.
Delivery: copied task files into X:/codex/appb2t after confirming each existing destination matched HEAD or the approved design/plan. User's unrelated edits were preserved. User explicitly authorized completing all necessary work, including applying to the main working tree.
Local runtime: rebuilt only app with docker compose up -d --no-deps --build app. Existing database kept running; added its db alias to current compose network because it was still attached only to the previous network. App and database healthy; /api/health returned HTTP 200 {"status":"ok"}.
Review report: docs/superpowers/reviews/2026-10-25-administrativo-ux.md.
PR preparation (2026-10-25): user authorized creating and publishing the PR. Branch codex/admin-ux from main f1b7592. Explicit allowlist excludes preexisting admin recovery work, installation docs, secrets and logs. Fresh domain/upload 267 passed; typecheck and lint passed. Full UI group rerun hit runner recursion in both worktree and original root; disclose in PR instead of claiming a fresh full pass. Source/test candidate hashes matched original root (60 files). Connector lacks repository access, so use authenticated local gh/git.
