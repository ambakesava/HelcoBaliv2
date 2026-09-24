import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateFEFO, newDashboardData, restoreDashboardData, statusesFor } from './dashboardModel.js';

const referenceDate = new Date(2026, 8, 24);

test('a critical store remains discoverable when all batches also expire soon', () => {
  const rows = [
    { storeId: 'store-a', physical: 4, expires: '2026-09-25' },
    { storeId: 'store-a', physical: 5, expires: '2026-09-26' },
  ];
  const settings = { minStock: 10, expiryDays: 30 };
  assert.deepEqual(statusesFor(rows[0], rows, settings, referenceDate), ['Segera kedaluwarsa', 'Stok kritis']);
  assert.equal(rows.filter((row) => statusesFor(row, rows, settings, referenceDate).includes('Stok kritis')).length, 2);
});

test('FEFO uses the oldest eligible batch first and never allocates an incomplete shipment', () => {
  const batches = [
    { id: 'later', batch: 'B', productId: 'coffee', status: 'Siap kirim', available: 4, expires: '2026-10-15' },
    { id: 'early', batch: 'A', productId: 'coffee', status: 'Siap kirim', available: 3, expires: '2026-10-01' },
    { id: 'expired', batch: 'X', productId: 'coffee', status: 'Siap kirim', available: 100, expires: '2026-09-20' },
  ];
  assert.deepEqual(allocateFEFO(batches, { productId: 'coffee', quantity: 5 }, referenceDate).map(({ batchId, quantity }) => [batchId, quantity]), [['early', 3], ['later', 2]]);
  assert.equal(allocateFEFO(batches, { productId: 'coffee', quantity: 8 }, referenceDate), null);
});

test('local state begins empty and malformed saved data is reported instead of fabricated', () => {
  assert.deepEqual(restoreDashboardData(null), newDashboardData());
  assert.throws(() => restoreDashboardData('{"rows": []}'), /Format data lokal/);
  assert.deepEqual(restoreDashboardData(JSON.stringify(newDashboardData())), newDashboardData());
});
