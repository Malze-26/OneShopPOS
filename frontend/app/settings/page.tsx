'use client';

import { Suspense } from 'react';
import SettingsContent from './SettingsContent';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}