# Roadmap

## Current priority

Run Pi inside a rootless Podman container so that Pi and its tools see only the selected project, not the host home directory, SSH agent, keychain, or container-control socket.

The prototype lives in a separate checkout, `~/Projects/pi-agent-config-container`, at commit `390a948`. That commit is local only and has not been pushed.

## Goals

- Isolate Pi sessions from host secrets and services.
- Make the setup portable: any Linux x86-64 machine with rootless Podman can build the same image and then supply its own provider login and model choice.
- Keep the personal workflow: shared extensions, skills, prompts, permission policy, indexed search, and the background-command fork.
- Keep credentials, conversation history, and runtime state out of the image and out of Git.

## Decisions

- **Vanilla image first.** The Vivobook has one user account and is mainly used as an SSH client. The image is a fixed starting point, not a per-account setup.
- **Included:** Pi, `jq`, `ripgrep`, `uv`, the shared extensions, skills, prompts, `AGENTS.md`, the permission policy, the MCP configuration, and the background-bash fork.
- **Excluded:** provider credentials, provider and model settings (set with `/login` and `/model`), the Cloudflare MCP, conversation history, startup timing, subscription usage, attention-span, and Pi Sentry.
- **Proton Pass stays on the host.** The skill is guidance only. The CLI, sessions, SSH socket, and keychain are not in the image.
- **Exa is offered without credentials.** The user passes `PI_AGENT_EXA` at launch.
- **Interactive questions render inline** by default.

## Status

The image built and passed a credential-free pilot on the Vivobook. Image ID: `4167cdbeb1479a9709cddbab663eabe0bb1c822eb342c053ca1a839a7715755c`.

Verified:

- Pi 1.3.0 and the configured extensions started without reported loading errors.
- Workspace writes appear on the host with owner `1000:1000`.
- The host Pi directory, container-control socket, SSH-agent variable, and Exa credential were absent from the sandbox.
- The image filesystem is read-only, effective capabilities are zero, and new privileges are disabled.
- Cgroup limits are 4 GiB memory, four CPUs, and 512 processes.

Not verified:

- Provider login
- Authenticated Exa search
- Interactive question rendering
- Background-job recovery
- Preview port forwarding
- Image rollback

No model requests have been made. The pilot container was stopped and removed.

## Known limits

- Containers share the host kernel. They are not virtual machines.
- Network access is not restricted. The container can reach the internet, the LAN, and the tailnet.
- The mounted project is fully writable, including `.git` and any secrets stored in it.
- Memory and CPU limits do not bound disk writes to the project or profile home.
- The Exa key is readable by processes in the container and is stored in Podman metadata.
- MCP calls are allowed by default. Written approval instructions are not enforced.

## Next steps

1. Launch with `scripts/pi-safe --profile personal <project>` on a disposable copy of a project. Run `/login` and `/model`.
2. Verify authenticated Exa search with `PI_AGENT_EXA` set.
3. Verify interactive questions and background-job behavior across Pi exit and sandbox stop.
4. Verify preview forwarding with `--port`.
5. Repeat the isolation checks after any change to the launcher, runtime, or image security settings.

## Open decisions

- Publish the container checkout to `origin`. Commit `390a948` is local only. This needs explicit approval.
- Keep the image local only, or publish it to a registry. No registry is configured.
- Startup-improvement work was removed from `main` in `5441571`. Its last state is at commit `7a52d8b`. Retrieve it from there if needed.
