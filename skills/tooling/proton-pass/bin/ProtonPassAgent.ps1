# ProtonPassAgent.ps1 -- bootstrap credential for a Proton Pass agent token.
#
#     . .\ProtonPassAgent.ps1
#     Set-ProtonPassAgentToken     # masked prompt, stores the token in Credential Manager
#     Connect-ProtonPassAgent      # reads it, logs pass-cli in, confirms
#     Get-ProtonPassSecret -Uri 'pass://Vault/Item/field' -Reason 'why'
#     Remove-ProtonPassAgentToken  # delete the local copy (does NOT revoke the token)
#
# WHY THIS EXISTS
#
# Every pass-cli READ works from the session on disk, so an automated process can
# fetch secrets unaided - right up until the session expires, which for a token
# session is every two hours. Then the one command it cannot run is the login,
# because that needs the token and the token is deliberately nowhere the process
# can reach. Sound design, one bad consequence: a human has to be present for a
# routine expiry, and the token is shown exactly once at creation, so a lost copy
# means regenerating it.
#
# So: exactly one bootstrap secret, in Windows Credential Manager (DPAPI, bound
# to this user on this machine), holding nothing but the token. The blast radius
# is unchanged - that token still reaches only the vaults it was granted.
#
# THE SECRET NEVER TOUCHES A COMMAND LINE. It is typed into a masked box, written
# through CredWrite, read back through CredRead, and handed to pass-cli as a
# process environment variable. Never an argument, never echoed, never in a
# transcript.

# --- configuration -----------------------------------------------------------

if (-not $script:ProtonPassCredTarget) {
    $script:ProtonPassCredTarget = $env:PROTON_PASS_CRED_TARGET
    if (-not $script:ProtonPassCredTarget) { $script:ProtonPassCredTarget = 'proton-pass:agent-pat' }
}
if (-not $script:ProtonPassSessionDir) {
    $script:ProtonPassSessionDir = $env:PROTON_PASS_SESSION_DIR
    # Deliberately durable, not $env:TEMP. A cleaned-up temp directory silently
    # costs the session, which then surfaces as a mysterious auth failure.
    if (-not $script:ProtonPassSessionDir) {
        $script:ProtonPassSessionDir = Join-Path $env:LOCALAPPDATA 'pass-agent-session'
    }
}
if (-not $script:ProtonPassTokenName) { $script:ProtonPassTokenName = 'pass-cli agent' }

function Resolve-PassCli {
    <#
    .SYNOPSIS
        Locate pass-cli.exe: PATH first, then the default install location.
    #>
    if ($env:PROTON_PASS_CLI -and (Test-Path -LiteralPath $env:PROTON_PASS_CLI)) {
        return $env:PROTON_PASS_CLI
    }
    $onPath = Get-Command pass-cli -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    foreach ($candidate in @(
        (Join-Path $env:LOCALAPPDATA 'Programs\ProtonPass\pass-cli.exe'),
        (Join-Path $env:ProgramFiles 'ProtonPass\pass-cli.exe')
    )) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
    }
    throw ("pass-cli not found. Install it (https://protonpass.github.io/pass-cli/get-started/installation/) " +
           "or set `$env:PROTON_PASS_CLI to its full path.")
}

# --- Credential Manager binding ----------------------------------------------

if (-not ('ProtonPass.CredStore' -as [type])) {
    # No -UsingNamespace: Add-Type's MemberDefinition template already emits
    # `using System.Runtime.InteropServices;`, and repeating it is CS0105.
    Add-Type -Namespace ProtonPass -Name CredStore -MemberDefinition @'
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL {
        public uint Flags; public uint Type; public string TargetName; public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
        public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
    }
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredWriteW(ref CREDENTIAL cred, uint flags);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredReadW(string target, uint type, uint flags, out IntPtr credential);
    [DllImport("advapi32.dll")] private static extern void CredFree(IntPtr cred);
    [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredDeleteW(string target, uint type, uint flags);

    public static void Write(string target, string user, string secret) {
        byte[] blob = System.Text.Encoding.Unicode.GetBytes(secret);
        CREDENTIAL c = new CREDENTIAL();
        c.Type = 1;      // GENERIC
        c.Persist = 2;   // LOCAL_MACHINE - survives logoff, never roams
        c.TargetName = target;
        c.UserName = user;
        c.CredentialBlobSize = (uint)blob.Length;
        c.CredentialBlob = Marshal.AllocCoTaskMem(blob.Length);
        Marshal.Copy(blob, 0, c.CredentialBlob, blob.Length);
        try {
            if (!CredWriteW(ref c, 0)) throw new Exception("CredWrite failed: " + Marshal.GetLastWin32Error());
        } finally { Marshal.FreeCoTaskMem(c.CredentialBlob); }
    }

    public static string Read(string target) {
        IntPtr p;
        if (!CredReadW(target, 1, 0, out p)) return null;
        try {
            CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
            if (c.CredentialBlobSize == 0) return null;
            return Marshal.PtrToStringUni(c.CredentialBlob, (int)c.CredentialBlobSize / 2);
        } finally { CredFree(p); }
    }

    public static bool Delete(string target) { return CredDeleteW(target, 1, 0); }
'@
}

function Set-ProtonPassAgentToken {
    <#
    .SYNOPSIS
        Prompt for the agent token and store it in Credential Manager.
    .DESCRIPTION
        A masked WinForms box rather than Read-Host, so the value never lands in
        a console buffer, in PSReadLine history, or in a transcript. Must run in
        a real interactive session - it puts a window on screen.
    #>
    [CmdletBinding()]
    param(
        [string] $Target    = $script:ProtonPassCredTarget,
        [string] $TokenName = $script:ProtonPassTokenName
    )

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $form = New-Object Windows.Forms.Form
    $form.Text = 'Proton Pass agent token'
    $form.Size = New-Object Drawing.Size(580, 235)
    $form.StartPosition = 'CenterScreen'
    $form.TopMost = $true
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $false

    $label = New-Object Windows.Forms.Label
    $label.Text = "Paste the '$TokenName' token (pst_...::...)." + [Environment]::NewLine + [Environment]::NewLine +
                  "Stored in Windows Credential Manager as '$Target'." + [Environment]::NewLine +
                  "It is not echoed and never reaches a command line."
    $label.Location = New-Object Drawing.Point(16, 14)
    $label.Size = New-Object Drawing.Size(530, 76)
    $form.Controls.Add($label)

    $box = New-Object Windows.Forms.TextBox
    $box.UseSystemPasswordChar = $true
    $box.Location = New-Object Drawing.Point(16, 96)
    $box.Size = New-Object Drawing.Size(530, 26)
    $form.Controls.Add($box)

    $ok = New-Object Windows.Forms.Button
    $ok.Text = 'Store'
    $ok.DialogResult = [Windows.Forms.DialogResult]::OK
    $ok.Location = New-Object Drawing.Point(366, 138)
    $ok.Size = New-Object Drawing.Size(84, 32)
    $form.Controls.Add($ok)
    $form.AcceptButton = $ok

    $cancel = New-Object Windows.Forms.Button
    $cancel.Text = 'Cancel'
    $cancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
    $cancel.Location = New-Object Drawing.Point(458, 138)
    $cancel.Size = New-Object Drawing.Size(88, 32)
    $form.Controls.Add($cancel)
    $form.CancelButton = $cancel

    $form.Add_Shown({ $form.Activate(); $box.Focus() })
    $result = $form.ShowDialog()
    $value = $box.Text
    $box.Text = ''
    $form.Dispose()

    if ($result -ne [Windows.Forms.DialogResult]::OK -or [string]::IsNullOrWhiteSpace($value)) {
        Write-Host 'cancelled - nothing stored' -ForegroundColor Yellow
        return $false
    }
    $written = $value.Trim()

    # VALIDATE THE SHAPE BEFORE STORING. A value that is not a token fails much
    # later, at a login, with an error that says nothing about where the bad
    # value came from. One real run stored 58 characters beginning "Add-" - a
    # line of an error message that happened to be on the clipboard - and the
    # mistake only surfaced two commands later. Reject it at the paste.
    if ($written -notmatch '^pst_[^\s]+::[^\s]+$') {
        $len = $written.Length
        $written = $null; $value = $null
        Write-Warning ("that does not look like a Proton Pass token - expected pst_<token>::<key>, " +
                       "got $len characters that do not match. Nothing stored.")
        return $false
    }

    try {
        [ProtonPass.CredStore]::Write($Target, $TokenName, $written)
    } catch {
        Write-Warning "CredWrite failed: $($_.Exception.Message)"
        return $false
    }

    # VERIFY BY READING IT BACK. An earlier version printed "stored" and returned
    # true while storing nothing: Add-Type had failed, so the Write call raised
    # "Unable to find type", which is statement-terminating rather than
    # script-terminating - execution walked straight on to the success message.
    # A one-time token was pasted into a box that discarded it. A credential
    # store that lies about storing is worse than one that fails, because the
    # failure surfaces later as an auth error with no cause.
    $check  = [ProtonPass.CredStore]::Read($Target)
    $stored = ($check -eq $written)
    $written = $null; $check = $null; $value = $null

    if (-not $stored) {
        Write-Warning 'stored value did not read back - nothing usable is in Credential Manager'
        return $false
    }
    Write-Host "stored '$Target' in Credential Manager, and read it back" -ForegroundColor Green
    return $true
}

function Connect-ProtonPassAgent {
    <#
    .SYNOPSIS
        Log pass-cli in using the stored bootstrap token. Idempotent.
    .DESCRIPTION
        Checks for a live session first and does nothing if there is one. The
        session outlives individual commands, so logging in on every call would
        be churn against Proton's API for no gain.
    #>
    [CmdletBinding()]
    param(
        [switch] $Force,
        [string] $Target = $script:ProtonPassCredTarget
    )

    $cli = Resolve-PassCli
    $env:PROTON_PASS_SESSION_DIR = $script:ProtonPassSessionDir

    if (-not $Force) {
        $info = & $cli info 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $info -match 'Personal Access Token') {
            Write-Verbose 'pass-cli session is already live'
            return $true
        }
    }

    $token = [ProtonPass.CredStore]::Read($Target)
    if (-not $token) {
        Write-Warning "No bootstrap token stored as '$Target'. Run Set-ProtonPassAgentToken first."
        return $false
    }

    & $cli logout --force 2>&1 | Out-Null
    $env:PROTON_PASS_PERSONAL_ACCESS_TOKEN = $token
    $token = $null
    try {
        $out  = & $cli login 2>&1 | Out-String
        $code = $LASTEXITCODE
    } finally {
        # Cleared either way. A failed login is exactly when something else is
        # most likely to dump the environment into a log.
        $env:PROTON_PASS_PERSONAL_ACCESS_TOKEN = $null
    }

    if ($code -ne 0) {
        Write-Warning ("pass-cli login failed: " + $out.Trim())
        return $false
    }
    Write-Verbose ((& $cli info 2>&1 | Out-String).Trim())
    return $true
}

function Get-ProtonPassSecret {
    <#
    .SYNOPSIS
        Read a secret, logging in first if the session has lapsed.
    .DESCRIPTION
        The entire point of the bootstrap credential: a read that recovers from
        an expired session by itself instead of stopping to ask a human.

        Returns $null rather than throwing, so a caller can decide whether a
        missing secret is fatal.

        NEVER print the return value. Assign it, use it, drop it.
    .EXAMPLE
        $key = Get-ProtonPassSecret -Uri 'pass://Machine Secrets/Stripe/secret_key' `
                                    -Reason 'Deploying the staging worker'
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)] [string] $Uri,
        [Parameter(Mandatory)] [string] $Reason
    )

    if ($Reason.Length -gt 300) { throw 'Reason must be 300 characters or fewer.' }

    $cli = Resolve-PassCli
    $env:PROTON_PASS_SESSION_DIR  = $script:ProtonPassSessionDir
    $env:PROTON_PASS_AGENT_REASON = $Reason

    $value = & $cli item view $Uri 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $value) {
        if (-not (Connect-ProtonPassAgent)) { return $null }
        $value = & $cli item view $Uri 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "read failed after re-login: $Uri"
            return $null
        }
    }
    return ($value | Out-String).Trim()
}

function Remove-ProtonPassAgentToken {
    <#
    .SYNOPSIS
        Delete the local bootstrap copy. Does NOT revoke the token.
    .DESCRIPTION
        Revoke it in Proton Pass as well - `pass-cli agent delete <name>`.
        Deleting the local copy alone leaves a live token in the wild.
    #>
    param([string] $Target = $script:ProtonPassCredTarget)

    if ([ProtonPass.CredStore]::Delete($Target)) {
        Write-Host "removed '$Target' - now revoke it: pass-cli agent delete <name>" -ForegroundColor Green
        return $true
    }
    Write-Warning "no stored credential named '$Target'"
    return $false
}
