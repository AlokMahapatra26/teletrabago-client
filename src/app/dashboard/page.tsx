'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { TaskBoard } from '@/components/tasks/TaskBoard';
import { CompanyChat } from '@/components/chat/CompanyChat';
import { CreateCompanyDialog } from '@/components/company/CreateCompanyDialog';
import { CompanySelector } from '@/components/company/CompanySelector';
import { AddMemberDialog } from '@/components/company/AddMemberDialog';
import { MembersList } from '@/components/company/MembersList';
import { DeleteCompanyDialog } from '@/components/company/DeleteCompanyDialog';
import { DocumentsList } from '@/components/documents/DocumentsList';
import { DocumentEditor } from '@/components/documents/DocumentEditor';
import { WhiteboardsList } from '@/components/whiteboard/WhiteboardList';
import { WhiteboardEditor } from '@/components/whiteboard/WhiteboardEditor';
import { CreateMeetingDialog } from '@/components/meetings/CreateMeetingDialog';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import {
  FileText,
  PenTool,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<any>(null);
  const [meetingRefreshTrigger, setMeetingRefreshTrigger] = useState(0);

  const [activeTab, setActiveTab] = useState("tasks");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }
    fetchCompanies();
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (selectedCompany) {
      fetchUserRole();
      const company = companies.find(c => c.companies.id === selectedCompany);
      if (company) {
        setSelectedCompanyName(company.companies.name);
      }
    }
  }, [selectedCompany]);

  async function fetchCompanies() {
    try {
      const data = await apiRequest('/api/companies');
      const companies = data?.companies || [];
      setCompanies(companies);

      if (companies.length === 0) {
        setSelectedCompany(null);
        setSelectedCompanyName('');
        return;
      }

      const storedCompanyId = localStorage.getItem('selectedCompanyId');
      const matched = companies.find((c: { companies: { id: string | null; }; }) => c.companies.id === storedCompanyId);

      if (storedCompanyId && matched) {
        setSelectedCompany(storedCompanyId);
        setSelectedCompanyName(matched.companies.name);
      } else {
        setSelectedCompany(companies[0].companies.id);
        setSelectedCompanyName(companies[0].companies.name);
      }
    }
    catch (error) {
      console.error('Failed to fetch companies', error);
    }
    finally {
      setLoading(false);
    }
  }


  const fetchUserRole = async () => {
    if (!selectedCompany) return;
    try {
      const data = await apiRequest(`/api/companies/${selectedCompany}/role`);
      setUserRole(data.role);
    } catch (error) {
      console.error('Failed to fetch user role:', error);
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

  const handleCompanyDeleted = () => {
    fetchCompanies();
    setSelectedCompany(null);
    setSelectedCompanyName('');
    setUserRole(null);
  };

  const handleMemberAdded = () => {
    setMemberRefreshTrigger((prev) => prev + 1);
  };

  function handleSelectCompany(companyId: string) {
    setSelectedCompany(companyId);
    localStorage.setItem('selectedCompanyId', companyId);
  }


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-current border-r-transparent rounded-xl"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-current border-r-transparent rounded-xl"></div>
          <p className="mt-2 text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        companies={companies}
        selectedCompany={selectedCompany}
        onSelectCompany={handleSelectCompany}
        onCompanyCreated={handleCompanyCreated}
        user={user}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <DashboardHeader title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}>
          {/* Header Actions */}
          {activeTab === 'members' && selectedCompany && (
            <AddMemberDialog companyId={selectedCompany} userRole={userRole} onMemberAdded={handleMemberAdded} />
          )}
        </DashboardHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {companies.length === 0 ? (
            <Card className="p-8 text-center max-w-md mx-auto mt-10">
              <h2 className="text-xl font-semibold mb-2">No Companies Yet</h2>
              <p className="text-muted-foreground mb-4">
                Create your first company to get started
              </p>
              <CreateCompanyDialog onCompanyCreated={handleCompanyCreated} />
            </Card>
          ) : (
            <>
              {activeTab === 'tasks' && selectedCompany && (
                <TaskBoard companyId={selectedCompany} />
              )}

              {activeTab === 'chat' && selectedCompany && (
                <CompanyChat companyId={selectedCompany} />
              )}

              {activeTab === 'documents' && selectedCompany && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                  <div className="lg:col-span-1 h-full overflow-y-auto">
                    <DocumentsList
                      companyId={selectedCompany}
                      onSelectDocument={setSelectedDocument}
                      selectedDocumentId={selectedDocument?.id}
                    />
                  </div>
                  <div className="lg:col-span-3 h-full overflow-y-auto">
                    {selectedDocument ? (
                      <DocumentEditor
                        document={selectedDocument}
                        onTitleChange={(title) => {
                          setSelectedDocument({ ...selectedDocument, title });
                        }}
                      />
                    ) : (
                      <Card className="p-8 text-center h-full flex flex-col items-center justify-center">
                        <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Select a document or create a new one
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'whiteboards' && selectedCompany && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                  <div className="lg:col-span-1 h-full overflow-y-auto">
                    <WhiteboardsList
                      companyId={selectedCompany}
                      onSelectWhiteboard={setSelectedWhiteboard}
                      selectedWhiteboardId={selectedWhiteboard?.id}
                    />
                  </div>
                  <div className="lg:col-span-3 h-full overflow-y-auto">
                    {selectedWhiteboard ? (
                      <WhiteboardEditor
                        whiteboard={selectedWhiteboard}
                        onTitleChange={(title) => {
                          setSelectedWhiteboard({ ...selectedWhiteboard, title });
                        }}
                      />
                    ) : (
                      <Card className="p-8 text-center h-full flex flex-col items-center justify-center">
                        <PenTool className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Select a whiteboard or create a new one
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'meetings' && selectedCompany && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Meetings</h2>
                    <CreateMeetingDialog
                      companyId={selectedCompany}
                      onMeetingCreated={() => setMeetingRefreshTrigger((prev) => prev + 1)}
                    />
                  </div>
                  <MeetingsList
                    companyId={selectedCompany}
                    refreshTrigger={meetingRefreshTrigger}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
