# Documentation contribution standards

> **Audience:** Everyone changing product or documentation  
> **Purpose:** Keep this portal accurate, safe, and reviewable  
> **Last verified:** 2026-10-20  
> **Source of truth:** Repository docs policy, Cursor documentation rules, and validation script

## Source priority

When sources disagree, verify in this order:

1. Current executable code and controller/entity annotations
2. Automated tests and verified runtime behavior
3. Current database migration/baseline (when introduced)
4. Maintained documentation
5. Historical documents, dumps, screenshots, and comments

Never silently convert an intended behavior into an “implemented” claim.

## Required updates

The author of a behavior change updates documentation in the same change. Do not defer docs to a follow-up task. Skip only no-behavior edits such as formatting, comments, or unused-code cleanup.

Update both portals when the change is user-visible:

- **User help center** — `src/docs/content/`, `src/docs/catalog.js`, and `src/docs/content/index.js` for signed-in readers
- **Engineering portal** — `README.md` and `docs/` for implementers, operators, and reviewers

Required when changing:

- frontend routes, navigation, labels, permissions, or workflows;
- user-facing screens, copy, empty states, or help-center articles;
- API methods, paths, request/response shapes, or authorization;
- entities, tables, relationships, enums, formulas, or triggers;
- configuration keys, ports, profiles, integrations, or schedulers;
- onboarding, deployment, monitoring, backup, or incident procedures;
- client-visible capabilities or limitations.

## Page standard

Every page under `docs/` should include:

```markdown
> **Audience:** ...
> **Purpose:** ...
> **Last verified:** YYYY-MM-DD
> **Source of truth:** ...
```

Use descriptive headings, relative links, small examples, and Mermaid for relationships that are harder to explain in prose. Define new product terms in the glossary.

## Safety

Never add:

- passwords, tokens, signing keys, OTPs, private certificates;
- production hostnames/IPs or vendor credentials;
- personal, bank, attendance, leave, or salary data;
- raw database dumps;
- screenshots containing client information.

Use `example.invalid`, placeholder IDs, and synthetic people.

## Review checklist

- Claim is verified against current code
- Audience and purpose are clear
- Routes, methods, permissions, table names, and statuses are exact
- Product promise is distinguishable from roadmap/intention
- Known limitation remains visible
- Links are relative and valid
- User-visible changes also update the matching `src/docs/content/` article
- Examples contain no secret or personal data
- `npm run docs:check` passes
- Related frontend build/backend tests pass as appropriate

## Ownership

The author of a behavior change owns its documentation update. Reviewers should reject stale docs the same way they reject stale tests. Architecture or security findings belong in the known-limitations register until resolved.
