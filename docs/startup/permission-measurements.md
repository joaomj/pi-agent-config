# Permission load-boundary measurements

## Decision

**Do not adopt this lazy boundary.** It regresses warm readiness and cache-cold first-tool delay without a consistent cold readiness gain.
Keep working settings unchanged. This rejects the measured boundary, not every possible option C implementation.
The [prototype record](permission-prototype.md) defines the retained engine and focused protection evidence.

## Results

Completed **20 measured launches and two excluded warm-ups**, with five randomized pairs per condition.
Every launch produced a verified denial for the harmless protected-file read. Active tool lists were identical.
The overlay differs from installed engine source only in `src/index.ts`.

| Condition | Metric | Unchanged median (ms) | Lazy median (ms) | Paired lazy-minus-unchanged median (ms) | Lazy wins |
| --- | --- | ---: | ---: | ---: | ---: |
| Warm | Editor readiness | 854.9 | 1055.7 | +248.0 | 0/5 |
| Warm | First prompt, settled | 136.1 | 128.4 | -10.1 | 3/5 |
| Warm | First protected-tool denial | 92.6 | 99.1 | +7.3 | 1/5 |
| Warm | Protected prompt, settled | 98.4 | 104.2 | +6.1 | 1/5 |
| Cache-cold | Editor readiness | 3373.0 | 3431.7 | +50.4 | 2/5 |
| Cache-cold | First prompt, settled | 194.8 | 270.3 | +16.0 | 1/5 |
| Cache-cold | First protected-tool denial | 96.9 | 411.5 | +314.6 | 0/5 |
| Cache-cold | Protected prompt, settled | 104.3 | 418.1 | +313.5 | 0/5 |

A positive paired delta means the lazy variant is slower. Paired deltas are not differences between group medians.
Warm readiness was slower in all five pairs, with a paired median regression of 248.0 ms.
Cache-cold readiness won two pairs and lost three; this sample does not establish a consistent gain.
Cache-cold protected-tool denial was slower in all five pairs, with a paired median regression of 314.6 ms.
The small warm first-prompt difference does not offset the readiness regression.

## Method and limits

- Both profiles use the same offline measurement extension and retain the active package group.
- Readiness uses the interactive editor probe at approximately 10 ms resolution.
- First-use times start at terminal submission, not at model request dispatch.
- An ordinary prompt completes before the first protected-tool prompt in each process.
- Prompt completion uses `agent_settled`; the denial receipt uses `tool_execution_end`.
- Cold runs isolate Node compilation and jiti caches, without clearing filesystem caches.
- Warm runs exclude one warm-up per case. Order is randomized within each pair.
- There are five samples per case and condition. Cold readiness includes large slow-run outliers.
- Compare these paired profiles only. Added instrumentation and different cache conditions prevent comparison with earlier absolute medians.
- The measurements do not identify the cause of the readiness regression.

The runner excludes the source `auth.json`. Pi creates an empty authentication store during launch.
Both generated stores were verified as empty objects, without printing values.
No real authentication was copied into these profiles. The scripted provider uses a dummy credential and makes no paid calls.

One earlier warm-up failed because its receipt listener used `tool_result`, which the blocked call did not reach.
That failed run is separate and excluded. The corrected run captured all denial receipts.

## Evidence and follow-up

Raw evidence remains outside Git at `$HOME/.local/state/pi-startup-experiments/permission-paired-20261011-235534/`.
The directory contains `manifest.json`, `results.json`, `summary.json`, isolated profiles, and per-launch evidence.
Counts, medians, paired differences, tool lists, authentication isolation, and copied engine source were independently checked.
The common driver is [`compare.py`](../../scripts/startup-experiment/permission/compare.py).

No larger confirmation or additional security suite is needed to justify not adopting this unsuccessful candidate.
Interactive approval, untrusted-project, subagent, and forwarding gaps remain unverified; do not claim complete equivalence.
The next planned experiment is separate FFF deferral. Undo remains deferred.
See the [roadmap](../ROADMAP.md) for pending tasks.
