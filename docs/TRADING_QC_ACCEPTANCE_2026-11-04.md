# ICA PRIME Trading Software — Frontend + Backend QC Gate
Date: 2026-11-04
Scope: Private ICA Master `/master?view=trading` and Cloudflare `ica-master-platform`.
This is a **verification checklist**, not a certificate that all device/browser behavior is proved.

## Functional controls and expected behavior

| Area | Control | Required result | Verification |
|---|---|---|---|
| Main workspace | Paper trade header | Scrolls to working paper scanner | Wired in UI; browser test pending |
| Main workspace | Dashboard / Ask AI tabs | Changes view without losing paper runner state | Source reviewed; browser test pending |
| Main workspace | Expand / exit | Enlarges/restores dashboard without trapping scrolling | Source reviewed; desktop+mobile pending |
| Detached windows | Chart, watchlist, chain, risk | Opens correct panel; returns to main dashboard if direct-link window | Wired; browser test pending |
| Detached windows | Scanner, alerts, results | Uses actual persisted paper session, **not static demo cards** | Wired; browser test pending |
| Watchlist | Filter group, select symbol, add/remove ticker | Changes chart/chain and shows latest actual scanner result or NOT CHECKED | Wired; browser test pending |
| TradingView | Interval buttons, full-chart link | Changes chart timeframe; link remains fallback for blocked embeds | Official Web Component integration reviewed; browser test pending |
| Schwab chart | 1/5/15/30/60m, zoom, latest, expand, drag | Updates real, timestamped candles; never fabricated prices | Code reviewed; authenticated quote + pointer test pending |
| Schwab options | CALL/PUT, show/collapse, select contract | Real authorized chain, selectable stream quote and clear delays | Code reviewed; live provider test pending |
| Schwab connection | Preflight, status, authorize, quote, disconnect | Authenticated owner-only actions with useful error states | Backend regression suite; provider test pending |
| Paper scanner | Start, pause, Run Now | Persists server state; Run Now performs early check; safe guards | Backend tests + build |
| Paper scanner | Auto-start at 9:30 AM ET | Server-saved opt-in; minute cron starts once per weekday; Pause not undone | New backend boundary regression + build |
| Paper trading | Alert accept/dismiss, open/closed tabs | Expiration, fresh quote, buying power and one-time approval verified | Backend regression suite |
| Paper trading | Close one, close all | Independent protective simulated exits; no fake fills on stale bid | Backend regression suite |
| Paper trading | Premium/extra tickers, Save | Validated inputs; persisted settings; blocked mid-position | Source + regression review |
| Mobile bell | Enable, Test, turn off | Foreground audio starts after gesture; full bell plays; interrupted state is shown | Code + build, **physical iPhone test pending** |
| Alert delivery | Background phone alert | Must work when screen locked **without** depending on page audio | **Not implemented: push and/or verified email needed** |
| AI assistant | Check connection, example prompts, Send, Clear | Authenticated AI chat, no unsourced live market data or orders | Backend auth/billing tests; live model response pending |
| AI credits | Recheck, billing link | Billable check only after owner opens advanced settings | Code + build; billing/provider request pending |
| Risk/mode | Real live trade button | Remains deliberately locked until broker execution security review | Verified policy; **do not enable during QC** |

## Release gates
- [x] GitHub Actions trading tests and Vite build (PR validation)
- [x] 9:30 schedule regression for prior minute, activation, manual Pause, next weekday, and opt-out
- [x] No actual brokerage order path enabled by this change
- [ ] Browser smoke test: desktop logged-in Master / chart widget / every visible control
- [ ] Browser smoke test: iPhone Safari foreground bell, interruption recovery, modal, popouts, scrolling
- [ ] Authorized Schwab status, quote, option-chain, streaming test using owner session (no orders)
- [ ] Confirm deployed web app and Worker match approved commit
- [ ] Configure/verify reliable opt-in background alerts before claiming locked-screen notifications
- [ ] Exercise AI response + billing states with an authenticated owner test without claiming dollar balance

**QC verdict:** Automated source/regression review can pass. The software is not honestly “100% verified” until the remaining runtime checks are observed. Do not substitute simulated market data, claim trading returns, or silently submit real orders.
