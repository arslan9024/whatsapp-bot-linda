# Traceability matrix

One row per problem. Each row links the problem to its algorithm,
flowchart, requirements, module, tests, terminal entry points, iteration and
status. `npm run plans:check` fails if a problem in the
[register](02-problems/PROBLEM_REGISTER.md) is missing here.

| PS | ALG | FC | FR | Module | Tests (tests/unit) | Menu / Playbook | Iteration | Status |
|---|---|---|---|---|---|---|---|---|
| PS-001 | [ALG-001](03-algorithms/ALG-001-single-instance-lease.md) | [FC-001](04-flowcharts/FC-001-single-instance-lease.md) | FR-001 | M-01 | BotInstanceGuard | automatic | E2 | Implemented |
| PS-002 | [ALG-002](03-algorithms/ALG-002-connection-state-machine.md) | [FC-002](04-flowcharts/FC-002-connection-state-machine.md) | FR-002, FR-003 | M-06 | TerminalSessionDashboard, SessionLoginDetector, TerminalLayout | 1.18 | E1 | Implemented |
| PS-003 | [ALG-003](03-algorithms/ALG-003-master-restore.md) | [FC-003](04-flowcharts/FC-003-master-restore.md) | FR-004, FR-005 | M-04, M-06, M-07 | TerminalSessionDashboard, TerminalNumberMenu, SessionRecoveryService, SavedSessionReconnect, MasterSessionPersistence | 1.20 check, 1.21 ready, 1.19, 1.16, P1 | E1 | Implemented |
| PS-004 | [ALG-004](03-algorithms/ALG-004-pairing-code-refresh.md) | [FC-004](04-flowcharts/FC-004-pairing-code-refresh.md) | FR-006, FR-007 | M-05 | DeviceLinking, LinkMethodCommand | 2.1, 1.12, P2, P3 | E1 | Implemented |
| PS-005 | [ALG-005](03-algorithms/ALG-005-durable-session-store.md) | [FC-005](04-flowcharts/FC-005-durable-session-store.md) | FR-008, FR-009 | M-03 | LocalSessionPersistence, MasterSessionShutdown | 1.7, P4 | E1 | Implemented |
| PS-006 | [ALG-006](03-algorithms/ALG-006-reconnect-backoff.md) | [FC-006](04-flowcharts/FC-006-reconnect-backoff.md) | FR-010, FR-011 | M-06, M-04 | SavedSessionReconnect, SessionRecoveryService | automatic; 1.20 inspect, 1.21 explicit recovery | C1 | Partial |
| PS-007 | [ALG-007](03-algorithms/ALG-007-logout-detection.md) | [FC-007](04-flowcharts/FC-007-logout-detection.md) | FR-012 | M-05 | SessionRecoveryService, WhatsAppCommandBridgeRecovery | 1.13, 1.9, P5 | C1 | Partial |
| PS-008 | [ALG-008](03-algorithms/ALG-008-multi-account-orchestration.md) | [FC-008](04-flowcharts/FC-008-multi-account-orchestration.md) | FR-013 | M-04 | AccountBootstrapManager, WhatsAppMultiAccountManager | 1.10, 1.4, P6 | C1 | Partial |
| PS-009 | [ALG-009](03-algorithms/ALG-009-conversation-report.md) | [FC-009](04-flowcharts/FC-009-conversation-report.md) | FR-014, FR-015 | M-09 | TerminalConversationAnalysis, ConversationIntelligenceEngine | 8.11, 8.9, 8.10, P7 | C3 | Implemented |
| PS-010 | [ALG-010](03-algorithms/ALG-010-safe-send.md) | [FC-010](04-flowcharts/FC-010-safe-send.md) | FR-016, FR-017, FR-018 | M-08 | CampaignSafety, InputValidation | 8.2, 8.1, P8 | C2 | Partial |
| PS-011 | [ALG-011](03-algorithms/ALG-011-contact-dedup.md) | [FC-011](04-flowcharts/FC-011-contact-dedup.md) | FR-019, FR-020 | M-11 | DataProcessingService | 3.2, 3.4, 8.7, P9 | C4 | Partial |
| PS-012 | [ALG-012](03-algorithms/ALG-012-health-score.md) | [FC-012](04-flowcharts/FC-012-health-score.md) | FR-021 | M-10 | RestoredFeatures | 6.1, 1.14, 1.18, P10 | C1 | Implemented |
| PS-013 | [ALG-013](03-algorithms/ALG-013-command-resolution.md) | [FC-013](04-flowcharts/FC-013-command-resolution.md) | FR-022, FR-023, FR-024 | M-07 | TerminalNumberMenu, TerminalPlaybooks, CommandExecutor | every input | E2 | Partial |
| PS-014 | [ALG-014](03-algorithms/ALG-014-screen-budget.md) | [FC-014](04-flowcharts/FC-014-screen-budget.md) | FR-025 | M-07 | TerminalLayout | automatic | E2 | Implemented |
| PS-015 | [ALG-015](03-algorithms/ALG-015-usage-counters.md) | [FC-015](04-flowcharts/FC-015-usage-counters.md) | FR-026 | M-07 | FeatureCatalog | dashboard ×n | E2 | Implemented |
| PS-016 | [ALG-016](03-algorithms/ALG-016-inbound-dedup.md) | [FC-016](04-flowcharts/FC-016-inbound-dedup.md) | FR-027 | M-02 | EnhancedMessageHandler | automatic | C2 | Implemented |
| PS-017 | [ALG-017](03-algorithms/ALG-017-campaign-scheduler.md) | [FC-017](04-flowcharts/FC-017-campaign-scheduler.md) | FR-028, FR-029 | M-08 | CampaignWorkspace, TerminalCampaignMenu | 6.4 | C2 | Partial |
| PS-018 | [ALG-018](03-algorithms/ALG-018-priority-inbox.md) | [FC-018](04-flowcharts/FC-018-priority-inbox.md) | FR-030 | M-09 | — (planned) | 8.12 (planned) | C3 | Planned |
| PS-019 | [ALG-019](03-algorithms/ALG-019-full-text-search.md) | [FC-019](04-flowcharts/FC-019-full-text-search.md) | FR-031 | M-09 | — (planned) | 8.13 (planned) | C3 | Planned |
| PS-020 | [ALG-020](03-algorithms/ALG-020-intent-routing.md) | [FC-020](04-flowcharts/FC-020-intent-routing.md) | FR-032, FR-033 | M-09, M-02 | MessageAnalyzerWithContext | 8.5 | C4 | Partial |

Test names are best-effort mappings of today's suites. When an algorithm
gap is closed, add a dedicated `ALG-nnn`-focused test and list it here.
