import bcrypt from "bcrypt";
import { type User } from "@shared/schema";
import { storage } from "./storage";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await storage.getUserByUsername(username);
  
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(password, user.password);
  
  if (!isValid) {
    return null;
  }
  
  return user;
}

export function canAccessTask(user: User, task: { departmentId: string | null; createdById: string }, assignments: { userId: string }[]): boolean {
  const role = user.role;
  
  if (role === "Giám đốc" || role === "Phó Giám đốc") {
    return true;
  }
  
  if (role === "Trưởng phòng") {
    if (user.departmentId === task.departmentId) {
      return true;
    }
  }
  
  const isAssigned = assignments.some(a => a.userId === user.id);
  if (isAssigned) {
    return true;
  }
  
  return false;
}

export function canCreateTask(user: User): boolean {
  return ["Giám đốc", "Phó Giám đốc", "Trưởng phòng"].includes(user.role);
}

export function canAssignToUser(assignerRole: string, assignerDeptId: string | null, assigneeRole: string, assigneeDeptId: string | null): boolean {
  if (assignerRole === "Giám đốc" || assignerRole === "Phó Giám đốc") {
    return true;
  }
  
  if (assignerRole === "Trưởng phòng") {
    if (assignerDeptId === assigneeDeptId && (assigneeRole === "Phó trưởng phòng" || assigneeRole === "Chuyên viên")) {
      return true;
    }
  }
  
  return false;
}
