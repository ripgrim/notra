"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Repository, RepositoryListProps } from "@/types/integrations";
import { QUERY_KEYS } from "@/utils/query-keys";

export function RepositoryList({ integrationId }: RepositoryListProps) {
  const queryClient = useQueryClient();

  const { data: integration, isLoading } = useQuery({
    queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
    queryFn: async () => {
      const response = await fetch(
        `/api/integrations/${integrationId}?includeRepositories=true`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }
      return response.json() as Promise<{
        repositories: Repository[];
      }>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      repositoryId,
      enabled,
    }: {
      repositoryId: string;
      enabled: boolean;
    }) => {
      const response = await fetch(`/api/repositories/${repositoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update repository");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.repositories(integrationId),
      });
      toast.success(
        variables.enabled ? "Repository disabled" : "Repository enabled"
      );
    },
    onError: () => {
      toast.error("Failed to update repository");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (repositoryId: string) => {
      const response = await fetch(`/api/repositories/${repositoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete repository");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.detail(integrationId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATIONS.repositories(integrationId),
      });
      toast.success("Repository removed");
    },
    onError: () => {
      toast.error("Failed to remove repository");
    },
  });

  const handleToggleRepository = (repositoryId: string, enabled: boolean) => {
    toggleMutation.mutate({ repositoryId, enabled });
  };

  const handleDeleteRepository = (repositoryId: string) => {
    // biome-ignore lint: Using browser confirm for simple deletion confirmation
    if (!window.confirm("Are you sure you want to remove this repository?")) {
      return;
    }
    deleteMutation.mutate(repositoryId);
  };

  const repositories = integration?.repositories || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No repositories configured yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {repositories.map((repo) => (
        <Card key={repo.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {repo.owner}/{repo.repo}
            </CardTitle>
            <CardDescription>
              {repo.outputs?.length ?? 0} output
              {(repo.outputs?.length ?? 0) !== 1 ? "s" : ""} configured
            </CardDescription>
            <CardAction>
              <div className="flex items-center gap-2">
                <Badge variant={repo.enabled ? "default" : "secondary"}>
                  {repo.enabled ? "Enabled" : "Disabled"}
                </Badge>
                <Button
                  disabled={
                    toggleMutation.isPending || deleteMutation.isPending
                  }
                  onClick={() => handleToggleRepository(repo.id, repo.enabled)}
                  size="sm"
                  variant="ghost"
                >
                  {repo.enabled ? "Disable" : "Enable"}
                </Button>
                <Button
                  disabled={
                    toggleMutation.isPending || deleteMutation.isPending
                  }
                  onClick={() => handleDeleteRepository(repo.id)}
                  size="sm"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {repo.outputs?.map((output) => (
                <Badge
                  key={output.id}
                  variant={output.enabled ? "default" : "secondary"}
                >
                  {output.outputType}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
