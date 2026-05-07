/**
 * Utilities for building minimal PATCH payloads from form snapshots.
 */

export const normalizeStringValue = (value) => (value == null ? '' : String(value).trim());

export const normalizeValueByRule = (value, rule = 'string') => {
  if (typeof rule === 'function') {
    return rule(value);
  }
  if (rule === 'raw') {
    return value;
  }
  return normalizeStringValue(value);
};

export const buildNormalizedRecord = (source, fieldRules) => {
  const normalizedRecord = {};
  Object.entries(fieldRules).forEach(([fieldName, rule]) => {
    normalizedRecord[fieldName] = normalizeValueByRule(source?.[fieldName], rule);
  });
  return normalizedRecord;
};

export const getChangedFields = ({ currentValues, initialValues, fieldRules }) => {
  const normalizedCurrent = buildNormalizedRecord(currentValues, fieldRules);
  const normalizedInitial = buildNormalizedRecord(initialValues || {}, fieldRules);

  const changedFields = {};
  Object.keys(fieldRules).forEach((fieldName) => {
    if (normalizedCurrent[fieldName] !== normalizedInitial[fieldName]) {
      changedFields[fieldName] = normalizedCurrent[fieldName];
    }
  });

  return {
    normalizedCurrent,
    normalizedInitial,
    changedFields,
    hasChanges: Object.keys(changedFields).length > 0,
  };
};

