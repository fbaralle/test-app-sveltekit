<script lang="ts">
  import { base } from '$app/paths'
  import { onMount } from 'svelte'

  interface Props {
    compact?: boolean
  }

  let { compact = false }: Props = $props()

  interface FeatureFlags {
    [key: string]: boolean
  }

  const FLAG_LABELS: Record<string, string> = {
    dark_mode: 'Dark Mode',
    show_favorites: 'Show Favorites',
    show_exports: 'Show Exports',
    show_page_views: 'Show Page Views',
    experimental_features: 'Experimental Features',
  }

  let flags = $state<FeatureFlags>({})
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let updating = $state<string | null>(null)

  async function fetchFlags() {
    isLoading = true
    error = null

    try {
      const res = await fetch(`${base}/api/flags`)
      const data = await res.json()

      if (data.error && res.status >= 500) {
        error = data.error
      }

      flags = data.flags || {}
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load flags'
    } finally {
      isLoading = false
    }
  }

  async function toggleFlag(flag: string) {
    updating = flag
    const newValue = !flags[flag]

    try {
      const res = await fetch(`${base}/api/flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag, value: newValue }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to update flag: ${res.status}`)
      }

      flags = { ...flags, [flag]: newValue }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to update flag'
    } finally {
      updating = null
    }
  }

  onMount(() => {
    fetchFlags()
  })
</script>

<div class={compact ? 'p-4' : 'w-full max-w-6xl mx-auto mb-8'}>
  {#if !compact}
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      Feature Flags
    </h2>
  {/if}

  {#if isLoading}
    <div class="flex items-center justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3">
      <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
      <button
        onclick={() => fetchFlags()}
        class="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  {:else}
    <div class={compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
      {#each Object.entries(flags) as [flag, value] (flag)}
        <div class="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {FLAG_LABELS[flag] || flag}
          </span>
          <button
            role="switch"
            aria-checked={value}
            aria-label={`Toggle ${FLAG_LABELS[flag] || flag}`}
            disabled={updating === flag}
            onclick={() => toggleFlag(flag)}
            class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 {value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}"
          >
            <span
              class="inline-block h-4 w-4 rounded-full bg-white transition-transform {value ? 'translate-x-6' : 'translate-x-1'}"
            ></span>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
