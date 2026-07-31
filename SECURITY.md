# Security Policy

## Supported versions

Only the `main` branch is supported.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's
private vulnerability reporting ("Report a vulnerability" under the Security
tab) instead.

We are particularly interested in:

- Any path where scraped, untrusted content can reach a code-execution sink
  (`eval`, `new Function`, `vm`, `child_process`, template evaluation).
- Prototype pollution or ReDoS in the parsers under `engine/src/utils/`.
- Anything that would let a malicious upstream source write outside the
  repository's `output/` directory and the four root `*.txt` lists.
- Supply-chain problems in the dependency tree.

## Hardening already in place

- No dynamic code evaluation anywhere in `engine/src/`; CI fails the build via
  `engine/scripts/check-no-eval.js`. Obfuscated provider payloads are decoded by
  the bounded, arithmetic-only parsers in `engine/src/utils/safe-parse.js`.
- TLS certificate verification is never disabled.
- All scraped values are whitelist-validated by `buildProxy()` before use.
- Requests have timeouts, retry ceilings and per-host rate limits.
- The update workflow uses the scoped `GITHUB_TOKEN` with `contents: write`
  and does not force-push.

## Note on the data itself

The published lists are third-party open proxies. Routing traffic through an
untrusted proxy exposes unencrypted data to its operator. Treat the data as
untrusted infrastructure and never send credentials through it.
