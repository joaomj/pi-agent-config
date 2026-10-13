#!/usr/bin/env python3
"""Deduplicate a Proton Pass vault in place, without export/import.

Four phases, each a separate invocation so a human can read the plan:

    pass-dedupe.py plan   --vault NAME [--vault NAME2] --out DIR
    pass-dedupe.py verify --vault NAME --out DIR
    pass-dedupe.py apply  --out DIR --yes
    pass-dedupe.py undo   --out DIR

Nothing this writes to disk contains a secret. The plan holds item IDs,
titles and timestamps; passwords are compared in memory and discarded.
"""
import argparse, collections, csv, datetime, hashlib, json, os, subprocess, sys

# --- registrable-domain ("eTLD+1") approximation -----------------------------
MULTI = {'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'co.jp', 'ne.jp', 'or.jp',
         'com.au', 'net.au', 'org.au', 'edu.au', 'co.nz', 'co.za', 'com.br',
         'co.in', 'com.mx', 'co.kr', 'com.tr', 'com.sg', 'com.hk', 'com.tw',
         'com.cn', 'co.il'}


def host_of(url):
    u = url.strip()
    if '://' in u:
        u = u.split('://', 1)[1]
    return u.split('/')[0].split('?')[0].split('#')[0].split('@')[-1].split(':')[0]


def registrable(h):
    h = h.lower().strip().strip('.')
    if h.startswith('www.'):
        h = h[4:]
    parts = h.split('.')
    if len(parts) < 2:
        return h
    if '.'.join(parts[-2:]) in MULTI and len(parts) >= 3:
        return '.'.join(parts[-3:])
    return '.'.join(parts[-2:])


# --- item accessors ----------------------------------------------------------
def body(it):
    return it['content']['content']


def login(it):
    return body(it).get('Login')


def title(it):
    return (it['content'].get('title') or '').strip()


def note(it):
    return (it['content'].get('note') or '').strip()


def is_alias(it):
    return 'Alias' in body(it)


def urls(it):
    lg = login(it) or {}
    return [u for u in (lg.get('urls') or []) if u and u.strip()]


def clean_hosts(it):
    """Hosts from URLs with no query, fragment or path: the ones worth keeping."""
    out = set()
    for u in urls(it):
        if '?' in u or '#' in u:
            continue
        h = host_of(u)
        rest = u.split('://', 1)[-1][len(h):].strip('/')
        if rest or not h:
            continue
        out.add(h.lower())
    return out


def irreplaceable(it):
    """Data no sibling copy can supply: TOTP seeds, passkeys, file attachments."""
    lg = login(it) or {}
    got = set()
    if lg.get('totp_uri'):
        got.add('totp:' + lg['totp_uri'])
    for pk in (lg.get('passkeys') or []):
        got.add('passkey:' + str(pk.get('credential_id')))
    if {'ItemHasFiles', 'ItemHasHadFiles'} & set(it.get('flags') or []):
        got.add('files')
    return got


def identity(it):
    """Username and email are interchangeable across importers, so compare as a set."""
    lg = login(it) or {}
    return tuple(sorted({v.strip().lower()
                         for v in (lg.get('username'), lg.get('email'))
                         if v and v.strip()}))


def site_key(it):
    cands = {registrable(host_of(u)) for u in urls(it)}
    t = title(it).lower()
    if '.' in t and ' ' not in t:
        cands.add(registrable(host_of(t)))
    cands = {c for c in cands if c and '.' in c}
    return sorted(cands)[0] if cands else 'title:' + t


def created(it):
    return datetime.datetime.fromisoformat(it['create_time'])


# --- pass-cli ----------------------------------------------------------------
def cli(*args, check=True):
    p = subprocess.run(['pass-cli', *args], capture_output=True, text=True)
    if check and p.returncode != 0:
        raise RuntimeError('pass-cli ' + ' '.join(args[:2]) + ': ' + p.stderr.strip())
    return p


def fetch(vaults):
    items = []
    for v in vaults:
        # --show-secrets is mandatory here: the password IS the safety guard.
        out = cli('item', 'list', v, '--output', 'json', '--show-secrets').stdout
        items += json.loads(out)['items']
    return [i for i in items if i['state'] == 'Active']


# --- clustering --------------------------------------------------------------
def build(items):
    """Group items that are candidates to collapse.

    A login cluster requires identical share + registrable domain + identity +
    byte-exact password. Differ in any of those and it is a different account.
    """
    aliases = [i for i in items if is_alias(i)]
    groups = collections.defaultdict(list)
    for it in items:
        if is_alias(it):
            continue
        lg = login(it)
        if lg is not None:
            groups[('login', it['share_id'], site_key(it), identity(it),
                    lg.get('password') or '')].append(it)
        else:
            blob = json.dumps({'t': title(it), 'n': note(it), 'c': body(it),
                               'e': it['content'].get('extra_fields')}, sort_keys=True)
            groups[('exact', it['share_id'],
                    hashlib.sha256(blob.encode()).hexdigest())].append(it)
    return groups, aliases


def resolve(group):
    """Pick a keeper, or refuse.

    Returns (keeper, (losers, dropped_hosts)) or (None, reason).
    """
    union = set().union(*[irreplaceable(i) for i in group])
    holders = [i for i in group if irreplaceable(i) >= union]
    if not holders:
        return None, 'irreplaceable data (TOTP/passkey/file) split across copies'

    notes = {note(i) for i in group if note(i)}
    if len(notes) > 1:
        return None, 'differing note text across copies'
    if notes:
        with_note = [i for i in holders if note(i)]
        if not with_note:
            return None, 'the only note lives on a copy missing other data'
        holders = with_note

    keeper = max(holders, key=lambda i: (len(clean_hosts(i)), len(irreplaceable(i)),
                                         len(urls(i)), -created(i).timestamp()))
    losers = [i for i in group if i['id'] != keeper['id']]
    dropped = set().union(*[clean_hosts(i) for i in losers]) - clean_hosts(keeper)
    return keeper, (losers, sorted(dropped))


# --- invariants --------------------------------------------------------------
def check(items, doomed):
    """Refuse to proceed unless every one of these holds."""
    fails = []
    doomed = set(doomed)
    by_id = {i['id']: i for i in items}
    survivors = [i for i in items if i['id'] not in doomed]

    if any(is_alias(by_id[d]) for d in doomed if d in by_id):
        fails.append('an alias is in the trash set')

    before = set().union(*[irreplaceable(i) for i in items]) if items else set()
    after = set().union(*[irreplaceable(i) for i in survivors]) if survivors else set()
    if before - after:
        fails.append(str(len(before - after)) + ' TOTP/passkey/file asset(s) would be lost')

    nb = {note(i) for i in items if note(i)}
    na = {note(i) for i in survivors if note(i)}
    if nb - na:
        fails.append(str(len(nb - na)) + ' distinct note text(s) would be lost')

    live = collections.defaultdict(list)
    for i in survivors:
        lg = login(i)
        if lg is not None:
            live[(i['share_id'], site_key(i), identity(i), lg.get('password') or '')].append(i)
    orphans = []
    for d in doomed:
        it = by_id.get(d)
        if it is None or login(it) is None:
            continue
        key = (it['share_id'], site_key(it), identity(it), login(it).get('password') or '')
        if not live.get(key):
            orphans.append(d)
    if orphans:
        fails.append(str(len(orphans)) + ' item(s) would be trashed with no surviving twin')
    return fails


# --- phases ------------------------------------------------------------------
def do_plan(a):
    os.makedirs(a.out, exist_ok=True)
    items = fetch(a.vault)
    groups, aliases = build(items)

    trash, held, dropped_rows, collapsed = [], [], [], 0
    for key, g in groups.items():
        if len(g) < 2:
            continue
        keeper, rest = resolve(g)
        if keeper is None:
            held.append((key, g, rest))
            continue
        losers, dropped = rest
        collapsed += 1
        trash += losers
        for h in dropped:
            dropped_rows.append([key[2], title(keeper), keeper['id'], h])

    fails = check(items, [i['id'] for i in trash])
    if fails:
        sys.exit('REFUSING TO PLAN, invariant violated:\n  ' + '\n  '.join(fails))

    json.dump([{'id': i['id'], 'share_id': i['share_id'], 'title': title(i),
                'created': i['create_time']} for i in trash],
              open(os.path.join(a.out, 'trash-plan.json'), 'w', encoding='utf-8'), indent=1)

    with open(os.path.join(a.out, 'dropped-urls.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['site', 'keeper_title', 'keeper_id', 'dropped_host'])
        w.writerows(dropped_rows)

    with open(os.path.join(a.out, 'held-back.txt'), 'w', encoding='utf-8') as f:
        for key, g, why in held:
            f.write(key[2] + '  (' + str(len(g)) + ' copies) -- ' + why + '\n')
            for i in g:
                lg = login(i) or {}
                f.write('    ' + i['id'] + '  created ' + i['create_time']
                        + '  totp=' + str(bool(lg.get('totp_uri')))
                        + ' passkeys=' + str(len(lg.get('passkeys') or []))
                        + ' note=' + str(bool(note(i)))
                        + '  title=' + title(i) + '\n')

    print('active items      : ' + str(len(items)))
    print('aliases excluded  : ' + str(len(aliases)))
    print('clusters collapsed: ' + str(collapsed))
    print('ITEMS TO TRASH    : ' + str(len(trash)))
    print('remaining after   : ' + str(len(items) - len(trash)))
    print('held for a human  : ' + str(len(held)) + '   -> ' + a.out + '/held-back.txt')
    print('real hosts dropped: ' + str(len(dropped_rows)) + ' -> ' + a.out + '/dropped-urls.csv')
    print('\nAll invariants pass. Read held-back.txt, then:')
    print('  pass-dedupe.py apply --out ' + a.out + ' --yes')


def do_verify(a):
    plan = json.load(open(os.path.join(a.out, 'trash-plan.json'), encoding='utf-8'))
    items = fetch(a.vault)
    fails = check(items, [p['id'] for p in plan])
    live = {i['id'] for i in items}
    stale = [p for p in plan if p['id'] not in live]
    print('plan size: ' + str(len(plan)) + '   already gone: ' + str(len(stale)))
    print('RESULT: ' + ('FAIL, ' + '; '.join(fails) if fails else 'ALL INVARIANTS PASS'))
    return 1 if fails else 0


def do_apply(a):
    plan = json.load(open(os.path.join(a.out, 'trash-plan.json'), encoding='utf-8'))
    if not a.yes:
        sys.exit(str(len(plan)) + ' items would be trashed. Re-run with --yes.')
    ok, err = [], []
    for n, p in enumerate(plan, 1):
        # The equals form is mandatory. Roughly 1% of Proton IDs start with '-'
        # and are otherwise parsed as a flag. See references/dedupe.md.
        r = cli('item', 'trash', '--share-id=' + p['share_id'], '--item-id=' + p['id'],
                check=False)
        (ok if r.returncode == 0 else err).append(p)
        if r.returncode != 0:
            print('  FAIL ' + p['title'][:40] + ': ' + r.stderr.strip()[:90], file=sys.stderr)
        if n % 50 == 0:
            print('  ' + str(n) + '/' + str(len(plan)), file=sys.stderr)
    json.dump(ok, open(os.path.join(a.out, 'trashed.json'), 'w', encoding='utf-8'), indent=1)
    print('trashed ' + str(len(ok)) + ', failed ' + str(len(err)))
    print('undo with: pass-dedupe.py undo --out ' + a.out)
    return 1 if err else 0


def do_undo(a):
    done = json.load(open(os.path.join(a.out, 'trashed.json'), encoding='utf-8'))
    n = 0
    for p in done:
        r = cli('item', 'untrash', '--share-id=' + p['share_id'], '--item-id=' + p['id'],
                check=False)
        n += r.returncode == 0
    print('restored ' + str(n) + '/' + str(len(done)))


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('phase', choices=['plan', 'verify', 'apply', 'undo'])
    ap.add_argument('--vault', action='append', default=[], help='vault name; repeatable')
    ap.add_argument('--out', required=True, help='plan directory')
    ap.add_argument('--yes', action='store_true', help='actually trash (apply only)')
    a = ap.parse_args()
    if a.phase in ('plan', 'verify') and not a.vault:
        sys.exit('--vault is required for plan and verify')
    sys.exit({'plan': do_plan, 'verify': do_verify,
              'apply': do_apply, 'undo': do_undo}[a.phase](a) or 0)


if __name__ == '__main__':
    main()
