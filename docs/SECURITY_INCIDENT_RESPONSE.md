# ThermaCore Integrated SCADA: Security Incident Response Plan
## Operational OT/IT Cybersecurity Incident Response, Isolation, and Mitigation Protocol

This document outlines the Security Incident Response Plan (SIRP) for the ThermaCore SCADA Platform, protecting our modular generator fleet from cyber-physical compromises or data breaches.

---

## 1. Incident Classification Framework

Events are categorized into 3 severity levels to drive response timelines:

```

┌────────────────────────────────────────────────────────┐
│  INCIDENT SEVERITY LEVEL CLASSIFICATIONS               │
├────────────────────────────────────────────────────────┤
│  🔴 LEVEL 1: CRITICAL  - Rogue command injection,      │
│                         OT physical loop compromise    │
├────────────────────────────────────────────────────────┤
│  🟡 LEVEL 2: MEDIUM    - XSS attempt, brute-force IP,  │
│                         unauthorized RBAC elevation    │
├────────────────────────────────────────────────────────┤
│  🔵 LEVEL 3: LOW       - Failed logins, port scan probes │
└────────────────────────────────────────────────────────┘

```

---

## 2. Response Roles and Security Contacts

Upon a Level 1 or Level 2 incident declaration, the **Cybersecurity Response Team** is mobilized:

| Role | Responsibility | Contact Channel |
| :--- | :--- | :--- |
| **Incident Commander** | Coordinates overall system isolation and recovery operations | `commander@thermacore.com` |
| **OT Specialist** | Focuses on physical generator safety, PLC disconnects, and field bypasses | `ot-response@thermacore.com` |
| **SecOps Analyst** | Audits server logs, rotates JWT key secrets, blocklists adversary IPs | `secops@thermacore.com` |
| **Legal Counsel** | Manages regulatory disclosures and notification compliance | `legal@thermacore.com` |

---

## 3. Cyber-Physical Incident Response Steps

When a security incident is identified, the response team executes this 4-phase protocol:

### Phase 1: Identification & Triaging
* Verify the alert validity. Check database audit logs for unauthorized user elevations or cryptographic command mismatches (`TC-303`).
* Extract IP addresses, target user profiles, and active generator node serial numbers.
* Identify affected tenant(s) by reviewing the `tenant_id` associated with compromised accounts or assets.

### Phase 2: Containment and Isolation
* **Adversary IP Isolation**: Instantly block malicious IPs on Render/Netlify and our gateway firewalls.
* **Force Session Re-Authentication**: Rotate the `JWT_SECRET_KEY` in Render. This immediately invalidates every active user session and forces complete re-authentication.
* **Hard OT Loop Isolation**: If a physical generator's telemetry shows malicious override attempts (Level 1), the on-site operator must manually shift the unit to **Local/Manual Mode** via the physical toggle. This completely overrides incoming digital web SCADA signals.
* **Tenant Context Isolation**: If a single customer environment is compromised, use the multi-tenant isolation architecture to restrict or revoke access to that specific `tenant_id` without affecting other tenant fleets:
  1. **Revoke Tenant Access**: Immediately disable the compromised tenant's access at the database level by setting a `tenant_isolation_flag` or temporarily revoking the tenant's active status.
  2. **Force Admin Re-authentication**: All administrative users are automatically redirected to the `/admin` Landing Page upon their next action, requiring them to re-verify secure credentials and context selection before accessing any tenant data.
  3. **Tenant Switcher Restrictions**: Temporarily remove the compromised tenant from the Tenant Switcher dropdown to prevent accidental re-selection during the incident window.
  4. **Isolate Tenant Data**: Restrict API access to the compromised `tenant_id` by blocking all queries scoped to that tenant at the application middleware layer.
  5. **Notify Tenant Administrators**: Alert the affected tenant's designated administrators about the security incident and isolation action taken.
  6. **Forensic Data Preservation**: Preserve all audit logs and telemetry data for the compromised tenant in a separate secure location for forensic analysis, without exposing other tenants' data.

### Phase 3: Eradication and Mitigation
* Review logs to locate the entry vector (e.g., an unpatched dependency or compromised operator credentials).
* Revoke compromised accounts and apply immediate security patches.
* If the entry vector is specific to a particular tenant (e.g., a compromised tenant-specific API key), rotate or revoke only that tenant's credentials.

### Phase 4: Recovery and Verification
* Confirm database and container file system integrity.
* Restore verified, clean configurations from backups if file systems were compromised.
* Transition generators from manual mode back to web-supervised mode.
* **Tenant Reinstatement**: After verifying the root cause is fully mitigated, systematically re-enable the isolated tenant:
  1. Restore tenant access in the database
  2. Re-add the tenant to the Tenant Switcher dropdown
  3. Verify all tenant-specific data is intact and accessible
  4. Force tenant administrators to reset their credentials upon next login
* **Regression and Integrity Testing**: Before re-opening the production portal, run the full automated test suite to verify code integrity. Ensure the production build achieves our verified baseline test coverage limits (**91.78% Frontend Coverage** under Vitest and **82.91% Backend Coverage** under Pytest) to guarantee no security regressions or syntax errors were introduced during emergency patch deployments.

---

## 4. Communication & Regulatory Notifications

ThermaCore adheres to international cybersecurity compliance guidelines (**NIST SP 800-61** and **NERC CIP-008**):

### 4.1 Internal Communication
* Avoid using compromised networks (e.g., if emails are breached, use pre-established encrypted communication channels).
* Limit distribution of technical vulnerability information to the immediate response team.
* If tenant isolation was performed, communicate the status to internal teams without revealing sensitive tenant-specific details.

### 4.2 External & Regulatory Notifications
* **Clients/Affected Parties**: Notify within **72 hours** of incident verification if personal information or asset integrity was compromised. For tenant-specific incidents, notifications should be limited to the affected tenant only.
* **OT Infrastructure Authorities**: In the event of a utility-grid control interruption (Level 1), file standard notifications with relevant national infrastructure security agencies.
* **Tenant-Specific Disclosure**: Provide affected tenants with a tailored incident report detailing the scope of impact, actions taken, and remediation steps completed, while protecting other tenants' data confidentiality.

---

## 5. Post-Incident Review & Follow-up Timeline

Continuous improvement is vital for maintaining robust defensive postures. Following any declared Level 1 or Level 2 incident, the Incident Commander will initiate a formal **lessons-learned process** and execute a structured follow-up timeline.

### 5.1 Lessons-Learned Process
1. **Fact Gathering**: Compile all timeline logs, communication records, and technical forensic artifacts (including PCAP files and database audit trails).
2. **Debrief Meeting**: Within 5 business days of incident closure, convene a cross-functional debrief with the Security Response Team, engineering, and operations leads.
3. **Root Cause Analysis (RCA)**: Identify the core technical or procedural vulnerability that allowed the compromise.
4. **Action Item Tracking**: Document precise remediation actions, assigning explicit owners and completion deadlines to prevent recurrence.
5. **Report Distribution**: Publish a sanitized, high-level Executive Summary for management and technical-level reports for engineering teams.
6. **Tenant Impact Assessment**: If a tenant was isolated, document the full impact assessment including:
   - Duration of isolation
   - Data integrity verification results
   - Any data loss or corruption discovered
   - Recommendations for tenant-specific security enhancements

### 5.2 30/60/90-Day Remediation Timeline

```

┌────────────────────────────────────────────────────────────────────────┐
│  POST-INCIDENT REMEDIATION TIMELINE                                    │
├────────────────────────────────────────────────────────────────────────┤
│  [30 Days]  - Patch vector, verify log preservation, rotate certs.     │
│  [60 Days]  - Update SIRP playbook, conduct tabletop exercise mock-run.│
│  [90 Days]  - External independent penetration test & audit sign-off.  │
└────────────────────────────────────────────────────────────────────────┘

```

#### 30-Day Checklist: Critical Mitigations
* [ ] Verify that the specific entry vector has been fully patched and verified in production.
* [ ] Confirm all system secrets, JWT keys, and mTLS certificates involved are rotated.
* [ ] Audit log preservation configurations to ensure no log manipulation occurred during the incident window.
* [ ] If tenant isolation was performed, verify tenant data integrity and restore full access with enhanced monitoring.

#### 60-Day Checklist: Process Upgrades
* [ ] Update the Security Incident Response Plan (SIRP) playbooks with lessons-learned refinements, including enhanced tenant isolation procedures.
* [ ] Conduct a simulated tabletop security exercise with operators to practice the revised emergency manual overrides and communication flows.
* [ ] Implement additional automated SIEM monitoring alerts for early warning detection of similar threat vectors.
* [ ] Review and enhance tenant isolation automation to reduce response time for future incidents.

#### 90-Day Checklist: External Audit & Closeout
* [ ] Commission an independent, third-party penetration test targeting the patched subsystems.
* [ ] Complete a full security posture review and present findings to the Executive Compliance Committee.
* [ ] Obtain formal administrator and OT security authority sign-offs on the closed security incident file.
* [ ] Provide affected tenant(s) with a final incident closure report and security enhancement recommendations specific to their environment.

---

*End of Security Incident Response Plan*
