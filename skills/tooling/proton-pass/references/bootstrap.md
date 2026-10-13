# The bootstrap credential

Why an unattended process needs one secret outside the vault, where to put it on
each OS, and the mistakes that cost tokens.

## The problem

`pass-cli` keeps a session on disk. Every **read** works from that session with
no credential in sight — which is the good part, and why an agent can operate for
hours with nothing sensitive anywhere near it.

The session expires. Token sessions last **2 hours**. At that moment the process
needs to run exactly one command it cannot run: `login`, which needs the token,
which is deliberately nowhere the process can reach.

Two bad outcomes follow, and both are common:

1. **A human has to be present for a routine expiry.** A long task dies
   mid-flight waiting for someone to notice.
2. **Someone pastes the token into a command to get moving.** Now it is in shell
   history, in the process table, and in the agent's transcript — which is the
   one thing this design existed to prevent.

## The shape of the fix

**One bootstrap secret, in the OS keychain, holding nothing but the token.**

The keychain entry is bound to this user on this machine and is not readable by
another account. The token inside still reaches only the vaults it was granted —
so the blast radius is exactly what it was before, and the vault boundary is
still the control.

One thing in the keychain, and it is the route to the real keys.

Non-negotiables for any implementation:

- The secret is **typed into a prompt with echo off**, never passed as an
  argument, never read from a file that lingers.
- It is handed to `pass-cli` as a **process environment variable**, set and
  cleared inside the same call.
- The store **reads the value back and compares** before reporting success.
- The value's **shape is validated before storing** — `pst_<token>::<key>`.

## Per-OS storage

| OS | Store | Mechanism |
|---|---|---|
| Windows | Credential Manager, generic credential | `CredWriteW` / `CredReadW` via P/Invoke; DPAPI at rest |
| macOS | login Keychain, generic password | `security -i` fed `add-generic-password` on stdin |
| Linux | Secret Service (GNOME Keyring, KWallet) | `secret-tool store` / `secret-tool lookup` |

**The macOS call is deliberately awkward.** The idiomatic form,
`security add-generic-password -w "$secret"`, puts the token in that process's
argv, where any user on the box can read it straight out of `ps`. That is the
exact exposure this whole design exists to avoid, and it is easy to ship by
accident because it works perfectly. `security -i` takes the same command on
stdin instead, so the value never becomes an argument. `secret-tool` reads the
secret from stdin natively and needs no such workaround.

This is also why `validate_token_shape` refuses quotes and backslashes: the
value is interpolated into a line that `security -i` parses as a command.

Linux without a Secret Service daemon — a headless server, a container — has no
good local answer. Use the platform's own secret store there (systemd credentials,
the CI provider's secret store, a cloud KMS) and inject the token as an
environment variable at process start. Do not fall back to a file on disk.

**Containers**: the kernel secret service is unavailable inside a container, so
pass-cli's own key material lands on the filesystem. Know that before you put
pass-cli in an image.

## The three mistakes

Each of these cost a one-time token, which then had to be regenerated.

### A failed store that reported success

The first Windows implementation printed "stored" and returned true while
storing nothing. `Add-Type` had failed, so the call to the type raised "Unable to
find type" — which is *statement*-terminating in PowerShell, not
*script*-terminating. Execution walked straight on to the success message.

The token had been displayed once, was pasted into a box that discarded it, and
was gone.

**Never trust a credential write that was not read back and compared.** That is
the single most important line in either helper script.

### The wrong value stored, silently

A later run stored 58 characters beginning `Add-` — a fragment of an error
message that happened to be on the clipboard. Nothing complained. The mistake
surfaced two commands later as a login failure that said nothing about where the
bad value came from.

**Validate the shape at the paste**, not at first use. A token is
`pst_<token>::<key>` with no whitespace. Anything else is rejected before it
reaches the store.

### `Add-Type -UsingNamespace System.Runtime.InteropServices`

Compilation error CS0105. `Add-Type -MemberDefinition` already emits that
`using`, and repeating it fails. Listed here because the error text points at
the C# rather than at the PowerShell that generated it.

## The rotation ceremony

Expiration is mandatory on every PAT and agent token, so this recurs — annually
at `1y`, sooner at anything shorter, and immediately whenever a token is revoked
or lost.

0. **Prove the store works first**, while nothing is at stake:

   ```bash
   ./bin/proton-pass-agent.sh self-check
   ```

   It round-trips a fake value through a throwaway keychain entry. Every failure
   in "The three mistakes" below was discovered *after* a one-time token had
   already been generated and could not be regenerated without cost. Doing this
   first is thirty seconds against that.

   Treat **SKIP** as unproven, not passing — a skipped keychain round trip means
   the platform has no backend, and `store` will fail when it matters.

1. **Owner regenerates the token**, scoped to the machine-secrets vault only:
   `pass-cli agent renew <name> --expiration 1y`. It is displayed **exactly
   once**. Keep it on the clipboard until step 3 reports success.
2. **Run the store command**, which prompts on the owner's own screen. On
   Windows this must be a real interactive shell, not an agent's tool call:

   ```powershell
   Start-Process pwsh -ArgumentList '-NoProfile','-NoExit','-Command',
     ". `"`$env:USERPROFILE\.local\bin\ProtonPassAgent.ps1`"; Set-ProtonPassAgentToken"
   ```

3. **Confirm the read-back.** Success means the helper says it stored the value
   *and read it back*. Anything else means nothing usable is stored — do not
   dismiss the token yet.
4. **Verify end to end**: connect, then perform a real read. A login that
   succeeds but reads nothing means the grant is missing, not the auth.

After that the process is autonomous until the next expiry.

Dot-sourcing note: a bash-expanded `$HOME` hands PowerShell a POSIX path it
cannot resolve. Use `$env:USERPROFILE`.

## Revoking

Deleting the local copy does **not** invalidate the token. Do both:

```powershell
Remove-ProtonPassAgentToken                 # Windows
```
```bash
./bin/proton-pass-agent.sh forget           # macOS / Linux
```
```
pass-cli agent delete <name>                # the actual revocation
```

Use the helper functions rather than reaching for the P/Invoke type directly —
`[ProtonPass.CredStore]::Delete(...)` works, but it takes the raw target name,
skips the reminder that the token is still live in Proton Pass, and breaks
silently if the namespace ever changes.
