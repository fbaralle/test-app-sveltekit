<script lang="ts">
  import CryptoDashboard from '$lib/components/CryptoDashboard.svelte'
  import FavoritesSection from '$lib/components/FavoritesSection.svelte'
  import PageViewsSection from '$lib/components/PageViewsSection.svelte'
  import FeatureFlagsSection from '$lib/components/FeatureFlagsSection.svelte'
  import ExportsSection from '$lib/components/ExportsSection.svelte'
  import EnvDebugSection from '$lib/components/EnvDebugSection.svelte'

  let favoritesSection: FavoritesSection | undefined = $state()

  function handleFavoriteChange() {
    favoritesSection?.refresh()
  }
</script>

<svelte:head>
  <title>Webflow Cloud Test App</title>
  <meta name="description" content="Test SvelteKit application for validating Webflow Cloud hosting, builds, and deployments." />
</svelte:head>

<div class="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
  <header class="pt-10 pb-6 text-center">
    <p class="text-xs font-medium uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
      Webflow Cloud Test App
    </p>
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white">
      Crypto Dashboard
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-300">
      Live market data from CoinGecko
    </p>
  </header>
  <main class="flex-1 px-4 pb-12">
    <!-- Favorites above content -->
    <FavoritesSection bind:this={favoritesSection} />

    <!-- Main content -->
    <CryptoDashboard onFavoriteChange={handleFavoriteChange} />

    <!-- Page Views, Feature Flags, and Exports below in compact mode -->
    <div class="w-full max-w-6xl mx-auto mt-8">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Cloudflare Bindings Demo
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Page Views (KV: SESSIONS) -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Page Views <span class="text-xs font-normal text-gray-400">(KV: SESSIONS)</span>
            </h3>
          </div>
          <PageViewsSection compact />
        </div>

        <!-- Feature Flags (KV: FLAGS) -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Feature Flags <span class="text-xs font-normal text-gray-400">(KV: FLAGS)</span>
            </h3>
          </div>
          <FeatureFlagsSection compact />
        </div>

        <!-- Exports (R2: MEDIA) -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Exports <span class="text-xs font-normal text-gray-400">(R2: MEDIA)</span>
            </h3>
          </div>
          <ExportsSection compact />
        </div>

        <!-- Env Debug -->
        <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Env Debug <span class="text-xs font-normal text-gray-400">(Names Only)</span>
            </h3>
          </div>
          <EnvDebugSection compact />
        </div>
      </div>
    </div>
  </main>
  <footer class="border-t border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/60 backdrop-blur">
    <div class="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
      <p>Webflow Cloud Test App — for internal testing purposes only</p>
      <p>SvelteKit + Svelte 5 + Tailwind CSS</p>
    </div>
  </footer>
</div>
