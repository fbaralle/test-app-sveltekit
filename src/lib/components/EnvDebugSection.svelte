<script lang="ts">
  import { base } from '$app/paths'
  import { onMount } from 'svelte'

  const basePath = base

  interface BackendEnvResponse {
    timestamp: string
    environment: string
    total: number
    filtered: number
    hidden: number
    envVarNames: string[]
  }

  interface Props {
    compact?: boolean
  }

  let { compact = false }: Props = $props()

  let backendEnv: BackendEnvResponse | null = $state(null)
  let loading = $state(true)
  let error: string | null = $state(null)
  let isExpanded = $state(false)

  // Frontend env vars for SvelteKit are accessed via $env/static/public
  // Since we can't dynamically enumerate them at runtime, we note this limitation
  // In SvelteKit, PUBLIC_ prefixed vars are available at build time
  const frontendEnvNames: string[] = $state(['(SvelteKit: use $env/static/public)'])

  async function fetchBackendEnv() {
    try {
      const res = await fetch(`${basePath}/api/env-debug`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      backendEnv = await res.json()
      error = null
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch'
    } finally {
      loading = false
    }
  }

  onMount(() => {
    fetchBackendEnv()
  })
</script>

{#if loading}
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 {compact ? 'p-3' : 'p-6'}">
    <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2 {compact ? 'text-sm mb-2' : 'text-lg mb-4'}">
      <span>Env Debug</span>
    </h3>
    <div class="animate-pulse flex gap-3">
      <div class="bg-gray-200 dark:bg-gray-700 rounded {compact ? 'h-10 flex-1' : 'h-16 flex-1'}"></div>
      <div class="bg-gray-200 dark:bg-gray-700 rounded {compact ? 'h-10 flex-1' : 'h-16 flex-1'}"></div>
    </div>
  </div>
{:else if error}
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-800 {compact ? 'p-3' : 'p-6'}">
    <h3 class="font-bold text-gray-900 dark:text-white flex items-center gap-2 {compact ? 'text-sm mb-1' : 'text-lg mb-2'}">
      <span>Env Debug</span>
    </h3>
    <p class="text-red-600 dark:text-red-400 {compact ? 'text-xs' : 'text-sm'}">
      {error}
    </p>
  </div>
{:else if compact}
  <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
    <button
      onclick={() => isExpanded = !isExpanded}
      class="w-full text-left"
    >
      <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
        <span class="flex items-center gap-2">
          Env Debug
          <span class="text-xs font-normal text-gray-400">(Names Only)</span>
        </span>
        <svg
          class="w-4 h-4 text-gray-400 transition-transform {isExpanded ? 'rotate-180' : ''}"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </h3>
    </button>
    <div class="flex gap-2">
      <div class="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded flex-1">
        <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
          {frontendEnvNames.length}
        </p>
        <p class="text-xs text-gray-500">Frontend</p>
      </div>
      <div class="text-center p-2 bg-purple-50 dark:bg-purple-900/30 rounded flex-1">
        <p class="text-lg font-bold text-purple-600 dark:text-purple-400">
          {backendEnv?.filtered || 0}
        </p>
        <p class="text-xs text-gray-500">Backend</p>
      </div>
    </div>
    {#if isExpanded}
      <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <div>
          <h4 class="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Frontend ({frontendEnvNames.length})</h4>
          <div class="flex flex-wrap gap-1">
            {#each frontendEnvNames as name}
              <span class="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-mono">
                {name}
              </span>
            {/each}
            {#if frontendEnvNames.length === 0}
              <span class="text-xs text-gray-400 italic">None available</span>
            {/if}
          </div>
        </div>
        <div>
          <h4 class="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
            Backend ({backendEnv?.filtered || 0})
            {#if backendEnv && backendEnv.hidden > 0}
              <span class="text-gray-400 font-normal"> - {backendEnv.hidden} hidden</span>
            {/if}
          </h4>
          <div class="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {#each backendEnv?.envVarNames || [] as name}
              <span class="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded font-mono">
                {name}
              </span>
            {/each}
            {#if !backendEnv || backendEnv.envVarNames.length === 0}
              <span class="text-xs text-gray-400 italic">None available</span>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
      <span>Environment Variables Debug</span>
      <span class="text-xs font-normal text-gray-400">(Names Only)</span>
    </h3>
    <div class="flex gap-6 mb-6">
      <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex-1">
        <p class="text-3xl font-bold text-blue-600 dark:text-blue-400">
          {frontendEnvNames.length}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Frontend Vars</p>
      </div>
      <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex-1">
        <p class="text-3xl font-bold text-purple-600 dark:text-purple-400">
          {backendEnv?.filtered || 0}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Backend Vars</p>
      </div>
    </div>
    <div class="space-y-4">
      <div>
        <h4 class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">Frontend Environment</h4>
        <div class="flex flex-wrap gap-2">
          {#each frontendEnvNames as name}
            <span class="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-mono">
              {name}
            </span>
          {/each}
          {#if frontendEnvNames.length === 0}
            <span class="text-sm text-gray-400 italic">No frontend env vars available</span>
          {/if}
        </div>
      </div>
      <div>
        <h4 class="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2">
          Backend Environment
          {#if backendEnv && backendEnv.hidden > 0}
            <span class="text-gray-400 font-normal ml-2">({backendEnv.hidden} sensitive vars hidden)</span>
          {/if}
        </h4>
        <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
          {#each backendEnv?.envVarNames || [] as name}
            <span class="text-sm px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded font-mono">
              {name}
            </span>
          {/each}
          {#if !backendEnv || backendEnv.envVarNames.length === 0}
            <span class="text-sm text-gray-400 italic">No backend env vars available</span>
          {/if}
        </div>
      </div>
    </div>
    <p class="text-xs text-gray-400 dark:text-gray-500 mt-4">
      Shows env var names only (not values) for debugging. Sensitive vars (containing SECRET, KEY, TOKEN, etc.) are hidden.
    </p>
  </div>
{/if}
