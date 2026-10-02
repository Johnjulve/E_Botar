import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Headless Paginator Hook with Bounded Sliding Window Cache.
 *
 * Implements Architectural Refactoring Pattern 3:
 * - Decouples pagination state & cache retention from UI presentation.
 * - Caches recent pages in a bounded Map with FIFO eviction when exceeding windowSize.
 * - Instant page switching for cached pages (zero latency, zero network calls).
 * - Automatic cache invalidation and page reset when dependencies change.
 * - Flat O(1) client memory footprint.
 *
 * @param {Object} options
 * @param {Function} options.fetchFn Async function (page, pageSize) => Promise<{ results, count, totalPages? }>
 * @param {Array} options.dependencies Array of dependency values that trigger cache reset & page reset
 * @param {number} [options.initialPage=1] Starting page
 * @param {number} [options.initialPageSize=20] Default items per page
 * @param {number} [options.windowSize=4] Max pages held in memory simultaneously
 */
export function useSlidingWindowPagination({
  fetchFn,
  dependencies = [],
  initialPage = 1,
  initialPageSize = 20,
  windowSize = 4,
}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  const [error, setError] = useState(null);

  // Map<number, { items: Array, count: number, totalPages: number }>
  const cacheRef = useRef(new Map());
  const activeFetchIdRef = useRef(0);

  // Load a specific page
  const loadPage = useCallback(
    async (targetPage, currentSize, force = false) => {
      if (targetPage < 1) return;

      const cache = cacheRef.current;

      // 1. Return from sliding window cache if available
      if (!force && cache.has(targetPage)) {
        const cached = cache.get(targetPage);
        setItems(cached.items);
        setTotalCount(cached.count);
        setTotalPages(cached.totalPages);
        setPage(targetPage);
        setStatus('SUCCESS');
        return;
      }

      // 2. Fetch from server
      const fetchId = ++activeFetchIdRef.current;
      setStatus('LOADING');
      setError(null);

      try {
        const data = await fetchFn(targetPage, currentSize);

        // Discard stale responses if another fetch was triggered
        if (fetchId !== activeFetchIdRef.current) return;

        const results = Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        const count = Number(data?.count ?? results.length) || 0;
        const computedTotalPages = Math.max(
          1,
          data?.totalPages || Math.ceil(count / currentSize) || 1
        );

        // Store in sliding window cache
        cache.set(targetPage, {
          items: results,
          count,
          totalPages: computedTotalPages,
        });

        // Sliding Window eviction: maintain flat O(1) memory
        if (cache.size > windowSize) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey !== undefined) {
            cache.delete(oldestKey);
          }
        }

        setItems(results);
        setTotalCount(count);
        setTotalPages(computedTotalPages);
        setPage(targetPage);
        setStatus('SUCCESS');
      } catch (err) {
        if (fetchId !== activeFetchIdRef.current) return;
        setStatus('ERROR');
        setError(err);
      }
    },
    [fetchFn, windowSize]
  );

  // Reset cache and reload on dependency change
  useEffect(() => {
    cacheRef.current.clear();
    setPage(1);
    loadPage(1, pageSize, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  // Navigation handlers
  const goToPage = useCallback(
    (targetPage) => {
      const clamped = Math.max(1, Math.min(targetPage, totalPages));
      loadPage(clamped, pageSize);
    },
    [loadPage, pageSize, totalPages]
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) goToPage(page + 1);
  }, [page, totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (page > 1) goToPage(page - 1);
  }, [page, goToPage]);

  const setPageSize = useCallback(
    (newSize) => {
      cacheRef.current.clear();
      setPageSizeState(newSize);
      setPage(1);
      loadPage(1, newSize, true);
    },
    [loadPage]
  );

  const refresh = useCallback(() => {
    cacheRef.current.clear();
    loadPage(page, pageSize, true);
  }, [loadPage, page, pageSize]);

  // Generate numbered page buttons (up to 5 pages)
  const pagesList = useMemo(() => {
    const list = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      list.push(i);
    }
    return list;
  }, [totalPages]);

  return {
    items,
    page,
    pageSize,
    totalPages,
    totalCount,
    status,
    isLoading: status === 'LOADING',
    isSuccess: status === 'SUCCESS',
    isError: status === 'ERROR',
    error,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    refresh,
    pagesList,
  };
}

export default useSlidingWindowPagination;
