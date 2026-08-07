/**
 * SMG Manager - Complete Gym Management Application Entry Point
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Member,
  MembershipPlan,
  PaymentRecord,
  MembershipHistory,
  AttendanceRecord,
  Expense,
  Enquiry,
  DeviceSession,
  GymSettings,
  AdminUser,
  DietPlan,
  Language,
} from './types';
import { Plus } from 'lucide-react';
import { Storage } from './utils/storage';
import { FirebaseService } from './lib/firebase';
import { useTranslation } from './utils/translations';
import { getTheme } from './utils/theme';
import { Header } from './components/Header';
import { isMemberExpired } from './utils/dateUtils';
import { Navigation, MainTab } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { MembersList } from './components/Members/MembersList';
import { MemberFormModal } from './components/Members/MemberFormModal';
import { MemberProfileModal } from './components/Members/MemberProfileModal';
import { MemberCardModal } from './components/Members/MemberCardModal';
import { RenewMemberModal } from './components/Members/RenewMemberModal';
import { DashboardView } from './components/Dashboard/DashboardView';
import { AttendanceView } from './components/Attendance/AttendanceView';
import { ReportsView } from './components/Reports/ReportsView';
import { DeletedMembersModal } from './components/MoreMenu/DeletedMembersModal';
import { ExpensesModal } from './components/MoreMenu/ExpensesModal';
import { EnquiriesModal } from './components/MoreMenu/EnquiriesModal';
import { DevicesModal } from './components/MoreMenu/DevicesModal';
import { AuthModal } from './components/MoreMenu/AuthModal';
import { SettingsModal } from './components/MoreMenu/SettingsModal';
import { PlansModal } from './components/MoreMenu/PlansModal';
import { DietPlansModal } from './components/MoreMenu/DietPlansModal';
import { PwaInstallBanner } from './components/Common/PwaInstallBanner';
import { MoreMenuDrawer } from './components/MoreMenu/MoreMenuDrawer';
import { ConfirmModal } from './components/ConfirmModal';

export default function App() {
  // Persistent State
  const [settings, setSettings] = useState<GymSettings>(() => Storage.getSettings());
  const t = useTranslation(settings.language);
  const theme = getTheme(settings.themeColor);
  const [admin, setAdmin] = useState<AdminUser>(() => Storage.getAdmin());
  const [members, setMembers] = useState<Member[]>(() => Storage.getMembers());
  const [deletedMembers, setDeletedMembers] = useState<Member[]>(() => Storage.getDeletedMembers());
  const [plans, setPlans] = useState<MembershipPlan[]>(() => Storage.getPlans());
  const [dietPlans, setDietPlans] = useState<DietPlan[]>(() => Storage.getDietPlans());
  const [payments, setPayments] = useState<PaymentRecord[]>(() => Storage.getPayments());
  const [membershipHistory, setMembershipHistory] = useState<MembershipHistory[]>(() =>
    Storage.getMembershipHistory()
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => Storage.getAttendance());
  const [expenses, setExpenses] = useState<Expense[]>(() => Storage.getExpenses());
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => Storage.getEnquiries());
  const [devices, setDevices] = useState<DeviceSession[]>(() => Storage.getDevices());

  // Active View Tab & Member Filter State (Persisted across sessions)
  const [activeTab, setActiveTabState] = useState<MainTab>(() => {
    try {
      const tId = Storage.getCurrentTenantId();
      const saved = localStorage.getItem(`smg_${tId}_active_tab`) || localStorage.getItem('smg_active_tab');
      if (saved && ['dashboard', 'members', 'attendance', 'reports'].includes(saved)) {
        return saved as MainTab;
      }
    } catch {}
    return 'dashboard';
  });

  const setActiveTab = (tab: MainTab) => {
    setActiveTabState(tab);
    try {
      const tId = Storage.getCurrentTenantId();
      localStorage.setItem(`smg_${tId}_active_tab`, tab);
      localStorage.setItem('smg_active_tab', tab);
    } catch {}
  };

  const [memberFilter, setMemberFilterState] = useState<string>(() => {
    try {
      const tId = Storage.getCurrentTenantId();
      const saved = localStorage.getItem(`smg_${tId}_member_filter`) || localStorage.getItem('smg_member_filter');
      if (saved) return saved;
    } catch {}
    return 'All';
  });

  const setMemberFilter = (filter: string) => {
    setMemberFilterState(filter);
    try {
      const tId = Storage.getCurrentTenantId();
      localStorage.setItem(`smg_${tId}_member_filter`, filter);
      localStorage.setItem('smg_member_filter', filter);
    } catch {}
  };

  const handleSelectMemberFilter = (filter: string) => {
    setMemberFilter(filter);
    setActiveTab('members');
  };

  // Modals & Collapsible Sidebar Open State
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('smg_sidebar_expanded');
      if (saved !== null) return saved === 'true';
    } catch {}
    return true;
  });

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smg_sidebar_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [profileMember, setProfileMember] = useState<Member | null>(null);
  const [cardMember, setCardMember] = useState<Member | null>(null);
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);

  const [isDeletedMembersOpen, setIsDeletedMembersOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isEnquiriesOpen, setIsEnquiriesOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isDietPlansOpen, setIsDietPlansOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<
    'profile' | 'theme' | 'dataMgmt' | 'memberMgmt' | 'backup' | 'danger'
  >('profile');

  const refreshAllData = () => {
    setMembers(Storage.getMembers());
    setDeletedMembers(Storage.getDeletedMembers());
    setPlans(Storage.getPlans());
    setDietPlans(Storage.getDietPlans());
    setPayments(Storage.getPayments());
    setAttendance(Storage.getAttendance());
    setExpenses(Storage.getExpenses());
    setEnquiries(Storage.getEnquiries());
    setDevices(Storage.getDevices());
    setSettings(Storage.getSettings());
  };

  // Initial load on App mount & Sync with Firestore
  useEffect(() => {
    // Initial quick load from local tenant workspace
    refreshAllData();

    // Background sync remote Firestore data for active tenant
    const activeTenantId = Storage.getCurrentTenantId();
    FirebaseService.fetchMembers(activeTenantId).then((remoteMembers) => {
      if (remoteMembers && remoteMembers.length > 0) {
        setMembers(remoteMembers.filter((m) => !m.isDeleted));
        setDeletedMembers(remoteMembers.filter((m) => m.isDeleted));
      }
    });
  }, []);

  // Sync RTL / LTR layout direction when language changes
  useEffect(() => {
    document.documentElement.dir = settings.language === 'ur' ? 'rtl' : 'ltr';
  }, [settings.language]);

  // Auto-update member status to Expired when 30 days are complete
  useEffect(() => {
    if (!members || members.length === 0) return;
    let hasChanges = false;
    const updated = members.map((m) => {
      if (!m.isFrozen && m.expiryDate && isMemberExpired(m.expiryDate) && m.status !== 'Expired') {
        hasChanges = true;
        return { ...m, status: 'Expired' as const };
      }
      return m;
    });

    if (hasChanges) {
      setMembers(updated);
      Storage.saveMembers(updated);
      updated.forEach((m) => {
        if (m.status === 'Expired') {
          Storage.updateMember(m);
        }
      });
    }
  }, [members]);

  // Today's attendance IDs
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayAttendanceMemberIds = attendance
    .filter((a) => a.date === todayStr && a.status === 'Present')
    .map((a) => a.memberId);

  // Expiring soon count (1-7 days)
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const expiringSoonCount = members.filter((m) => {
    if (m.status === 'Expired') return false;
    const diff = Math.ceil((new Date(m.expiryDate).getTime() - todayDate.getTime()) / (1000 * 3600 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  // Handlers for Member CRUD
  const handleSaveMember = (m: Member) => {
    const current = Storage.getMembers().filter((item) => item.id !== m.id);
    const updated = [m, ...current];
    Storage.saveMembers(updated);
    setMembers(updated);

    if (!editingMember && m.paidAmount > 0) {
      const pay: PaymentRecord = {
        id: `pay_${Date.now()}`,
        memberId: m.id,
        memberName: m.name,
        planName: m.membershipPlanName,
        amount: m.paidAmount,
        paymentMethod: 'Cash',
        paymentDate: todayStr,
        receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        remarks: 'New Admission Payment',
      };
      Storage.addPayment(pay);
      setPayments(Storage.getPayments());
    }

    setIsAddMemberOpen(false);
    setEditingMember(null);
  };

  // Delete Confirmation State
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null);

  const handleSoftDeleteMember = async (id: string, skipConfirm = false) => {
    const target =
      members.find(
        (m) => m.id === id || m.id.trim().toLowerCase() === id.trim().toLowerCase()
      ) ||
      Storage.getMembers().find(
        (m) => m.id === id || m.id.trim().toLowerCase() === id.trim().toLowerCase()
      );

    if (skipConfirm || !target) {
      await Storage.softDeleteMember(id);
      refreshAllData();
      if (profileMember?.id === id) setProfileMember(null);
      setDeleteConfirmMember(null);
    } else {
      setDeleteConfirmMember(target);
    }
  };

  const confirmSoftDelete = async () => {
    if (!deleteConfirmMember) return;
    const targetId = deleteConfirmMember.id;
    await Storage.softDeleteMember(targetId);
    refreshAllData();
    if (profileMember?.id === targetId) setProfileMember(null);
    setDeleteConfirmMember(null);
  };

  const handleRestoreMember = async (id: string) => {
    await Storage.restoreMember(id);
    refreshAllData();
  };

  const handlePermanentDeleteMember = async (id: string) => {
    await Storage.permanentlyDeleteMember(id);
    refreshAllData();
  };

  const handleFreezeMember = (m: Member) => {
    const updated: Member = {
      ...m,
      isFrozen: !m.isFrozen,
      status: !m.isFrozen ? 'Freeze' : m.dueAmount > 0 ? 'Partial' : 'Active',
      freezeReason: !m.isFrozen ? 'Requested by member' : undefined,
    };
    Storage.updateMember(updated);
    setMembers(Storage.getMembers());
    if (profileMember) setProfileMember(updated);
  };

  const handleRenewMemberSuccess = (
    updatedMember: Member,
    paymentRecord: PaymentRecord,
    renewedPlanName: string
  ) => {
    Storage.updateMember(updatedMember);
    Storage.addPayment(paymentRecord);
    Storage.addMembershipHistory({
      id: `hist_${Date.now()}`,
      memberId: updatedMember.id,
      planName: renewedPlanName,
      startDate: updatedMember.startDate,
      expiryDate: updatedMember.expiryDate,
      paidAmount: paymentRecord.amount,
      renewedAt: todayStr,
    });

    setMembers(Storage.getMembers());
    setPayments(Storage.getPayments());
    setMembershipHistory(Storage.getMembershipHistory());
    setRenewingMember(null);
    if (profileMember) setProfileMember(updatedMember);
  };

  // Attendance Handler
  const handleMarkAttendance = (
    memberId: string,
    dateStr: string = todayStr,
    status: 'Present' | 'Absent' = 'Present'
  ) => {
    Storage.markAttendance(memberId, dateStr, status);
    setAttendance(Storage.getAttendance());
  };

  // Expenses Handlers
  const handleAddExpense = (e: Expense) => {
    Storage.addExpense(e);
    setExpenses(Storage.getExpenses());
  };
  const handleUpdateExpense = (e: Expense) => {
    Storage.updateExpense(e);
    setExpenses(Storage.getExpenses());
  };
  const handleDeleteExpense = (id: string) => {
    Storage.deleteExpense(id);
    setExpenses(Storage.getExpenses());
  };

  // Enquiries Handlers
  const handleAddEnquiry = (enq: Enquiry) => {
    Storage.addEnquiry(enq);
    setEnquiries(Storage.getEnquiries());
  };
  const handleUpdateEnquiry = (enq: Enquiry) => {
    Storage.updateEnquiry(enq);
    setEnquiries(Storage.getEnquiries());
  };
  const handleDeleteEnquiry = (id: string) => {
    Storage.deleteEnquiry(id);
    setEnquiries(Storage.getEnquiries());
  };

  const handleConvertEnquiryToMember = (enq: Enquiry) => {
    // Pre-fill state for Add Member form
    const updatedEnq: Enquiry = { ...enq, status: 'Converted' };
    Storage.updateEnquiry(updatedEnq);
    setEnquiries(Storage.getEnquiries());

    setIsEnquiriesOpen(false);
    setIsAddMemberOpen(true);
  };

  // Settings Handlers
  const handleSaveSettings = (updated: GymSettings) => {
    Storage.saveSettings(updated);
    setSettings(updated);

    if (admin) {
      const updatedAdmin: AdminUser = {
        ...admin,
        adminName: updated.adminName || admin.adminName,
        gymName: updated.gymName || admin.gymName,
        email: updated.adminEmail || admin.email,
        mobile: updated.adminMobile || admin.mobile,
      };
      Storage.saveAdmin(updatedAdmin);
      setAdmin(updatedAdmin);
    }
  };

  const handleSavePlans = (updatedPlans: MembershipPlan[]) => {
    Storage.savePlans(updatedPlans);
    setPlans(updatedPlans);
  };

  const handleResetAccount = () => {
    Storage.resetAllData();
    window.location.reload();
  };

  const handleLoginSuccess = (updatedAdmin: AdminUser, newGymName?: string) => {
    Storage.saveAdmin(updatedAdmin);
    setAdmin(updatedAdmin);

    if (newGymName) {
      const current = Storage.getSettings();
      const updatedSettings = { ...current, gymName: newGymName, adminName: updatedAdmin.adminName };
      Storage.saveSettings(updatedSettings);
    }

    refreshAllData();
    setIsAuthOpen(false);
  };

  const handleSignOut = () => {
    const loggedOutAdmin: AdminUser = {
      ...admin,
      isLoggedIn: false,
    };
    Storage.saveAdmin(loggedOutAdmin);
    setAdmin(loggedOutAdmin);
    setAuthMode('signin');
    setIsAuthOpen(true);
  };

  // Handle More Menu option selection
  const handleMoreMenuOption = (key: string) => {
    switch (key) {
      case 'downloadReport':
        setActiveTab('reports');
        break;
      case 'deletedMembers':
        setIsDeletedMembersOpen(true);
        break;
      case 'expenses':
        setIsExpensesOpen(true);
        break;
      case 'enquiries':
        setIsEnquiriesOpen(true);
        break;
      case 'devices':
        setIsDevicesOpen(true);
        break;
      case 'plans':
        setIsPlansOpen(true);
        break;
      case 'dietPlans':
        setIsDietPlansOpen(true);
        break;
      case 'installPwa':
        // Prompt user or inform about PWA installability
        if ('serviceWorker' in navigator) {
          alert('SMG Manager is fully PWA installable! You can install it via the "Install App" banner at the bottom or via your browser menu (⋮ / Share -> Install App).');
        } else {
          alert('PWA app installation is supported on Google Chrome, Microsoft Edge, Brave, and Safari.');
        }
        break;
      case 'dataManagement':
        setSettingsTab('dataMgmt');
        setIsSettingsOpen(true);
        break;
      case 'settings':
        setSettingsTab('profile');
        setIsSettingsOpen(true);
        break;
      case 'forgotPassword':
        setAuthMode('forgot');
        setIsAuthOpen(true);
        break;
      case 'security':
        setAuthMode('signin');
        setIsAuthOpen(true);
        break;
      case 'dangerZone':
        setSettingsTab('danger');
        setIsSettingsOpen(true);
        break;
    }
  };

  // Full screen lock gatekeeper when not logged in
  if (!admin.isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans selection:bg-emerald-500 selection:text-white">
        <AuthModal
          mode={authMode}
          settings={settings}
          admin={admin}
          onLoginSuccess={handleLoginSuccess}
          isGatekeeper={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Collapsible Left Sidebar Navigation */}
      <Sidebar
        isExpanded={isSidebarExpanded}
        onClose={() => setIsSidebarExpanded(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        settings={settings}
        admin={admin}
        counts={{
          membersCount: members.length,
          expiringSoonCount,
          todayAttendanceCount: todayAttendanceMemberIds.length,
          deletedMembersCount: deletedMembers.length,
        }}
        onSelectOption={handleMoreMenuOption}
        onSignOut={handleSignOut}
      />

      {/* Top Navbar Header */}
      <Header
        settings={settings}
        admin={admin}
        isSidebarExpanded={isSidebarExpanded}
        onOpenMoreMenu={toggleSidebar}
        onOpenSignIn={() => {
          setAuthMode('signin');
          setIsAuthOpen(true);
        }}
        onOpenSignUp={() => {
          setAuthMode('signup');
          setIsAuthOpen(true);
        }}
        onSignOut={handleSignOut}
      />

      {/* Main View Area with Dynamic Sidebar Offset */}
      <main className={`flex-1 w-full max-w-7xl mr-auto px-3 sm:px-6 lg:px-8 pt-4 pb-20 sm:pb-24 ${isSidebarExpanded ? 'lg:ml-64' : 'lg:ml-0'} lg:pb-8 transition-all`}>
        {activeTab === 'members' && (
          <MembersList
            members={members}
            settings={settings}
            onOpenAddModal={() => {
              setEditingMember(null);
              setIsAddMemberOpen(true);
            }}
            onSelectMember={(m) => setProfileMember(m)}
            onRenewMember={(m) => setRenewingMember(m)}
            onPrintCard={(m) => setCardMember(m)}
            onMarkAttendance={(mId) => handleMarkAttendance(mId)}
            onDeleteMember={handleSoftDeleteMember}
            todayAttendanceMemberIds={todayAttendanceMemberIds}
            activeFilter={memberFilter}
            onFilterChange={setMemberFilter}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            members={members}
            payments={payments}
            expenses={expenses}
            enquiries={enquiries}
            todayAttendanceCount={todayAttendanceMemberIds.length}
            settings={settings}
            onOpenAddMember={() => {
              setEditingMember(null);
              setIsAddMemberOpen(true);
            }}
            onOpenAddExpense={() => setIsExpensesOpen(true)}
            onOpenAddEnquiry={() => setIsEnquiriesOpen(true)}
            onGoToAttendance={() => setActiveTab('attendance')}
            onRenewMember={(m) => setRenewingMember(m)}
            onSelectMemberFilter={handleSelectMemberFilter}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onSelectMember={(m) => setProfileMember(m)}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceView
            members={members}
            attendance={attendance}
            settings={settings}
            onMarkAttendance={handleMarkAttendance}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            members={members}
            payments={payments}
            expenses={expenses}
            attendance={attendance}
            settings={settings}
          />
        )}
      </main>

      {/* Bottom Fixed Navigation Bar (Members, Dashboard, Reports, Attendance) */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        settings={settings}
        counts={{
          membersCount: members.length,
          expiringSoonCount,
          todayAttendanceCount: todayAttendanceMemberIds.length,
        }}
      />

      {/* Floating Action Button (FAB) to Add Member */}
      <button
        id="btn-fab-add-member"
        type="button"
        onClick={() => {
          setEditingMember(null);
          setIsAddMemberOpen(true);
        }}
        className={`fixed bottom-20 right-4 sm:right-6 lg:right-8 z-40 w-14 h-14 rounded-full text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer ${theme.bgPrimary} ${theme.hoverPrimary}`}
        title={t('addMemberBtn') || 'Add New Member'}
        aria-label={t('addMemberBtn') || 'Add New Member'}
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>


      {/* Modals & Drawers */}
      {isMoreMenuOpen && (
        <MoreMenuDrawer
          settings={settings}
          admin={admin}
          deletedMembersCount={deletedMembers.length}
          onSelectOption={handleMoreMenuOption}
          onSignOut={handleSignOut}
          onClose={() => setIsMoreMenuOpen(false)}
        />
      )}

      {(isAddMemberOpen || editingMember) && (
        <MemberFormModal
          initialMember={editingMember}
          plans={plans}
          existingMembers={members}
          existingMembersCount={members.length}
          settings={settings}
          onSave={handleSaveMember}
          onClose={() => {
            setIsAddMemberOpen(false);
            setEditingMember(null);
          }}
        />
      )}

      {profileMember && (
        <MemberProfileModal
          member={profileMember}
          payments={payments}
          history={membershipHistory}
          attendance={attendance}
          settings={settings}
          onClose={() => setProfileMember(null)}
          onEdit={(m) => {
            setProfileMember(null);
            setEditingMember(m);
          }}
          onDelete={handleSoftDeleteMember}
          onRenew={(m) => {
            setProfileMember(null);
            setRenewingMember(m);
          }}
          onFreeze={handleFreezeMember}
          onPrintCard={(m) => setCardMember(m)}
        />
      )}

      {cardMember && (
        <MemberCardModal
          member={cardMember}
          settings={settings}
          onClose={() => setCardMember(null)}
        />
      )}

      {renewingMember && (
        <RenewMemberModal
          member={renewingMember}
          plans={plans}
          settings={settings}
          onRenew={handleRenewMemberSuccess}
          onClose={() => setRenewingMember(null)}
        />
      )}

      {isDeletedMembersOpen && (
        <DeletedMembersModal
          deletedMembers={deletedMembers}
          settings={settings}
          onRestore={handleRestoreMember}
          onPermanentDelete={handlePermanentDeleteMember}
          onClose={() => setIsDeletedMembersOpen(false)}
        />
      )}

      {isExpensesOpen && (
        <ExpensesModal
          expenses={expenses}
          settings={settings}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
          onClose={() => setIsExpensesOpen(false)}
        />
      )}

      {isEnquiriesOpen && (
        <EnquiriesModal
          enquiries={enquiries}
          settings={settings}
          onAddEnquiry={handleAddEnquiry}
          onUpdateEnquiry={handleUpdateEnquiry}
          onDeleteEnquiry={handleDeleteEnquiry}
          onConvertToMember={handleConvertEnquiryToMember}
          onClose={() => setIsEnquiriesOpen(false)}
        />
      )}

      {isDevicesOpen && (
        <DevicesModal
          devices={devices}
          settings={settings}
          onRevokeDevice={(id) => {
            Storage.revokeDevice(id);
            setDevices(Storage.getDevices());
          }}
          onUpdateBiometricSettings={(ip, port) => {
            handleSaveSettings({ ...settings, biometricIp: ip, biometricPort: port });
          }}
          onClose={() => setIsDevicesOpen(false)}
        />
      )}

      {isPlansOpen && (
        <PlansModal
          plans={plans}
          settings={settings}
          onSavePlans={handleSavePlans}
          onClose={() => setIsPlansOpen(false)}
        />
      )}

      {isDietPlansOpen && (
        <DietPlansModal
          dietPlans={dietPlans}
          members={members}
          settings={settings}
          onClose={() => setIsDietPlansOpen(false)}
          onUpdateDietPlans={(updatedPlans) => setDietPlans(updatedPlans)}
          onUpdateMembers={(updatedMembers) => setMembers(updatedMembers)}
        />
      )}

      {isAuthOpen && (
        <AuthModal
          mode={authMode}
          settings={settings}
          admin={admin}
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          plans={plans}
          members={members}
          initialTab={settingsTab}
          onDeleteMember={handleSoftDeleteMember}
          onSaveSettings={handleSaveSettings}
          onSavePlans={handleSavePlans}
          onReloadData={refreshAllData}
          onResetAccount={handleResetAccount}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmMember !== null}
        title="Delete Member"
        message={
          deleteConfirmMember
            ? `Are you sure you want to delete ${deleteConfirmMember.name} (${deleteConfirmMember.id})? They will be moved to Deleted Members.`
            : ''
        }
        confirmLabel="Delete Member"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={confirmSoftDelete}
        onClose={() => setDeleteConfirmMember(null)}
      />

      {/* Floating PWA Installation Banner */}
      <PwaInstallBanner />
    </div>
  );
}
