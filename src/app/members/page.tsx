'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MembersList } from '@/components/company/MembersList';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

export default function MembersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyId = searchParams.get('companyId');

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!companyId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No company selected. Please select a company first.
        <div className="mt-4">
          <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Company Members</h1>
      <Button onClick={handleRefresh} className="mb-4">
        Refresh Members List
      </Button>
      <Separator className="mb-4" />
      <MembersList companyId={companyId} refreshTrigger={refreshTrigger} />
    </div>
  );
}
