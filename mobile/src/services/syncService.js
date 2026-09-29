import NetInfo from '@react-native-community/netinfo';
import api from './api';
import { getQueue, removeFromQueue } from './offlineQueue';

let isSyncing = false;
const syncListeners = new Set();

/**
 * Register a listener to be notified when sync operations complete.
 * Returns an unsubscribe function.
 */
export const subscribeSyncEvents = (callback) => {
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
};

const notifySyncListeners = (data) => {
  syncListeners.forEach((callback) => {
    try {
      callback(data);
    } catch (err) {
      console.error('[SyncService] Listener error:', err);
    }
  });
};

/**
 * Attempt to sync all pending offline mark entries to the API.
 * Returns { synced, failed } counts.
 */
export const syncPendingMarks = async () => {
  if (isSyncing) {
    return { synced: 0, failed: 0, inProgress: true };
  }

  const rawQueue = await getQueue();
  if (rawQueue.length === 0) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  // Deduplicate queue items by student_id, subject_id, date/term, exam_name (keep latest)
  const dedupedMap = new Map();
  rawQueue.forEach((entry) => {
    const dateKey = String(entry.exam_date || entry.term || '').trim().toLowerCase();
    const key = `${entry.student_id}_${entry.subject_id}_${dateKey}_${String(entry.exam_name || '').trim().toLowerCase()}`;
    dedupedMap.set(key, entry);
  });
  const uniqueQueue = Array.from(dedupedMap.values());
  const remainingQueue = [];

  try {
    for (const entry of uniqueQueue) {
      try {
        const cleanDate = entry.exam_date || entry.term || new Date().toISOString().split('T')[0];
        await api.post('/results/add', {
          student_id: entry.student_id,
          subject_id: entry.subject_id,
          term: cleanDate,
          exam_date: cleanDate,
          exam_name: entry.exam_name,
          marks_obtained: entry.marks_obtained,
          total_marks: entry.total_marks,
        });
        synced++;
      } catch (err) {
        console.error('[SyncService] Sync failed for entry:', entry, err.message);
        remainingQueue.push(entry);
        failed++;
      }
    }
  } finally {
    // Keep items added while sync was running, plus any failed items
    const currentQueue = await getQueue();
    const newlyAdded = currentQueue.filter(
      (curr) => !uniqueQueue.some((u) => u.queued_at && u.queued_at === curr.queued_at)
    );
    const updatedQueue = [...remainingQueue, ...newlyAdded];
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('offline_marks_queue', JSON.stringify(updatedQueue));
    isSyncing = false;
  }

  const result = { synced, failed };
  notifySyncListeners(result);
  return result;
};

/**
 * Check connectivity and sync all queued offline marks to the server.
 * Returns { synced, failed, offline, inProgress }.
 */
export const checkAndSyncPendingMarks = async () => {
  if (isSyncing) {
    return { synced: 0, failed: 0, inProgress: true };
  }

  try {
    const netState = await NetInfo.fetch();
    const isConnected = Boolean(netState.isConnected);

    if (!isConnected) {
      console.log('[SyncService] Device is offline. Skipping sync.');
      return { synced: 0, failed: 0, offline: true };
    }

    const queue = await getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    return await syncPendingMarks();
  } catch (err) {
    console.error('[SyncService] checkAndSyncPendingMarks error:', err);
    return { synced: 0, failed: 0, error: err.message };
  }
};
