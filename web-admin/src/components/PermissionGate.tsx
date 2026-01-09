import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface PermissionGateProps {
    children: ReactNode;
    requiredPermission?: string;
    requiredRole?: string; // Code
    requiredLevel?: number; // Less than or equal to user level (1 is highest)
    fallback?: ReactNode;
}

export function PermissionGate({
    children,
    requiredPermission: _requiredPermission,
    requiredRole,
    requiredLevel,
    fallback = null
}: PermissionGateProps) {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return <>{fallback}</>;
    }

    // Role Level Check (Lower value is higher privilege usually, e.g. 1 SuperAdmin, 5 Viewer)
    // Wait, implementation plan says: 1 SuperAdmin, 5 Viewer.
    // So if requiredLevel is 3 (Supervisor), user with 1, 2, 3 should see it.
    // So user.role_level <= requiredLevel

    if (requiredLevel !== undefined) {
        if (!user.role_level || user.role_level > requiredLevel) {
            return <>{fallback}</>;
        }
    }

    // Role Code Check
    if (requiredRole) {
        if (user.role !== requiredRole && user.role !== 'super_admin') {
            return <>{fallback}</>;
        }
    }

    // Permission Check
    // We didn't implement permissions array in User interface yet fully (commented out).
    // But if we did:
    // if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    //    return <>{fallback}</>;
    // }

    return <>{children}</>;
}
