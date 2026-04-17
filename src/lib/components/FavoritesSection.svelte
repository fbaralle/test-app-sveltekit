<script lang="ts">
  import { base } from '$app/paths'
  import { onMount } from 'svelte'

  const basePath = base

  interface Favorite {
    id: number
    user_id: string
    coin_id: string
    coin_name: string | null
    coin_symbol: string | null
    coin_image: string | null
    created_at: number
  }

  // Svelte 5 runes for state management
  let favorites = $state<Favorite[]>([])
  let isLoading = $state(false)
  let error = $state<string | null>(null)

  async function fetchFavorites() {
    isLoading = true
    error = null

    try {
      const res = await fetch(`${basePath}/api/favorites?user_id=public`)
      if (!res.ok) {
        throw new Error(`Failed to fetch favorites: ${res.status}`)
      }
      const data = await res.json()
      favorites = data.favorites || []
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load favorites'
    } finally {
      isLoading = false
    }
  }

  async function removeFavorite(coinId: string) {
    try {
      const res = await fetch(`${basePath}/api/favorites?user_id=public&coin_id=${coinId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        throw new Error(`Failed to remove favorite: ${res.status}`)
      }
      // Remove from local state
      favorites = favorites.filter(f => f.coin_id !== coinId)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to remove favorite'
    }
  }

  // Expose refresh function for external components
  export function refresh() {
    fetchFavorites()
  }

  onMount(() => {
    fetchFavorites()
  })
</script>

<div class="w-full max-w-6xl mx-auto mb-8">
  <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
    Favorite Coins
  </h2>

  {#if isLoading}
    <div class="flex items-center justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  {:else if error}
    <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
      <p class="text-red-600 dark:text-red-400 text-sm">{error}</p>
      <button
        onclick={() => fetchFavorites()}
        class="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
      >
        Try again
      </button>
    </div>
  {:else if favorites.length === 0}
    <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center">
      <p class="text-gray-500 dark:text-gray-400">No favorite coins yet. Click the star icon to add favorites.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {#each favorites as favorite (favorite.id)}
        <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            {#if favorite.coin_image}
              <img
                src={favorite.coin_image}
                alt={favorite.coin_name || favorite.coin_id}
                width="32"
                height="32"
                class="rounded-full"
              />
            {:else}
              <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span class="text-xs text-gray-500 dark:text-gray-400">?</span>
              </div>
            {/if}
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {favorite.coin_name || favorite.coin_id}
              </p>
              {#if favorite.coin_symbol}
                <p class="text-xs text-gray-400 uppercase">{favorite.coin_symbol}</p>
              {/if}
            </div>
          </div>
          <button
            onclick={() => removeFavorite(favorite.coin_id)}
            class="p-2 rounded-full text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Remove from favorites"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
