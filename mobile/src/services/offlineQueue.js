import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_marks_queue';

/**
 * Add a marks entry to the offline queue.
 */
export const enqueue = async (markEntry) => {
    try {
        const existing = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = existing ? JSON.parse(existing) : [];
        queue.push({ ...markEntry, queued_at: Date.now() });
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return queue.length;
    } catch (err) {
        console.error('Offline queue enqueue error:', err);
        return 0;
    }
};

/**
 * Get all pending items in the queue.
 */
export const getQueue = async () => {
    try {
        const existing = await AsyncStorage.getItem(QUEUE_KEY);
        return existing ? JSON.parse(existing) : [];
    } catch (err) {
        return [];
    }
};

/**
 * Clear the entire queue (call after successful sync).
 */
export const clearQueue = async () => {
    await AsyncStorage.removeItem(QUEUE_KEY);
};

/**
 * Remove a single item by index after a successful sync.
 */
export const removeFromQueue = async (index) => {
    try {
        const existing = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = existing ? JSON.parse(existing) : [];
        queue.splice(index, 1);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
        console.error('Remove from queue error:', err);
    }
};
