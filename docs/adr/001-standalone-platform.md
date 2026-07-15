# ADR 001: Standalone platform with OpenClaw as operator

## Status

Accepted

## Decision

The platform owns its database, workflows, rendering, storage, approvals, and publishing. OpenClaw integrates through a restricted API and is not a runtime dependency.

## Consequence

Jobs continue when the local OpenClaw host is offline.
