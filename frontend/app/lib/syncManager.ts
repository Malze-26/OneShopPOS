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
    } catch (err: any) {
      console.error('Failed to sync transaction:', err);

      const status = err?.response?.status;
      if (status === 400 || status === 422 || status === 500) {
        console.warn(`Dropping unrecoverable pending transaction: ${transaction.localId}`);
        await deletePendingTransaction(transaction.localId);
      } else {
        failed++;
      }
    }
  }

  return { synced, failed };
}