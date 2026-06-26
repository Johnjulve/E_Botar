/**
 * useTableSort
 * --------------------------------------------------------------------------
 * Three-state column sort for table-shaped data:
 *
 *   none → asc → desc → none → ...
 *
 * The third click on the same column header clears the sort, returning the
 * caller's original row order. This is intentional: it lets the user revert
 * to API/filter order without reloading.
 *
 * Usage
 * -----
 *
 *   const getSortValue = (row, key) => {
 *     switch (key) {
 *       case 'name':  return (row.name || '').toLowerCase();
 *       case 'year':  return Number(row.year) || 0;
 *       case 'date':  return new Date(row.date).getTime();
 *       default:      return '';
 *     }
 *   };
 *
 *   const { sortedRows, sortConfig, handleSort } =
 *     useTableSort(filteredRows, getSortValue);
 *
 *   // Render <SortableHeader sortKey="name" sortConfig={sortConfig}
 *   //   onSort={handleSort} label="Name" />
 *
 * Notes
 * -----
 * - The hook never mutates the input array (uses ``[...rows].sort(...)``).
 * - When ``sortConfig.key`` is ``null`` or ``sortConfig.direction`` is
 *   ``null``, ``sortedRows === rows`` (same reference) so React skips the
 *   downstream memoization invalidation cost.
 * - ``getSortValue`` is intentionally caller-supplied so each table can map
 *   its column keys to comparable primitives (lowercased strings, numbers,
 *   epoch ms, role-priority weights, etc.) without the hook needing to
 *   know any domain shape.
 */

import { useCallback, useMemo, useState } from 'react';

const cycleDirection = (currentKey, currentDirection, nextKey) => {
  if (currentKey !== nextKey) return 'asc';
  if (currentDirection === 'asc') return 'desc';
  return null;
};

export const useTableSort = (rows, getSortValue, options = {}) => {
  const { initial = { key: null, direction: null } } = options;
  const [sortConfig, setSortConfig] = useState(initial);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return rows;
    if (typeof getSortValue !== 'function') return rows;

    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getSortValue(a, sortConfig.key);
      const vb = getSortValue(b, sortConfig.key);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [rows, getSortValue, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      const direction = cycleDirection(prev.key, prev.direction, key);
      return direction === null ? { key: null, direction: null } : { key, direction };
    });
  }, []);

  return { sortedRows, sortConfig, handleSort };
};

export default useTableSort;
