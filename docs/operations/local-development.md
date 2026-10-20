# Local development

> **Audience:** Developers and QA  
> **Purpose:** Run the frontend, backend, and database locally  
> **Last verified:** 2026-10-20  
> **Source of truth:** Build files and verified local runtime

## Prerequisites

- Node.js and npm
- Java 21
- Maven 3.9+
- MySQL 8
- `payroll-frontend` and sibling `payroll-backend`
- Local JKS keystore for backend HTTPS
- Authorized, sanitized database seed or migration baseline

## Ports

| Service | Port |
| --- | --- |
| Frontend | 5174 |
| Backend HTTPS | 8092 |
| Project MySQL on the verified workstation | 3307 |

Tracked backend properties have no credential defaults. Local JDBC URL, passwords, and `jwt.secret` come from gitignored `application-local.properties` or environment variables. The verified workstation uses MySQL port 3307.

## Database

Create `payroll_management`, restore an approved sanitized dump or migration baseline, and use a local-only database account. Never commit the dump or credentials.

Confirm connectivity and table count before starting the API.

## Backend

```bash
export JAVA_HOME='<path-to-java-21>'
export SPRING_PROFILES_ACTIVE=local

cd ../payroll-backend
# copy application-local.example.properties to gitignored application-local.properties first
mvn spring-boot:run
```

Expected result: Tomcat starts on HTTPS port 8092 and the JPA connection pool connects to MySQL.

The local keystore belongs in backend resources only for local execution and must remain ignored by Git.

## Frontend

```bash
cd ../payroll-frontend
npm install
npm run dev
```

Open `http://localhost:5174/login`. The development proxy accepts the backend's self-signed certificate. The UI ships with Public Sans / Barlow fonts and a light-first theme (`data-theme`); toggle dark mode from the header.

## Verification

1. Open the login page.
2. Sign in with the approved local test account.
3. Confirm Staff Details loads.
4. Confirm one GET and one mutation pass through the proxy.
5. Confirm browser requests use `/payroll-management/v1`.
6. Check backend logs for database or integration failures.

## Useful checks

```bash
npm run docs:check
npm run build

cd ../payroll-backend
mvn test
```

## Optional services

Basic login and database screens do not require every integration. OTP notifications, emails, biometric retrieval, and staff import require their corresponding external services/configuration.

See [runbook and troubleshooting](runbook-and-troubleshooting.md) when startup or login fails. Shared QA and production servers follow [QA and production deployment](qa-and-production-deployment.md); do not copy `application-local.properties` onto those hosts.
