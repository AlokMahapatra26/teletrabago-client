import { Suspense } from 'react';
import MembersClient from './MembersClient';

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading members...</div>}>
      <MembersClient />
    </Suspense>
  );
}
