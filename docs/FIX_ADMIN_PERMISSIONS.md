# Fix Admin User Permissions - Complete Guide

## Issues Identified

1. ✅ **Missing EXECUTION_READ permission** - FIXED
2. ✅ **Missing `/workscript/executions` endpoint** - FIXED
3. ⏳ **Admin user needs proper permissions** - FOLLOW STEPS BELOW
4. ⏳ **UI text overlap in Quick Actions** - FOLLOW STEPS BELOW

## Code Changes Made

### 1. Added Execution Permissions (`apps/api/src/shared-services/auth/types.ts`)

```typescript
// Added after AUTOMATION_EXECUTE:
EXECUTION_READ = 'execution:read',
EXECUTION_EXPORT = 'execution:export',
EXECUTION_RERUN = 'execution:rerun',
```

### 2. Updated Permission Manager (`apps/api/src/shared-services/auth/PermissionManager.ts`)

Added execution permissions to USER and API roles:
- **USER role**: Can read, export, and rerun executions
- **API role**: Can read executions
- **ADMIN role**: Already has all permissions via `Object.values(Permission)`

### 3. Created Executions API Routes (`apps/api/src/plugins/workscript/executions/index.ts`)

New endpoints:
- `GET /workscript/executions` - List all executions with filtering
- `GET /workscript/executions/:id` - Get single execution
- `GET /workscript/executions/stats` - Get execution statistics
- `POST /workscript/executions/:id/rerun` - Rerun an execution

### 4. Mounted Executions Routes (`apps/api/src/plugins/workscript/plugin.ts`)

Added executions router to the Workscript plugin.

---

## Steps to Fix Admin User Permissions

### Option 1: Update via Database (Recommended)

**Connect to your database and run:**

```sql
-- Step 1: Check current admin user
SELECT id, email, role, permissions FROM users WHERE email LIKE '%admin%' OR role = 'admin';

-- Step 2: Update admin user role to 'admin' (if it's not already)
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';

-- Step 3: Clear any custom permissions (admin role gets all permissions automatically)
UPDATE users
SET permissions = '[]'
WHERE email = 'your-admin-email@example.com';

-- Step 4: Verify the update
SELECT id, email, role, permissions FROM users WHERE email = 'your-admin-email@example.com';
```

**Note:** Replace `'your-admin-email@example.com'` with your actual admin email.

### Option 2: Use Drizzle Studio (Visual UI)

```bash
cd apps/api
bun run db:studio
```

Then:
1. Open Drizzle Studio in your browser (usually http://localhost:4983)
2. Navigate to the `users` table
3. Find your admin user
4. Update:
   - `role` field to `'admin'`
   - `permissions` field to `[]` (empty array)
5. Save changes

### Option 3: Create a Migration Script

Create a file: `apps/api/scripts/fix-admin-user.ts`

```typescript
import { db } from '../src/db';
import { users } from '../src/db/schema/auth.schema';
import { eq } from 'drizzle-orm';

async function fixAdminUser() {
  const adminEmail = process.argv[2] || 'admin@example.com';

  console.log(`Updating admin user: ${adminEmail}`);

  const result = await db
    .update(users)
    .set({
      role: 'admin',
      permissions: []
    })
    .where(eq(users.email, adminEmail));

  console.log('✅ Admin user updated successfully');
  console.log('Role: admin');
  console.log('Permissions: [] (inherits all from admin role)');
}

fixAdminUser().catch(console.error);
```

Then run:
```bash
cd apps/api
bun run scripts/fix-admin-user.ts your-admin-email@example.com
```

---

## Fix Quick Actions Text Overlap

Update the file: `apps/frontend/src/components/dashboard/QuickActions.tsx`

**Change line 103:**

```typescript
// FROM:
className="h-auto flex flex-col items-center gap-3 py-6 px-4 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all duration-200"

// TO:
className="h-auto flex flex-col items-center gap-2 py-4 px-3 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all duration-200"
```

**And update line 107:**

```typescript
// FROM:
<span className="font-medium text-center text-sm">
  {action.label}
</span>

// TO:
<span className="font-medium text-center text-xs leading-tight whitespace-normal">
  {action.label}
</span>
```

---

## Rebuild and Test

1. **Rebuild the API** (to include new permission enums and routes):
```bash
cd apps/api
bun run build
```

2. **Restart the API server**:
```bash
bun run dev:api
```

3. **Clear browser cache and refresh**:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Or clear localStorage: Open DevTools → Application → Local Storage → Clear

4. **Log out and log back in** to refresh permissions

---

## Verification Steps

After making these changes, verify:

### 1. Check API Endpoints
```bash
curl http://localhost:3000/workscript/executions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Should return a list of executions (not 404).

### 2. Check Browser Console
The errors about 404 for `/workscript/executions` should be gone.

### 3. Check Dashboard
- ✅ Quick Actions buttons should have properly wrapped text
- ✅ No more "You don't have permission..." message at bottom
- ✅ Execution statistics should load

### 4. Check User Permissions
In DevTools Console:
```javascript
JSON.parse(localStorage.getItem('user'))
```

Should show:
```json
{
  "role": "admin",
  "permissions": []  // Empty is correct - inherits all from admin role
}
```

---

## Understanding the Permission System

### How RBAC Works

1. **Roles** (`Role.ADMIN`, `Role.USER`, `Role.API`) define permission sets
2. **PermissionManager** maps roles to permissions automatically
3. **Custom permissions** in `user.permissions` array can add more (but admin doesn't need this)

### Admin Role Permissions

When `user.role = 'admin'`:
- PermissionManager gives: `Object.values(Permission)` = ALL permissions
- No need for custom permissions array
- Automatically includes:
  - All workflow permissions
  - All automation permissions
  - All execution permissions (newly added)
  - All user management permissions
  - All system permissions

### Frontend Permission Check

The dashboard checks: `hasPermission('EXECUTION_READ')`

This function:
1. Checks `user.permissions` array first
2. Then checks `PermissionManager.rolePermissions[user.role]`
3. Returns `true` if admin role (has all permissions)

---

## Troubleshooting

### Issue: Still seeing 404 errors

**Solution:**
1. Make sure API is rebuilt: `cd apps/api && bun run build`
2. Restart API server
3. Clear browser cache

### Issue: Still seeing permission denied

**Solution:**
1. Verify admin user role in database: `SELECT role FROM users WHERE email = 'your-email'`
2. Should show `'admin'` not `'user'`
3. Log out and log back in to refresh JWT token

### Issue: Text still overlapping

**Solution:**
1. Hard refresh browser: `Cmd+Shift+R` or `Ctrl+Shift+R`
2. Check if changes were applied to QuickActions.tsx
3. Restart frontend dev server: `bun run dev:frontend`

---

## Summary of Changes

### Backend Changes
- ✅ Added 3 execution permissions to enum
- ✅ Updated PermissionManager role mappings
- ✅ Created `/executions` API routes
- ✅ Mounted routes in Workscript plugin

### Database Changes
- ⏳ Update admin user `role = 'admin'`
- ⏳ Clear admin user `permissions = []`

### Frontend Changes
- ⏳ Fix QuickActions button styling

### Next Steps
1. Follow database update steps above (Option 1, 2, or 3)
2. Apply QuickActions.tsx changes
3. Rebuild and restart
4. Test and verify

---

## Questions?

If you encounter any issues:
1. Check the API logs for errors
2. Check browser console for errors
3. Verify database changes were applied
4. Ensure you logged out and back in after changes
