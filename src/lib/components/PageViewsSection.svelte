<script lang="ts">
  import { base } from '$app/paths'
  import { onMount } from 'svelte'

  const basePath = base

  interface Props {
    compact?: boolean
  }

  let { compact = false }: Props = $props()

  let totalViews = $state(0)
  let uniqueVisitors = $state(0)
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  let visitorId = $state<string | null>(null)

  async function fetchPageViews() {
    isLoading = true
    error = null

    try {
      const res = await fetch(`${basePath}/api/pageviews`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to fetch: ${res.status}`)
      }
      const data = await res.json()
      totalViews = data.totalViews || 0
      uniqueVisitors = data.uniqueVisitors || 0
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load page views'
    } finally {
      isLoading = false
    }
  }

  async function recordPageView() {
    try {
      // Get or create visitor ID from localStorage
      let storedVisitorId = localStorage.getItem('visitorId')

      const res = await fetch(`${basePath}/api/pageviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: storedVisitorId }),
      })

      if (res.ok) {
        const data = await res.json()
        totalViews = data.totalViews
        visitorId = data.visitorId

        // Store visitor ID for future visits
        if (data.visitorId && !storedVisitorId) {
          localStorage.setItem('visitorId', data.visitorId)
        }

        // Refresh to get updated unique count
        await fetchPageViews()
      }
    } catch {
      // Silently fail - page view tracking is non-critical
    }
  }

  onMount(() => {
    fetchPageViews()
    recordPageView()
  })
</script>

<div class={compact ? 'p-4' : 'w-full max-w-6xl mx-auto mb-8'}>
  {#if !compact}
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
      Page Views
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
        onclick={() => fetchPageViews()}
        class="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  {:else}
    <div class={compact ? 'flex gap-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
        <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
          {totalViews.toLocaleString()}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Total Views
        </div>
      </div>
      <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
        <div class="text-3xl font-bold text-green-600 dark:text-green-400">
          {uniqueVisitors.toLocaleString()}
        </div>
        <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Unique Visitors
        </div>
      </div>
    </div>
    {#if visitorId && !compact}
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
        Your visitor ID: {visitorId.slice(0, 20)}...
      </p>
    {/if}
  {/if}
</div>
