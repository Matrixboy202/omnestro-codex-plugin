# OMNESTRO for Codex

OMNESTRO conducts your own Codex and Claude Code on one software-engineering mission: one builder, a builder with an independent reviewer, or two competing candidates with cross review. Every mission runs in an isolated copy of your project with tests, review and recorded evidence. Nothing reaches your project until you approve the plan and press Apply inside the OMNESTRO desktop app.

This plugin connects Codex to the OMNESTRO desktop app on your computer. It does not contain the OMNESTRO engine. It works in local Codex sessions (the Codex CLI and desktop app), not in cloud tasks.

## Requirements

- The OMNESTRO desktop app. Windows is in early access by invitation until the Microsoft Store release, and Linux has a public beta. See https://omnestro.matrixboy.net/download/.
- An OMNESTRO account. The app shows your account and subscription status.
- Codex signed in with your own ChatGPT plan. Claude Code with your Claude subscription is optional and enables two-agent missions.
- Node.js 18 or later on your PATH.

## Setup

1. Install the plugin: `codex plugin marketplace add Matrixboy202/omnestro-codex-plugin`, then `codex plugin add omnestro@omnestro`.
2. Open OMNESTRO > **Account and subscription** (الحساب والاشتراك) and create an account or sign in.
3. Open **Connect Codex and Claude** (الربط والإضافات) > the **Codex** card, choose your project and press **Connect / change project** (ربط / تغيير المشروع). A connection lasts up to 7 days and you can revoke it at any time. If you installed this plugin from a marketplace or the plugin directory, you do not need the card's install button.
4. Start a new Codex session and ask Codex to run a task through OMNESTRO.

## Example prompts

- "Is OMNESTRO connected to this project?"
- "Run this through OMNESTRO: add input validation to the signup form, with Claude reviewing."
- "Show the status and evidence of my latest OMNESTRO mission."

## What the plugin runs, reads and sends

- It starts `node launcher.mjs` from the plugin folder as a local stdio MCP server. The launcher has no third-party dependencies.
- It reads one file, `~/.omnestro/extensions/codex.json`, which the OMNESTRO app writes when you connect a project. The file holds the local engine address and a connection token scoped to that one project.
- It sends requests only to the OMNESTRO engine on `127.0.0.1`. The plugin itself makes no internet requests and collects no conversation data.
- The OMNESTRO app contacts the OMNESTRO account service for sign-in and subscriptions. It runs your own Codex and Claude Code command-line tools, which talk to their providers as they normally do.

## Tools

`omnestro_connection_status` reports the setup step you still need, your account state, and trial and plan status when you ask. Once connected: read the project, modes, missions, plans, activity and evidence, and request a new mission, a follow-up, the next stage, a resume or a cancellation. Every request that changes anything waits for your approval in the OMNESTRO app. Plan approval, answers to questions and Apply happen only in the app.

## Troubleshooting

- **NOT_PAIRED** or **EXPIRED**: connect the project again from the Codex card. Installing or updating the plugin does not renew a connection.
- **ACCOUNT_REQUIRED**: sign in, or subscribe after the trial, under Account and subscription.
- **ENGINE_UNAVAILABLE**: open the OMNESTRO app and wait until it shows that the engine is ready.

## Links

- Website: https://omnestro.matrixboy.net
- Support: https://omnestro.matrixboy.net/support/
- Privacy policy: https://omnestro.matrixboy.net/privacy/
- Terms: https://omnestro.matrixboy.net/terms/
- Source: https://github.com/Matrixboy202/omnestro-codex-plugin
