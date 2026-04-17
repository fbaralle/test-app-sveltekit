<script lang="ts">
  import { base } from '$app/paths'
  import { onMount } from 'svelte'

  interface Props {
    compact?: boolean
  }

  let { compact = false }: Props = $props()

  interface Export {
    key: string
    size: number
    uploaded: string
  }

  let exports = $state<Export[]>([])
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let isCreating = $state(false)

  async function fetchExports() {
    isLoading = true
    error = null

    try {
      const res = await fetch(`${base}/api/export`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json()
      exports = data.exports || []
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load exports'
    } finally {
      isLoading = false
    }
  }

  async function createExport() {
    isCreating = true
    error = null

    try {
      const res = await fetch(`${base}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sample',
          timestamp: new Date().toISOString(),
          data: {
            message: 'Sample export data',
            random: Math.random().toString(36).slice(2),
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to create: ${res.status}`)
      }

      // Refresh exports list
      await fetchExports()
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create export'
    } finally {
      isCreating = false
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getExportName(key: string): string {
    return key.replace('exports/', '')
  }

  onMount(() => {
    fetchExports()
  })
</script>

<div class={compact ? 'p-4' : 'w-full max-w-6xl mx-auto mb-8'}>
  {#if !compact}
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        Exports (R2)
      </h2>
      <button
        onclick={createExport}
        disabled={isCreating}
        class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {isCreating ? 'Creating...' : 'Create Export'}
      </button>
    </div>
  {/if}

  {#if isLoading}
    <div class="flex items-center justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
      <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
      <button
        onclick={() => fetchExports()}
        class="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  {:else if exports.length === 0}
    <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
      <p class="text-gray-500 dark:text-gray-400 text-sm">No exports yet.</p>
      {#if compact}
        <button
          onclick={createExport}
          disabled={isCreating}
          class="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Export'}
        </button>
      {/if}
    </div>
  {:else}
    <div class={compact ? 'space-y-2' : 'space-y-3'}>
      {#each exports.slice(0, compact ? 3 : 10) as exp (exp.key)}
        <div class="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="text-gray-400 dark:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {getExportName(exp.key)}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(exp.size)} - {formatDate(exp.uploaded)}
              </p>
            </div>
          </div>
        </div>
      {/each}
      {#if compact && exports.length > 3}
        <p class="text-xs text-gray-400 dark:text-gray-500 text-center">
          +{exports.length - 3} more exports
        </p>
      {/if}
    </div>
    {#if compact}
      <button
        onclick={createExport}
        disabled={isCreating}
        class="mt-3 w-full px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {isCreating ? 'Creating...' : 'Create Export'}
      </button>
    {/if}
  {/if}
</div>
