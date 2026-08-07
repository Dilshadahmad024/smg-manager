/**
 * Data Management Utility for SMG Manager
 * Handles Full JSON Backup/Restore (with Merge mode & Trash bin preservation)
 * and Excel/CSV Export/Import (with preview & duplicate prevention)
 */

import * as XLSX from 'xlsx';
import { Storage } from './storage';
import { Member, MembershipPlan } from '../types';

export interface ParsedMemberRow {
  rowIndex: number;
  id: string;
  name: string;
  mobile: string;
  cnic: string;
  gender: 'Male' | 'Female';
  address: string;
  emergencyContact: string;
  joiningDate: string;
  membershipPlanId: string;
  membershipPlanName: string;
  startDate: string;
  expiryDate: string;
  paidAmount: number;
  dueAmount: number;
  status: 'Active' | 'Expired' | 'Partial' | 'Unpaid';
  actionType: 'NEW' | 'UPDATE' | 'INVALID';
  errorMessage?: string;
}

export interface ExcelImportPreviewResult {
  totalRows: number;
  newCount: number;
  updateCount: number;
  invalidCount: number;
  rows: ParsedMemberRow[];
}

export const computeNextMemberId = (members?: Member[], countFallback: number = 0): string => {
  if (members && members.length > 0) {
    let maxId = 0;
    for (const m of members) {
      if (!m || !m.id) continue;
      const digitsOnly = m.id.replace(/\D/g, '');
      if (digitsOnly) {
        const num = parseInt(digitsOnly, 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    if (maxId > 0) {
      return String(maxId + 1);
    }
  }
  return String(countFallback + 1);
};

export const DataManagement = {
  /**
   * 1. FULL BACKUP EXPORT (JSON)
   * Downloads full JSON snapshot to local device
   */
  exportFullBackupJSON(): void {
    const fullBackup = {
      app: 'SMG_FITNESS_MANAGER',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      gymSettings: Storage.getSettings(),
      admin: Storage.getAdmin(),
      members: Storage.getMembers(),
      deletedMembers: Storage.getDeletedMembers(),
      plans: Storage.getPlans(),
      dietPlans: Storage.getDietPlans(),
      payments: Storage.getPayments(),
      membershipHistory: Storage.getMembershipHistory(),
      attendance: Storage.getAttendance(),
      expenses: Storage.getExpenses(),
      enquiries: Storage.getEnquiries(),
      devices: Storage.getDevices(),
    };

    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const gymNameClean = (Storage.getSettings().gymName || 'Gym').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${gymNameClean}_FullBackup_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * 2. FULL RESTORE / MERGE IMPORT (JSON)
   * Safely imports JSON backup in MERGE mode (default) or REPLACE mode
   */
  importFullBackupJSON(
    jsonStr: string,
    mode: 'merge' | 'replace' = 'merge'
  ): { success: boolean; message: string; membersAdded: number; membersUpdated: number } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || (typeof parsed !== 'object')) {
        return { success: false, message: 'Invalid JSON file format.', membersAdded: 0, membersUpdated: 0 };
      }

      if (mode === 'replace') {
        if (parsed.members) Storage.saveMembers(parsed.members);
        if (parsed.deletedMembers) localStorage.setItem('smg_deleted_members', JSON.stringify(parsed.deletedMembers));
        if (parsed.plans) Storage.savePlans(parsed.plans);
        if (parsed.payments) localStorage.setItem('smg_payments', JSON.stringify(parsed.payments));
        if (parsed.membershipHistory) localStorage.setItem('smg_membership_history', JSON.stringify(parsed.membershipHistory));
        if (parsed.attendance) Storage.saveAttendance(parsed.attendance);
        if (parsed.expenses) Storage.saveExpenses(parsed.expenses);
        if (parsed.enquiries) Storage.saveEnquiries(parsed.enquiries);
        if (parsed.gymSettings) Storage.saveSettings(parsed.gymSettings);
        if (parsed.admin) Storage.saveAdmin(parsed.admin);
        return { success: true, message: 'Full data snapshot replaced successfully.', membersAdded: parsed.members?.length || 0, membersUpdated: 0 };
      }

      // MERGE MODE
      let addedCount = 0;
      let updatedCount = 0;

      // 1. Members Merge
      const currentMembers = Storage.getMembers();
      const currentDeletedMembers = Storage.getDeletedMembers();

      const memberMap = new Map<string, Member>();
      currentMembers.forEach((m) => memberMap.set(m.id.trim().toLowerCase(), m));

      const deletedMap = new Map<string, Member>();
      currentDeletedMembers.forEach((m) => deletedMap.set(m.id.trim().toLowerCase(), m));

      // Merge imported active members
      if (Array.isArray(parsed.members)) {
        parsed.members.forEach((impMember: Member) => {
          if (!impMember.id) return;
          const key = impMember.id.trim().toLowerCase();

          // If it's currently in deleted list, preserve its deleted state or update deleted record
          if (deletedMap.has(key)) {
            const existingDel = deletedMap.get(key)!;
            deletedMap.set(key, { ...existingDel, ...impMember, isDeleted: true });
          } else if (memberMap.has(key)) {
            // Update existing active member
            const existing = memberMap.get(key)!;
            memberMap.set(key, { ...existing, ...impMember });
            updatedCount++;
          } else {
            // Add new active member
            memberMap.set(key, impMember);
            addedCount++;
          }
        });
      }

      // Merge imported deleted members (must remain deleted!)
      if (Array.isArray(parsed.deletedMembers)) {
        parsed.deletedMembers.forEach((impDel: Member) => {
          if (!impDel.id) return;
          const key = impDel.id.trim().toLowerCase();
          // Remove from active list if imported as deleted
          memberMap.delete(key);
          deletedMap.set(key, { ...impDel, isDeleted: true });
        });
      }

      Storage.saveMembers(Array.from(memberMap.values()));
      localStorage.setItem('smg_deleted_members', JSON.stringify(Array.from(deletedMap.values())));

      // 2. Plans Merge
      if (Array.isArray(parsed.plans)) {
        const currentPlans = Storage.getPlans();
        const planMap = new Map<string, MembershipPlan>();
        currentPlans.forEach((p) => planMap.set(p.id, p));
        parsed.plans.forEach((p: MembershipPlan) => planMap.set(p.id, p));
        Storage.savePlans(Array.from(planMap.values()));
      }

      // 3. Payments Merge
      if (Array.isArray(parsed.payments)) {
        const currentPayments = Storage.getPayments();
        const payMap = new Map<string, any>();
        currentPayments.forEach((pay) => payMap.set(pay.id, pay));
        parsed.payments.forEach((pay: any) => {
          if (pay.id) payMap.set(pay.id, pay);
        });
        localStorage.setItem('smg_payments', JSON.stringify(Array.from(payMap.values())));
      }

      // 4. Attendance Merge
      if (Array.isArray(parsed.attendance)) {
        const currentAtt = Storage.getAttendance();
        const attMap = new Map<string, any>();
        currentAtt.forEach((a) => attMap.set(`${a.memberId}_${a.date}`, a));
        parsed.attendance.forEach((a: any) => {
          attMap.set(`${a.memberId}_${a.date}`, a);
        });
        Storage.saveAttendance(Array.from(attMap.values()));
      }

      // 5. Expenses Merge
      if (Array.isArray(parsed.expenses)) {
        const currentExp = Storage.getExpenses();
        const expMap = new Map<string, any>();
        currentExp.forEach((e) => expMap.set(e.id, e));
        parsed.expenses.forEach((e: any) => expMap.set(e.id, e));
        Storage.saveExpenses(Array.from(expMap.values()));
      }

      // 6. Enquiries Merge
      if (Array.isArray(parsed.enquiries)) {
        const currentEnq = Storage.getEnquiries();
        const enqMap = new Map<string, any>();
        currentEnq.forEach((eq) => enqMap.set(eq.id, eq));
        parsed.enquiries.forEach((eq: any) => enqMap.set(eq.id, eq));
        Storage.saveEnquiries(Array.from(enqMap.values()));
      }

      // 7. Settings Merge
      if (parsed.gymSettings) {
        Storage.saveSettings({ ...Storage.getSettings(), ...parsed.gymSettings });
      }

      return {
        success: true,
        message: `Merge successful! Added ${addedCount} new member(s) and updated ${updatedCount} existing member(s).`,
        membersAdded: addedCount,
        membersUpdated: updatedCount,
      };
    } catch (err: any) {
      console.error('Error restoring JSON backup:', err);
      return { success: false, message: `Restore failed: ${err.message || 'Invalid JSON format'}`, membersAdded: 0, membersUpdated: 0 };
    }
  },

  /**
   * 3. EXCEL / CSV EXPORT FOR MEMBERS
   */
  exportMembersToSpreadsheet(
    membersToExport: Member[],
    format: 'xlsx' | 'csv' = 'xlsx',
    customFileName?: string
  ): void {
    const rows = membersToExport.map((m) => ({
      'Member ID': m.id,
      'Full Name': m.name,
      'Mobile Phone': m.mobile,
      'CNIC': m.cnic || '',
      'Gender': m.gender,
      'Joining Date': m.joiningDate,
      'Membership Plan': m.membershipPlanName,
      'Start Date': m.startDate,
      'Expiry Date': m.expiryDate,
      'Paid Amount (Rs)': m.paidAmount,
      'Due Amount (Rs)': m.dueAmount,
      'Status': m.status,
      'Address': m.address || '',
      'Emergency Contact': m.emergencyContact || '',
      'Frozen Status': m.isFrozen ? 'Yes' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Members');

    const dateStr = new Date().toISOString().slice(0, 10);
    const gymNameClean = (Storage.getSettings().gymName || 'Gym').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = customFileName || `${gymNameClean}_Members_${dateStr}.${format}`;

    XLSX.writeFile(workbook, fileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  },

  /**
   * 4. EXCEL / CSV IMPORT PARSER & PREVIEW GENERATOR
   */
  async parseMembersFile(file: File): Promise<ExcelImportPreviewResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const currentMembers = Storage.getMembers();
    const currentDeletedMembers = Storage.getDeletedMembers();

    const existingIdMap = new Map<string, Member>();
    currentMembers.forEach((m) => existingIdMap.set(m.id.trim().toLowerCase(), m));

    const existingMobileMap = new Map<string, Member>();
    currentMembers.forEach((m) => {
      const cleanMob = m.mobile.replace(/\D/g, '');
      if (cleanMob.length >= 7) existingMobileMap.set(cleanMob, m);
    });

    const parsedRows: ParsedMemberRow[] = [];
    let newCount = 0;
    let updateCount = 0;
    let invalidCount = 0;

    let nextAutoIdIndex = parseInt(computeNextMemberId(currentMembers, currentMembers.length), 10);

    rawRows.forEach((row, idx) => {
      // Find values by matching flexible column titles
      const getVal = (...keys: string[]): string => {
        for (const k of keys) {
          for (const rowKey of Object.keys(row)) {
            if (rowKey.trim().toLowerCase() === k.trim().toLowerCase()) {
              return String(row[rowKey]).trim();
            }
          }
        }
        return '';
      };

      const rawId = getVal('Member ID', 'ID', 'MemberID', 'Member_ID', 'Code');
      const name = getVal('Full Name', 'Name', 'Member Name', 'MemberName');
      const mobile = getVal('Mobile Phone', 'Phone', 'Mobile', 'Contact', 'Cell', 'MobilePhone');
      const cnic = getVal('CNIC', 'CNIC Number', 'CnicNo', 'NIC');
      const genderRaw = getVal('Gender', 'Sex');
      const joiningDateRaw = getVal('Joining Date', 'JoiningDate', 'Joined');
      const planName = getVal('Membership Plan', 'Plan', 'Plan Name', 'MembershipPlan');
      const startDateRaw = getVal('Start Date', 'StartDate');
      const expiryDateRaw = getVal('Expiry Date', 'ExpiryDate', 'DueDate');
      const paidRaw = getVal('Paid Amount (Rs)', 'Paid Amount', 'Paid', 'PaidAmount');
      const dueRaw = getVal('Due Amount (Rs)', 'Due Amount', 'Due', 'DueAmount');
      const statusRaw = getVal('Status', 'Member Status');
      const address = getVal('Address', 'Location');
      const emergencyContact = getVal('Emergency Contact', 'EmergencyPhone');

      const today = new Date().toISOString().slice(0, 10);

      // Validation
      if (!name) {
        parsedRows.push({
          rowIndex: idx + 2,
          id: rawId || `${nextAutoIdIndex++}`,
          name: row['Name'] || row['Member Name'] || 'Missing Name',
          mobile: mobile || '-',
          cnic,
          gender: 'Male',
          address,
          emergencyContact,
          joiningDate: joiningDateRaw || today,
          membershipPlanId: 'plan_monthly',
          membershipPlanName: planName || 'Monthly Fitness Plan',
          startDate: startDateRaw || today,
          expiryDate: expiryDateRaw || today,
          paidAmount: Number(paidRaw) || 0,
          dueAmount: Number(dueRaw) || 0,
          status: 'Active',
          actionType: 'INVALID',
          errorMessage: 'Missing Member Name',
        });
        invalidCount++;
        return;
      }

      const gender: 'Male' | 'Female' =
        genderRaw.toLowerCase().startsWith('f') || genderRaw.toLowerCase() === 'ladies' ? 'Female' : 'Male';

      const paidAmount = Number(paidRaw) || 0;
      const dueAmount = Number(dueRaw) || 0;

      let status: 'Active' | 'Expired' | 'Partial' | 'Unpaid' = 'Active';
      if (statusRaw) {
        const sLower = statusRaw.toLowerCase();
        if (sLower.includes('exp')) status = 'Expired';
        else if (sLower.includes('part')) status = 'Partial';
        else if (sLower.includes('unpaid')) status = 'Unpaid';
        else if (sLower.includes('act')) status = 'Active';
      } else {
        if (dueAmount > 0 && paidAmount > 0) status = 'Partial';
        else if (paidAmount === 0 && dueAmount > 0) status = 'Unpaid';
      }

      // Member ID resolution
      let memberId = rawId;
      let actionType: 'NEW' | 'UPDATE' = 'NEW';

      if (memberId) {
        const key = memberId.trim().toLowerCase();
        if (existingIdMap.has(key)) {
          actionType = 'UPDATE';
          updateCount++;
        } else {
          actionType = 'NEW';
          newCount++;
        }
      } else {
        // Match by mobile if no ID provided
        const cleanMob = mobile.replace(/\D/g, '');
        if (cleanMob.length >= 7 && existingMobileMap.has(cleanMob)) {
          const existing = existingMobileMap.get(cleanMob)!;
          memberId = existing.id;
          actionType = 'UPDATE';
          updateCount++;
        } else {
          memberId = `${nextAutoIdIndex++}`;
          actionType = 'NEW';
          newCount++;
        }
      }

      parsedRows.push({
        rowIndex: idx + 2,
        id: memberId,
        name,
        mobile: mobile || '+92 300 0000000',
        cnic,
        gender,
        address,
        emergencyContact,
        joiningDate: joiningDateRaw || today,
        membershipPlanId: 'plan_monthly',
        membershipPlanName: planName || 'Monthly Fitness Plan',
        startDate: startDateRaw || today,
        expiryDate: expiryDateRaw || today,
        paidAmount,
        dueAmount,
        status,
        actionType,
      });
    });

    return {
      totalRows: rawRows.length,
      newCount,
      updateCount,
      invalidCount,
      rows: parsedRows,
    };
  },

  /**
   * 5. APPLY EXCEL / CSV IMPORTED MEMBERS
   */
  applyExcelImport(validRows: ParsedMemberRow[]): { added: number; updated: number } {
    const currentMembers = Storage.getMembers();
    const memberMap = new Map<string, Member>();
    currentMembers.forEach((m) => memberMap.set(m.id.trim().toLowerCase(), m));

    let added = 0;
    let updated = 0;

    validRows.forEach((row) => {
      if (row.actionType === 'INVALID') return;

      const key = row.id.trim().toLowerCase();
      const existing = memberMap.get(key);

      if (existing) {
        memberMap.set(key, {
          ...existing,
          name: row.name || existing.name,
          mobile: row.mobile || existing.mobile,
          cnic: row.cnic || existing.cnic,
          gender: row.gender || existing.gender,
          joiningDate: row.joiningDate || existing.joiningDate,
          membershipPlanName: row.membershipPlanName || existing.membershipPlanName,
          startDate: row.startDate || existing.startDate,
          expiryDate: row.expiryDate || existing.expiryDate,
          paidAmount: row.paidAmount ?? existing.paidAmount,
          dueAmount: row.dueAmount ?? existing.dueAmount,
          status: row.status || existing.status,
          address: row.address || existing.address,
          emergencyContact: row.emergencyContact || existing.emergencyContact,
        });
        updated++;
      } else {
        const newMember: Member = {
          id: row.id,
          name: row.name,
          photo: '',
          mobile: row.mobile,
          cnic: row.cnic,
          gender: row.gender,
          joiningDate: row.joiningDate,
          membershipPlanId: row.membershipPlanId || 'plan_monthly',
          membershipPlanName: row.membershipPlanName || 'Monthly Fitness Plan',
          startDate: row.startDate,
          expiryDate: row.expiryDate,
          paidAmount: row.paidAmount,
          dueAmount: row.dueAmount,
          status: row.status,
          address: row.address,
          emergencyContact: row.emergencyContact,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        memberMap.set(key, newMember);
        added++;
      }
    });

    Storage.saveMembers(Array.from(memberMap.values()));
    return { added, updated };
  },
};
