/**
 * SearchBar
 * --------------------------------------------------------------------------
 * Standardized search input + optional Advanced filters toggle + slot for
 * trailing actions (Export, Refresh, etc.). Replaces the three near-identical
 * inline `display: flex; gap: 0.75rem; flex-wrap: wrap;` wrappers that grew
 * up across the admin pages.
 *
 * Usage
 * -----
 *
 *   <SearchBar
 *     value={searchQuery}
 *     onChange={setSearchQuery}
 *     placeholder="Search by name, email, or student ID..."
 *     onAdvancedToggle={() => setShowFilters(p => !p)}
 *     advancedOpen={showFilters}
 *   >
 *     <button className="admin-btn secondary" onClick={handleExport}>
 *       Export CSV
 *     </button>
 *   </SearchBar>
 *
 *   {showFilters && <YourAdvancedPanel />}
 *
 * Props
 * -----
 * - ``value`` / ``onChange``        — controlled input.
 * - ``placeholder``                 — input placeholder text.
 * - ``label``                       — optional inline label rendered above
 *                                     the input. Some pages (e.g. VotingStatus)
 *                                     prefix the input with a "Search" label.
 * - ``onAdvancedToggle``            — optional click handler. When present a
 *                                     pill-shaped "Advanced Search" button is
 *                                     rendered beside the input.
 * - ``advancedOpen``                — optional, drives the active styling /
 *                                     ``aria-expanded`` of the advanced btn.
 * - ``advancedLabel``               — override the default "Advanced Search".
 * - ``alignActions``                — ``'flex-end'`` (default) or ``'center'``
 *                                     — controls ``align-items`` of the row.
 * - ``children``                    — rendered to the right of the
 *                                     advanced-search button (Export, etc.).
 */

import React from 'react';
import './SearchBar.css';

const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  label,
  onAdvancedToggle,
  advancedOpen = false,
  advancedLabel = 'Advanced Search',
  alignActions = 'flex-end',
  className = '',
  inputClassName = '',
  children,
}) => {
  const containerClass = `ebotar-search-bar${className ? ` ${className}` : ''}`;
  const rowStyle = { alignItems: alignActions };

  const handleInputChange = (event) => {
    if (typeof onChange !== 'function') return;
    // Tolerate both signatures: receiver expecting a value or an event.
    onChange(event.target.value, event);
  };

  return (
    <div className={containerClass}>
      <div className="ebotar-search-bar__row" style={rowStyle}>
        <div className="ebotar-search-bar__input-wrap">
          {label && <label className="ebotar-search-bar__label">{label}</label>}
          <input
            type="text"
            placeholder={placeholder}
            value={value ?? ''}
            onChange={handleInputChange}
            className={`ebotar-search-bar__input${inputClassName ? ` ${inputClassName}` : ''}`}
          />
        </div>

        {typeof onAdvancedToggle === 'function' && (
          <button
            type="button"
            className={`admin-btn secondary${advancedOpen ? ' is-active' : ''}`}
            onClick={onAdvancedToggle}
            aria-expanded={advancedOpen}
          >
            {advancedLabel}
          </button>
        )}

        {children}
      </div>
    </div>
  );
};

export default SearchBar;
