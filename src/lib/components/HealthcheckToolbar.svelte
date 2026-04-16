<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface ServiceStatus {
    status: 'ok' | 'error';
    latency: number;
    error?: string;
  }

  interface HealthcheckResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    services: {
      d1: ServiceStatus;
      kv_sessions: ServiceStatus;
      kv_flags: ServiceStatus;
      r2: ServiceStatus;
    };
  }

  type ServiceName = 'd1' | 'kv_sessions' | 'kv_flags' | 'r2';

  interface ServiceConfig {
    label: string;
    type: string;
    binding: string;
    description: string;
    icon: string;
    details: Record<string, string>;
  }

  const SERVICE_CONFIG: Record<ServiceName, ServiceConfig> = {
    d1: {
      label: 'D1 Database',
      type: 'D1',
      binding: 'DB',
      description: 'SQLite database for persistent storage',
      icon: '🗄️',
      details: {
        'Database Name': 'project-updates-db',
        'Migrations Dir': 'drizzle',
      },
    },
    kv_sessions: {
      label: 'KV Sessions',
      type: 'KV',
      binding: 'SESSIONS',
      description: 'Key-value store for session data',
      icon: '🔑',
      details: {
        'Namespace ID': 'local',
        'Purpose': 'User sessions',
      },
    },
    kv_flags: {
      label: 'KV Flags',
      type: 'KV',
      binding: 'FLAGS',
      description: 'Key-value store for feature flags',
      icon: '🚩',
      details: {
        'Namespace ID': 'local-flags',
        'Purpose': 'Feature flags',
      },
    },
    r2: {
      label: 'R2 Storage',
      type: 'R2',
      binding: 'WEBFLOW_CLOUD_MEDIA',
      description: 'Object storage for files and media',
      icon: '📦',
      details: {
        'Bucket Name': 'fake',
        'Purpose': 'Media storage',
      },
    },
  };

  let health: HealthcheckResponse | null = $state(null);
  let loading = $state(true);
  let error: string | null = $state(null);
  let isExpanded = $state(true);
  let hoveredService: ServiceName | null = $state(null);
  let interval: ReturnType<typeof setInterval> | null = null;

  async function fetchHealth() {
    try {
      const res = await fetch('/api/healthcheck');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      health = (await res.json()) as HealthcheckResponse;
      error = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch';
    } finally {
      loading = false;
    }
  }

  function getServiceStatus(key: ServiceName): 'ok' | 'error' | 'loading' {
    if (loading) return 'loading';
    return health?.services[key]?.status || 'error';
  }

  function getOverallStatus(): 'ok' | 'error' | 'loading' {
    if (loading) return 'loading';
    return health?.status === 'healthy' ? 'ok' : 'error';
  }

  function getOnlineCount(): number {
    if (!health) return 0;
    return Object.values(health.services).filter(s => s.status === 'ok').length;
  }

  onMount(() => {
    fetchHealth();
    interval = setInterval(fetchHealth, 30000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="fixed bottom-4 right-4 z-50">
  <div class="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl min-w-[320px] max-w-[380px]">
    <!-- Header -->
    <button
      onclick={() => isExpanded = !isExpanded}
      class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
    >
      <div class="flex items-center gap-3">
        <span
          class="inline-block w-4 h-4 rounded-full shadow-lg {getOverallStatus() === 'ok' ? 'bg-green-500 shadow-green-500/50' : getOverallStatus() === 'loading' ? 'bg-yellow-500 shadow-yellow-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}"
        ></span>
        <div class="text-left">
          <div class="text-sm font-semibold text-white">Cloudflare Bindings</div>
          <div class="text-xs text-gray-400">
            {loading ? 'Checking...' : error ? 'Connection error' : `${getOnlineCount()}/4 services online`}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        {#if health}
          <span
            class="text-xs font-medium px-2 py-1 rounded-full border {health.status === 'healthy' ? 'text-green-400 bg-green-500/20 border-green-500/30' : health.status === 'degraded' ? 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' : 'text-red-400 bg-red-500/20 border-red-500/30'}"
          >
            {health.status.toUpperCase()}
          </span>
        {/if}
        <svg
          class="w-5 h-5 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </button>

    <!-- Expanded Content -->
    {#if isExpanded}
      <div class="px-4 pb-4 space-y-2">
        {#if error}
          <div class="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        {/if}

        {#each Object.entries(SERVICE_CONFIG) as [key, config]}
          <div
            class="relative"
            onmouseenter={() => hoveredService = key as ServiceName}
            onmouseleave={() => hoveredService = null}
          >
            <div
              class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all {getServiceStatus(key as ServiceName) === 'error' ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20' : getServiceStatus(key as ServiceName) === 'loading' ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'}"
            >
              <div class="text-2xl">{config.icon}</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-white truncate">{config.label}</span>
                  <span
                    class="inline-block w-2 h-2 rounded-full shadow-lg {getServiceStatus(key as ServiceName) === 'ok' ? 'bg-green-500 shadow-green-500/50' : getServiceStatus(key as ServiceName) === 'loading' ? 'bg-yellow-500 shadow-yellow-500/50 animate-pulse' : 'bg-red-500 shadow-red-500/50'}"
                  ></span>
                </div>
                <div class="text-xs text-gray-400 font-mono truncate">{config.binding}</div>
              </div>
              {#if health?.services[key as ServiceName] && !loading}
                <div class="text-xs text-gray-500">{health.services[key as ServiceName].latency}ms</div>
              {/if}
            </div>

            <!-- Tooltip -->
            {#if hoveredService === key}
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60] pointer-events-none">
                <div class="bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 text-sm min-w-[200px]">
                  <div class="font-semibold text-white">{config.label}</div>
                  <div class="text-gray-400 text-xs">{config.description}</div>
                  <div class="border-t border-gray-700 pt-2 mt-2 space-y-1">
                    <div class="flex justify-between text-xs">
                      <span class="text-gray-500">Binding:</span>
                      <span class="text-gray-300 font-mono">{config.binding}</span>
                    </div>
                    {#each Object.entries(config.details) as [detailKey, value]}
                      <div class="flex justify-between text-xs">
                        <span class="text-gray-500">{detailKey}:</span>
                        <span class="text-gray-300 font-mono">{value}</span>
                      </div>
                    {/each}
                    {#if health?.services[key as ServiceName]}
                      <div class="flex justify-between text-xs">
                        <span class="text-gray-500">Latency:</span>
                        <span class="text-gray-300">{health.services[key as ServiceName].latency}ms</span>
                      </div>
                      {#if health.services[key as ServiceName].error}
                        <div class="text-xs text-red-400 mt-1">
                          Error: {health.services[key as ServiceName].error}
                        </div>
                      {/if}
                    {/if}
                  </div>
                </div>
                <div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                  <div class="border-8 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            {/if}
          </div>
        {/each}

        {#if health}
          <div class="text-xs text-gray-500 text-center pt-2 border-t border-gray-800">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
