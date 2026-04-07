<script lang="ts">
  import { onDestroy } from 'svelte'

  interface Coin {
    id: string
    symbol: string
    name: string
    image: string
    current_price: number
    market_cap: number
    market_cap_rank: number
    total_volume: number
    price_change_percentage_24h: number
    price_change_percentage_7d_in_currency: number
    high_24h: number
    low_24h: number
    sparkline_in_7d: { price: number[] }
  }

  type SortKey =
    | 'market_cap_rank'
    | 'current_price'
    | 'price_change_percentage_24h'
    | 'price_change_percentage_7d_in_currency'
    | 'total_volume'
  type Currency = 'usd' | 'eur' | 'gbp'

  interface ApiError {
    label: string
    code: string
    detail: string
  }

  interface Toast {
    id: number
    label: string
    code: string
    detail: string
    type: 'error' | 'info'
  }

  const CURRENCY_SYMBOLS: Record<Currency, string> = {
    usd: '$',
    eur: '€',
    gbp: '£',
  }

  function formatNumber(n: number, currency: Currency): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: n < 1 ? 6 : 2,
    }).format(n)
  }

  function formatCompact(n: number, currency: Currency): string {
    const symbol = CURRENCY_SYMBOLS[currency]
    if (n >= 1e12) return `${symbol}${(n / 1e12).toFixed(2)}T`
    if (n >= 1e9) return `${symbol}${(n / 1e9).toFixed(2)}B`
    if (n >= 1e6) return `${symbol}${(n / 1e6).toFixed(2)}M`
    return formatNumber(n, currency)
  }

  async function fetchCoins(currency: Currency): Promise<Coin[]> {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=7d`
    )

    if (!res.ok) {
      let serverMessage = ''
      try {
        const body = await res.text()
        const json = JSON.parse(body)
        serverMessage =
          json.error || json.message || json.status?.error_message || body.slice(0, 200)
      } catch {
        // body wasn't JSON
      }

      const error: ApiError =
        res.status === 429
          ? {
              label: 'Rate Limit',
              code: `HTTP ${res.status} — Too Many Requests`,
              detail:
                serverMessage ||
                'CoinGecko free tier allows ~30 req/min. Wait a moment before retrying.',
            }
          : res.status === 403
            ? {
                label: 'Access Denied',
                code: `HTTP ${res.status} — Forbidden`,
                detail:
                  serverMessage ||
                  'Request blocked by CoinGecko. Check IP restrictions or CORS.',
              }
            : res.status >= 500
              ? {
                  label: 'Server Error',
                  code: `HTTP ${res.status} — ${res.statusText}`,
                  detail:
                    serverMessage ||
                    'CoinGecko is experiencing issues. Check status.coingecko.com.',
                }
              : res.status >= 400
                ? {
                    label: 'Client Error',
                    code: `HTTP ${res.status} — ${res.statusText}`,
                    detail:
                      serverMessage ||
                      'Bad request or invalid parameters sent to CoinGecko API.',
                  }
                : {
                    label: 'Request Failed',
                    code: `HTTP ${res.status} — ${res.statusText}`,
                    detail:
                      serverMessage || 'Unexpected response from CoinGecko API.',
                  }

      throw error
    }

    return res.json()
  }

  // State using Svelte 5 runes
  let toasts = $state<Toast[]>([])
  let toastIdCounter = 0
  let coins = $state<Coin[]>([])
  let isLoading = $state(false)
  let isFetching = $state(false)
  let dataUpdatedAt = $state<number | null>(null)
  let currency = $state<Currency>('usd')
  let sortKey = $state<SortKey>('market_cap_rank')
  let sortAsc = $state(true)
  let selectedCoin = $state<string | null>(null)
  let autoRefresh = $state(false)
  let refreshInterval = $state(30)
  let countdown = $state(0)
  let countdownInterval: ReturnType<typeof setInterval> | null = null
  let refreshIntervalId: ReturnType<typeof setInterval> | null = null

  // Toast functions
  function addToast(toast: { label: string; code: string; detail: string; type?: 'error' | 'info' }) {
    const id = ++toastIdCounter
    toasts = [...toasts, { id, type: 'error', ...toast }]
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
    }, 8000)
  }

  function dismissToast(id: number) {
    toasts = toasts.filter((t) => t.id !== id)
  }

  // Fetch function
  async function loadCoins() {
    if (coins.length === 0) {
      isLoading = true
    }
    isFetching = true

    try {
      coins = await fetchCoins(currency)
      dataUpdatedAt = Date.now()
    } catch (err) {
      if (err && typeof err === 'object' && 'label' in err) {
        addToast(err as ApiError)
      } else if (err instanceof TypeError && err.message === 'Failed to fetch') {
        addToast({
          label: 'Network Error',
          code: 'ERR_NETWORK',
          detail:
            'Could not reach CoinGecko. Check your internet connection or ad blockers.',
        })
      } else {
        addToast({
          label: 'Fetch Error',
          code: err instanceof Error ? err.name : 'UNKNOWN',
          detail:
            err instanceof Error ? err.message : 'An unexpected error occurred.',
        })
      }
    } finally {
      isLoading = false
      isFetching = false
    }
  }

  // Initial load
  loadCoins()

  // Watch currency changes
  $effect(() => {
    const _ = currency // track dependency
    loadCoins()
  })

  // Auto-refresh effect
  $effect(() => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId)
      refreshIntervalId = null
    }

    if (autoRefresh) {
      refreshIntervalId = setInterval(() => {
        loadCoins()
      }, refreshInterval * 1000)
    }

    return () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId)
      }
    }
  })

  // Countdown effect
  $effect(() => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    if (!autoRefresh) {
      countdown = 0
      return
    }

    countdown = refreshInterval
    countdownInterval = setInterval(() => {
      countdown = countdown <= 1 ? refreshInterval : countdown - 1
    }, 1000)

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  })

  // Reset countdown when data is fetched
  $effect(() => {
    if (autoRefresh && dataUpdatedAt) {
      countdown = refreshInterval
    }
  })

  onDestroy(() => {
    if (countdownInterval) clearInterval(countdownInterval)
    if (refreshIntervalId) clearInterval(refreshIntervalId)
  })

  // Derived state
  let loading = $derived(isLoading || isFetching)

  let sorted = $derived(
    [...coins].sort((a, b) => {
      const aVal = a[sortKey] ?? 0
      const bVal = b[sortKey] ?? 0
      return sortAsc ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
  )

  let selectedData = $derived(coins.find((c) => c.id === selectedCoin))
  let lastUpdated = $derived(dataUpdatedAt ? new Date(dataUpdatedAt) : null)

  // Methods
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc
    } else {
      sortKey = key
      sortAsc = key === 'market_cap_rank'
    }
  }

  function getSortIcon(column: SortKey): string {
    if (sortKey !== column) return '↕'
    return sortAsc ? '↑' : '↓'
  }

  function toggleCoin(coinId: string) {
    selectedCoin = selectedCoin === coinId ? null : coinId
  }

  // Sparkline helpers
  function getSparklinePoints(prices: number[]): string {
    if (!prices || prices.length === 0) return ''
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const range = max - min || 1
    const width = 120
    const height = 32

    return prices
      .map((p, i) => {
        const x = (i / (prices.length - 1)) * width
        const y = height - ((p - min) / range) * height
        return `${x},${y}`
      })
      .join(' ')
  }

  function isSparklineUp(prices: number[]): boolean {
    if (!prices || prices.length === 0) return true
    return prices[prices.length - 1] >= prices[0]
  }

  // Price bar helper
  function getPriceBarPosition(low: number, high: number, current: number): number {
    const range = high - low || 1
    return Math.min(Math.max(((current - low) / range) * 100, 0), 100)
  }
</script>

<div class="w-full max-w-6xl mx-auto">
  <!-- Header controls -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
        Top 10 Cryptocurrencies
      </h2>
      {#if lastUpdated}
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      {/if}
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <!-- Currency picker -->
      <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
        {#each ['usd', 'eur', 'gbp'] as c}
          <button
            onclick={() => currency = c as Currency}
            class="px-3 py-1.5 text-sm font-medium transition-colors {currency === c
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
          >
            {CURRENCY_SYMBOLS[c as Currency]} {c.toUpperCase()}
          </button>
        {/each}
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- Auto-refresh toggle -->
      <button
        role="switch"
        aria-checked={autoRefresh}
        aria-label="Toggle auto-refresh"
        onclick={() => autoRefresh = !autoRefresh}
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors {autoRefresh ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}"
      >
        <span
          class="inline-block h-4 w-4 rounded-full bg-white transition-transform {autoRefresh ? 'translate-x-6' : 'translate-x-1'}"
        ></span>
      </button>

      <!-- Frequency picker -->
      <div
        class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 transition-opacity {autoRefresh ? '' : 'opacity-40 pointer-events-none'}"
      >
        {#each [{ value: 30, label: '30s' }, { value: 60, label: '1m' }, { value: 300, label: '5m' }] as opt}
          <button
            onclick={() => refreshInterval = opt.value}
            class="px-3 py-1.5 text-sm font-medium transition-colors {refreshInterval === opt.value
              ? 'bg-indigo-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
          >
            {opt.label}
          </button>
        {/each}
      </div>

      <!-- Countdown -->
      {#if autoRefresh && countdown > 0}
        <div class="flex items-center gap-1.5">
          <svg class="h-4 w-4 -rotate-90" viewBox="0 0 20 20">
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray={2 * Math.PI * 8}
              stroke-dashoffset={2 * Math.PI * 8 * (1 - countdown / refreshInterval)}
              stroke-linecap="round"
              class="text-indigo-600 transition-all duration-1000 ease-linear"
            />
          </svg>
          <span class="text-sm tabular-nums text-gray-500 dark:text-gray-400">
            {countdown}s
          </span>
        </div>
      {/if}

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- Refresh button -->
      <button
        onclick={() => loadCoins()}
        disabled={loading}
        class="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Loading…' : 'Refresh'}
      </button>
    </div>
  </div>

  <!-- Table -->
  <div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-left">
            <th
              class="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white whitespace-nowrap"
              onclick={() => handleSort('market_cap_rank')}
            >
              # Rank <span class="ml-1 {sortKey === 'market_cap_rank' ? '' : 'text-gray-400'}">{getSortIcon('market_cap_rank')}</span>
            </th>
            <th class="px-4 py-3 font-medium">Coin</th>
            <th
              class="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white text-right whitespace-nowrap"
              onclick={() => handleSort('current_price')}
            >
              Price <span class="ml-1 {sortKey === 'current_price' ? '' : 'text-gray-400'}">{getSortIcon('current_price')}</span>
            </th>
            <th
              class="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white text-right whitespace-nowrap"
              onclick={() => handleSort('price_change_percentage_24h')}
            >
              24h % <span class="ml-1 {sortKey === 'price_change_percentage_24h' ? '' : 'text-gray-400'}">{getSortIcon('price_change_percentage_24h')}</span>
            </th>
            <th
              class="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white text-right whitespace-nowrap"
              onclick={() => handleSort('price_change_percentage_7d_in_currency')}
            >
              7d % <span class="ml-1 {sortKey === 'price_change_percentage_7d_in_currency' ? '' : 'text-gray-400'}">{getSortIcon('price_change_percentage_7d_in_currency')}</span>
            </th>
            <th
              class="px-4 py-3 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white text-right whitespace-nowrap"
              onclick={() => handleSort('total_volume')}
            >
              Volume <span class="ml-1 {sortKey === 'total_volume' ? '' : 'text-gray-400'}">{getSortIcon('total_volume')}</span>
            </th>
            <th class="px-4 py-3 font-medium text-center whitespace-nowrap">24h Range</th>
            <th class="px-4 py-3 font-medium text-center whitespace-nowrap">7d Chart</th>
          </tr>
        </thead>
        <tbody>
          {#if isLoading && coins.length === 0}
            {#each Array(10) as _, i}
              <tr class="border-t border-gray-100 dark:border-gray-800 animate-pulse">
                <td class="px-4 py-4" colspan="8">
                  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </td>
              </tr>
            {/each}
          {:else}
            {#each sorted as coin (coin.id)}
              <tr
                onclick={() => toggleCoin(coin.id)}
                class="border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors {selectedCoin === coin.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}"
              >
                <td class="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono">
                  {coin.market_cap_rank}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <img
                      src={coin.image}
                      alt={coin.name}
                      width="24"
                      height="24"
                      class="rounded-full"
                    />
                    <span class="font-medium text-gray-900 dark:text-white">
                      {coin.name}
                    </span>
                    <span class="text-gray-400 uppercase text-xs">
                      {coin.symbol}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">
                  {formatNumber(coin.current_price, currency)}
                </td>
                <td
                  class="px-4 py-3 text-right font-mono {coin.price_change_percentage_24h >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'}"
                >
                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h?.toFixed(2) ?? '—'}%
                </td>
                <td
                  class="px-4 py-3 text-right font-mono {(coin.price_change_percentage_7d_in_currency ?? 0) >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'}"
                >
                  {(coin.price_change_percentage_7d_in_currency ?? 0) >= 0 ? '+' : ''}{coin.price_change_percentage_7d_in_currency?.toFixed(2) ?? '—'}%
                </td>
                <td class="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">
                  {formatCompact(coin.total_volume, currency)}
                </td>
                <td class="px-4 py-3">
                  <div class="w-28 mx-auto">
                    <div class="w-full">
                      <div class="flex justify-between text-xs text-gray-400 mb-1">
                        <span>L</span>
                        <span>H</span>
                      </div>
                      <div class="relative h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          class="absolute h-1.5 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                          style="width: 100%"
                        ></div>
                        <div
                          class="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-gray-800 dark:border-white"
                          style="left: {getPriceBarPosition(coin.low_24h, coin.high_24h, coin.current_price)}%; transform: translate(-50%, -50%)"
                        ></div>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  {#if coin.sparkline_in_7d?.price?.length}
                    <svg width="120" height="32" class="inline-block">
                      <polyline
                        points={getSparklinePoints(coin.sparkline_in_7d.price)}
                        fill="none"
                        stroke={isSparklineUp(coin.sparkline_in_7d.price) ? '#22c55e' : '#ef4444'}
                        stroke-width="1.5"
                      />
                    </svg>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Detail panel -->
  {#if selectedData}
    <div class="mt-4 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm animate-in">
      <div class="flex items-center gap-3 mb-4">
        <img
          src={selectedData.image}
          alt={selectedData.name}
          width="40"
          height="40"
          class="rounded-full"
        />
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">
            {selectedData.name}
            <span class="ml-2 text-sm font-normal text-gray-400 uppercase">
              {selectedData.symbol}
            </span>
          </h3>
          <p class="text-sm text-gray-500">
            Rank #{selectedData.market_cap_rank}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Price</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {formatNumber(selectedData.current_price, currency)}
          </p>
        </div>
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Market Cap</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCompact(selectedData.market_cap, currency)}
          </p>
        </div>
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">24h Volume</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCompact(selectedData.total_volume, currency)}
          </p>
        </div>
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">24h High / Low</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white">
            {formatNumber(selectedData.high_24h, currency)} / {formatNumber(selectedData.low_24h, currency)}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <p class="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
    Data from CoinGecko free API. Prices may be delayed.
  </p>

  <!-- Toast container -->
  <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-3 w-96">
    {#each toasts as toast (toast.id)}
      <div
        class="rounded-lg shadow-lg border animate-slide-in overflow-hidden {toast.type === 'error'
          ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
          : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'}"
      >
        <div class="flex items-center justify-between px-4 pt-3 pb-1">
          <span
            class="text-xs font-bold uppercase tracking-wide {toast.type === 'error'
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-400'}"
          >
            {toast.label}
          </span>
          <button
            onclick={() => dismissToast(toast.id)}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div class="px-4 pb-3">
          <p
            class="text-xs font-mono mb-1 {toast.type === 'error'
              ? 'text-red-500 dark:text-red-300'
              : 'text-blue-500 dark:text-blue-300'}"
          >
            {toast.code}
          </p>
          <p
            class="text-sm {toast.type === 'error'
              ? 'text-red-800 dark:text-red-200'
              : 'text-blue-800 dark:text-blue-200'}"
          >
            {toast.detail}
          </p>
        </div>
      </div>
    {/each}
  </div>
</div>
