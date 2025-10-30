import { useCallback } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { useQueryClient } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useEditUser, type User } from "@tryghost/admin-x-framework/api/users";

export type Preferences = Record<string, unknown>;

export type UseUserPreferencesResult = UseQueryResult<Preferences> & {
    updatePreferences: (updatedPreferences: Preferences) => Promise<void>;
};

const userPreferencesQueryKeyPrefix = (user: User | undefined) =>
    ["userPreferences", user?.id] as const;

const userPreferencesQueryKey = (user: User | undefined) =>
    [...userPreferencesQueryKeyPrefix(user), user?.accessibility] as const;

export const useUserPreferences = (): UseUserPreferencesResult => {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const { mutateAsync: editUser } = useEditUser();

    // Dependent query - ONE cache entry per user ID
    const result = useQuery({
        queryKey: userPreferencesQueryKey(user),
        queryFn: () => {
            if (!user) {
                throw new Error("User not loaded");
            }
            try {
                const raw = user.accessibility ?? "{}";
                return JSON.parse(raw) as Preferences;
            } catch {
                return {};
            }
        },
        enabled: !!user,
        staleTime: Infinity,
    });

    const updatePreferences = useCallback(
        async (updatedPreferences: Preferences) => {
            if (!user) {
                throw new Error("User is not loaded");
            }

            // Read latest preferences from cache to avoid race conditions
            const currentPreferences =
                queryClient.getQueryData<Preferences>(
                    userPreferencesQueryKey(user)
                ) ?? {};

            const newPreferences = {
                ...currentPreferences,
                ...updatedPreferences,
            };

            // Update user with new accessibility value
            // The editUser mutation will automatically update the currentUser cache
            // via its updateQueries config, which will then trigger this query to
            // refetch due to the changed query key (which includes user.accessibility)
            await editUser({
                ...user,
                accessibility: JSON.stringify(newPreferences),
            });
        },
        [user, editUser, queryClient]
    );

    return {
        ...result,
        updatePreferences,
    };
};
