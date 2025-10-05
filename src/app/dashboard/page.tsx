'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { CreateCompanyDialog } from '@/components/company/CreateCompanyDialog';
import { CompanySelector } from '@/components/company/CompanySelector';
import { AddMemberDialog } from '@/components/company/AddMemberDialog';
import { MembersList } from '@/components/company/MembersList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);

  useEffect(() => {
    // Wait for hydration to complete
    if (isLoading) return;

    // After hydration, check if user is authenticated
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }

    // User is authenticated, fetch companies
    fetchCompanies();
  }, [isAuthenticated, isLoading]);

  const fetchCompanies = async () => {
    try {
      const data = await apiRequest('/api/companies');
      setCompanies(data.companies || []);
      if (data.companies && data.companies.length > 0 && !selectedCompany) {
        setSelectedCompany(data.companies[0].companies.id);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await apiRequest('/api/auth/signout', { method: 'POST' });
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      clearAuth();
      router.push('/');
    }
  };

  const handleCompanyCreated = () => {
    fetchCompanies();
  };

  const handleMemberAdded = () => {
    setMemberRefreshTrigger((prev) => prev + 1);
  };

  // Show loading state while hydrating
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Show loading state while fetching companies
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    );
  }

  const selectedCompanyData = companies.find(
    (c) => c.companies.id === selectedCompany
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Remote Work Platform</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user?.full_name || user?.email}
              </p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {companies.length === 0 ? (
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No Companies Yet</h2>
            <p className="text-muted-foreground mb-4">
              Create your first company to get started
            </p>
            <CreateCompanyDialog onCompanyCreated={handleCompanyCreated} />
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Company Selection and Management */}
            <Card className="p-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Active Company
                    </label>
                    <CompanySelector
                      companies={companies}
                      selectedCompany={selectedCompany}
                      onSelectCompany={setSelectedCompany}
                    />
                  </div>
                  {selectedCompany && (
                    <div className="mt-6">
                      <AddMemberDialog
                        companyId={selectedCompany}
                        onMemberAdded={handleMemberAdded}
                      />
                    </div>
                  )}
                </div>
                <CreateCompanyDialog onCompanyCreated={handleCompanyCreated} />
              </div>

              {selectedCompany && (
                <>
                  <Separator className="my-4" />
                  <MembersList
                    companyId={selectedCompany}
                    refreshTrigger={memberRefreshTrigger}
                  />
                </>
              )}
            </Card>

            {/* Task Board */}
            {selectedCompany ? (
              <TaskBoard companyId={selectedCompany} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Select a company to view tasks
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
