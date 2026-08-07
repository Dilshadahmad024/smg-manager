/**
 * SMG Manager - Gym Management Web App Types
 */

export type MemberStatus = 'Active' | 'Expired' | 'Blocked' | 'Freeze' | 'Partial' | 'Unpaid';

export type Gender = 'Male' | 'Female' | 'Other';

export type DietPlanCategory =
  | 'Weight Loss'
  | 'Muscle Gain'
  | 'ADV Weight Loss'
  | 'ADV Muscle Gain'
  | 'ADV Keto Pro'
  | 'ADV Competition Prep'
  | 'ADV Intermittent Fasting'
  | 'ADV High Protein Maintenance';

export interface DietMeal {
  id?: string;
  time: string; // e.g., "08:00 AM" or "Breakfast"
  title: string; // e.g. "High Protein Oats & Egg Whites"
  foodItems: string[]; // e.g. ["1 Cup Oats", "4 Egg Whites", "1 Banana"]
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatsGrams?: number;
  notes?: string;
}

export interface DietPlan {
  id: string;
  tenantId?: string;
  title: string;
  isAdv: boolean; // Advanced Plan flag
  category: DietPlanCategory;
  targetGoal: string; // e.g. "Fat Loss + Lean Muscle Retention"
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  waterIntakeLiters: number;
  description?: string;
  meals: DietMeal[];
  supplements?: string[];
  dosAndDonts?: {
    dos: string[];
    donts: string[];
  };
  createdAt?: string;
}

export interface Member {
  id: string; // e.g., "1"
  tenantId?: string;
  name: string;
  photo: string;
  mobile: string;
  cnic: string;
  gender: Gender;
  address: string;
  emergencyContact: string;
  joiningDate: string; // YYYY-MM-DD
  membershipPlanId: string;
  membershipPlanName: string;
  startDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  paidAmount: number;
  dueAmount: number;
  status: MemberStatus;
  isFrozen?: boolean;
  freezeReason?: string;
  dietPlanId?: string;
  dietPlanName?: string;
  assignedDietDate?: string;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface MembershipPlan {
  id: string;
  tenantId?: string;
  name: string;
  durationMonths: number;
  price: number;
  admissionFee: number;
  genderTarget: 'All' | 'Gents' | 'Ladies';
  description?: string;
}

export interface PaymentRecord {
  id: string;
  tenantId?: string;
  memberId: string;
  memberName: string;
  planName: string;
  amount: number;
  paymentMethod: 'Cash' | 'Online' | 'Card' | 'Bank Transfer';
  paymentDate: string;
  receiptNo: string;
  remarks?: string;
}

export interface MembershipHistory {
  id: string;
  tenantId?: string;
  memberId: string;
  planName: string;
  startDate: string;
  expiryDate: string;
  paidAmount: number;
  renewedAt: string;
}

export interface AttendanceRecord {
  id: string;
  tenantId?: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent';
  timeIn?: string;
  method?: 'Manual' | 'Biometric' | 'QR Code';
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Trainer Salary'
  | 'Equipment'
  | 'Maintenance'
  | 'Supplements'
  | 'Marketing'
  | 'Utilities'
  | 'Other';

export interface Expense {
  id: string;
  tenantId?: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'Online';
  description?: string;
}

export type EnquiryStatus = 'Pending' | 'Contacted' | 'Converted' | 'Lost';

export interface Enquiry {
  id: string;
  tenantId?: string;
  name: string;
  mobile: string;
  gender: Gender;
  date: string; // YYYY-MM-DD
  interestedPlan: string;
  source: string;
  notes: string;
  followUpDate: string;
  status: EnquiryStatus;
}

export interface DeviceSession {
  id: string;
  tenantId?: string;
  deviceName: string;
  deviceType: 'Mobile' | 'Laptop' | 'Desktop' | 'Tablet' | 'Biometric';
  browser: string;
  lastActive: string;
  ipAddress: string;
  isCurrent: boolean;
}

export type ThemeColor = 'emerald' | 'blue' | 'crimson' | 'amber' | 'indigo' | 'slate';
export type Language = 'en' | 'ur';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MMM-YYYY';

export interface GymSettings {
  tenantId?: string;
  gymName: string;
  gymLogo: string;
  adminName: string;
  adminEmail: string;
  adminMobile: string;
  address: string;
  currencySymbol: string; // e.g. "Rs" or "$" or "PKR"
  language: 'en' | 'ur';
  themeColor: ThemeColor;
  dateFormat?: DateFormat;
  googleDriveConnected: boolean;
  lastBackupDate: string | null;
  biometricIp: string;
  biometricPort: number;
  biometricConnected: boolean;
}

export interface AdminUser {
  id?: string;
  tenantId?: string;
  email: string;
  gymName: string;
  adminName: string;
  mobile: string;
  password?: string;
  isLoggedIn: boolean;
  rememberMe?: boolean;
}

export interface UserAccount {
  id: string;
  tenantId: string;
  gymName: string;
  adminName: string;
  mobile: string;
  email: string;
  password?: string;
  createdAt: string;
}
