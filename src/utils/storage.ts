/**
 * Storage and Persistence Utility for SMG Manager
 * Multi-Tenant SaaS Engine supporting complete Gym Owner / Tenant data isolation.
 */

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
  UserAccount,
  DietPlan,
} from '../types';
import { FirebaseService } from '../lib/firebase';
import { defaultStarterDietPlans } from './defaultDietPlans';

const KEYS = {
  USERS_REGISTRY: 'smg_users_registry',
  CURRENT_TENANT: 'smg_current_tenant_id',
  MEMBERS: 'members',
  DELETED_MEMBERS: 'deleted_members',
  PLANS: 'plans',
  DIET_PLANS: 'diet_plans',
  PAYMENTS: 'payments',
  MEMBERSHIP_HISTORY: 'membership_history',
  ATTENDANCE: 'attendance',
  EXPENSES: 'expenses',
  ENQUIRIES: 'enquiries',
  DEVICES: 'devices',
  SETTINGS: 'settings',
  ADMIN: 'admin',
};

// Default Gym Settings
export const defaultSettings: GymSettings = {
  tenantId: 'tenant_default',
  gymName: 'Shah Muqeem Gym',
  gymLogo: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80',
  adminName: 'Admin',
  adminEmail: 'shahmuqeemgym.pk@gmail.com',
  adminMobile: '03001234567',
  address: 'Shah Muqeem Gym Complex, Main Boulevard',
  currencySymbol: 'Rs',
  language: 'en',
  themeColor: 'emerald',
  dateFormat: 'DD/MM/YYYY',
  googleDriveConnected: true,
  lastBackupDate: new Date().toISOString().slice(0, 10),
  biometricIp: '192.168.1.105',
  biometricPort: 4370,
  biometricConnected: true,
};

// Default Admin User
export const defaultAdmin: AdminUser = {
  id: 'usr_default',
  tenantId: 'tenant_default',
  email: 'shahmuqeemgym.pk@gmail.com',
  gymName: 'Shah Muqeem Gym',
  adminName: 'Admin',
  mobile: '03001234567',
  password: '123',
  isLoggedIn: false,
  rememberMe: true,
};

// Starter Membership Plans for new tenant workspaces
export const defaultStarterPlans: MembershipPlan[] = [
  {
    id: 'plan_monthly_default',
    tenantId: 'tenant_default',
    name: 'Monthly Membership',
    durationMonths: 1,
    price: 3000,
    admissionFee: 1000,
    genderTarget: 'All',
    description: '30-Day Active Gym Membership',
  },
  {
    id: 'plan_quarterly_default',
    tenantId: 'tenant_default',
    name: 'Quarterly Package (3 Months)',
    durationMonths: 3,
    price: 8000,
    admissionFee: 1000,
    genderTarget: 'All',
    description: '3 Months Active Gym Package',
  },
  {
    id: 'plan_yearly_default',
    tenantId: 'tenant_default',
    name: 'Annual VIP Membership',
    durationMonths: 12,
    price: 28000,
    admissionFee: 0,
    genderTarget: 'All',
    description: '1 Year Full Access Pass',
  },
];

// LocalStorage Low-Level Helpers
function loadData<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return seed;
  }
}

function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

// Multi-Tenant Isolation Key Resolver
function getCurrentTenantId(): string {
  try {
    return localStorage.getItem(KEYS.CURRENT_TENANT) || 'tenant_default';
  } catch {
    return 'tenant_default';
  }
}

function getTenantKey(baseKey: string, tenantId?: string): string {
  const tId = tenantId || getCurrentTenantId();
  return `smg_${tId}_${baseKey}`;
}

// Storage Store API
export const Storage = {
  getCurrentTenantId(): string {
    return getCurrentTenantId();
  },

  setCurrentTenantId(tenantId: string) {
    saveData(KEYS.CURRENT_TENANT, tenantId);
  },

  // Multi-Tenant User Registry & Authentication
  getUsersRegistry(): UserAccount[] {
    return loadData<UserAccount[]>(KEYS.USERS_REGISTRY, []);
  },

  registerUser(
    accountData: {
      gymName: string;
      adminName: string;
      mobile: string;
      email?: string;
      password?: string;
    },
    rememberMe: boolean = true
  ): { success: boolean; account: UserAccount; admin: AdminUser } {
    const registry = this.getUsersRegistry();
    const cleanMobile = accountData.mobile.trim().toLowerCase();
    const cleanEmail = (accountData.email || '').trim().toLowerCase();

    const existing = registry.find(
      (u) =>
        (cleanMobile && u.mobile.toLowerCase() === cleanMobile) ||
        (cleanEmail && cleanEmail !== 'admin@smgmanager.com' && u.email.toLowerCase() === cleanEmail)
    );

    if (existing) {
      throw new Error('An account with this Mobile Number or Email already exists. Please Sign In.');
    }

    const newTenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newAccount: UserAccount = {
      id: userId,
      tenantId: newTenantId,
      gymName: accountData.gymName.trim(),
      adminName: accountData.adminName.trim(),
      mobile: accountData.mobile.trim(),
      email: accountData.email?.trim() || `admin_${Date.now()}@smgmanager.com`,
      password: accountData.password || '123',
      createdAt: new Date().toISOString(),
    };

    registry.push(newAccount);
    saveData(KEYS.USERS_REGISTRY, registry);

    // Set as active tenant ID
    this.setCurrentTenantId(newTenantId);

    // Initialize clean Settings & Admin User for this tenant
    const tenantSettings: GymSettings = {
      ...defaultSettings,
      tenantId: newTenantId,
      gymName: accountData.gymName.trim(),
      adminName: accountData.adminName.trim(),
      adminMobile: accountData.mobile.trim(),
      adminEmail: accountData.email?.trim() || `admin_${Date.now()}@smgmanager.com`,
    };

    const tenantAdmin: AdminUser = {
      id: userId,
      tenantId: newTenantId,
      gymName: accountData.gymName.trim(),
      adminName: accountData.adminName.trim(),
      mobile: accountData.mobile.trim(),
      email: accountData.email?.trim() || `admin_${Date.now()}@smgmanager.com`,
      password: accountData.password || '123',
      isLoggedIn: true,
      rememberMe,
    };

    this.saveSettings(tenantSettings);
    this.saveAdmin(tenantAdmin);

    // Seed default starter membership plans for the new tenant workspace
    const starterPlans = defaultStarterPlans.map((p, idx) => ({
      ...p,
      id: `plan_${newTenantId}_${idx + 1}`,
      tenantId: newTenantId,
    }));
    this.savePlans(starterPlans);

    // Ensure completely clean initial dataset for new tenant
    this.saveMembers([]);
    saveData(getTenantKey(KEYS.DELETED_MEMBERS, newTenantId), []);
    saveData(getTenantKey(KEYS.PAYMENTS, newTenantId), []);
    saveData(getTenantKey(KEYS.ATTENDANCE, newTenantId), []);
    saveData(getTenantKey(KEYS.EXPENSES, newTenantId), []);
    saveData(getTenantKey(KEYS.ENQUIRIES, newTenantId), []);
    saveData(getTenantKey(KEYS.DEVICES, newTenantId), []);

    return { success: true, account: newAccount, admin: tenantAdmin };
  },

  loginUser(
    identifier: string,
    passwordInput: string,
    rememberMe: boolean = true
  ): { success: boolean; account: UserAccount; admin: AdminUser } {
    const registry = this.getUsersRegistry();
    const input = identifier.trim().toLowerCase();

    let target = registry.find(
      (u) => (u.mobile && u.mobile.toLowerCase() === input) || (u.email && u.email.toLowerCase() === input)
    );

    // Fallback default demo account if registry is empty
    if (!target && (input === '03001234567' || input === 'admin@smgmanager.com' || input === 'admin')) {
      target = {
        id: 'usr_default',
        tenantId: 'tenant_default',
        gymName: defaultSettings.gymName,
        adminName: defaultAdmin.adminName,
        mobile: defaultAdmin.mobile,
        email: defaultAdmin.email,
        password: defaultAdmin.password,
        createdAt: new Date().toISOString(),
      };
    }

    if (!target) {
      throw new Error('Account not found with this Mobile Number or Email. Please Register first.');
    }

    if (target.password && passwordInput !== target.password) {
      throw new Error('Incorrect Password. Please enter your correct registered password.');
    }

    // Switch active tenant ID
    this.setCurrentTenantId(target.tenantId);

    const loggedInAdmin: AdminUser = {
      id: target.id,
      tenantId: target.tenantId,
      email: target.email,
      gymName: target.gymName || this.getSettings().gymName || 'Shah Muqeem Gym',
      adminName: target.adminName || 'Admin',
      mobile: target.mobile,
      password: target.password,
      isLoggedIn: true,
      rememberMe,
    };

    this.saveAdmin(loggedInAdmin);
    return { success: true, account: target, admin: loggedInAdmin };
  },

  // Members
  getMembers(): Member[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.MEMBERS, tId);
    return loadData<Member[]>(key, []);
  },

  saveMembers(members: Member[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.MEMBERS, tId);
    saveData(key, members);
    members.forEach((m) => FirebaseService.upsertMember(m, tId));
  },

  async addMember(member: Member): Promise<{ success: boolean; error?: string }> {
    const tId = getCurrentTenantId();
    const members = this.getMembers();
    const memberWithTenant = { ...member, tenantId: tId };
    const existingIndex = members.findIndex((m) => m.id === memberWithTenant.id);
    if (existingIndex !== -1) {
      members[existingIndex] = memberWithTenant;
    } else {
      members.unshift(memberWithTenant);
    }
    this.saveMembers(members);
    await FirebaseService.upsertMember(memberWithTenant, tId);
    return { success: true };
  },

  async updateMember(updatedMember: Member): Promise<{ success: boolean; error?: string }> {
    const tId = getCurrentTenantId();
    const memberWithTenant = { ...updatedMember, tenantId: tId };
    const members = this.getMembers().map((m) => (m.id === updatedMember.id ? memberWithTenant : m));
    this.saveMembers(members);
    await FirebaseService.upsertMember(memberWithTenant, tId);
    return { success: true };
  },

  async hardDeleteMember(memberId: string) {
    const cleanId = memberId.trim();
    const tId = getCurrentTenantId();

    const members = this.getMembers().filter(
      (m) => m.id !== cleanId && m.id.trim().toLowerCase() !== cleanId.toLowerCase()
    );
    const deletedList = this.getDeletedMembers().filter(
      (m) => m.id !== cleanId && m.id.trim().toLowerCase() !== cleanId.toLowerCase()
    );

    saveData(getTenantKey(KEYS.MEMBERS, tId), members);
    saveData(getTenantKey(KEYS.DELETED_MEMBERS, tId), deletedList);

    const payments = this.getPayments().filter(
      (p) => p.memberId !== cleanId && p.memberId?.trim().toLowerCase() !== cleanId.toLowerCase()
    );
    saveData(getTenantKey(KEYS.PAYMENTS, tId), payments);

    const attendance = this.getAttendance().filter(
      (a) => a.memberId !== cleanId && a.memberId?.trim().toLowerCase() !== cleanId.toLowerCase()
    );
    saveData(getTenantKey(KEYS.ATTENDANCE, tId), attendance);

    const enquiries = this.getEnquiries().filter(
      (e) => (e as any).memberId !== cleanId && (e as any).memberId?.trim().toLowerCase() !== cleanId.toLowerCase()
    );
    saveData(getTenantKey(KEYS.ENQUIRIES, tId), enquiries);

    await FirebaseService.deleteMember(cleanId, tId);
  },

  async softDeleteMember(memberId: string) {
    await this.hardDeleteMember(memberId);
  },

  // Deleted Members
  getDeletedMembers(): Member[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.DELETED_MEMBERS, tId);
    return loadData<Member[]>(key, []);
  },

  async restoreMember(memberId: string) {
    const tId = getCurrentTenantId();
    const deletedList = this.getDeletedMembers();
    const members = this.getMembers();
    const targetIndex = deletedList.findIndex((m) => m.id === memberId);
    if (targetIndex !== -1) {
      const target = deletedList[targetIndex];
      target.isDeleted = false;
      delete target.deletedAt;
      members.unshift(target);
      deletedList.splice(targetIndex, 1);
      saveData(getTenantKey(KEYS.MEMBERS, tId), members);
      saveData(getTenantKey(KEYS.DELETED_MEMBERS, tId), deletedList);
      await FirebaseService.upsertMember(target, tId);
    }
  },

  async permanentlyDeleteMember(memberId: string) {
    await this.hardDeleteMember(memberId);
  },

  // Membership Plans
  getPlans(): MembershipPlan[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.PLANS, tId);
    const plans = loadData<MembershipPlan[]>(key, defaultStarterPlans);
    return plans;
  },

  savePlans(plans: MembershipPlan[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.PLANS, tId);
    const plansWithTenant = plans.map((p) => ({ ...p, tenantId: tId }));
    saveData(key, plansWithTenant);
    FirebaseService.savePlans(plansWithTenant, tId);
  },

  // Diet Plans (Standard & ADV Options)
  getDietPlans(): DietPlan[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.DIET_PLANS, tId);
    return loadData<DietPlan[]>(key, defaultStarterDietPlans);
  },

  saveDietPlans(plans: DietPlan[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.DIET_PLANS, tId);
    const plansWithTenant = plans.map((p) => ({ ...p, tenantId: tId }));
    saveData(key, plansWithTenant);
    FirebaseService.saveDietPlans(plansWithTenant, tId);
  },

  // Payments
  getPayments(): PaymentRecord[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.PAYMENTS, tId);
    return loadData<PaymentRecord[]>(key, []);
  },

  addPayment(payment: PaymentRecord) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.PAYMENTS, tId);
    const payments = this.getPayments();
    const record = { ...payment, tenantId: tId };
    payments.unshift(record);
    saveData(key, payments);
    FirebaseService.insertPayment(record, tId);
  },

  // Membership History
  getMembershipHistory(): MembershipHistory[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.MEMBERSHIP_HISTORY, tId);
    return loadData<MembershipHistory[]>(key, []);
  },

  addMembershipHistory(hist: MembershipHistory) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.MEMBERSHIP_HISTORY, tId);
    const list = this.getMembershipHistory();
    list.unshift({ ...hist, tenantId: tId });
    saveData(key, list);
  },

  // Attendance
  getAttendance(): AttendanceRecord[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.ATTENDANCE, tId);
    return loadData<AttendanceRecord[]>(key, []);
  },

  saveAttendance(attendance: AttendanceRecord[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.ATTENDANCE, tId);
    const records = attendance.map((a) => ({ ...a, tenantId: tId }));
    saveData(key, records);
  },

  markAttendance(memberId: string, date: string, status: 'Present' | 'Absent') {
    const tId = getCurrentTenantId();
    const attendance = this.getAttendance();
    const existingIndex = attendance.findIndex((a) => a.memberId === memberId && a.date === date);
    let targetAtt: AttendanceRecord;

    if (existingIndex !== -1) {
      attendance[existingIndex].status = status;
      if (status === 'Present') {
        attendance[existingIndex].timeIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      targetAtt = attendance[existingIndex];
    } else {
      targetAtt = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        tenantId: tId,
        memberId,
        date,
        status,
        timeIn: status === 'Present' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
        method: 'Manual',
      };
      attendance.unshift(targetAtt);
    }
    this.saveAttendance(attendance);
    FirebaseService.upsertAttendance(targetAtt, tId);
  },

  // Expenses
  getExpenses(): Expense[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.EXPENSES, tId);
    return loadData<Expense[]>(key, []);
  },

  saveExpenses(expenses: Expense[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.EXPENSES, tId);
    const records = expenses.map((e) => ({ ...e, tenantId: tId }));
    saveData(key, records);
  },

  addExpense(expense: Expense) {
    const tId = getCurrentTenantId();
    const expenses = this.getExpenses();
    const record = { ...expense, tenantId: tId };
    expenses.unshift(record);
    this.saveExpenses(expenses);
    FirebaseService.upsertExpense(record, tId);
  },

  updateExpense(updated: Expense) {
    const tId = getCurrentTenantId();
    const record = { ...updated, tenantId: tId };
    const expenses = this.getExpenses().map((e) => (e.id === updated.id ? record : e));
    this.saveExpenses(expenses);
    FirebaseService.upsertExpense(record, tId);
  },

  deleteExpense(id: string) {
    const tId = getCurrentTenantId();
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    this.saveExpenses(expenses);
    FirebaseService.deleteExpense(id, tId);
  },

  // Enquiries
  getEnquiries(): Enquiry[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.ENQUIRIES, tId);
    return loadData<Enquiry[]>(key, []);
  },

  saveEnquiries(enquiries: Enquiry[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.ENQUIRIES, tId);
    const records = enquiries.map((e) => ({ ...e, tenantId: tId }));
    saveData(key, records);
  },

  addEnquiry(enquiry: Enquiry) {
    const tId = getCurrentTenantId();
    const list = this.getEnquiries();
    const record = { ...enquiry, tenantId: tId };
    list.unshift(record);
    this.saveEnquiries(list);
    FirebaseService.upsertEnquiry(record, tId);
  },

  updateEnquiry(updated: Enquiry) {
    const tId = getCurrentTenantId();
    const record = { ...updated, tenantId: tId };
    const list = this.getEnquiries().map((e) => (e.id === updated.id ? record : e));
    this.saveEnquiries(list);
    FirebaseService.upsertEnquiry(record, tId);
  },

  deleteEnquiry(id: string) {
    const tId = getCurrentTenantId();
    const list = this.getEnquiries().filter((e) => e.id !== id);
    this.saveEnquiries(list);
    FirebaseService.deleteEnquiry(id, tId);
  },

  // Devices
  getDevices(): DeviceSession[] {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.DEVICES, tId);
    return loadData<DeviceSession[]>(key, []);
  },

  saveDevices(devices: DeviceSession[]) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.DEVICES, tId);
    saveData(key, devices);
  },

  revokeDevice(id: string) {
    const devices = this.getDevices().filter((d) => d.id !== id);
    this.saveDevices(devices);
  },

  // Settings
  getSettings(): GymSettings {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.SETTINGS, tId);
    const loaded = loadData(key, { ...defaultSettings, tenantId: tId });
    return { ...defaultSettings, ...loaded, tenantId: tId };
  },

  saveSettings(settings: GymSettings) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.SETTINGS, tId);
    const updated = { ...settings, tenantId: tId };
    saveData(key, updated);
    FirebaseService.saveSettings(updated, tId);
  },

  // Admin Auth
  getAdmin(): AdminUser {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.ADMIN, tId);
    const loaded = loadData(key, { ...defaultAdmin, tenantId: tId });

    const isSessionActive =
      typeof sessionStorage !== 'undefined' && sessionStorage.getItem('smg_session_active') === 'true';

    if (loaded.isLoggedIn) {
      if (isSessionActive) {
        return loaded;
      } else if (loaded.rememberMe !== false) {
        // Remember Me is enabled, keep session active across launches
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('smg_session_active', 'true');
        }
        return loaded;
      } else {
        // Remember Me was unchecked and browser session ended -> logout
        const loggedOutAdmin = { ...loaded, isLoggedIn: false };
        saveData(key, loggedOutAdmin);
        return loggedOutAdmin;
      }
    }

    return loaded;
  },

  saveAdmin(admin: AdminUser) {
    const tId = getCurrentTenantId();
    const key = getTenantKey(KEYS.ADMIN, tId);
    const updated = { ...admin, tenantId: tId };
    saveData(key, updated);

    if (typeof sessionStorage !== 'undefined') {
      if (admin.isLoggedIn) {
        sessionStorage.setItem('smg_session_active', 'true');
      } else {
        sessionStorage.removeItem('smg_session_active');
      }
    }

    FirebaseService.saveAdmin(updated, tId);
  },

  // Backup & Import / Export
  exportAllDataJSON(): string {
    const tId = getCurrentTenantId();
    const fullBackup = {
      version: '2.0-saas',
      tenantId: tId,
      exportedAt: new Date().toISOString(),
      gymSettings: this.getSettings(),
      admin: this.getAdmin(),
      members: this.getMembers(),
      deletedMembers: this.getDeletedMembers(),
      plans: this.getPlans(),
      payments: this.getPayments(),
      attendance: this.getAttendance(),
      expenses: this.getExpenses(),
      enquiries: this.getEnquiries(),
    };
    return JSON.stringify(fullBackup, null, 2);
  },

  importAllDataJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.members) this.saveMembers(parsed.members);
      if (parsed.deletedMembers) {
        const tId = getCurrentTenantId();
        saveData(getTenantKey(KEYS.DELETED_MEMBERS, tId), parsed.deletedMembers);
      }
      if (parsed.plans) this.savePlans(parsed.plans);
      if (parsed.payments) {
        const tId = getCurrentTenantId();
        saveData(getTenantKey(KEYS.PAYMENTS, tId), parsed.payments);
      }
      if (parsed.attendance) this.saveAttendance(parsed.attendance);
      if (parsed.expenses) this.saveExpenses(parsed.expenses);
      if (parsed.enquiries) this.saveEnquiries(parsed.enquiries);
      if (parsed.gymSettings) this.saveSettings(parsed.gymSettings);
      if (parsed.admin) this.saveAdmin(parsed.admin);
      return true;
    } catch (e) {
      console.error('Failed to import backup JSON:', e);
      return false;
    }
  },

  // Reset current tenant workspace
  resetAllData() {
    const tId = getCurrentTenantId();
    localStorage.removeItem(getTenantKey(KEYS.MEMBERS, tId));
    localStorage.removeItem(getTenantKey(KEYS.DELETED_MEMBERS, tId));
    localStorage.removeItem(getTenantKey(KEYS.PLANS, tId));
    localStorage.removeItem(getTenantKey(KEYS.PAYMENTS, tId));
    localStorage.removeItem(getTenantKey(KEYS.ATTENDANCE, tId));
    localStorage.removeItem(getTenantKey(KEYS.EXPENSES, tId));
    localStorage.removeItem(getTenantKey(KEYS.ENQUIRIES, tId));
    localStorage.removeItem(getTenantKey(KEYS.SETTINGS, tId));
    localStorage.removeItem(getTenantKey(KEYS.ADMIN, tId));
  },
};
