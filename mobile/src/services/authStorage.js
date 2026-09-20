import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/**
 * Persist the user session after a successful login.
 * @param {string} token - JWT token from the API
 * @param {object} user  - User object { id, name, username, role }
 */
export const saveSession = async (token, user) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Load the persisted session.
 * @returns {{ token: string, user: object } | null}
 */
export const loadSession = async () => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (!token || !userJson) return null;
    return { token, user: JSON.parse(userJson) };
  } catch (_) {
    return null;
  }
};

/**
 * Remove the persisted session (logout).
 */
export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
