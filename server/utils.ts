import { type User, type UserWithDepartment } from "@shared/schema";

// Overloaded signatures for sanitizeUser
export function sanitizeUser(user: UserWithDepartment): Omit<UserWithDepartment, "password">;
export function sanitizeUser(user: User): Omit<User, "password">;
export function sanitizeUser(user: User | UserWithDepartment): Omit<User | UserWithDepartment, "password"> {
  const { password, ...sanitized } = user;
  return sanitized;
}

// Overloaded signatures for sanitizeUsers  
export function sanitizeUsers(users: UserWithDepartment[]): Omit<UserWithDepartment, "password">[];
export function sanitizeUsers(users: User[]): Omit<User, "password">[];
export function sanitizeUsers(users: (User | UserWithDepartment)[]): Omit<(User | UserWithDepartment), "password">[] {
  return users.map(sanitizeUser);
}
