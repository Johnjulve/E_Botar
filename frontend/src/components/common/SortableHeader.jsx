/**
 * SortableHeader
 * --------------------------------------------------------------------------
 * Drop-in `<th>` for click-to-sort table headers. Pairs with the
 * ``useTableSort`` hook (one click cycles none → asc → desc → none).
 *
 * Usage
 * -----
 *
 *   <SortableHeader
 *     label="Name"
 *     sortKey="name"
 *     sortConfig={sortConfig}   // from useTableSort
 *     onSort={handleSort}       // from useTableSort
 *     align="center"            // optional: 'left' (default) | 'center' | 'right'
 *   />
 *
 * Accessibility
 * -------------
 * The rendered <th> sets ``aria-sort`` to ``"ascending"`` /
 * ``"descending"`` / ``"none"`` for screen readers, and the inner
 * <button> has an ``aria-label`` describing the action ("Sort by Name").
 */

import React from 'react';
import './SortableHeader.css';

const ChevronStack = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="8 9 12 5 16 9" />
    <polyline points="8 15 12 19 16 15" />
  </svg>
);

const ChevronUp = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 15 12 9 18 15" />
  </svg>
);

const ChevronDown = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ALIGN_CLASS = {
  center: 'text-center',
  right: 'text-right',
};

const SortableHeader = ({
  label,
  sortKey,
  sortConfig,
  onSort,
  align,
  className = '',
}) => {
  const isActive = sortConfig?.key === sortKey;
  const direction = isActive ? sortConfig?.direction : null;

  const ariaSort = isActive
    ? direction === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';

  const Indicator = direction === 'asc'
    ? ChevronUp
    : direction === 'desc'
      ? ChevronDown
      : ChevronStack;

  const thClass = [ALIGN_CLASS[align], className].filter(Boolean).join(' ');

  return (
    <th aria-sort={ariaSort} className={thClass || undefined}>
      <button
        type="button"
        onClick={() => onSort?.(sortKey)}
        className={`ebotar-sortable-header${isActive ? ' is-active' : ''}`}
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        <span className="ebotar-sortable-header__icon">
          <Indicator />
        </span>
      </button>
    </th>
  );
};

export { SortableHeader };
export default SortableHeader;

