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
import { DeleteCompanyDialog } from '@/components/company/DeleteCompanyDialog';  // Add this
import { DocumentsList } from '@/components/documents/DocumentsList';
import { DocumentEditor } from '@/components/documents/DocumentEditor';
import { WhiteboardsList } from '@/components/whiteboard/WhiteboardList';
import { WhiteboardEditor } from '@/components/whiteboard/WhiteboardEditor';
import { CreateMeetingDialog } from '@/components/meetings/CreateMeetingDialog';
import { MeetingsList } from '@/components/meetings/MeetingsList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/api';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  PenTool,
  Video,
  Users,
  LogOutIcon
} from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import Link from 'next/link';

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
      <header className="border-b border-border bg-background ">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <div>

              <h1 className="text-2xl font-bold">Teletrabago</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user?.full_name || user?.email}
              </p>
            </div>
            <div className='flex gap-2'>
              <ModeToggle />
              <Button variant="destructive" onClick={handleSignOut} className='cursor-pointer'>
                <LogOutIcon />
              </Button>
            </div>

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
                      onSelectCompany={handleSelectCompany}
                    />

                  </div>
                  {selectedCompany && (
                    <div className="mt-6">
                      <AddMemberDialog companyId={selectedCompany} userRole={userRole} onMemberAdded={handleMemberAdded} />
                      <Link href={`/members?companyId=${selectedCompany}`}>

                        <Button size="sm" variant="outline" className="mt ml-4">
                          <Users />
                        </Button>

                      </Link>
                    </div>
                  )}
                  {selectedCompany && (
                    <div className="mt-6">
                      <DeleteCompanyDialog
                        companyId={selectedCompany}
                        companyName={selectedCompanyName}
                        userRole={userRole}
                        onCompanyDeleted={handleCompanyDeleted}
                      />
                    </div>
                  )}


                </div>
                <CreateCompanyDialog onCompanyCreated={handleCompanyCreated} />
              </div>


            </Card>

            {/* Tabs for Tasks, Chat, Documents, Whiteboards, Meetings */}
            {selectedCompany && (
              <Tabs defaultValue="tasks" className="space-y-4">
                <TabsList className="grid w-full max-w-4xl grid-cols-5">
                  <TabsTrigger value="tasks" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="whiteboards" className="gap-2">
                    <PenTool className="h-4 w-4" />
                    Whiteboards
                  </TabsTrigger>
                  <TabsTrigger value="meetings" className="gap-2">
                    <Video className="h-4 w-4" />
                    Meetings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tasks">
                  <TaskBoard companyId={selectedCompany} />
                </TabsContent>

                <TabsContent value="chat">
                  <CompanyChat companyId={selectedCompany} />
                </TabsContent>

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
                          onTitleChange={(title) => {
                            setSelectedDocument({ ...selectedDocument, title });
                          }}
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
                          onTitleChange={(title) => {
                            setSelectedWhiteboard({ ...selectedWhiteboard, title });
                          }}
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

                <TabsContent value="meetings">
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
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
