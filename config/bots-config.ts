/**
 * Dynamic WhatsApp Bot Accounts Registry
 * High-performance, strongly-typed configuration for Linda WhatsApp Bot accounts.
 */

export type BotRole = 'primary' | 'secondary' | 'agent';
export type BotStatus = 'pending' | 'ready' | 'authenticated' | 'disconnected';

export interface BotFeatures {
  messaging: boolean;
  contacts: boolean;
  campaigns: boolean;
  analytics: boolean;
  scheduling: boolean;
}

export interface BotConfig {
  id: string;
  phoneNumber: string;
  displayName: string;
  description: string;
  role: BotRole;
  sessionPath: string;
  enabled: boolean;
  features: BotFeatures;
  status: BotStatus;
  createdAt: string;
  lastSync: string | null;
}

export interface BotsRegistryConfig {
  whatsappBots: Record<string, BotConfig>;
  default: string;
  primaryAccount: string;
  version: string;
  format: string;
  metadata: {
    totalBots: number;
    activeBots: number;
    pendingBots: number;
    lastModified: string;
    managedBy: string;
    notes: string;
  };
  capabilities: {
    'multi-account': boolean;
    'dynamic-management': boolean;
    'contact-sync': boolean;
    'campaign-management': boolean;
    'message-routing': boolean;
    'analytics-aggregation': boolean;
  };
}

// Default standard features enabled across all bots
const DEFAULT_FEATURES: BotFeatures = {
  messaging: true,
  contacts: true,
  campaigns: true,
  analytics: true,
  scheduling: true,
};

/**
 * Compact factory to instantiate bot definitions with safe defaults and zero redundant boilerplate.
 */
function createBot(params: {
  id: string;
  phoneNumber: string;
  displayName: string;
  createdAt: string;
  description?: string;
  role?: BotRole;
  enabled?: boolean;
  features?: Partial<BotFeatures>;
  status?: BotStatus;
}): BotConfig {
  const cleanPhone = params.phoneNumber.replace(/\D/g, '');
  return {
    id: params.id,
    phoneNumber: params.phoneNumber,
    displayName: params.displayName,
    description: params.description ?? `Master Account - ${params.phoneNumber}`,
    role: params.role ?? 'primary',
    sessionPath: `sessions/session-${cleanPhone}`,
    enabled: params.enabled ?? true,
    features: { ...DEFAULT_FEATURES, ...params.features },
    status: params.status ?? 'pending',
    createdAt: params.createdAt,
    lastSync: null,
  };
}

/**
 * All configured WhatsApp Bot Accounts
 */
export const WHATSAPP_BOTS: Record<string, BotConfig> = {
  'arslan-malik': createBot({
    id: 'arslan-malik',
    phoneNumber: '+971505760056',
    displayName: 'Arslan Malik',
    description: 'Master WhatsApp Account - Linda AI Assistant',
    createdAt: '2026-02-11',
  }),
  bigbroker: createBot({
    id: 'master_1771448396526',
    phoneNumber: '+971553633595',
    displayName: '"big broker"',
    description: 'Master Account - "big broker"',
    createdAt: '2026-02-18',
  }),
  master_971589969886: createBot({
    id: 'master_971589969886',
    phoneNumber: '+971589969886',
    displayName: 'Master 971589969886',
    createdAt: '2026-10-30',
  }),
  master_971503869886: createBot({
    id: 'master_971503869886',
    phoneNumber: '+971503869886',
    displayName: 'Master 971503869886',
    createdAt: '2026-10-30',
  }),
  master_971509079196: createBot({
    id: 'master_971509079196',
    phoneNumber: '+971509079196',
    displayName: 'Master 971509079196',
    createdAt: '2026-10-30',
  }),
  master_971509570067: createBot({
    id: 'master_971509570067',
    phoneNumber: '+971509570067',
    displayName: 'Master 971509570067',
    createdAt: '2026-10-30',
  }),
  master_971582178440: createBot({
    id: 'master_971582178440',
    phoneNumber: '+971582178440',
    displayName: 'Master 971582178440',
    createdAt: '2026-10-30',
  }),
  master_971569288983: createBot({
    id: 'master_971569288983',
    phoneNumber: '+971569288983',
    displayName: 'Master 971569288983',
    createdAt: '2026-10-30',
  }),
  master_971502039886: createBot({
    id: 'master_971502039886',
    phoneNumber: '+971502039886',
    displayName: 'Master 971502039886',
    createdAt: '2026-10-30',
  }),
  master_971585259886: createBot({
    id: 'master_971585259886',
    phoneNumber: '+971585259886',
    displayName: 'Master 971585259886',
    createdAt: '2026-10-30',
  }),
  master_971563616136: createBot({
    id: 'master_971563616136',
    phoneNumber: '+971563616136',
    displayName: 'Master 971563616136',
    createdAt: '2026-10-30',
  }),
  master_971567160096: createBot({
    id: 'master_971567160096',
    phoneNumber: '+971567160096',
    displayName: 'Master 971567160096',
    createdAt: '2026-10-30',
  }),
  master_971589750428: createBot({
    id: 'master_971589750428',
    phoneNumber: '+971589750428',
    displayName: 'Master 971589750428',
    createdAt: '2026-10-30',
  }),
  master_971505036476: createBot({
    id: 'master_971505036476',
    phoneNumber: '+971505036476',
    displayName: 'Master 971505036476',
    createdAt: '2026-10-30',
  }),
  master_971559156636: createBot({
    id: 'master_971559156636',
    phoneNumber: '+971559156636',
    displayName: 'Master 971559156636',
    createdAt: '2026-10-30',
  }),
  master_971551900559: createBot({
    id: 'master_971551900559',
    phoneNumber: '+971551900559',
    displayName: 'Master 971551900559',
    createdAt: '2026-10-30',
  }),
  master_971551105099: createBot({
    id: 'master_971551105099',
    phoneNumber: '+971551105099',
    displayName: 'Master 971551105099',
    createdAt: '2026-10-30',
  }),
  master_971505110636: createBot({
    id: 'master_971505110636',
    phoneNumber: '+971505110636',
    displayName: 'Master 971505110636',
    createdAt: '2026-10-31',
  }),
};

/**
 * Master Registry Object with backwards compatibility for existing config readers
 */
export const BOTS_CONFIG: BotsRegistryConfig = {
  whatsappBots: WHATSAPP_BOTS,
  default: 'arslan-malik',
  primaryAccount: 'arslan-malik',
  version: '2.0',
  format: 'Dynamic WhatsApp Bot Accounts Registry',
  metadata: {
    totalBots: Object.keys(WHATSAPP_BOTS).length,
    activeBots: Object.values(WHATSAPP_BOTS).filter((b) => b.status === 'authenticated' || b.status === 'ready').length,
    pendingBots: Object.values(WHATSAPP_BOTS).filter((b) => b.status === 'pending').length,
    lastModified: '2026-10-31T04:47:00Z',
    managedBy: 'DynamicAccountManager',
    notes: 'Configured multi-master bot accounts.',
  },
  capabilities: {
    'multi-account': true,
    'dynamic-management': true,
    'contact-sync': true,
    'campaign-management': true,
    'message-routing': true,
    'analytics-aggregation': true,
  },
};

// --- Fast O(1) & Utility Helpers ---

export const getBotById = (id: string): BotConfig | undefined => WHATSAPP_BOTS[id];

export const getBotByPhone = (phone: string): BotConfig | undefined => {
  const clean = phone.replace(/\D/g, '');
  return Object.values(WHATSAPP_BOTS).find((b) => b.phoneNumber.replace(/\D/g, '') === clean);
};

export const getActiveBots = (): BotConfig[] =>
  Object.values(WHATSAPP_BOTS).filter((b) => b.enabled);

export const getDefaultBot = (): BotConfig =>
  WHATSAPP_BOTS[BOTS_CONFIG.default] || Object.values(WHATSAPP_BOTS)[0];

export default BOTS_CONFIG;

