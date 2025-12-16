"use client";

import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { type ReactNode, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/client";
import {
  activeOrganizationAtom,
  getOrganizationBySlugAtom,
  isLoadingOrganizationsAtom,
  organizationsAtom,
} from "@/utils/atoms/organizations";
import { QUERY_KEYS } from "@/utils/query-keys";

export type Organization = NonNullable<
  ReturnType<typeof authClient.useListOrganizations>["data"]
>[number];

export function OrganizationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const setOrganizations = useSetAtom(organizationsAtom);
  const setActiveOrganization = useSetAtom(activeOrganizationAtom);
  const setIsLoading = useSetAtom(isLoadingOrganizationsAtom);
  const hasAutoSelectedRef = useRef(false);

  const [
    { data: organizationsData, isPending: isLoadingOrgs },
    { data: activeOrganization, isPending: isLoadingActive },
  ] = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.AUTH.organizations,
        queryFn: async () => {
          const result = await authClient.organization.list();
          return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - org list changes rarely
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
      {
        queryKey: QUERY_KEYS.AUTH.activeOrganization,
        queryFn: async () => {
          const result = await authClient.organization.getFullOrganization();
          return result.data ?? null;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
      },
    ],
  });

  useEffect(() => {
    if (organizationsData) {
      setOrganizations(organizationsData);
    }
  }, [organizationsData, setOrganizations]);

  useEffect(() => {
    setActiveOrganization(activeOrganization ?? null);
  }, [activeOrganization, setActiveOrganization]);

  // Auto-select first organization if no active organization is set
  useEffect(() => {
    // Only run when both queries are done (not loading) and we have organizations
    // Use ref to prevent running multiple times
    if (
      !(isLoadingOrgs || isLoadingActive) &&
      organizationsData &&
      organizationsData.length > 0 &&
      !activeOrganization &&
      !hasAutoSelectedRef.current
    ) {
      // Automatically set the first organization as active
      const firstOrg = organizationsData[0];
      if (firstOrg) {
        hasAutoSelectedRef.current = true;
        // Set it in the atom immediately for UI
        setActiveOrganization(firstOrg);
        // Also set it on the server
        authClient.organization
          .setActive({ organizationId: firstOrg.id })
          .then((result) => {
            if (result.error) {
              console.error(
                "Failed to auto-set active organization:",
                result.error
              );
              // Revert the atom if server call failed
              setActiveOrganization(null);
              hasAutoSelectedRef.current = false;
            } else {
              // Invalidate queries to sync with server
              queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.AUTH.activeOrganization,
              });
            }
          })
          .catch((error) => {
            console.error("Error auto-setting active organization:", error);
            setActiveOrganization(null);
            hasAutoSelectedRef.current = false;
          });
      }
    }
    // Reset ref if activeOrganization becomes null (user cleared it)
    if (activeOrganization === null && hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = false;
    }
  }, [
    isLoadingOrgs,
    isLoadingActive,
    organizationsData,
    activeOrganization,
    setActiveOrganization,
    queryClient,
  ]);

  useEffect(() => {
    setIsLoading(isLoadingOrgs || isLoadingActive);
  }, [isLoadingOrgs, isLoadingActive, setIsLoading]);

  return <>{children}</>;
}

export function useOrganizationsContext() {
  const organizations = useAtomValue(organizationsAtom);
  const activeOrganization = useAtomValue(activeOrganizationAtom);
  const isLoading = useAtomValue(isLoadingOrganizationsAtom);
  const [getOrganizationBySlug] = useAtom(getOrganizationBySlugAtom);

  return {
    organizations,
    activeOrganization,
    isLoading,
    getOrganization: getOrganizationBySlug,
  };
}
