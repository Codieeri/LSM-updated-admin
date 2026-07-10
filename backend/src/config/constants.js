// ─── System Roles ───
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

// Role hierarchy (higher index = higher authority)
export const ROLE_HIERARCHY = [
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.HR,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
];

// ─── Permissions ───
export const PERMISSIONS = {
  // Employee
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_UPDATE: 'employee:update',
  EMPLOYEE_DELETE: 'employee:delete',

  // Attendance
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_MANAGE: 'attendance:manage',
  ATTENDANCE_EXPORT: 'attendance:export',

  // Shifts
  SHIFT_READ: 'shift:read',
  SHIFT_MANAGE: 'shift:manage',

  // Departments
  DEPARTMENT_READ: 'department:read',
  DEPARTMENT_MANAGE: 'department:manage',

  // Reports
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',

  // Onboarding
  ONBOARDING_MANAGE: 'onboarding:manage',

  // Leaves
  LEAVE_REQUEST: 'leave:request',
  LEAVE_APPROVE: 'leave:approve',

  // Audit
  AUDIT_VIEW: 'audit:view',

  // Roles
  ROLE_MANAGE: 'role:manage',
};

// ─── Default Role → Permission Mapping ───
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMIN]: [
    PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.EMPLOYEE_DELETE,
    PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.ATTENDANCE_EXPORT,
    PERMISSIONS.SHIFT_READ, PERMISSIONS.SHIFT_MANAGE,
    PERMISSIONS.DEPARTMENT_READ, PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.ONBOARDING_MANAGE,
    PERMISSIONS.LEAVE_REQUEST, PERMISSIONS.LEAVE_APPROVE,
    PERMISSIONS.ROLE_MANAGE,
  ],

  [ROLES.HR]: [
    PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.EMPLOYEE_DELETE,
    PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.ATTENDANCE_EXPORT,
    PERMISSIONS.SHIFT_READ, PERMISSIONS.SHIFT_MANAGE,
    PERMISSIONS.DEPARTMENT_READ, PERMISSIONS.DEPARTMENT_MANAGE,
    PERMISSIONS.REPORT_VIEW, PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.ONBOARDING_MANAGE,
    PERMISSIONS.LEAVE_REQUEST, PERMISSIONS.LEAVE_APPROVE,
  ],

  [ROLES.MANAGER]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.SHIFT_READ,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.LEAVE_REQUEST, PERMISSIONS.LEAVE_APPROVE,
  ],

  [ROLES.EMPLOYEE]: [
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.SHIFT_READ,
    PERMISSIONS.DEPARTMENT_READ,
    PERMISSIONS.LEAVE_REQUEST,
  ],
};

// ─── Attendance Statuses ───
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half_day',
  LATE: 'late',
  ON_LEAVE: 'on_leave',
  HOLIDAY: 'holiday',
  WEEKEND: 'weekend',
};

// ─── Employment Types ───
export const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'];

// ─── Employee Statuses ───
export const EMPLOYEE_STATUS = ['active', 'on_leave', 'suspended', 'terminated'];

// ─── Onboarding Statuses ───
export const ONBOARDING_STATUS = ['pending', 'in_progress', 'completed'];

// ─── Leave Types ───
export const LEAVE_TYPES = ['sick', 'casual', 'earned', 'unpaid', 'wfh'];

// ─── Check-in Methods ───
export const CHECKIN_METHODS = ['web', 'mobile', 'biometric', 'qr', 'manual'];
