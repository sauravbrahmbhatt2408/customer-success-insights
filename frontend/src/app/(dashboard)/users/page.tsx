"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Select } from "@/components/form";
import { formatDate } from "@/components/labels";
import { EmptyState, ErrorState, LoadingRows, PageHeader, Pagination } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage, useGetUsersQuery, useUpdateUserMutation } from "@/store/api";
import { useAppSelector } from "@/store/store";
import type { Role, User } from "@/types";

export default function UsersPage() {
  const me = useAppSelector((state) => state.auth.user);
  const [page, setPage] = useState(1);
  const isAdmin = me?.role === "admin";
  const { data, isLoading, isError, error, refetch } = useGetUsersQuery(page, { skip: !isAdmin });
  const [updateUser] = useUpdateUserMutation();

  async function update(user: User, changes: { role?: Role; is_active?: boolean }) {
    try {
      await updateUser({ id: user.id, ...changes }).unwrap();
      toast.success(`${user.full_name} updated`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update user"));
    }
  }

  if (!isAdmin) {
    return <ErrorState message="Only admins can manage users." />;
  }

  return (
    <div>
      <PageHeader title="Users" />
      {isLoading ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error, "Could not load users")} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No users yet" />
      ) : (
        <>
          <div className="rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((user) => {
                  const isMe = user.id === me.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          aria-label={`Role for ${user.full_name}`}
                          className="w-32"
                          value={user.role}
                          disabled={isMe}
                          onChange={(e) => update(user, { role: e.target.value as Role })}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="csm">CSM</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? "outline" : "secondary"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {!isMe && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => update(user, { is_active: !user.is_active })}
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
