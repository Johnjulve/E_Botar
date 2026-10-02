/**
 * User Gateway Adapter
 * 
 * Implements the Gateway Adapter pattern to isolate UI components from shifting
 * backend profile and voting status schemas. Normalizes both lean (flat) payloads
 * and legacy nested payloads into consistent, immutable ViewModels.
 */

/**
 * Adapts a single raw user profile record (from /auth/profiles/ or /auth/directory/).
 * @param {Object} raw - Raw API item
 * @returns {Object} Normalized UserViewModel
 */
export const adaptUserProfileListItem = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return {};

  const userObj = raw.user || {};
  const deptObj = raw.department || {};
  const courseObj = raw.course || {};

  const id = raw.id ?? userObj.id;
  const userId = raw.user_id ?? userObj.id ?? id;
  const username = raw.username || userObj.username || '';
  const firstName = raw.first_name ?? userObj.first_name ?? '';
  const lastName = raw.last_name ?? userObj.last_name ?? '';
  const middleName = raw.middle_name || '';
  const fullName =
    raw.full_name ||
    `${firstName} ${lastName}`.trim() ||
    username ||
    'Unknown';
  const email = raw.email ?? userObj.email ?? '';
  const studentId = raw.student_id || username || '';
  const yearLevel = raw.year_level || '';
  const section = raw.section || '';
  const isActive = Boolean(raw.is_active ?? userObj.is_active ?? true);
  const isVerified = Boolean(raw.is_verified);
  const mustChangePassword = Boolean(raw.must_change_password);
  const isStaff = Boolean(raw.is_staff ?? userObj.is_staff);
  const isSuperuser = Boolean(raw.is_superuser ?? userObj.is_superuser);

  const deptCode = raw.department_code ?? (typeof deptObj === 'object' ? deptObj.code : deptObj) ?? '';
  const deptName = raw.department_name ?? (typeof deptObj === 'object' ? deptObj.name : deptObj) ?? '';
  const courseCode = raw.course_code ?? (typeof courseObj === 'object' ? courseObj.code : courseObj) ?? '';
  const courseName = raw.course_name ?? (typeof courseObj === 'object' ? courseObj.name : courseObj) ?? '';
  const dateJoined = raw.date_joined || userObj.date_joined || raw.created_at || '';

  return {
    id,
    userId,
    studentId,
    student_id: studentId,
    username,
    firstName,
    lastName,
    middleName,
    middle_name: middleName,
    fullName,
    full_name: fullName,
    email,
    yearLevel,
    year_level: yearLevel,
    section,
    isActive,
    is_active: isActive,
    isVerified,
    is_verified: isVerified,
    mustChangePassword,
    must_change_password: mustChangePassword,
    isStaff,
    is_staff: isStaff,
    isSuperuser,
    is_superuser: isSuperuser,
    departmentCode: deptCode,
    departmentName: deptName,
    courseCode,
    courseName,
    dateJoined,
    date_joined: dateJoined,
    createdAt: raw.created_at,
    created_at: raw.created_at,
    // Dual-compatibility: preserve nested accessors so legacy components continue functioning
    user: {
      id: userId,
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      is_active: isActive,
      is_staff: isStaff,
      is_superuser: isSuperuser,
      date_joined: dateJoined,
    },
    department: (deptCode || deptName) ? { code: deptCode, name: deptName || deptCode } : null,
    course: (courseCode || courseName) ? { code: courseCode, name: courseName || courseCode } : null,
  };
};

/**
 * Adapts an array of raw user profile items.
 * @param {Array} rawList
 * @returns {Array} Array of normalized UserViewModels
 */
export const adaptUserProfileList = (rawList = []) => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(adaptUserProfileListItem);
};

/**
 * Adapts a single voting status row.
 * Extends the UserViewModel with election voting status.
 * @param {Object} raw - Raw API item from /voting/voting-status/
 * @returns {Object} Normalized VotingStatusViewModel
 */
export const adaptVotingStatusListItem = (raw = {}) => {
  const base = adaptUserProfileListItem(raw);
  const hasVoted = Boolean(raw.has_voted);
  return {
    ...base,
    hasVoted,
    has_voted: hasVoted,
  };
};

/**
 * Adapts an array of voting status rows.
 * @param {Array} rawList
 * @returns {Array} Array of normalized VotingStatusViewModels
 */
export const adaptVotingStatusList = (rawList = []) => {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(adaptVotingStatusListItem);
};
