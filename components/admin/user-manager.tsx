"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Filter, Loader2, Pencil, Search, Trash2, UserPlus, X } from "lucide-react";

import { GenerateResetLinkDialog } from "@/components/admin/generate-reset-link-dialog";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Messages } from "@/lib/api.constants";
import { cn } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  username: string;
  role: "student" | "admin";
  createdAt: string;
};

type FilterValues = {
  role: string;
  registeredFrom: string;
  registeredTo: string;
};

const PAGE_SIZE = 10;

const ROLE_OPTIONS = [
  { label: "Student", value: "student" },
  { label: "Admin", value: "admin" },
] as const;

const ROLE_BADGE_CLASS_NAMES: Record<AdminUserRow["role"], string> = {
  admin: "bg-amber-50 text-amber-900 border-amber-200",
  student: "bg-slate-100 text-slate-700 border-slate-200",
};

function createEmptyFilters(): FilterValues {
  return {
    role: "",
    registeredFrom: "",
    registeredTo: "",
  };
}

function formatUserDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDateBoundary(value: string, endOfDay = false) {
  if (!value) {
    return null;
  }

  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizeUser(user: AdminUserRow): AdminUserRow {
  return {
    ...user,
    role: user.role === "admin" ? "admin" : "student",
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

function UserDialog({
  user,
  trigger,
  onSaved,
  currentUserId,
}: {
  user?: AdminUserRow;
  trigger: React.ReactNode;
  onSaved: (user: AdminUserRow) => void;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const [role, setRole] = useState<AdminUserRow["role"]>(user?.role ?? "student");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!user;
  const isSelf = user?.id === currentUserId;

  function handleOpenChange(nextOpen: boolean) {
    if (pending) {
      return;
    }

    setOpen(nextOpen);
    setError(null);
    setUsername(user?.username ?? "");
    setRole(user?.role ?? "student");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isEdit && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isEdit && password.length < 1) {
      setError("Password is required.");
      return;
    }

    setPending(true);

    try {
      const response = await fetch(isEdit ? `/api/admin/users/${user.id}` : "/api/admin/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { username, role }
            : { username, role, password },
        ),
      });

      const data = (await response.json()) as {
        message?: string;
        user?: AdminUserRow;
      };

      if (!response.ok || !data.user) {
        setError(data.message ?? (isEdit ? Messages.unableToUpdateUser : Messages.unableToCreateUser));
        return;
      }

      onSaved(normalizeUser(data.user));
      toast.success(isEdit ? "User updated." : "User created.");
      setOpen(false);
    } catch {
      setError(Messages.somethingWrong);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-[30px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the account identity and platform role." : "Create a local username and password account."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <FormField label="Username" htmlFor={isEdit ? `edit-username-${user.id}` : "create-username"} required>
            <Input
              id={isEdit ? `edit-username-${user.id}` : "create-username"}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={50}
              required
            />
          </FormField>

          <FormField
            label="Role"
            htmlFor={isEdit ? `edit-role-${user.id}` : "create-role"}
            description={isSelf ? "You cannot remove your own admin access." : undefined}
            required
          >
            <Select value={role} onValueChange={(value: AdminUserRow["role"]) => setRole(value)}>
              <SelectTrigger id={isEdit ? `edit-role-${user.id}` : "create-role"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student" disabled={isSelf}>
                  Student
                </SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {!isEdit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Password" htmlFor="create-password" required>
                <Input
                  id="create-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  maxLength={100}
                  required
                />
              </FormField>
              <FormField label="Confirm" htmlFor="create-confirm-password" required>
                <Input
                  id="create-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  maxLength={100}
                  required
                />
              </FormField>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="gap-1.5">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save User" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserButton({
  user,
  currentUserId,
  onDeleted,
}: {
  user: AdminUserRow;
  currentUserId: string;
  onDeleted: (userId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isSelf = user.id === currentUserId;

  async function handleDelete() {
    setPending(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(data.message ?? Messages.unableToDeleteUser);
        return;
      }

      onDeleted(user.id);
      toast.success("User deleted.");
      setOpen(false);
    } catch {
      toast.error(Messages.somethingWrong);
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-red-600 hover:text-red-700"
          disabled={isSelf}
          title={isSelf ? "You cannot delete your own account." : "Delete user"}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete user?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">{user.username}</span> and cascade their related records.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete User
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UserManager({
  users: initialUsers,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(() => initialUsers.map(normalizeUser));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<FilterValues>(createEmptyFilters);
  const [filterDraft, setFilterDraft] = useState<FilterValues>(createEmptyFilters);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: keyof FilterValues; label: string; displayValue: string }> = [];
    if (filterValues.role) {
      filters.push({
        key: "role",
        label: "Role",
        displayValue: ROLE_OPTIONS.find((option) => option.value === filterValues.role)?.label ?? filterValues.role,
      });
    }
    if (filterValues.registeredFrom) {
      filters.push({
        key: "registeredFrom",
        label: "Registered from",
        displayValue: filterValues.registeredFrom,
      });
    }
    if (filterValues.registeredTo) {
      filters.push({
        key: "registeredTo",
        label: "Registered to",
        displayValue: filterValues.registeredTo,
      });
    }
    return filters;
  }, [filterValues]);

  const activeFilterCount = activeFilters.length;

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const registeredFrom = getDateBoundary(filterValues.registeredFrom);
    const registeredTo = getDateBoundary(filterValues.registeredTo, true);

    return users.filter((user) => {
      const createdTime = new Date(user.createdAt).getTime();
      const matchesSearch = normalizedSearch ? user.username.toLowerCase().includes(normalizedSearch) : true;
      const matchesRole = filterValues.role ? user.role === filterValues.role : true;
      const matchesFrom = registeredFrom === null ? true : createdTime >= registeredFrom;
      const matchesTo = registeredTo === null ? true : createdTime <= registeredTo;

      return matchesSearch && matchesRole && matchesFrom && matchesTo;
    });
  }, [users, search, filterValues]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSaved(user: AdminUserRow) {
    setUsers((current) => {
      const exists = current.some((item) => item.id === user.id);
      if (exists) {
        return current.map((item) => (item.id === user.id ? user : item));
      }

      return [...current, user].sort((a, b) => {
        const byCreatedAt = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return byCreatedAt || a.username.localeCompare(b.username);
      });
    });
    router.refresh();
  }

  function handleDeleted(userId: string) {
    setUsers((current) => current.filter((user) => user.id !== userId));
    router.refresh();
  }

  function handleFilterDraftChange(fieldKey: keyof FilterValues, value: string) {
    setFilterDraft((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function handleFilterDialogOpen() {
    setFilterDraft(filterValues);
    setIsFilterDialogOpen(true);
  }

  function handleApplyFilters() {
    setFilterValues(filterDraft);
    setPage(1);
    setIsFilterDialogOpen(false);
  }

  function handleResetFilters() {
    const emptyFilters = createEmptyFilters();
    setFilterDraft(emptyFilters);
    setFilterValues(emptyFilters);
    setPage(1);
    setIsFilterDialogOpen(false);
  }

  function handleClearSingleFilter(fieldKey: keyof FilterValues) {
    setFilterValues((current) => ({
      ...current,
      [fieldKey]: "",
    }));
    setPage(1);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[var(--tint-sm)] shadow-sm dark:border-slate-800/60">
        <div className="flex flex-col gap-4 p-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <p className="w-20 pl-2 text-sm font-semibold text-slate-700">Users</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by username"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-72 rounded-full pl-8 pr-10"
              />
              <Button
                type="button"
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={handleFilterDialogOpen}
                className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-xl px-2.5"
              >
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="hidden flex-1 sm:block" />

          <UserDialog
            currentUserId={currentUserId}
            onSaved={handleSaved}
            trigger={
              <Button size="sm" className="h-9 rounded-full">
                <UserPlus className="h-4 w-4" />
                New user
              </Button>
            }
          />
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <span className="pl-1 text-xs font-medium uppercase tracking-[0.05em] text-slate-400">
              Filters:
            </span>
            {activeFilters.map((filter) => (
              <Button
                key={filter.key}
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 rounded-full border-slate-200 px-3 text-xs text-slate-700 hover:bg-background hover:text-slate-700"
                onClick={() => handleClearSingleFilter(filter.key)}
              >
                <span>{filter.label}: {filter.displayValue}</span>
                <X className="h-3 w-3 text-slate-400" />
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-950"
              onClick={handleResetFilters}
            >
              Clear all
            </Button>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 bg-[var(--tint-sm)] dark:border-slate-800/60">
              <TableHead>Username</TableHead>
              <TableHead className="w-28">Role</TableHead>
              <TableHead className="w-48">Registered</TableHead>
              <TableHead className="w-[500px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-400">
                  {search || activeFilterCount > 0 ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((user) => (
                <TableRow key={user.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{user.username}</span>
                      {user.id === currentUserId ? (
                        <Badge variant="outline" className="border-slate-200 bg-white text-[10px] text-slate-500">
                          You
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize", ROLE_BADGE_CLASS_NAMES[user.role])}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-500">
                    {formatUserDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <UserDialog
                        user={user}
                        currentUserId={currentUserId}
                        onSaved={handleSaved}
                        trigger={
                          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        }
                      />
                      <GenerateResetLinkDialog userId={user.id} username={user.username} />
                      <ResetPasswordDialog userId={user.id} username={user.username} />
                      <DeleteUserButton user={user} currentUserId={currentUserId} onDeleted={handleDeleted} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="rounded-[30px] p-4 sm:max-w-md sm:rounded-[30px]">
          <DialogHeader className="pl-2">
            <DialogTitle className="text-sm font-semibold text-[var(--text-main)]">Filter Users</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="filter-role" className="pl-2 text-slate-700">Role</Label>
              <Select
                value={filterDraft.role || "all"}
                onValueChange={(value) => handleFilterDraftChange("role", value === "all" ? "" : value)}
              >
                <SelectTrigger id="filter-role" className="h-9 rounded-full border border-input bg-background font-semibold">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="filter-registered-from" className="pl-2 text-slate-700">Registered from</Label>
                <Input
                  id="filter-registered-from"
                  type="date"
                  value={filterDraft.registeredFrom}
                  onChange={(event) => handleFilterDraftChange("registeredFrom", event.target.value)}
                  className="h-9 rounded-full"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="filter-registered-to" className="pl-2 text-slate-700">Registered to</Label>
                <Input
                  id="filter-registered-to"
                  type="date"
                  value={filterDraft.registeredTo}
                  onChange={(event) => handleFilterDraftChange("registeredTo", event.target.value)}
                  className="h-9 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800/60">
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="h-9 rounded-full font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
            >
              Reset
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFilterDialogOpen(false)}
                className="h-9 rounded-full border border-slate-200 bg-white px-4 font-semibold text-slate-900 dark:border-slate-800 dark:bg-[#1c1c1e]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyFilters}
                className="h-9 rounded-full bg-black px-4 font-semibold !text-white transition-colors hover:bg-zinc-900/90 dark:bg-black dark:hover:bg-zinc-900/90"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
