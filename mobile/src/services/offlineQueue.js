import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_marks_queue';

/**
 * Add a marks entry to the offline queue.
 */
export const enqueue = async (markEntry) => {
    try {
        const existing = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = existing ? JSON.parse(existing) : [];
        
        // Check if an entry for this student, subject, date, and exam already exists
        const existingIdx = queue.findIndex(
            (item) =>
                String(item.student_id) === String(markEntry.student_id) &&
                String(item.subject_id) === String(markEntry.subject_id) &&
                String(item.exam_date || item.term || '').trim().toLowerCase() === String(markEntry.exam_date || markEntry.term || '').trim().toLowerCase() &&
                String(item.exam_name || '').trim().toLowerCase() === String(markEntry.exam_name || '').trim().toLowerCase()
        );

        if (existingIdx >= 0) {
            queue[existingIdx] = { ...markEntry, queued_at: Date.now() };
        } else {
            queue.push({ ...markEntry, queued_at: Date.now() });
        }

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
