# Site copy

Draft for [#28](https://github.com/scott-r-lindsey/foom-site/issues/28).
The owner approved this copy on 2026-10-30, including the tagline and the
qualified Local by design wording. #31 implements it. Content PRs still need the
owner's dev check before merge.

Product evidence is pinned to Foom commit
[`245a4d44f45c0c833bedfee19791abf3235beba8`](https://github.com/scott-r-lindsey/foom/commit/245a4d44f45c0c833bedfee19791abf3235beba8).
All Foom source links below use that commit. Editorial notes, sample-data notes,
the claims table and owner questions are not public page copy.

## Recorded owner decisions

Source: [2026-10-29 owner decisions on #27](https://github.com/scott-r-lindsey/foom-site/issues/27#issuecomment-6514685336)
and [download clarification on #32](https://github.com/scott-r-lindsey/foom-site/issues/32#issuecomment-6514685848).

- Link the rolling nightly prerelease. Switch to stable releases when they exist.
  macOS arm64 nightlies are Developer ID signed and notarized; Windows x64 is
  unsigned pending [foom#665](https://github.com/scott-r-lindsey/foom/issues/665).
  Linux x64 ships as a ZIP.
- Put “built by its own agents” at the end of the orchestration section, not in
  the headline.
- Use dark-first styling with light mode following system preference. The black
  hole stays `#06050B` in both modes. Amber means Needs you only; magenta means
  Failed only.
- The hero replays sidebar rows with agent, branch, light and reason. Use the
  sample rows below, not an abstract field of lights.
- A future `/privacy/` page belongs to #39, after #34 ships. Its endpoint logging
  and retention statements must follow the shipped infrastructure, not assumptions.
- #28, #29 and #32 may proceed independently. #30 waits for #29. #31 waits for
  owner approval of #28 and completion of #29. The homepage Download button
  belongs to #31, per its [scope clarification](https://github.com/scott-r-lindsey/foom-site/issues/31#issuecomment-6514689427).

## Positioning

**Tagline:** Many agents. One needs you.

**One-line description / meta description:** Foom is a desktop workspace for coding agents in Git worktrees, with terminal tiles and lights that tell you which agent needs you.

Editorial note: the tagline describes the attention-routing idea, not a promise
that exactly one agent needs input. Use the same description for home metadata.

## Home page

### Hero

**Heading:** Many agents. One needs you.

**Body:** Run coding agents side by side in Git worktrees. Let the lights tell you
who is working, who is finished, and who is waiting for you.

**Primary link:** Download → `/download/`

**Secondary link:** Docs → <https://github.com/scott-r-lindsey/foom>

#### Sidebar replay: sample data, not a captured session

These six rows are illustrative. Branch names and the combination of sessions
are invented sample data, not customer activity, screenshots or measured results.
Use text agent names and neutral badges, not third-party logos. Keep this
sample-data designation in the implementation source for #30.

The real sidebar nests sessions under worktree branches. The table supplies that
branch context; it does not propose a new flat product layout. Ordinary reason
lines use `reason · signal`. The documented example is
`Wants to edit src/main/main.ts · pattern: (y/n)`; these samples instead use
verbatim implementation reasons and signal IDs. Waiting is a real display
override: it shows `Waiting on N`, without an appended verdict signal. Do not
invent one to fill that row. Shells have no sidebar reason line, so all six
samples are agents.

| Agent       | Branch                    | State     | Reason line                                        | Process |
| ----------- | ------------------------- | --------- | -------------------------------------------------- | ------- |
| Codex       | `codex/sidebar-filter`    | Working   | `Agent is working · rules:codex:osc_title_working` | Running |
| Claude Code | `claude/settings-copy`    | Needs you | `Waiting for yes or no · pattern:confirmation`     | Running |
| Antigravity | `agy/keyboard-nav`        | Done      | `Process exited successfully · process:exit`       | Exited  |
| Codex       | `codex/artifact-checks`   | Failed    | `Process exited with an error · process:exit`      | Exited  |
| Claude Code | `claude/preview-server`   | Quiet     | `Server is listening · pattern:server`             | Running |
| Codex       | `codex/site-orchestrator` | Waiting   | `Waiting on 3`                                     | Running |

Editorial note: #30 owns replay timing, recorded output-rate traces, accessible
labels and reduced-motion behavior. Done and Failed here are exited examples:
draw a green hollow ring and a magenta square outline respectively. Working is
violet; Needs you alone is amber with a steady halo. Quiet is dim neutral;
Waiting is a neutral hourglass. Show state words as well as lights. Do not add
output-rate claims to the copy or present these sample branches as measured runs.

### What the lights mean

**Heading:** What the lights mean

**Body:** Every agent verdict has a reason and the signal behind it. Quiet is not
done. A process can be silent while it works.

| Label     | Body                                  |
| --------- | ------------------------------------- |
| Working   | The agent is executing.               |
| Needs you | Waiting for your input or approval.   |
| Done      | Finished successfully.                |
| Failed    | Exited with an error or gave up.      |
| Quiet     | Quiet but fine.                       |
| Waiting   | An idle orchestrator awaits children. |

**Exited:** A solid light means the process is running. A hollow ring means it
has exited. Failed uses a square outline. The result stays visible.

Editorial note: use the six light treatments specified above. Exited is a process
condition, not a seventh attention state. Shell lights follow separate neutral
rules; this explanation and the replay describe agents.

### One worktree per agent

**Heading:** One worktree per agent

**Body:** Give each agent its own Git worktree and branch. Keep terminals in tiles,
or hide them while they keep running. The sidebar keeps repositories, worktrees
and sessions together.

Editorial note: this is a workflow, not a claim that Foom enforces one session per
worktree or sandboxes agents. Worktrees are separate checkouts, not security
boundaries. #31 owns the board image; use a real capture from foom#582 and write
alt text against the selected image rather than inventing its contents here.

### Agents

**Heading:** Familiar agents. One workspace.

**Body:** Foom includes integrations for Claude Code, Codex and Antigravity. Add
other agents with JSON manifests, or run a CLI in a plain shell. The agent CLIs
use your existing installations.

Editorial note: bundled integrations do not mean bundled agent executables,
subscriptions or credentials. Use text names only.

### Orchestration

**Heading:** Give one agent the room.

**Body:** Make an agent the repository's orchestrator. It can create worktrees,
launch workers, read their reports and inspect their results. You can stop a
worker or take it over. The orchestrator's access ends when you take over.

This site's production launch ran through Foom, with an orchestrator and Codex
workers. Built by its own agents.

Editorial note: keep that last sentence as the section's payoff. The claim is
about the evidenced production-launch work, not every line of this site or
Foom's entire development history. Evidence is the owner's statement on #27,
issue #33 and PRs #35–#38, linked in the claims table.

### Local by design

**Heading:** Local by design

**Body:** Foom evaluates attention locally, without sending terminal content to
a model. Agent-requested child reports and terminal tails can enter the
orchestrator agent's model context under that agent's provider settings.

Update checks are on by default. Turn them off in Settings → General. Update
requests never include terminal content, repository paths, agent identities or
credentials.

Foom is open source under Apache-2.0.

Editorial note: do not shorten this to “nothing leaves your machine”, “no
telemetry” or “no network requests”. The pinned privacy rules disclose update
counts, agent output access, SSH transport to user-provided hosts and forge
metadata requests. Endpoint log fields and retention copy remain with #39 after
#34; this draft makes no claim about their implementation or retention period.

## Download page

### Page introduction

**Heading:** Download Foom

**Body:** Get the rolling nightly. These are development builds.

**Release link:** Nightly release → <https://github.com/scott-r-lindsey/foom/releases/tag/nightly>

Editorial note: per the [#32 scope change](https://github.com/scott-r-lindsey/foom-site/issues/32),
each platform link points to the nightly release page above. The rolling
nightly deletes its previous assets on each rollover, so the page shows no
version, date, archive size or direct asset URL. Direct links return with the
immutable nightly feed (foom#604), which needs its own issue. All three
platforms remain listed. The homepage link label remains Download.

### macOS

**Heading:** macOS · Apple silicon

**Body:** The macOS arm64 nightly is Developer ID signed and notarized. Extract
the ZIP and open `Foom.app`.

**Link label:** Download for macOS

Editorial note: the signing authority is `docs/validation.md`, “CI and packages”.
The “not signed or notarized” introduction and macOS quarantine-removal steps in
`docs/nightly-opening.md` predate signing. Do not copy those statements or steps
into the page, and do not promise a warning-free first launch.

### Windows

**Heading:** Windows · x64

**Body:** The Windows x64 nightly is unsigned. Extract the ZIP and open
`Foom.exe`. If SmartScreen warns, choose **More info → Run anyway**.

**Link label:** Download for Windows

Editorial note: Windows signing remains [foom#665](https://github.com/scott-r-lindsey/foom/issues/665).
Do not imply that macOS signing applies to Windows.

### Linux

**Heading:** Linux · x64

**Body:** Download the Linux x64 ZIP. Extract it and run `./Foom` in a graphical
desktop session.

**Link label:** Download for Linux

#### Ubuntu 24.04

**Body:** Ubuntu 24.04 needs a few runtime libraries and an AppArmor profile for
Chromium's sandbox. Follow the setup in the Foom repository.

**Link label:** Ubuntu 24.04 setup → <https://github.com/scott-r-lindsey/foom/blob/main/docs/nightly-opening.md#ubuntu-2404-sandbox-setup>

Editorial note: link to the maintained instructions rather than copying the
package list and profile, which change with the app. Do not suggest disabling
the sandbox.

### Checksums and source

**Heading:** Check the archive. Read the source.

**Body:** The nightly release includes `SHA256SUMS` for the platform ZIPs.

**Link labels:** SHA256SUMS · Source

Editorial note: SHA256SUMS links to
<https://github.com/scott-r-lindsey/foom/releases/download/nightly/SHA256SUMS>.
Source links to <https://github.com/scott-r-lindsey/foom>. Do not hardcode a nightly version,
date, archive size or asset URL from this draft.

## Footer

**Text:** Nothing needs you. Yet.

**Links:** Download · Docs · Source · Apache-2.0

Editorial note: Download points to `/download/`; Docs and Source both point to
<https://github.com/scott-r-lindsey/foom> for now. Apache-2.0 points to the
[license][license]. Add the label Privacy pointing to `/privacy/` when #39 ships;
do not emit a link to an absent page. The footer sentence is brand voice, not a
live reading of the visitor's sessions.

## Claims and evidence

Each row covers the corresponding public copy and its supporting editorial
constraints. Section names identify the source location at the pinned commit;
source-code references identify the symbol or JSON rule. Owner decisions and
site history are explicitly separate evidence, not capabilities inferred from
Foom documentation.

| Claim / copy                                                                                                        | Foom path and section at the pinned commit                                                                                                                           | Scope / evidence                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tagline, description, hero: desktop workspace, concurrent coding agents, Git worktrees, tiles and attention routing | [README.md][readme], introduction; [docs/product.md][product], introduction                                                                                          | Tagline is proposed wording, not an exact count or metric.                                                                                                                                                                                                                                                                                                                                                                                               |
| Hero and lights: each verdict has a reason and signal                                                               | [docs/behavior/attention.md][attention], “The light”; [src/renderer/board/live-board-source.ts][board-source], `stateRow`                                            | Actual ordinary display is `reason · signal`; the edit-request example is documented in “The light”.                                                                                                                                                                                                                                                                                                                                                     |
| Sample Working row: Codex, executing, exact reason and signal                                                       | [src/shared/bundled-agents/codex.json][codex-manifest], `attention.rules` rule `osc_title_working`; [src/main/evaluator/evaluator.ts][evaluator], `evaluateRules`    | `Agent is working · rules:codex:osc_title_working`; branch is illustrative.                                                                                                                                                                                                                                                                                                                                                                              |
| Sample Needs you row: yes/no request                                                                                | [src/main/evaluator/evaluator.ts][evaluator], `evaluateRules`, confirmation pattern                                                                                  | `Waiting for yes or no · pattern:confirmation`; branch is illustrative.                                                                                                                                                                                                                                                                                                                                                                                  |
| Sample Done and Failed rows: process exits                                                                          | [src/main/evaluator/evaluator.ts][evaluator], `evaluateRules`, exit-code branch                                                                                      | Exact `Process exited successfully` / `Process exited with an error` reasons and `process:exit` signal.                                                                                                                                                                                                                                                                                                                                                  |
| Sample Quiet row: listening server                                                                                  | [src/main/evaluator/evaluator.ts][evaluator], `evaluateRules`, server pattern                                                                                        | `Server is listening · pattern:server`; branch is illustrative.                                                                                                                                                                                                                                                                                                                                                                                          |
| Sample Waiting row: idle orchestrator, three pending children                                                       | [docs/behavior/attention.md][attention], “The light”; [src/renderer/board/live-board-source.ts][board-source], `stateRow`                                            | `Waiting on 3` is the real display override; three is sample data.                                                                                                                                                                                                                                                                                                                                                                                       |
| Six state labels and meanings; Quiet does not establish completion                                                  | [docs/behavior/attention.md][attention], “The light” and “The evaluator”                                                                                             | Working, Needs you, Done, Failed, Quiet, Waiting. No separate seventh verdict.                                                                                                                                                                                                                                                                                                                                                                           |
| Violet activity, amber Needs you halo, green Done, square magenta Failed, neutral Quiet / Waiting                   | [docs/behavior/attention.md][attention], “The light”; [docs/brand.md][brand], “Rules”                                                                                | Status has text and shape as well as color. Amber never decorates.                                                                                                                                                                                                                                                                                                                                                                                       |
| Solid running lights; exited rings, Failed square outline, retained result                                          | [docs/behavior/attention.md][attention], “The light”                                                                                                                 | Exited Done is green; exited Failed is magenta; other exited lights are muted.                                                                                                                                                                                                                                                                                                                                                                           |
| Agent names, branch grouping, neutral badges; shells have no reason line                                            | [docs/behavior/sidebar.md][sidebar], “Terminal sidebar”                                                                                                              | Agent-only hero rows avoid inventing shell reason text or colored shell execution states.                                                                                                                                                                                                                                                                                                                                                                |
| Separate worktree and branch workflow, not enforced isolation                                                       | [docs/behavior/worktrees.md][worktrees], “New worktree”; [docs/contracts/agent-trust.md][agent-trust], “Trust model”                                                 | Worktrees are not sandboxes. Agent launchers belong to checkout panels per “Terminal sidebar”.                                                                                                                                                                                                                                                                                                                                                           |
| Terminal tiles; hidden terminals keep running                                                                       | [docs/behavior/tiles.md][tiles], “Terminal tiles”; [docs/product.md][product], introduction                                                                          | Hiding is not stopping.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Claude Code, Codex and Antigravity integrations; plain-shell CLIs                                                   | [docs/product.md][product], introduction; [docs/behavior/settings.md][settings], “Settings”                                                                          | Providers are bundled; missing agent executables show Not found. No claim of bundled CLIs or subscriptions.                                                                                                                                                                                                                                                                                                                                              |
| Other agents via JSON manifests                                                                                     | [docs/contracts/agent-trust.md][agent-trust], “Trust model”, “Customizing a built-in agent” and “Code versus data”                                                   | Valid config manifests extend providers; no promise of unmeasured compatibility.                                                                                                                                                                                                                                                                                                                                                                         |
| Human grants repository orchestrator; it creates worktrees, launches workers, reads reports and inspects output     | [docs/behavior/orchestration.md][orchestration-behavior], “Orchestration and privacy”; [docs/orchestration.md][orchestration], “Pinned server and tool wording”      | Human grant precedes mutations; parent must verify results.                                                                                                                                                                                                                                                                                                                                                                                              |
| Human can stop or take over workers; takeover ends parent access                                                    | [docs/behavior/orchestration.md][orchestration-behavior], “Orchestration and privacy”                                                                                | No claim that delegated agents gain unrestricted control.                                                                                                                                                                                                                                                                                                                                                                                                |
| Production launch through Foom; “Built by its own agents”                                                           | Not a product capability claim; site history and owner-provided fact                                                                                                 | [Owner statement](https://github.com/scott-r-lindsey/foom-site/issues/27#issuecomment-6514685336), [#33](https://github.com/scott-r-lindsey/foom-site/issues/33), [#35](https://github.com/scott-r-lindsey/foom-site/pull/35), [#36](https://github.com/scott-r-lindsey/foom-site/pull/36), [#37](https://github.com/scott-r-lindsey/foom-site/pull/37), [#38](https://github.com/scott-r-lindsey/foom-site/pull/38). Applies to the stated launch work. |
| Attention evaluation is local and makes no model requests                                                           | [docs/behavior/attention.md][attention], “The evaluator”; [docs/areas/privacy.md][privacy], “Secrets”                                                                | Does not describe the agents' own provider traffic.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Child reports / terminal tails can reach orchestrator model context                                                 | [docs/behavior/orchestration.md][orchestration-behavior], “Orchestration and privacy”; [docs/areas/privacy.md][privacy], “Secrets”                                   | Required qualification to the local evaluation statement; provider settings govern the agent.                                                                                                                                                                                                                                                                                                                                                            |
| Update checks default on, General opt-out, excluded request contents                                                | [docs/areas/privacy.md][privacy], “Update requests (#603)”; [docs/product.md][product], “Updates (#603)”                                                             | No terminal content, repository paths, agent identities or credentials. No endpoint retention claim.                                                                                                                                                                                                                                                                                                                                                     |
| Apache-2.0 / open source                                                                                            | [README.md][readme], “License”; [LICENSE][license]                                                                                                                   | Dependency and font licenses remain their own.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Rolling nightly development builds; macOS arm64, Windows x64 and Linux x64 ZIPs; SHA256SUMS                         | [README.md][readme], “Try a nightly”; [docs/validation.md][validation], “CI and packages”; [docs/nightly-opening.md][nightly-opening], “Opening an unsigned nightly” | Owner selects nightly channel. Older opening document is used only for platform opening and Linux instructions, not macOS signing status.                                                                                                                                                                                                                                                                                                                |
| macOS nightly Developer ID signed and notarized                                                                     | [docs/validation.md][validation], “CI and packages”                                                                                                                  | Published nightlies, not local or PR ad-hoc artifacts. Extract/open instruction adapts the opening document without quarantine removal.                                                                                                                                                                                                                                                                                                                  |
| Windows unsigned; SmartScreen More info → Run anyway                                                                | [docs/validation.md][validation], “CI and packages”; [docs/nightly-opening.md][nightly-opening], “Opening an unsigned nightly”, Windows bullet                       | Windows signing remains #665.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Linux graphical launch, Ubuntu libraries and sandbox setup, fixed path and upgrades                                 | [docs/nightly-opening.md][nightly-opening], Linux bullet and “Ubuntu 24.04 sandbox setup”                                                                            | Page links to the maintained setup instead of copying commands; no sandbox-disabling workaround.                                                                                                                                                                                                                                                                                                                                                         |
| Footer voice                                                                                                        | [docs/brand.md][brand], “Voice”                                                                                                                                      | “Nothing needs you. Yet.” is brand wording, not live session status.                                                                                                                                                                                                                                                                                                                                                                                     |
| System light mode, invariant black hole and reserved colors                                                         | [docs/brand.md][brand], “Rules” and “Interface themes”                                                                                                               | Site theme choice comes from the owner decision; public product copy makes no new theme promise.                                                                                                                                                                                                                                                                                                                                                         |

## Owner answers

Approved on 2026-10-30:

1. The tagline “Many agents. One needs you.” and the page copy. The tagline is
   positioning, not a literal count of pending requests.
2. The qualified Local by design wording, including the agent model context
   disclosure. #31's shorthand must not become an unconditional promise that
   terminal content can never reach a model.

No new feature, performance, testimonial or comparison claims are proposed.
The download channel, theme and placement of the orchestration payoff are
already decided above. #39 owns the future endpoint privacy disclosure; its
retention details are not guessed here.

[readme]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/README.md
[product]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/product.md
[brand]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/brand.md
[attention]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/behavior/attention.md
[sidebar]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/behavior/sidebar.md
[worktrees]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/behavior/worktrees.md
[tiles]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/behavior/tiles.md
[settings]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/behavior/settings.md
[orchestration-behavior]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/behavior/orchestration.md
[orchestration]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/orchestration.md
[privacy]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/areas/privacy.md
[agent-trust]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/contracts/agent-trust.md
[validation]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/validation.md
[nightly-opening]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/docs/nightly-opening.md
[evaluator]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/src/main/evaluator/evaluator.ts
[board-source]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/src/renderer/board/live-board-source.ts
[codex-manifest]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/src/shared/bundled-agents/codex.json
[license]: https://github.com/scott-r-lindsey/foom/blob/245a4d44f45c0c833bedfee19791abf3235beba8/LICENSE
