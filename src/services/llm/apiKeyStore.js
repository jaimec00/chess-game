const STORAGE_KEY = 'chess-rot-api-keys';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getApiKey(providerId) {
  return getAll()[providerId] || '';
}

export function setApiKey(providerId, key) {
  const keys = getAll();
  keys[providerId] = key;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearApiKey(providerId) {
  const keys = getAll();
  delete keys[providerId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
