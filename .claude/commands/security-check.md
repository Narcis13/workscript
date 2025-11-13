---
description: Comprehensive security review of code changes with OWASP focus
---

You are performing a security review of code in the Agentic Workflow Orchestration System.

## Security Review Checklist

### Step 1: Identify Code to Review

Ask the user what to review:
- Specific file(s)
- Recent changes (git diff)
- Entire feature/module
- API endpoints
- Database queries

### Step 2: OWASP Top 10 Analysis

Check for common vulnerabilities:

#### 1. Injection Attacks
- [ ] **SQL Injection:** Raw SQL queries? Use parameterized queries (Drizzle ORM does this)
- [ ] **Command Injection:** Shell commands with user input? Use `child_process.execFile` with array args
- [ ] **NoSQL Injection:** MongoDB queries with user input?
- [ ] **LDAP Injection:** LDAP queries with user input?

```typescript
// BAD
const query = `SELECT * FROM users WHERE id = ${userId}`;

// GOOD (Drizzle ORM)
const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
```

#### 2. Authentication & Session Management
- [ ] Password storage uses bcrypt/argon2?
- [ ] Session tokens are cryptographically random?
- [ ] JWT secrets are strong and rotated?
- [ ] Multi-factor authentication available?
- [ ] Session timeout implemented?
- [ ] Secure session storage?

#### 3. XSS (Cross-Site Scripting)
- [ ] User input sanitized before rendering?
- [ ] React auto-escapes (but check `dangerouslySetInnerHTML`)
- [ ] Content-Security-Policy headers set?
- [ ] User-generated HTML sanitized (use DOMPurify)?

```typescript
// BAD
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// GOOD
<div>{userInput}</div> // React auto-escapes
```

#### 4. Broken Access Control
- [ ] Authorization checks on all routes?
- [ ] User can't access others' resources?
- [ ] Role-based access control implemented?
- [ ] Direct object references validated?

```typescript
// BAD
app.get('/workflow/:id', async (c) => {
  const workflow = await getWorkflow(c.req.param('id'));
  return c.json(workflow);
});

// GOOD
app.get('/workflow/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const workflowId = c.req.param('id');
  const workflow = await getWorkflow(workflowId);

  if (workflow.userId !== userId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  return c.json(workflow);
});
```

#### 5. Security Misconfiguration
- [ ] Error messages don't leak sensitive info?
- [ ] Debug mode disabled in production?
- [ ] Unnecessary features disabled?
- [ ] Security headers set (HSTS, X-Frame-Options, etc.)?
- [ ] CORS properly configured?

```typescript
// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});
```

#### 6. Sensitive Data Exposure
- [ ] Secrets not in code/git?
- [ ] Environment variables for sensitive config?
- [ ] HTTPS enforced?
- [ ] Sensitive data encrypted at rest?
- [ ] PII handled according to regulations?
- [ ] API keys/tokens masked in logs?

#### 7. Insufficient Logging & Monitoring
- [ ] Security events logged?
- [ ] Failed login attempts tracked?
- [ ] Suspicious activity monitored?
- [ ] Logs don't contain sensitive data?
- [ ] Log injection prevented?

#### 8. Insecure Deserialization
- [ ] JSON.parse on untrusted data validated?
- [ ] Pickle/serialize untrusted data avoided?
- [ ] Type validation after deserialization?

```typescript
// BAD
const data = JSON.parse(userInput);
doSomething(data);

// GOOD
const schema = z.object({ field: z.string() });
const data = schema.parse(JSON.parse(userInput));
doSomething(data);
```

#### 9. Using Components with Known Vulnerabilities
- [ ] Dependencies up to date? (`bun update`)
- [ ] Security advisories checked? (`bun audit`)
- [ ] Lock file committed?

#### 10. Insufficient Rate Limiting & DoS
- [ ] Rate limiting on API endpoints?
- [ ] Request size limits?
- [ ] Timeout on long operations?
- [ ] Resource limits (memory, CPU)?

### Step 3: Workflow-Specific Security

#### Node Execution Security
- [ ] User-provided node configs validated?
- [ ] File system access restricted?
- [ ] Network access controlled?
- [ ] Resource limits per workflow?

#### State Management Security
- [ ] State doesn't leak between users?
- [ ] State resolver prevents injection?
- [ ] State snapshots secured?

### Step 4: Database Security
- [ ] Drizzle ORM used (prevents SQL injection)?
- [ ] Connection strings not hardcoded?
- [ ] Database credentials rotated?
- [ ] Principle of least privilege for DB user?

### Step 5: WebSocket Security
- [ ] WebSocket connections authenticated?
- [ ] Messages validated before processing?
- [ ] Rate limiting on WebSocket messages?
- [ ] Channel access controlled?

### Step 6: Generate Report

Provide:
1. **Critical Issues** - Must fix immediately
2. **High Priority** - Fix before production
3. **Medium Priority** - Fix in next sprint
4. **Low Priority** - Consider for future
5. **Best Practices** - Recommendations

For each issue:
- Location (file:line)
- Vulnerability type
- Risk level
- Exploit scenario
- Fix recommendation
- Code example

Now, what code would you like me to review for security issues?
