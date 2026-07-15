'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Search, User, Shield, Eye, EyeOff, Edit, Trash2, Users, UserCheck, UserPlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'user'
  status: 'active' | 'inactive' | 'pending'
  joinedDate: string
  lastActive: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<'admin' | 'editor' | 'user'>('user')
  const [updating, setUpdating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch users from API
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const filtered = users.filter(
        user =>
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.role.toLowerCase().includes(term)
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchTerm, users])

  const handleDelete = async (id: string) => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete user')
      }

      setUsers(users.filter(user => user.id !== id))
      setFilteredUsers(filteredUsers.filter(user => user.id !== id))
      toast.success('User deleted successfully')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const toggleStatus = async (id: string) => {
    const user = users.find(u => u.id === id)
    if (!user) return

    const newStatus = user.status === 'active' ? 'inactive' : 'active'

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update user status')
      }

      setUsers(users.map(u =>
        u.id === id ? { ...u, status: newStatus } : u
      ))
      setFilteredUsers(filteredUsers.map(u =>
        u.id === id ? { ...u, status: newStatus } : u
      ))

      toast.success(`User ${user.name}'s status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error toggling user status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update user status')
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setNewRole(user.role)
    setEditDialogOpen(true)
  }

  const handleUpdateRole = async () => {
    if (!selectedUser) return

    try {
      setUpdating(true)

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          role: newRole,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update user role')
      }

      setUsers(users.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ))
      setFilteredUsers(filteredUsers.map(u =>
        u.id === selectedUser.id ? { ...u, role: newRole } : u
      ))

      toast.success(`User ${selectedUser.name}'s role updated to ${newRole}`)
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update user role')
    } finally {
      setUpdating(false)
    }
  }

  const roleBadgeClass = (role: User['role']) => cn(
    'border-0 px-2.5 py-0.5 rounded-full uppercase text-[10px] tracking-wider font-bold',
    role === 'admin' ? 'bg-rose-100 text-rose-600' :
      role === 'editor' ? 'bg-orange-100 text-orange-600' :
        'bg-zinc-100 text-zinc-500'
  )

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-20 lg:pt-0">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">Access Control</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
            User <span className="text-orange-600">Directory</span>
          </h1>
          <p className="text-zinc-500 text-xs sm:text-sm font-medium max-w-2xl">
            Manage permissions and access levels for the platform ecosystem.
          </p>
        </div>

        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl h-11 px-6 shadow-lg shadow-orange-200 transition-all font-bold shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPITile
          label="Total Users"
          value={users.length}
          icon={Users}
          color="orange"
          subValue="Registered"
          loading={loading}
        />
        <KPITile
          label="Active"
          value={users.filter(u => u.status === 'active').length}
          icon={UserCheck}
          color="emerald"
          subValue="Online"
          loading={loading}
        />
        <KPITile
          label="Admins"
          value={users.filter(u => u.role === 'admin').length}
          icon={Shield}
          color="rose"
          subValue="Full Access"
          loading={loading}
        />
        <KPITile
          label="Editors"
          value={users.filter(u => u.role === 'editor').length}
          icon={Edit}
          color="amber"
          subValue="Content"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 bg-white border border-orange-100 rounded-3xl overflow-hidden min-h-[500px] shadow-sm">
          <CardHeader className="border-b border-orange-100 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-500" />
                Personnel
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <label htmlFor="user-search" className="sr-only">Search users</label>
                <Input
                  id="user-search"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white border-zinc-200 text-sm text-zinc-900 rounded-xl focus:ring-1 focus:ring-orange-300 focus:border-orange-300"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 sm:p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-4">
                <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <Users className="h-8 w-8 text-orange-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-800">{searchTerm ? 'No matching users' : 'No users found'}</h3>
                  <p className="text-sm text-zinc-500 max-w-sm">
                    {searchTerm ? 'Try a different name, email or role.' : 'Users will appear here once they join the platform.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-orange-50/60">
                      <TableRow className="border-orange-100 hover:bg-transparent">
                        <TableHead className="text-zinc-500 font-semibold pl-6">Identity</TableHead>
                        <TableHead className="text-zinc-500 font-semibold">Role</TableHead>
                        <TableHead className="text-zinc-500 font-semibold">Status</TableHead>
                        <TableHead className="text-zinc-500 font-semibold">Last Active</TableHead>
                        <TableHead className="text-zinc-500 font-semibold text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-zinc-100 hover:bg-orange-50/40 transition-colors group">
                          <TableCell className="font-medium pl-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                                <User className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-zinc-800 font-semibold truncate">{user.name}</div>
                                <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleBadgeClass(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={cn('h-2 w-2 rounded-full', user.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300')} />
                              <span className={cn('text-xs font-medium', user.status === 'active' ? 'text-emerald-600' : 'text-zinc-500')}>
                                {user.status === 'active' ? 'Active' : user.status}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-xs">
                            {new Date(user.lastActive || user.joinedDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleStatus(user.id)}
                                className="h-8 w-8 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                                aria-label={`Mark ${user.name} as ${user.status === 'active' ? 'inactive' : 'active'}`}
                                title={`Mark as ${user.status === 'active' ? 'inactive' : 'active'}`}
                              >
                                {user.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditUser(user)}
                                aria-label={`Edit role for ${user.name}`}
                                className="h-8 w-8 text-zinc-400 hover:text-orange-600 hover:bg-orange-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(user)}
                                aria-label={`Delete ${user.name}`}
                                className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden p-4 space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="rounded-2xl border border-zinc-100 bg-white p-4 space-y-3 hover:border-orange-200 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-zinc-900 font-bold truncate">{user.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{user.email}</div>
                        </div>
                        <Badge variant="outline" className={roleBadgeClass(user.role)}>{user.role}</Badge>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('h-2 w-2 rounded-full', user.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-300')} />
                          <span className={cn('text-xs font-medium', user.status === 'active' ? 'text-emerald-600' : 'text-zinc-500')}>
                            {user.status === 'active' ? 'Active' : user.status}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus(user.id)} aria-label={`Toggle status for ${user.name}`} className="h-8 w-8 rounded-full bg-zinc-50 text-zinc-500">
                            {user.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)} aria-label={`Edit role for ${user.name}`} className="h-8 w-8 rounded-full bg-zinc-50 text-zinc-500 hover:text-orange-600 hover:bg-orange-50">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user)} aria-label={`Delete ${user.name}`} className="h-8 w-8 rounded-full bg-rose-50 text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Roles Info Box */}
        <div className="space-y-6">
          <Card className="bg-white border border-orange-100 rounded-3xl overflow-hidden p-6 shadow-sm">
            <h3 className="text-zinc-900 font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              Role Definitions
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3 w-3 text-rose-500" />
                  <span className="text-sm font-semibold text-zinc-800">Admin</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Full system access. Can manage users, settings, and all content.</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <Edit className="h-3 w-3 text-orange-500" />
                  <span className="text-sm font-semibold text-zinc-800">Editor</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Can publish content and manage events. Restricted from system settings.</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3 w-3 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-800">User</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Standard account. Read-only access to public content.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white border-orange-100 text-zinc-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-900">Edit User Role</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Change the role for <span className="text-zinc-900 font-medium">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-zinc-600">Role Assignment</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as 'admin' | 'editor' | 'user')}
              >
                <SelectTrigger id="role" className="bg-white border-zinc-200 text-zinc-900 focus:ring-orange-300">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-rose-500" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-orange-500" />
                      <span>Editor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-zinc-500" />
                      <span>User</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-xs text-orange-700">
              {newRole === 'admin' && 'Warning: Admins have full control over the platform.'}
              {newRole === 'editor' && 'Editors can manage content but cannot change system settings.'}
              {newRole === 'user' && 'Users have standard read/write access to their own data only.'}
            </div>

          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
              className="text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updating} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {updating ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent className="bg-white border-orange-100 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900">Delete this user?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              This will deactivate <span className="font-medium text-zinc-800">{deleteTarget?.name}</span>&apos;s account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl border-zinc-200 text-zinc-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleteTarget) handleDelete(deleteTarget.id) }}
              disabled={deleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function KPITile({ label, value, icon: Icon, color, subValue, loading }: any) {
  const colors: any = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  }

  return (
    <div className="relative p-4 sm:p-6 rounded-3xl border border-orange-100 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
      <Icon className="absolute -right-3 -bottom-3 h-20 w-20 text-orange-500 opacity-[0.04] -rotate-12 group-hover:scale-110 transition-transform duration-700" />
      <div className="relative z-10 space-y-3 sm:space-y-4">
        <div className={cn('h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center border', colors[color] || colors.orange)}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="space-y-1">
          {loading ? (
            <Skeleton className="h-8 w-14" />
          ) : (
            <p className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">{value}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
            {subValue && <span className="text-[10px] text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-zinc-100 hidden sm:inline">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
