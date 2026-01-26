# 🛠 Auth Migration Fix Guide: Role-Based Access Control (RBAC)

## The Problem
The `roleAuth` middleware is failing because of a **Type Mismatch**. 
- **Expected (Legacy):** `user.id` as `number`, `username` property, and a specific `role` location.
- **Actual (Better Auth):** `user.id` as `string`, `email` instead of `username`, and `role` as an additional field.

---

## 📋 Steps to Fix Tonight

### 1. Update Global Type Definitions
Locate your `AuthRequest` interface (likely in `types/index.d.ts` or `middleware/roleAuth.ts`) and align it with the Better Auth User object.

```typescript
// Better Auth User Schema mapping
export interface AuthRequest extends express.Request {
    user: {
        id: string;      // Changed from number to string
        email: string;   // Changed from username to email
        name: string;
        role: string;    // Ensure this matches your DB column name
    };
    session: any;
}