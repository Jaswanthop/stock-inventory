/** Escape user input before using it inside a RegExp. */
export const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function getPagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Build a Mongoose sort object from a whitelist.
 * Example: "-quantity" -> { quantity: -1 }
 */
export function getSort(sort, allowed = [], fallback = '-createdAt') {
  const requested = String(sort || fallback);
  const descending = requested.startsWith('-');
  const field = descending ? requested.slice(1) : requested;
  const safeField = allowed.includes(field) ? field : fallback.replace(/^-/, '');
  const direction = allowed.includes(field) ? (descending ? -1 : 1) : -1;
  return { [safeField]: direction, _id: -1 };
}

export function toNumber(value, field, { min = 0, fallback } = {}) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw Object.assign(new Error(`${field} is required`), { statusCode: 400 });
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw Object.assign(new Error(`${field} must be a number`), { statusCode: 400 });
  }
  if (num < min) {
    throw Object.assign(new Error(`${field} cannot be less than ${min}`), { statusCode: 400 });
  }
  return num;
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
  if (missing.length) {
    throw Object.assign(new Error(`Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`), {
      statusCode: 400,
    });
  }
}
