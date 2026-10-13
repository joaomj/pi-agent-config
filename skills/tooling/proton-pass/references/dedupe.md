# Deduplicating a vault in place

Proton Pass has no duplicate detection. A round trip through another manager —
Pass to Apple Passwords and back, or any import that ran twice — leaves hundreds
of near-copies behind. This is how to remove them without an export.

Load this when someone has duplicate entries, a bloated vault after a migration,
or asks to "clean up" Proton Pass.

## Do not export, dedupe, and re-import

It is the obvious plan and it is the wrong one. The round trip is lossy in ways
that are invisible until months later.

| Data | Survives an export/import round trip? |
|---|---|
| Username, password, URLs, notes | Yes |
| TOTP seeds | Usually — `totpUri` is in the JSON export and the importer reads it |
| **Passkeys** | **No.** Present in the JSON, dropped by every importer |
| **Aliases** | **No.** They are SimpleLogin objects; an import recreates them as ordinary logins pointing at the address |
| **File attachments** | **No.** Not in the export at all |
| Item history | No |
| `create_time` / `modify_time` | No — every item resets to the import date, destroying the evidence you would need to tell copies apart afterwards |
| Pass Monitor exclusions | No |

Passkeys are the one people miss. They are visible in the exported JSON, which
makes the export look complete, and they silently fail to land on import — see
[bitwarden/clients#21356](https://github.com/bitwarden/clients/issues/21356) for
the same bug against a Proton export.

**Target the duplicates instead.** `item trash` removes one item and touches
nothing else, so every survivor keeps its history, TOTP, passkeys and files
untouched. Trash is reversible with `item untrash`, so no backup export is
needed either.

## The rule that makes it safe

**Two items collapse only if they agree on share + registrable domain +
identity + byte-exact password.**

Every part earns its place:

- **Registrable domain, not title.** After an Apple round trip the same account
  appears as `eveonline.com` and `login.eveonline.com`. Both reduce to
  `eveonline.com`. Grouping by title misses the pair; grouping by full host
  misses it too.
- **Identity as a *set* of username and email.** Importers move an address
  between the two fields freely. Compare `{username, email}` with empties
  dropped, lowercased. When one copy has `username=bob` and the other has
  `email=bob@x.com`, the sets differ and they do not collapse — a false
  negative, which is the safe direction to fail.
- **Password byte-exact.** No trimming, no case folding. This is the guard that
  lets someone hold twenty-nine accounts on one domain and lose none of them.
- **Domain as well as credentials.** Grouping on identity and password alone
  would merge two genuinely different sites that share a reused password.

## Three refusals

Having a legal cluster is not enough. Refuse to collapse and hand it to a human
when any of these hold:

1. **Irreplaceable data is split.** Compute the union of TOTP seeds, passkey
   credential IDs and attachment flags across the cluster. If no single item
   holds that whole union, there is no safe keeper. This is common: the 2024
   copy carries the passkey and the 2026 copy carries the TOTP seed.
2. **Note text differs.** More than one distinct non-empty note body means the
   copies are not copies. This refusal is the one that pays for itself — two
   items identical in title, username, password *and* URL, differing only in a
   note holding **two different Windows product keys**, are not duplicates.
   Nothing in the credential comparison can see that.
3. **The only note lives on a copy that is missing other data.** Keeping either
   one loses something.

**Never touch aliases.** Filter them out before clustering. Trashing an alias
item can disable the alias itself, which breaks mail delivery to an address that
may be the only login for some account.

## Choosing the keeper

Among items that hold the full union of irreplaceable data, rank by:

1. Most **clean hosts** — URLs with no query string, fragment or path. An Apple
   import fills `urls` with expired OAuth callbacks and one-time signup tokens;
   `https://auth.usbank.com/` is worth keeping, a 400-character
   `?authentication&token=...` is not.
2. Most irreplaceable data, then most URLs overall.
3. **Oldest** `create_time`, which is the copy with the real history.

URLs on a discarded copy are gone. Log the clean hosts that fall off so the
owner can re-add any that mattered — `item update` cannot merge them back
(see the trap below).

## Verify before and after, against the live vault

Compute these over the whole item set, not per cluster, and refuse to run if any
fail. Then re-fetch from the API afterwards and run them again — comparing the
plan to itself proves nothing.

- Zero aliases in the trash set.
- The set of TOTP seeds, passkey credential IDs and attachment flags is
  **identical** before and after.
- The set of distinct note texts is **identical** before and after.
- Every trashed item has a surviving twin under the same cluster key.
- No unplanned removals; nothing planned is still active.

Expect one benign surprise on the after-check: an item present after but not
before is usually the owner saving a new login in the browser while the batch
ran. Confirm by its `create_time`, do not assume.

## Traps

- **Item IDs that start with `-`.** Proton IDs are base64 and about 1% begin
  with a hyphen, which `pass-cli` parses as a flag:
  `error: unexpected argument '-K' found`. Always use the equals form,
  `--item-id=$ID`, never `--item-id $ID`. A bulk loop hits this on a handful of
  items and looks like it succeeded. `grep` and bash `read` mangle the same IDs;
  extract them with `awk -F'\t'`.
- **`item update --field` cannot merge URLs.** An unrecognised field name is
  silently created as a *custom field* rather than rejected, so probing for a
  `urls` field pollutes the item. There is no supported URL merge; pick the
  keeper with the best URLs instead.
- **`--show-secrets` is required.** The password is the safety guard, so the
  metadata-only listing cannot drive this. Pipe the JSON straight into the
  analysis and never write it to disk. Agent sessions cannot use the flag at
  all — dedupe is an interactive-session job.
- **Throughput.** `item trash` costs about 1.9 s. Three in parallel is
  comfortable; a few hundred items is several minutes, so run it detached and
  log every result rather than trusting an exit code.

## The tool

`bin/pass-dedupe.py` implements all of the above. Four phases, deliberately
separate so a human reads the plan before anything moves:

```bash
pass-dedupe.py plan   --vault Personal --vault "Access Tokens" --out ./plan
pass-dedupe.py verify --vault Personal --vault "Access Tokens" --out ./plan
pass-dedupe.py apply  --out ./plan --yes
pass-dedupe.py undo   --out ./plan
```

`plan` refuses to write anything if an invariant fails. It emits:

- `trash-plan.json` — IDs, titles and timestamps. **No secrets.**
- `held-back.txt` — clusters needing a human, with the reason and the item IDs.
- `dropped-urls.csv` — real login hosts lost to keeper selection.

`apply` writes `trashed.json`, which is what `undo` reads. It is idempotent:
re-running `plan` on a clean vault reports zero to collapse.

Empty the trash by hand afterwards. Leaving it full is the cheap insurance that
makes the whole approach reversible.
