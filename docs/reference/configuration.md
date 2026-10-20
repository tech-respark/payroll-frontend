# Configuration reference

> **Audience:** Developers, DevOps, operators  
> **Purpose:** List runtime settings without exposing secret values  
> **Last verified:** 2026-10-20  
> **Source of truth:** Vite config, backend properties, and configuration consumers

## Frontend

| Setting | Current development value | Purpose |
| --- | --- | --- |
| Vite port | `5174` | Local browser URL |
| API path | `/payroll-management/v1` | Shared frontend API prefix |
| Proxy target | `https://localhost:8092` | Local backend |
| Proxy certificate validation | disabled locally | Supports self-signed local certificate |

The frontend currently has no `.env.example`; the proxy is in `vite.config.js`.

Vite also deduplicates `react` and `react-dom` and pre-bundles `@tanstack/react-table` so lazy-loaded report screens do not pull a second React copy (which would crash those routes at runtime).

## Backend

| Property | Purpose | Secret |
| --- | --- | --- |
| `server.port` | HTTPS API port | No |
| `spring.datasource.url` | MySQL location/database | Environment-sensitive |
| `DB_USERNAME`, `DB_PASSWORD` | Database authentication | Yes |
| `jwt.secret` / `JWT_SECRET` | HS256 signing key, minimum 32 bytes | Yes; required at startup |
| `cors.allowed-origins` / `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins | No; defaults are local Vite only |
| `jwt.expiration-ms` | JWT lifetime | No |
| `spring.jpa.hibernate.ddl-auto` / `HIBERNATE_DDL_AUTO` | Schema behavior | No; production-critical |
| `server.ssl.*` | Keystore, alias, passwords | Passwords are secret |
| `management.endpoints.web.exposure.include` | Operational endpoints (`health` only in tracked config) | No |
| `spring.rabbitmq.*` | Messaging broker | Credentials are secret |
| `env`, `address.queue` | Message routing environment/queue | No |
| `spring.mail.*` | SMTP | Credentials are secret |
| `scheduler.attendance.fixedRate` | Attendance scan delay in ms | No |
| `logging.file.name` | Backend log path | No |

## Database configuration

The repository default expects database `payroll_management`. Local environments may use another port by overriding the complete JDBC URL:

```bash
export SPRING_PROFILES_ACTIVE=local
# copy backend src/main/resources/application-local.example.properties
# to gitignored application-local.properties and fill local values
```

Environment-variable alternative:

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://127.0.0.1:3307/payroll_management?useSSL=false'
export DB_USERNAME='<local-user>'
export DB_PASSWORD='<local-password>'
export JWT_SECRET='<local-secret-at-least-32-bytes>'
```

Do not put real values in committed shell scripts, Markdown, `.env`, screenshots, or examples.

## Integration data stored in MySQL

Tenant rows contain biometric and external-software configuration. Store rows contain external branch mapping. Treat vendor credentials as secrets even though the current model stores them in application tables.

Deployed QA and production hosts inject the same keys from a secret manager. See [QA and production deployment](../operations/qa-and-production-deployment.md).

## Production recommendations

- Use environment-specific Spring profiles.
- Remove credential defaults from tracked properties.
- Inject all secrets through a managed secret provider.
- Set `ddl-auto=validate` after adopting versioned migrations.
- Use a trusted certificate and private key lifecycle.
- Restrict CORS to deployed frontend origins.
- Restrict actuator and logs to operators.
- Separate local, staging, and production broker/email queues and accounts.
