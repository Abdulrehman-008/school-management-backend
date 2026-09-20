import api from './api';
import { getQueue, removeFromQueue } from './offlineQueue';

/**
 * Attempt to sync all pending offline mark entries to the API.
 * Returns { synced, failed } counts.
 */
export const syncPendingMarks = async () => {
    const queue = await getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    // Iterate in reverse so splicing doesn't mess up indices
    for (let i = queue.length - 1; i >= 0; i--) {
        const entry = queue[i];
        try {
            await api.post('/results/add', {
                student_id: entry.student_id,
                subject_id: entry.subject_id,
                term: entry.term,
                exam_name: entry.exam_name,
                marks_obtained: entry.marks_obtained,
                total_marks: entry.total_marks,
            });
            await removeFromQueue(i);
            synced++;
        } catch (err) {
            console.error('Sync failed for entry:', entry, err.message);
            failed++;
        }
    }
    return { synced, failed };
};
