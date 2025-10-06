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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/api';
import { LayoutDashboard, MessageSquare, Users } from 'lucide-react';
import { DocumentsList } from '@/components/documents/DocumentsList';
import { DocumentEditor } from '@/components/documents/DocumentEditor';
import { FileText } from 'lucide-react';
import { WhiteboardsList } from '@/components/whiteboard/WhiteboardList';
import { WhiteboardEditor } from '@/components/whiteboard/WhiteboardEditor';
import { PenTool } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<any>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-current border-r-transparent"></div>
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
          <div className="inline-block h-8 w-8 animate-spin border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-muted-foreground">Loading companies...</p>
        </div>
      </div>
    );
  }

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
            {/* Company Selection */}
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

            {/* Tabs for Tasks and Chat */}
            {selectedCompany && (
              <Tabs defaultValue="tasks" className="space-y-4">
                {/* --- Tab Buttons --- */}
                <TabsList className="grid w-full max-w-2xl grid-cols-2 md:grid-cols-4">
                  <TabsTrigger value="tasks" className="flex-1 justify-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex-1 justify-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1 justify-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="whiteboards" className="flex-1 justify-center gap-2">
                    <PenTool className="h-4 w-4" />
                    Whiteboards
                  </TabsTrigger>
                </TabsList>

                {/* --- Tasks --- */}
                <TabsContent value="tasks">
                  <TaskBoard companyId={selectedCompany} />
                </TabsContent>

                {/* --- Chat --- */}
                <TabsContent value="chat">
                  <CompanyChat companyId={selectedCompany} />
                </TabsContent>

                {/* --- Documents --- */}
                <TabsContent value="documents">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1">
                      <DocumentsList
                        companyId={selectedCompany}
                        onSelectDocument={setSelectedDocument}
                        selectedDocumentId={selectedDocument?.id}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      {selectedDocument ? (
                        <DocumentEditor
                          document={selectedDocument}
                          onTitleChange={(title) =>
                            setSelectedDocument({ ...selectedDocument, title })
                          }
                        />
                      ) : (
                        <Card className="p-8 text-center">
                          <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Select a document or create a new one
                          </p>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* --- Whiteboards --- */}
                <TabsContent value="whiteboards">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1">
                      <WhiteboardsList
                        companyId={selectedCompany}
                        onSelectWhiteboard={setSelectedWhiteboard}
                        selectedWhiteboardId={selectedWhiteboard?.id}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      {selectedWhiteboard ? (
                        <WhiteboardEditor
                          whiteboard={selectedWhiteboard}
                          onTitleChange={(title) =>
                            setSelectedWhiteboard({ ...selectedWhiteboard, title })
                          }
                        />
                      ) : (
                        <Card className="p-8 text-center">
                          <PenTool className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            Select a whiteboard or create a new one
                          </p>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}


          </div>
        )}
      </div>
    </div>
  );
}
