# Proton Pass CLI 2.4.2 command reference

Captured from the installed CLI with `--help`. No vault data is included.

Use `run` or `inject` instead of putting secrets in command arguments.
Use `PROTON_PASS_PERSONAL_ACCESS_TOKEN` for token login, not `--pat`.

## Top level

```text
A CLI tool for Proton Pass

Usage: pass-cli <COMMAND>

Commands:
  agent                  Manage AI agents
  login                  Log in (defaults to web login)
  logout                 Log out of the current session
  info                   Show information about the current session
  inject                 Inject secrets into a file templated with secret references
  run                    Pass secrets as environment variables to an application or script
  vault                  Vault operations
  item                   Item operations
  invite                 Invite operations
  password               Password operations
  personal-access-token  Personal Access Token operations
  totp                   TOTP operations
  share                  Share operations
  user                   User operations
  session                Session operations
  ssh-agent              SSH agent operations
  settings               Manage persistent settings
  update                 Check for and install updates
  support                Reach to us if you need help
  help                   Print this message or the help of the given subcommand(s)

Options:
  -h, --help     Print help
  -V, --version  Print version
```

## agent

```text
Manage AI agents

Usage: pass-cli agent <COMMAND>

Commands:
  create        Create a new agent
  list          List all agents
  delete        Delete an agent
  monitor       List monitor audit entries for an agent
  access        Manage agent vault/item access
  renew         Renew an agent token
  instructions  Print agent usage instructions (markdown)
  help          Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## login

```text
Log in (defaults to web login)

Usage: pass-cli login [OPTIONS] [USERNAME]

Arguments:
  [USERNAME]  The username to log in with (for interactive mode)

Options:
      --interactive  Use interactive login mode
      --pat <PAT>    Personal access token (format: pst_<token>::<key>)
  -h, --help         Print help
```

## logout

```text
Log out of the current session

Usage: pass-cli logout [OPTIONS]

Options:
      --force  Force logout even if remote logout fails
  -h, --help   Print help
```

## info

```text
Show information about the current session

Usage: pass-cli info [OPTIONS]

Options:
  -o, --output <OUTPUT>  Output format [possible values: human, json]
  -h, --help             Print help
```

## inject

```text
Inject secrets into a file templated with secret references

Usage: pass-cli inject [OPTIONS]

Options:
      --file-mode <FILE_MODE>  Set filemode for the output file (Unix systems only). It is ignored without the --out-file flag. [default: 0600]
  -f, --force                  Do not prompt for confirmation
  -i, --in-file <IN_FILE>      The filename of a template file to inject
  -o, --out-file <OUT_FILE>    Write the injected template to a file instead of stdout
  -h, --help                   Print help
```

## run

```text
Pass secrets as environment variables to an application or script

Usage: pass-cli run [OPTIONS] -- <COMMAND>...

Arguments:
  <COMMAND>...  The command and arguments to execute

Options:
      --env-file <ENV_FILES>  Enable Dotenv integration with specific Dotenv files to parse
      --no-masking            Disable masking of secrets on stdout and stderr
  -h, --help                  Print help
```

## vault

```text
Vault operations

Usage: pass-cli vault <COMMAND>

Commands:
  list      List vaults
  create    Create a new vault
  update    Update a vault
  member    Manage vault members
  delete    Delete a vault
  share     Share a vault with someone
  transfer  Transfer the ownership of one of your vaults
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## item

```text
Item operations

Usage: pass-cli item <COMMAND>

Commands:
  list        List items in a vault
  create      Create a new item
  delete      Delete an item
  share       Share an item
  view        View an item
  move        Move an item to a different vault
  attachment  Attachment operations
  alias       Alias operations
  member      Manage item members
  totp        Generate TOTP code(s) for an item
  trash       Move an item to trash
  untrash     Restore an item from trash
  update      Update an item's fields
  help        Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## invite

```text
Invite operations

Usage: pass-cli invite <COMMAND>

Commands:
  list    List pending invites
  accept  Accept an invite
  reject  Reject an invite
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## password

```text
Password operations

Usage: pass-cli password <COMMAND>

Commands:
  generate  Generate a password
  score     Score a password
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## personal-access-token

```text
Personal Access Token operations

Usage: pass-cli personal-access-token <COMMAND>

Commands:
  create  Create a new personal access token
  list    List all personal access tokens
  delete  Delete a personal access token
  renew   Renew a personal access token
  access  Manage personal access token access
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## totp

```text
TOTP operations

Usage: pass-cli totp <COMMAND>

Commands:
  generate  Generate a TOTP token from a secret or URI
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## share

```text
Share operations

Usage: pass-cli share <COMMAND>

Commands:
  list  List available shares
  help  Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## user

```text
User operations

Usage: pass-cli user <COMMAND>

Commands:
  info             Show user info
  generate-report  Generate a report on users in the organization
  help             Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## session

```text
Session operations

Usage: pass-cli session <COMMAND>

Commands:
  create-lock  Create a lock for the current session with a lock code
  lock         Lock the current session now (requires an existing lock)
  unlock       Unlock the current session with a lock code
  remove-lock  Remove the session lock entirely
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## ssh-agent

```text
SSH agent operations

Usage: pass-cli ssh-agent <COMMAND>

Commands:
  start   Start a Proton Pass SSH agent
  load    Load SSH keys from Proton Pass into the system SSH agent
  debug   Debug SSH key items and show why they are or aren't usable
  daemon  Manage the SSH agent as a background daemon
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## settings

```text
Manage persistent settings

Usage: pass-cli settings <COMMAND>

Commands:
  view   View all current settings
  set    Set a setting value
  unset  Unset (clear) a setting
  help   Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## update

```text
Check for and install updates

Usage: pass-cli update [OPTIONS]

Options:
  -y, --yes                    Skip confirmation prompt
      --set-track <SET_TRACK>  Change the release track to check updates (default: stable)
  -h, --help                   Print help
```

## support

```text
Reach to us if you need help

Usage: pass-cli support

Options:
  -h, --help  Print help
```

## agent create

```text
Create a new agent

Usage: pass-cli agent create [OPTIONS] --expiration <EXPIRATION> <NAME>

Arguments:
  <NAME>  Agent name

Options:
      --expiration <EXPIRATION>  Expiration (1h, 1d, 1w, 1m, 3m, 6m, 1y) [possible values: 1h, 1d, 1w, 1m, 3m, 6m, 1y]
      --vault <VAULTS>           Vault name to grant access to (can be repeated)
  -h, --help                     Print help
```

## agent list

```text
List all agents

Usage: pass-cli agent list [OPTIONS]

Options:
      --output <OUTPUT>  [possible values: human, json]
  -h, --help             Print help
```

## agent delete

```text
Delete an agent

Usage: pass-cli agent delete <NAME>

Arguments:
  <NAME>  Agent name

Options:
  -h, --help  Print help
```

## agent monitor

```text
List monitor audit entries for an agent

Usage: pass-cli agent monitor [OPTIONS] [NAME]

Arguments:
  [NAME]  Agent name (required when logged in as a user account)

Options:
      --limit <LIMIT>    Maximum number of records to show [default: 100]
      --output <OUTPUT>  [possible values: human, json]
  -h, --help             Print help
```

## agent access

```text
Manage agent vault/item access

Usage: pass-cli agent access <COMMAND>

Commands:
  grant   Grant vault or item access to an agent
  revoke  Revoke vault access from an agent
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## agent renew

```text
Renew an agent token

Usage: pass-cli agent renew [OPTIONS] --expiration <EXPIRATION> <NAME>

Arguments:
  <NAME>  Agent name

Options:
      --expiration <EXPIRATION>  New expiration (1h, 1d, 1w, 1m, 3m, 6m, 1y) [possible values: 1h, 1d, 1w, 1m, 3m, 6m, 1y]
      --output <OUTPUT>          [possible values: human, json]
  -h, --help                     Print help
```

## agent instructions

```text
Print agent usage instructions (markdown)

Usage: pass-cli agent instructions

Options:
  -h, --help  Print help
```

## vault list

```text
List vaults

Usage: pass-cli vault list [OPTIONS]

Options:
      --output <OUTPUT>  [possible values: human, json]
  -h, --help             Print help
```

## vault create

```text
Create a new vault

Usage: pass-cli vault create --name <NAME>

Options:
      --name <NAME>  Name of the vault
  -h, --help         Print help
```

## vault update

```text
Update a vault

Usage: pass-cli vault update [OPTIONS] --name <NAME>

Options:
      --share-id <SHARE_ID>      Share ID of the vault
      --vault-name <VAULT_NAME>  Name of the vault
      --name <NAME>              New name of the vault
  -h, --help                     Print help
```

## vault member

```text
Manage vault members

Usage: pass-cli vault member <COMMAND>

Commands:
  list    List vault members
  update  Update a vault member's role
  remove  Remove a vault member
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## vault delete

```text
Delete a vault

Usage: pass-cli vault delete [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault to delete
      --vault-name <VAULT_NAME>  Name of the vault to delete
  -h, --help                     Print help
```

## vault share

```text
Share a vault with someone

Usage: pass-cli vault share [OPTIONS] <EMAIL>

Arguments:
  <EMAIL>  Email address to share with

Options:
      --share-id <SHARE_ID>      Share ID of the vault to share
      --vault-name <VAULT_NAME>  Name of the vault to share
      --role <ROLE>              [default: viewer] [possible values: viewer, editor, manager]
  -h, --help                     Print help
```

## vault transfer

```text
Transfer the ownership of one of your vaults

Usage: pass-cli vault transfer [OPTIONS] <MEMBER_SHARE_ID>

Arguments:
  <MEMBER_SHARE_ID>  Member Share ID of the new owner of the vault

Options:
      --share-id <SHARE_ID>      Share ID of the vault to transfer ownership
      --vault-name <VAULT_NAME>  Name of the vault to to transfer ownership
  -h, --help                     Print help
```

## item list

```text
List items in a vault

Usage: pass-cli item list [OPTIONS] [VAULT_NAME]

Arguments:
  [VAULT_NAME]  Name of the vault to list items from (positional)

Options:
      --share-id <SHARE_ID>          Share ID of the vault to list items from
      --vault-name <VAULT_NAME>      Name of the vault to list items from
      --filter-type <FILTER_TYPE>    Filter items by type (note, login, alias, credit-card, identity, ssh-key, wifi, custom)
      --filter-state <FILTER_STATE>  Filter items by state (active, trashed)
      --sort-by <SORT_BY>            Sort items (alphabetic-asc, alphabetic-desc, created-asc, created-desc)
      --output <OUTPUT>              [possible values: human, json]
      --show-secrets                 Include full item content in JSON output (requires --output json, not allowed with agent sessions)
  -h, --help                         Print help
```

## item create

```text
Create a new item

Usage: pass-cli item create <COMMAND>

Commands:
  login        Create a new login item
  note         Create a new note item
  credit-card  Create a new credit card item
  wifi         Create a new WiFi item
  custom       Create a new custom item
  identity     Create a new identity item
  ssh-key      Create a new SSH key item
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## item delete

```text
Delete an item

Usage: pass-cli item delete --share-id <SHARE_ID> --item-id <ITEM_ID>

Options:
      --share-id <SHARE_ID>  Share ID of the vault containing the item
      --item-id <ITEM_ID>    ID of the item to delete
  -h, --help                 Print help
```

## item share

```text
Share an item

Usage: pass-cli item share [OPTIONS] --share-id <SHARE_ID> --item-id <ITEM_ID> <EMAIL>

Arguments:
  <EMAIL>  Email address to share with

Options:
      --share-id <SHARE_ID>  Share ID that contains the item
      --item-id <ITEM_ID>    ID of the item to share
      --role <ROLE>          [default: viewer] [possible values: viewer, editor, manager]
  -h, --help                 Print help
```

## item view

```text
View an item

Usage: pass-cli item view [OPTIONS] [URI]

Arguments:
  [URI]  Pass URI in format pass://SHARE_ID/ITEM_ID[/FIELD]

Options:
      --share-id <SHARE_ID>      Share ID of the vault containing the item
      --vault-name <VAULT_NAME>  Name of the vault containing the item
      --item-id <ITEM_ID>        ID of the item to view
      --item-title <ITEM_TITLE>  Title of the item to view
      --field <FIELD>            Specific field to view
      --output <OUTPUT>          [possible values: human, json]
  -h, --help                     Print help
```

## item move

```text
Move an item to a different vault

Usage: pass-cli item move [OPTIONS]

Options:
      --from-share-id <FROM_SHARE_ID>      Share ID of the source vault
      --from-vault-name <FROM_VAULT_NAME>  Name of the source vault
      --item-id <ITEM_ID>                  ID of the item to move
      --item-title <ITEM_TITLE>            Title of the item to move
      --to-share-id <TO_SHARE_ID>          Share ID of the destination vault
      --to-vault-name <TO_VAULT_NAME>      Name of the destination vault
  -h, --help                               Print help
```

## item attachment

```text
Attachment operations

Usage: pass-cli item attachment <COMMAND>

Commands:
  download  Download an attachment
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## item alias

```text
Alias operations

Usage: pass-cli item alias <COMMAND>

Commands:
  create  Create a new alias
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## item member

```text
Manage item members

Usage: pass-cli item member <COMMAND>

Commands:
  list    List item members
  update  Update an item member's role
  remove  Remove an item member
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## item totp

```text
Generate TOTP code(s) for an item

Usage: pass-cli item totp [OPTIONS] [URI]

Arguments:
  [URI]  Pass URI in format pass://SHARE_ID/ITEM_ID[/FIELD]

Options:
      --share-id <SHARE_ID>      Share ID of the vault containing the item
      --vault-name <VAULT_NAME>  Name of the vault containing the item
      --item-id <ITEM_ID>        ID of the item
      --item-title <ITEM_TITLE>  Title of the item
      --field <FIELD>            Specific TOTP field to generate code for
      --output <OUTPUT>          [possible values: human, json]
  -h, --help                     Print help
```

## item trash

```text
Move an item to trash

Usage: pass-cli item trash [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault containing the item
      --vault-name <VAULT_NAME>  Name of the vault containing the item
      --item-id <ITEM_ID>        ID of the item to trash
      --item-title <ITEM_TITLE>  Title of the item to trash
  -h, --help                     Print help
```

## item untrash

```text
Restore an item from trash

Usage: pass-cli item untrash [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault containing the item
      --vault-name <VAULT_NAME>  Name of the vault containing the item
      --item-id <ITEM_ID>        ID of the item to restore
      --item-title <ITEM_TITLE>  Title of the item to restore
  -h, --help                     Print help
```

## item update

```text
Update an item's fields

Usage: pass-cli item update [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault containing the item
      --vault-name <VAULT_NAME>  Name of the vault containing the item
      --item-id <ITEM_ID>        ID of the item to update
      --item-title <ITEM_TITLE>  Title of the item to update
      --field <FIELDS>           Field to update in format field_name=field_value (can be specified multiple times)
  -h, --help                     Print help
```

## invite list

```text
List pending invites

Usage: pass-cli invite list [OPTIONS]

Options:
      --output <OUTPUT>  [default: human] [possible values: human, json]
  -h, --help             Print help
```

## invite accept

```text
Accept an invite

Usage: pass-cli invite accept <INVITE_ID>

Arguments:
  <INVITE_ID>  ID of the invite to accept

Options:
  -h, --help  Print help
```

## invite reject

```text
Reject an invite

Usage: pass-cli invite reject <INVITE_ID>

Arguments:
  <INVITE_ID>  ID of the invite to reject

Options:
  -h, --help  Print help
```

## password generate

```text
Generate a password

Usage: pass-cli password generate <COMMAND>

Commands:
  random      Generate a random password
  passphrase  Generate a passphrase
  help        Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## password score

```text
Score a password

Usage: pass-cli password score [OPTIONS] <PASSWORD>

Arguments:
  <PASSWORD>  Password to score

Options:
      --output <OUTPUT>  [default: human] [possible values: human, json]
  -h, --help             Print help
```

## personal-access-token create

```text
Create a new personal access token

Usage: pass-cli personal-access-token create [OPTIONS] --name <NAME> --expiration <EXPIRATION>

Options:
      --name <NAME>              Name of the personal access token
      --expiration <EXPIRATION>  Expiration for the personal access token (1h, 1d, 1w, 1m, 3m, 6m, 1y) [possible values: 1h, 1d, 1w, 1m, 3m, 6m, 1y]
      --output <OUTPUT>          [possible values: human, json]
  -h, --help                     Print help
```

## personal-access-token list

```text
List all personal access tokens

Usage: pass-cli personal-access-token list [OPTIONS]

Options:
      --output <OUTPUT>  [possible values: human, json]
  -h, --help             Print help
```

## personal-access-token delete

```text
Delete a personal access token

Usage: pass-cli personal-access-token delete --personal-access-token-id <PERSONAL_ACCESS_TOKEN_ID>

Options:
      --personal-access-token-id <PERSONAL_ACCESS_TOKEN_ID>  Personal access token ID to delete
  -h, --help                                                 Print help
```

## personal-access-token renew

```text
Renew a personal access token

Usage: pass-cli personal-access-token renew [OPTIONS] --expiration <EXPIRATION>

Options:
      --personal-access-token-id <PERSONAL_ACCESS_TOKEN_ID>
          Personal access token ID
      --personal-access-token-name <PERSONAL_ACCESS_TOKEN_NAME>
          Personal access token name
      --expiration <EXPIRATION>
          New expiration for the personal access token (1h, 1d, 1w, 1m, 3m, 6m, 1y) [possible values: 1h, 1d, 1w, 1m, 3m, 6m, 1y]
      --output <OUTPUT>
          [possible values: human, json]
  -h, --help
          Print help
```

## personal-access-token access

```text
Manage personal access token access

Usage: pass-cli personal-access-token access <COMMAND>

Commands:
  grant        Grant access to a personal access token
  revoke       Revoke access from a personal access token
  list-access  List access grants for a personal access token
  help         Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## totp generate

```text
Generate a TOTP token from a secret or URI

Usage: pass-cli totp generate [OPTIONS] <SECRET_OR_URI>

Arguments:
  <SECRET_OR_URI>  TOTP secret (base32) or URI (otpauth://...)

Options:
      --output <OUTPUT>  [default: human] [possible values: human, json]
  -h, --help             Print help
```

## share list

```text
List available shares

Usage: pass-cli share list [OPTIONS]

Options:
      --only-items <ONLY_ITEMS>    Only display item shares [default: false] [possible values: true, false]
      --only-vaults <ONLY_VAULTS>  Only display vault shares [default: false] [possible values: true, false]
      --output <OUTPUT>            [default: human] [possible values: human, json]
  -h, --help                       Print help
```

## user info

```text
Show user info

Usage: pass-cli user info [OPTIONS]

Options:
      --output <OUTPUT>  [default: human] [possible values: human, json]
  -h, --help             Print help
```

## user generate-report

```text
Generate a report on users in the organization

Usage: pass-cli user generate-report [OPTIONS]

Options:
      --output <OUTPUT>  [default: human] [possible values: human, json]
  -h, --help             Print help
```

## session create-lock

```text
Create a lock for the current session with a lock code

Usage: pass-cli session create-lock [OPTIONS]

Options:
      --idle-timeout <IDLE_TIMEOUT>  Time in seconds before the session auto-unlocks (min 30, max 900) [default: 300]
  -h, --help                         Print help
```

## session lock

```text
Lock the current session now (requires an existing lock)

Usage: pass-cli session lock

Options:
  -h, --help  Print help
```

## session unlock

```text
Unlock the current session with a lock code

Usage: pass-cli session unlock

Options:
  -h, --help  Print help
```

## session remove-lock

```text
Remove the session lock entirely

Usage: pass-cli session remove-lock

Options:
  -h, --help  Print help
```

## ssh-agent start

```text
Start a Proton Pass SSH agent

Usage: pass-cli ssh-agent start [OPTIONS]

Options:
      --socket-path <SOCKET_PATH>
          Path to the SSH agent socket (Unix) or named pipe identifier (Windows)
      --share-id <SHARE_ID>
          Share ID of the vault to load keys from
      --vault-name <VAULT_NAME>
          Name of the vault to load keys from
      --refresh-interval <REFRESH_INTERVAL>
          Interval in seconds to check for new SSH keys in Proton Pass [default: 30]
      --create-new-identities <VAULT_NAME_OR_SHARE_ID>
          Automatically create new SSH key items in the specified vault when identities are added via ssh-add. Specify either a vault name or share ID.
  -h, --help
          Print help
```

## ssh-agent load

```text
Load SSH keys from Proton Pass into the system SSH agent

Usage: pass-cli ssh-agent load [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault to load keys from
      --vault-name <VAULT_NAME>  Name of the vault to load keys from
  -h, --help                     Print help
```

## ssh-agent debug

```text
Debug SSH key items and show why they are or aren't usable

Usage: pass-cli ssh-agent debug [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault to check
      --vault-name <VAULT_NAME>  Name of the vault to check
      --item-id <ITEM_ID>        Item ID to check (instead of checking all items)
      --item-title <ITEM_TITLE>  Item title to check (instead of checking all items)
  -o, --output <OUTPUT>          Output format [possible values: human, json]
  -h, --help                     Print help
```

## ssh-agent daemon

```text
Manage the SSH agent as a background daemon

Usage: pass-cli ssh-agent daemon <COMMAND>

Commands:
  start   Start the SSH agent as a background daemon
  status  Show the status of the SSH agent daemon
  stop    Stop the SSH agent daemon
  help    Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## settings view

```text
View all current settings

Usage: pass-cli settings view

Options:
  -h, --help  Print help
```

## settings set

```text
Set a setting value

Usage: pass-cli settings set <COMMAND>

Commands:
  default-vault   Set the default vault
  default-format  Set the default output format
  help            Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## settings unset

```text
Unset (clear) a setting

Usage: pass-cli settings unset <COMMAND>

Commands:
  default-vault   Unset the default vault
  default-format  Unset the default output format
  help            Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## agent access grant

```text
Grant vault or item access to an agent

Usage: pass-cli agent access grant [OPTIONS] <NAME>

Arguments:
  <NAME>  Agent name

Options:
      --share-id <SHARE_ID>      Share ID of the vault to grant access to
      --vault-name <VAULT_NAME>  Name of the vault to grant access to
      --item-id <ITEM_ID>        Specific item ID to grant access to
      --item-title <ITEM_TITLE>  Specific item title to grant access to
      --role <ROLE>              [default: viewer] [possible values: viewer, editor, manager]
  -h, --help                     Print help
```

## agent access revoke

```text
Revoke vault access from an agent

Usage: pass-cli agent access revoke --share-id <SHARE_ID> <NAME>

Arguments:
  <NAME>  Agent name

Options:
      --share-id <SHARE_ID>  Share ID to revoke access from
  -h, --help                 Print help
```

## vault member list

```text
List vault members

Usage: pass-cli vault member list [OPTIONS]

Options:
      --share-id <SHARE_ID>      Share ID of the vault
      --vault-name <VAULT_NAME>  Name of the vault
      --output <OUTPUT>          [default: human] [possible values: human, json]
  -h, --help                     Print help
```

## vault member update

```text
Update a vault member's role

Usage: pass-cli vault member update [OPTIONS] --member-share-id <MEMBER_SHARE_ID> --role <ROLE>

Options:
      --share-id <SHARE_ID>
          Share ID of the vault
      --vault-name <VAULT_NAME>
          Name of the vault
      --member-share-id <MEMBER_SHARE_ID>
          Member share ID
      --role <ROLE>
          New role for the member [possible values: viewer, editor, manager]
  -h, --help
          Print help
```

## vault member remove

```text
Remove a vault member

Usage: pass-cli vault member remove [OPTIONS] --member-share-id <MEMBER_SHARE_ID>

Options:
      --share-id <SHARE_ID>                Share ID of the vault
      --vault-name <VAULT_NAME>            Name of the vault
      --member-share-id <MEMBER_SHARE_ID>  Member share ID
  -h, --help                               Print help
```

## item create login

```text
Create a new login item

Usage: pass-cli item create login [OPTIONS]

Options:
      --get-template
          Output a JSON template structure
      --from-template <FROM_TEMPLATE>
          Path to template file, or '-' for stdin
      --share-id <SHARE_ID>
          Share ID of the vault to create the login item in
      --vault-name <VAULT_NAME>
          Name of the vault to create the login item in
      --title <TITLE>
          Title of the login item
      --username <USERNAME>
          Username for the login
      --email <EMAIL>
          Email for the login
      --password <PASSWORD>
          Password for the login
      --generate-password[=<SETTINGS>]
          Generate a random password (optionally with custom settings: "length,uppercase,symbols")
      --generate-passphrase[=<WORD_COUNT>]
          Generate a passphrase (optionally with custom word count)
      --url <URL>
          URLs associated with the login (can be specified multiple times)
  -h, --help
          Print help
```

## item create note

```text
Create a new note item

Usage: pass-cli item create note [OPTIONS]

Options:
      --get-template                   Output a JSON template structure
      --from-template <FROM_TEMPLATE>  Path to template file, or '-' for stdin
      --share-id <SHARE_ID>            Share ID of the vault to create the note item in
      --vault-name <VAULT_NAME>        Name of the vault to create the note item in
      --title <TITLE>                  Title of the note item
      --note <NOTE>                    Note content
  -h, --help                           Print help
```

## item create credit-card

```text
Create a new credit card item

Usage: pass-cli item create credit-card [OPTIONS]

Options:
      --get-template                       Output a JSON template structure
      --from-template <FROM_TEMPLATE>      Path to template file, or '-' for stdin
      --share-id <SHARE_ID>                Share ID of the vault to create the credit card item in
      --vault-name <VAULT_NAME>            Name of the vault to create the credit card item in
      --title <TITLE>                      Title of the credit card item
      --cardholder-name <CARDHOLDER_NAME>  Cardholder name
      --number <NUMBER>                    Card number
      --cvv <CVV>                          CVV/CVC security code
      --expiration-date <EXPIRATION_DATE>  Expiration date in format YYYY-MM (e.g., 2027-12)
      --pin <PIN>                          Card PIN
      --note <NOTE>                        Note content
  -h, --help                               Print help
```

## item create wifi

```text
Create a new WiFi item

Usage: pass-cli item create wifi [OPTIONS]

Options:
      --get-template                   Display a template
      --from-template <FROM_TEMPLATE>  Create from template file (use '-' for stdin)
      --share-id <SHARE_ID>            Share ID
      --vault-name <VAULT_NAME>        Name of the vault to create the WiFi item in
      --title <TITLE>                  Item title
      --ssid <SSID>                    Network SSID (name)
      --password <PASSWORD>            Network password (leave empty for open networks)
      --security <SECURITY>            Security type (wpa, wpa2, wpa3, wep, open, none)
      --note <NOTE>                    Note
  -h, --help                           Print help
```

## item create custom

```text
Create a new custom item

Usage: pass-cli item create custom [OPTIONS]

Options:
      --get-template                   Display a template JSON structure for creating custom items
      --from-template <FROM_TEMPLATE>  Create from template file (use '-' for stdin)
      --share-id <SHARE_ID>            Share ID of the vault to create the custom item in
      --vault-name <VAULT_NAME>        Name of the vault to create the custom item in
  -h, --help                           Print help
```

## item create identity

```text
Create a new identity item

Usage: pass-cli item create identity [OPTIONS]

Options:
      --get-template                   Display a template JSON structure for creating identity items
      --from-template <FROM_TEMPLATE>  Create from template file (use '-' for stdin)
      --share-id <SHARE_ID>            Share ID of the vault to create the identity item in
      --vault-name <VAULT_NAME>        Name of the vault to create the identity item in
  -h, --help                           Print help
```

## item create ssh-key

```text
Create a new SSH key item

Usage: pass-cli item create ssh-key <COMMAND>

Commands:
  import    Import an SSH key from a private key file
  generate  Generate a new SSH key
  help      Print this message or the help of the given subcommand(s)

Options:
  -h, --help  Print help
```

## item attachment download

```text
Download an attachment

Usage: pass-cli item attachment download --share-id <SHARE_ID> --item-id <ITEM_ID> --attachment-id <ATTACHMENT_ID> --output <OUTPUT>

Options:
      --share-id <SHARE_ID>            Share ID of the vault containing the item
      --item-id <ITEM_ID>              ID of the item containing the attachment
      --attachment-id <ATTACHMENT_ID>  ID of the attachment to download
      --output <OUTPUT>                Output path for the downloaded attachment
  -h, --help                           Print help
```

## item alias create

```text
Create a new alias

Usage: pass-cli item alias create [OPTIONS] --prefix <PREFIX>

Options:
      --share-id <SHARE_ID>      Share ID of the vault where the alias will be created
      --vault-name <VAULT_NAME>  Name of the vault where the alias will be created
      --prefix <PREFIX>          Prefix of the alias. The resulting email will be [prefix].[suffix]
      --output <OUTPUT>          Output format [default: human] [possible values: human, json]
  -h, --help                     Print help
```

## item member list

```text
List item members

Usage: pass-cli item member list [OPTIONS] --share-id <SHARE_ID> --item-id <ITEM_ID>

Options:
      --share-id <SHARE_ID>  Share ID of the vault containing the item
      --item-id <ITEM_ID>    ID of the item
      --output <OUTPUT>      [default: human] [possible values: human, json]
  -h, --help                 Print help
```

## item member update

```text
Update an item member's role

Usage: pass-cli item member update --share-id <SHARE_ID> --member-share-id <MEMBER_SHARE_ID> --role <ROLE>

Options:
      --share-id <SHARE_ID>
          Share ID of the vault containing the item
      --member-share-id <MEMBER_SHARE_ID>
          Member share ID
      --role <ROLE>
          New role for the member [possible values: viewer, editor, manager]
  -h, --help
          Print help
```

## item member remove

```text
Remove an item member

Usage: pass-cli item member remove --share-id <SHARE_ID> --member-share-id <MEMBER_SHARE_ID>

Options:
      --share-id <SHARE_ID>                Share ID of the vault containing the item
      --member-share-id <MEMBER_SHARE_ID>  Member share ID
  -h, --help                               Print help
```

## password generate random

```text
Generate a random password

Usage: pass-cli password generate random [OPTIONS]

Options:
      --length <LENGTH>                Length of the random password [default: 16]
      --numbers <NUMBERS>              Whether to include numbers [default: true] [possible values: true, false]
      --uppercase <UPPERCASE_LETTERS>  Whether to include uppercase letters [default: true] [possible values: true, false]
      --symbols <SYMBOLS>              Whether to include Symbols [default: true] [possible values: true, false]
      --output <OUTPUT>                [default: human] [possible values: human, json]
  -h, --help                           Print help
```

## password generate passphrase

```text
Generate a passphrase

Usage: pass-cli password generate passphrase [OPTIONS]

Options:
      --separator <SEPARATOR>      Which word separator to use [default: hyphens] [possible values: hyphens, spaces, periods, commas, underscores, numbers, numbers-and-symbols]
      --capitalise <CAPITALISE>    Whether to capitalise words [default: true] [alias: --capitalize] [possible values: true, false]
      --numbers <INCLUDE_NUMBERS>  Whether to include numbers [default: true] [possible values: true, false]
      --count <COUNT>              How many words to use in the passphrase [default: 5]
      --output <OUTPUT>            [default: human] [possible values: human, json]
  -h, --help                       Print help
```

## personal-access-token access grant

```text
Grant access to a personal access token

Usage: pass-cli personal-access-token access grant [OPTIONS]

Options:
      --personal-access-token-id <PERSONAL_ACCESS_TOKEN_ID>
          Personal access token ID
      --personal-access-token-name <PERSONAL_ACCESS_TOKEN_NAME>
          Personal access token name
      --share-id <SHARE_ID>
          Share ID of the vault to grant access to
      --vault-name <VAULT_NAME>
          Name of the vault to grant access to
      --item-id <ITEM_ID>
          Specific item ID to grant access to
      --item-title <ITEM_TITLE>
          Specific item title to grant access to
      --role <ROLE>
          [default: viewer] [possible values: viewer, editor, manager]
  -h, --help
          Print help
```

## personal-access-token access revoke

```text
Revoke access from a personal access token

Usage: pass-cli personal-access-token access revoke [OPTIONS] --share-id <SHARE_ID>

Options:
      --personal-access-token-id <PERSONAL_ACCESS_TOKEN_ID>      Personal access token ID
      --personal-access-token-name <PERSONAL_ACCESS_TOKEN_NAME>  Personal access token name
      --share-id <SHARE_ID>                                      Share ID to revoke access from
  -h, --help                                                     Print help
```

## personal-access-token access list-access

```text
List access grants for a personal access token

Usage: pass-cli personal-access-token access list-access [OPTIONS]

Options:
      --personal-access-token-id <PERSONAL_ACCESS_TOKEN_ID>      Personal access token ID
      --personal-access-token-name <PERSONAL_ACCESS_TOKEN_NAME>  Personal access token name
      --output <OUTPUT>                                          [possible values: human, json]
  -h, --help                                                     Print help
```

## ssh-agent daemon start

```text
Start the SSH agent as a background daemon

Usage: pass-cli ssh-agent daemon start [OPTIONS]

Options:
      --socket-path <SOCKET_PATH>
          Path to the SSH agent socket (Unix) or named pipe identifier (Windows)
      --share-id <SHARE_ID>
          Share ID of the vault to load keys from
      --vault-name <VAULT_NAME>
          Name of the vault to load keys from
      --refresh-interval <REFRESH_INTERVAL>
          Interval in seconds to check for new SSH keys in Proton Pass [default: 30]
      --create-new-identities <VAULT_NAME_OR_SHARE_ID>
          Automatically create new SSH key items in the specified vault when identities are added via ssh-add. Specify either a vault name or share ID.
      --pid-file <PID_FILE>
          Path to the PID file (default: ~/.ssh/proton-pass-agent.pid)
      --log-file <LOG_FILE>
          Redirect daemon stdout/stderr to this file instead of discarding them
  -h, --help
          Print help
```

## ssh-agent daemon status

```text
Show the status of the SSH agent daemon

Usage: pass-cli ssh-agent daemon status [OPTIONS]

Options:
      --pid-file <PID_FILE>  Path to the PID file (default: ~/.ssh/proton-pass-agent.pid)
  -h, --help                 Print help
```

## ssh-agent daemon stop

```text
Stop the SSH agent daemon

Usage: pass-cli ssh-agent daemon stop [OPTIONS]

Options:
      --pid-file <PID_FILE>  Path to the PID file (default: ~/.ssh/proton-pass-agent.pid)
  -h, --help                 Print help
```

## settings set default-vault

```text
Set the default vault

Usage: pass-cli settings set default-vault [OPTIONS]

Options:
      --vault-name <VAULT_NAME>  Vault name to set as default
      --share-id <SHARE_ID>      Share ID to set as default
  -h, --help                     Print help
```

## settings set default-format

```text
Set the default output format

Usage: pass-cli settings set default-format <FORMAT>

Arguments:
  <FORMAT>  Output format (human or json)

Options:
  -h, --help  Print help
```

## settings unset default-vault

```text
Unset the default vault

Usage: pass-cli settings unset default-vault

Options:
  -h, --help  Print help
```

## settings unset default-format

```text
Unset the default output format

Usage: pass-cli settings unset default-format

Options:
  -h, --help  Print help
```

## item create ssh-key import

```text
Import an SSH key from a private key file

Usage: pass-cli item create ssh-key import [OPTIONS] --from-private-key <PRIVATE_KEY_FILE> --title <TITLE>

Options:
      --from-private-key <PRIVATE_KEY_FILE>  Path to the private key file
      --password                             Enable passphrase for the SSH key
      --share-id <SHARE_ID>                  Share ID of the vault to create the SSH key item in
      --vault-name <VAULT_NAME>              Name of the vault to create the SSH key item in
      --title <TITLE>                        Title of the SSH key item
  -h, --help                                 Print help
```

## item create ssh-key generate

```text
Generate a new SSH key

Usage: pass-cli item create ssh-key generate [OPTIONS] --title <TITLE>

Options:
      --comment <COMMENT>        Comment for the SSH key
      --key-type <KEY_TYPE>      Type of SSH key to generate [default: ed25519] [possible values: ed25519, rsa2048, rsa4096]
      --password                 Enable passphrase for the SSH key
      --share-id <SHARE_ID>      Share ID of the vault to create the SSH key item in
      --vault-name <VAULT_NAME>  Name of the vault to create the SSH key item in
      --title <TITLE>            Title of the SSH key item
  -h, --help                     Print help
```
