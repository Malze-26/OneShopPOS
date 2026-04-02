import api from './api';
import { getPendingTransactions, deletePendingTransaction } from './offlineDB';

export async function syncPendingTransactions(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingTransactions();
  let synced = 0;
  let failed = 0;

  for (const transaction of pending) {
    try {
      const { localId, ...data } = transaction;
      await api.post('/transactions', data);
      await deletePendingTransaction(localId);
      synced++;
    } catch (err) {
      console.error('Failed to sync transaction:', err);
      failed++;
    }
  }

  return { synced, failed };
}