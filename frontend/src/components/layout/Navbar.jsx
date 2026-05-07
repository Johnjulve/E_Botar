/**
 * Navbar Component
 * Main navigation bar with E-Botar branding
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import { electionService } from '../../services';
import { DEFAULT_FEATURE_FLAGS } from '../../services/systemService';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../hooks/useBranding';
import { APP_VERSION } from '../../constants';
import logoImg from '../../assets/images/logo.png';

// SVG Icon Component
const Icon = ({ name, size = 20, className = '' }) => {
  const icons = {
    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    user: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6m5.2-14.8l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m14.8 5.2l-4.2-4.2m-2-2l-4.2-4.2"/>
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    login: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
        <polyline points="10 17 15 12 10 7"/>
        <line x1="15" y1="12" x2="3" y2="12"/>
      </svg>
    ),
    userPlus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="8.5" cy="7" r="4"/>
        <line x1="20" y1="8" x2="20" y2="14"/>
        <line x1="23" y1="11" x2="17" y2="11"/>
      </svg>
    ),
    chevronDown: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    ),
    vote: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    building: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21h18"/>
        <path d="M5 21V7l8-4v18"/>
        <path d="M19 21V11l-6-4"/>
        <line x1="9" y1="9" x2="9" y2="9"/>
        <line x1="9" y1="12" x2="9" y2="12"/>
        <line x1="9" y1="15" x2="9" y2="15"/>
        <line x1="9" y1="18" x2="9" y2="18"/>
      </svg>
    ),
    briefcase: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
    activity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    download: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    ),
  };

  return icons[name] || null;
};

function suppressedByFeatureFlags(navItem, featureFlagsResolved) {
  const keyGate = navItem.featureDisableKey;
  if (keyGate != null && featureFlagsResolved[keyGate] === false) {
    return true;
  }
  const anyGate = navItem.featureDisableAny;
  if (
    Array.isArray(anyGate) &&
    anyGate.length > 0 &&
    anyGate.every((candidateKey) => featureFlagsResolved[candidateKey] === false)
  ) {
    return true;
  }
  return false;
}

function applySidebarFeaturePresentation(navItem, featureFlagsResolved, { isStaffOrAdminSubset, isSuperuser }) {
  if (!navItem) {
    return null;
  }
  const suppressed = suppressedByFeatureFlags(navItem, featureFlagsResolved);

  if (!suppressed) {
    return navItem;
  }

  if (isSuperuser) {
    return navItem;
  }

  const staffShowsMuted =
    isStaffOrAdminSubset &&
    featureFlagsResolved.staff_preview_disabled_features !== false;

  if (staffShowsMuted) {
    return { ...navItem, disabled: true };
  }

  return null;
}

function mapNavChildren(navItems, featureFlagsResolved, sidebarViewer) {
  return navItems
    .map((child) =>
      applySidebarFeaturePresentation(child, featureFlagsResolved, sidebarViewer))
    .filter(Boolean);
}

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isStaffOrAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [canApplyAsCandidate, setCanApplyAsCandidate] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const branding = useBranding();
  const sidebarFeatureFlags = branding.feature_flags;
  const brandingLoading = branding.loading;

  const resolvedSidebarFlags = useMemo(
    () =>
      brandingLoading
        ? DEFAULT_FEATURE_FLAGS
        : { ...DEFAULT_FEATURE_FLAGS, ...(sidebarFeatureFlags || {}) },
    [brandingLoading, sidebarFeatureFlags],
  );

  // Initialize sidebar state on mount
  useEffect(() => {
    const appShell = document.querySelector('.app-shell');
    if (appShell) {
      appShell.setAttribute('data-sidebar-collapsed', 'false');
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
    setShowMenu(false);
  }, [logout, navigate]);

  // Determine if candidate applications are open (based on upcoming elections)
  useEffect(() => {
    let isAlive = true;
    async function checkUpcoming() {
      try {
        if (!isAuthenticated) {
          if (isAlive) setCanApplyAsCandidate(false);
          return;
        }
        const res = await electionService.getUpcoming();
        const list = Array.isArray(res?.data) ? res.data : [];
        if (isAlive) setCanApplyAsCandidate(list.length > 0);
      } catch {
        // On error, allow applying to avoid blocking users erroneously
        if (isAlive) setCanApplyAsCandidate(true);
      }
    }
    checkUpcoming();
    return () => {
      isAlive = false;
    };
  }, [isAuthenticated]);

  const menuSections = useMemo(() => {
    const sections = [];

    // Show admin menu for staff and admins
    const sidebarAudience = {
      isSuperuser: Boolean(isAdmin),
      isStaffOrAdminSubset: Boolean(isStaffOrAdmin),
    };

    if (isStaffOrAdmin) {
      let adminMenuItems = [
        { key: 'admin-dashboard', label: 'Dashboard', to: '/admin', icon: 'home' },
        { key: 'admin-elections', label: 'Elections', to: '/admin/elections', icon: 'calendar' },
        { key: 'admin-applications', label: 'Applications', to: '/admin/applications', icon: 'users' },
        { key: 'admin-voting-status', label: 'Voting Status', to: '/admin/voting-status', icon: 'vote' },
        { key: 'admin-receipt-audit', label: 'Receipt Audit', to: '/admin/receipt-audit', icon: 'activity' },
        {
          key: 'admin-data-export',
          label: 'Data Export',
          to: '/admin/data-export',
          icon: 'download',
          featureDisableKey: 'data_export',
        },
        { key: 'admin-users', label: 'Users', to: '/admin/users', icon: 'users' },
      ];

      // Admin-only registry items (superuser only)
      if (isAdmin) {
        adminMenuItems.push(
          { key: 'admin-programs', label: 'Programs', to: '/admin/programs', icon: 'building' }
        );
      }

      adminMenuItems = mapNavChildren(adminMenuItems, resolvedSidebarFlags, sidebarAudience);

      sections.push({
        key: 'admin',
        label: isAdmin ? 'Admin' : 'Staff',
        icon: 'settings',
        collapsible: true,
        children: adminMenuItems,
      });

      // Superuser-only: operations / monitoring
      if (isAdmin) {
        let maintenanceLinks = [
          {
            key: 'admin-maint-features',
            label: 'Feature availability',
            to: '/admin/maintenance/features',
            icon: 'settings',
          },
          { key: 'admin-logs', label: 'System Logs', to: '/admin/logs', icon: 'activity' },
        ];
        maintenanceLinks = mapNavChildren(maintenanceLinks, resolvedSidebarFlags, sidebarAudience);
        sections.push({
          key: 'maintenance',
          label: 'Maintenance',
          icon: 'briefcase',
          collapsible: true,
          children: maintenanceLinks,
        });
      }
    }

    sections.push(
      {
        key: 'home',
        label: 'Home',
        to: '/',
        icon: 'home',
      },
      {
        key: 'election',
        label: 'Election',
        icon: 'calendar',
        collapsible: true,
        children: [
          { key: 'elections-all', label: 'All Elections', to: '/elections' },
          ...(isAuthenticated
            ? [
                {
                  key: 'my-votes',
                  label: 'My Voting History',
                  to: '/my-votes',
                },
                {
                  key: 'verify-receipt',
                  label: 'Verify Receipt',
                  to: '/verify-receipt',
                },
              ]
            : []),
        ],
      },
      {
        key: 'candidate',
        label: 'Candidate',
        icon: 'users',
        collapsible: true,
        children: [
          { key: 'candidate-directory', label: 'Candidate Directory', to: '/candidates' },
          ...(isAuthenticated
            ? [
                { key: 'candidate-apply', label: 'Candidate Application', to: canApplyAsCandidate ? '/apply' : undefined, disabled: !canApplyAsCandidate },
                { key: 'candidate-my-applications', label: 'My Applications', to: '/my-applications' },
              ]
            : []),
        ],
      }
    );

    if (isAuthenticated) {
      sections.push(
        { key: 'logout', label: 'Logout', to: '#logout', icon: 'logout', action: handleLogout }
      );
    } else {
      const guestAudience = {
        isSuperuser: false,
        isStaffOrAdminSubset: false,
      };

      const publicAuthLinks = [];
      const registrationAccessible = resolvedSidebarFlags.user_registration !== false;

      publicAuthLinks.push({
        key: 'login',
        label: 'Login',
        to: '/login',
        icon: 'login',
      });

      if (registrationAccessible) {
        publicAuthLinks.push({
          key: 'register',
          label: 'Register',
          to: '/register',
          icon: 'userPlus',
          featureDisableKey: 'user_registration',
        });
      }

      mapNavChildren(publicAuthLinks, resolvedSidebarFlags, guestAudience).forEach((item) =>
        sections.push(item)
      );
    }

    return sections;
  }, [
    brandingLoading,
    canApplyAsCandidate,
    handleLogout,
    isAdmin,
    isAuthenticated,
    isStaffOrAdmin,
    resolvedSidebarFlags,
  ]);

  useEffect(() => {
    const activeSections = {};

    menuSections.forEach((section) => {
      if (section.collapsible && section.children) {
        const hasActiveChild = section.children.some((child) => {
          if (!child.to) {
            return false;
          }

          if (child.match) {
            return child.match(location.pathname);
          }

          if (child.to === '/') {
            return location.pathname === '/';
          }

          return location.pathname.startsWith(child.to);
        });

        if (hasActiveChild) {
          activeSections[section.key] = true;
        }
      }
    });

    setExpandedSections((prev) => ({ ...prev, ...activeSections }));
  }, [location.pathname, menuSections]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const newState = !prev;
      // Update data attribute on app-shell for CSS targeting
      document.querySelector('.app-shell')?.setAttribute('data-sidebar-collapsed', newState);
      return newState;
    });
  };

  const handleNavClick = (action) => {
    if (typeof action === 'function') {
      action();
    }
    setShowMenu(false);
  };

  const renderLink = (link, itemClass, closeOnClick = false) => {
    const content = (
      <>
        {link.icon && <Icon name={link.icon} size={20} className="menu-icon" />}
        {(!sidebarCollapsed || closeOnClick) && <span>{link.label}</span>}
      </>
    );

    if (link.disabled) {
      return (
        <span
          key={link.key}
          className={`${itemClass} disabled`}
          aria-disabled="true"
          title={sidebarCollapsed && !closeOnClick ? link.label : "No upcoming elections available"}
        >
          {content}
        </span>
      );
    }

    if (link.action) {
      return (
        <button
          key={link.key}
          type="button"
          className={`${itemClass} side-item-button`}
          onClick={() => handleNavClick(link.action)}
          title={sidebarCollapsed && !closeOnClick ? link.label : ''}
        >
          {content}
        </button>
      );
    }

    return (
      <NavLink
        key={link.key}
        to={link.to}
        end={link.to === '/'}
        className={({ isActive }) =>
          `${itemClass} ${isActive ? 'active' : ''}`
        }
        onClick={() => {
          if (closeOnClick) {
            setShowMenu(false);
          }
        }}
        title={sidebarCollapsed && !closeOnClick ? link.label : ''}
      >
        {content}
      </NavLink>
    );
  };

  const renderSection = (section, itemClass, isMobile = false) => {
    if (section.collapsible && section.children) {
      const isExpanded = expandedSections[section.key];
      const shouldShowCollapsed = !sidebarCollapsed || isMobile;

      return (
        <div key={section.key} className="menu-group">
          <button
            type="button"
            className={`${itemClass} side-item-collapsible ${isExpanded ? 'active' : ''}`}
            onClick={() => toggleSection(section.key)}
            aria-expanded={isExpanded}
            title={sidebarCollapsed && !isMobile ? section.label : ''}
          >
            <span className="d-inline-flex align-items-center gap-2">
              {section.icon && <Icon name={section.icon} size={20} className="menu-icon" />}
              {shouldShowCollapsed && <span>{section.label}</span>}
            </span>
            {shouldShowCollapsed && (
              <Icon name="chevronDown" size={18} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
            )}
          </button>

          {shouldShowCollapsed && (
            <div className={`collapse ${isExpanded ? 'show' : ''}`}>
              {section.children.map((child) =>
                renderLink(child, itemClass, isMobile)
              )}
            </div>
          )}
        </div>
      );
    }

    return renderLink(section, itemClass, isMobile);
  };

  const buildInitials = () => {
    if (!isAuthenticated) return '';

    const nameParts = [
      user?.user?.first_name?.trim(),
      user?.user?.last_name?.trim(),
    ].filter(Boolean);

    if (nameParts.length > 0) {
      return nameParts
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }

    if (user?.user?.username) {
      return user.user.username.slice(0, 2).toUpperCase();
    }

    if (user?.user?.email) {
      return user.user.email.slice(0, 2).toUpperCase();
    }

    return 'ME';
  };

  const userInitials = buildInitials();

  const renderUserAvatar = () => {
    if (user?.profile?.avatar_url && !avatarLoadFailed) {
      return (
        <img
          src={user.profile.avatar_url}
          alt={userFullName}
          className="avatar-image"
          onError={() => setAvatarLoadFailed(true)}
        />
      );
    }

    return userInitials;
  };

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [user?.profile?.avatar_url]);

  const userFullName = isAuthenticated
    ? `${user?.user?.first_name || ''} ${user?.user?.last_name || ''}`.trim() ||
      user?.user?.username ||
      user?.user?.email ||
      'My Account'
    : '';

  return (
    <>
      <header className="topbar">
        <div className="container d-flex align-items-center justify-content-between">
          <Link
            to="/"
            className="brand d-flex align-items-center gap-2 text-decoration-none"
            style={{ color: 'inherit' }}
          >
            <div className="brand-logo d-flex align-items-center justify-content-center">
              <img
                src={branding.institution_logo_url || logoImg}
                alt={`${branding.institution_full_name} Logo`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.onerror = null; e.target.src = logoImg; }}
              />
            </div>
            <span className="brand-text">
              {branding.institution_name}
              <br />
              {branding.institution_name_line2}
            </span>
          </Link>

          <button
            className="menu-btn d-lg-none"
            type="button"
            onClick={() => setShowMenu(true)}
            aria-label="Open menu"
            title="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      <aside className={`desktop-sidebar d-none d-lg-block ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-menu-header">
          {!sidebarCollapsed && <div className="sidebar-menu-title">E-Botar</div>}
          <button 
            className="sidebar-toggle-btn" 
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {sidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6"/>
              ) : (
                <polyline points="15 18 9 12 15 6"/>
              )}
            </svg>
          </button>
        </div>
        
        <div className="menu">
          {menuSections.map((section) =>
            renderSection(section, 'side-item')
          )}
        </div>

        <div className="sidebar-bottom-meta">
          <div className="sidebar-version text-selectable">
            {branding.app_name} v{APP_VERSION}
          </div>

          {isAuthenticated && (
            <Link
              to="/profile"
              className={`user-pill text-decoration-none ${sidebarCollapsed ? 'avatar-only' : ''}`}
            >
              <div className="avatar">
                {renderUserAvatar()}
              </div>
              {!sidebarCollapsed && (
                <div className="user-pill-text">
                  <span className="name">{userFullName}</span>
                  <span className="email">{user?.user?.email}</span>
                </div>
              )}
            </Link>
          )}
        </div>
      </aside>

      <Offcanvas
        placement="end"
        show={showMenu}
        onHide={() => setShowMenu(false)}
        className="offcanvas offcanvas-end"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <nav className="list-group">
            <div className="sidebar-menu-title">E-Botar</div>
            {menuSections.map((section) =>
              renderSection(section, 'list-group-item list-group-item-action', true)
            )}
          </nav>

          {/* Mobile sidebar version label above user pill */}
          <div className="offcanvas-version text-selectable">
            {branding.app_name} v{APP_VERSION}
          </div>

          {isAuthenticated && (
            <Link
              to="/profile"
              className="user-pill text-decoration-none"
              onClick={() => setShowMenu(false)}
            >
              <div className="avatar">
                {renderUserAvatar()}
              </div>
              <div className="user-pill-text">
                <span className="name">{userFullName}</span>
                <span className="email">{user?.user?.email}</span>
              </div>
            </Link>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Navbar;

