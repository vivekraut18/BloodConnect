import React from 'react';
import AppLayout from '@/components/AppLayout';
import FindBloodSearchContent from './components/FindBloodSearch';

export default function FindBloodSearchPage() {
  return (
    <AppLayout activeRoute="/find-blood-search">
      <FindBloodSearchContent />
    </AppLayout>
  );
}