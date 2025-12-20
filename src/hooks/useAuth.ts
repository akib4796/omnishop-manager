import { useState, useEffect } from 'react';
import { account, databases, Query } from '@/integrations/appwrite';
import { Models } from 'appwrite';

interface UserProfile {
    $id: string;
    userId: string;
    tenantId: string;
    fullName?: string;
    email?: string;
    phone?: string;
    role?: {
        $id: string;
        name: string;
        permissions: string[];
    };
}

interface AuthState {
    user: Models.User<Models.Preferences> | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    hasPermission: (permission: string) => boolean;
    labels: string[];
    isStaff: boolean;
}

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'omnishop_db';

export function useAuth(): AuthState {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchAuth = async () => {
            try {
                // Get current user
                const currentUser = await account.get();
                console.log('[useAuth] Current user:', currentUser.$id, currentUser.email);
                if (!mounted) return;
                setUser(currentUser);

                // Get user profile with tenantId
                try {
                    console.log('[useAuth] Fetching profile for userId:', currentUser.$id);
                    const profileResponse = await databases.listDocuments(
                        DATABASE_ID,
                        'profiles',
                        [
                            Query.equal('userId', currentUser.$id),
                            Query.limit(1)
                        ]
                    );

                    console.log('[useAuth] Profile response:', profileResponse.documents.length, 'documents found');

                    if (profileResponse.documents.length > 0 && mounted) {
                        const doc = profileResponse.documents[0];
                        console.log('[useAuth] Profile found:', doc.$id, 'tenantId:', doc.tenantId);
                        setProfile({
                            $id: doc.$id,
                            userId: doc.userId,
                            tenantId: doc.tenantId,
                            fullName: doc.fullName,
                            email: doc.email,
                            phone: doc.phone,
                            role: doc.role // Assuming 'role' is a relationship that is expanded
                        });
                    } else {
                        console.log('[useAuth] No profile found for user');
                    }
                } catch (profileError) {
                    console.error('[useAuth] Error fetching profile:', profileError);
                }
            } catch (error) {
                // User not authenticated
                console.log('[useAuth] User not authenticated:', error);
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchAuth();

        return () => {
            mounted = false;
        };
    }, []);

    // Helper function to check if user has a specific permission
    const hasPermission = (permission: string): boolean => {
        // If no role is set (legacy/owner user), grant all permissions
        if (!profile?.role) return true;
        return profile.role.permissions?.includes(permission) || false;
    };

    // Get user labels from Appwrite user object
    const labels = user?.labels || [];
    const isStaff = labels.includes('staff');

    return {
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        hasPermission,
        labels,
        isStaff,
    };
}
