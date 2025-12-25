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
  CardDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Search, User, Mail, Calendar, Shield, Eye, EyeOff, Edit, Trash2, Users, UserCheck, UserPlus, Loader2 } from 'lucide-react'
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
    if (!confirm('Are you sure you want to delete this user? This will deactivate their account.')) return

    try {
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Access Control</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            User <span className="text-blue-500">Directory</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl font-medium">
            Manage permissions and access levels for the platform ecosystem.
          </p>
        </div>

        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-blue-500/20 transition-all hover:scale-105">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPITile
          label="Total Users"
          value={users.length}
          icon={Users}
          color="blue"
          subValue="Registered"
        />
        <KPITile
          label="Active"
          value={users.filter(u => u.status === 'active').length}
          icon={UserCheck}
          color="emerald"
          subValue="Online"
        />
        <KPITile
          label="Admins"
          value={users.filter(u => u.role === 'admin').length}
          icon={Shield}
          color="rose"
          subValue="Full Access"
        />
        <KPITile
          label="Editors"
          value={users.filter(u => u.role === 'editor').length}
          icon={Edit}
          color="purple"
          subValue="Content"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden min-h-[500px]">
          <CardHeader className="border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" />
                Personnel
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-950/50 border-white/10 text-sm text-white focus:ring-blue-500/20"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-zinc-400 pl-6">Identity</TableHead>
                    <TableHead className="text-zinc-400">Role</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Last Active</TableHead>
                    <TableHead className="text-zinc-400 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                      <TableCell className="font-medium pl-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-white font-semibold">{user.name}</div>
                            <div className="text-xs text-zinc-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "border-0 px-2.5 py-0.5 rounded-full uppercase text-[10px] tracking-wider font-bold",
                          user.role === 'admin' ? "bg-rose-500/10 text-rose-400" :
                            user.role === 'editor' ? "bg-blue-500/10 text-blue-400" :
                              "bg-zinc-700/50 text-zinc-400"
                        )}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", user.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-zinc-700")} />
                          <span className={cn("text-xs font-medium", user.status === 'active' ? "text-emerald-400" : "text-zinc-500")}>
                            {user.status === 'active' ? 'Active' : user.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-zinc-500 text-xs">
                        {new Date(user.lastActive || user.joinedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStatus(user.id)}
                            className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10"
                            title={`Mark as ${user.status === 'active' ? 'inactive' : 'active'}`}
                          >
                            {user.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Roles Info Box */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/40 border-white/5 backdrop-blur-sm rounded-3xl overflow-hidden p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Role Definitions
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3 w-3 text-rose-500" />
                  <span className="text-sm font-semibold text-zinc-200">Admin</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Full system access. Can manage users, settings, and all content.</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="h-3 w-3 p-0 bg-blue-500 rounded-full" />
                  <span className="text-sm font-semibold text-zinc-200">Editor</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Can publish content and manage events. Restricted from system settings.</p>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/50 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-3 w-3 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-200">User</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">Standard account. Read-only access to public content.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Change the role for <span className="text-white font-medium">{selectedUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-zinc-400">Role Assignment</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as 'admin' | 'editor' | 'user')}
              >
                <SelectTrigger id="role" className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-rose-500" />
                      <span>Admin</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-500" />
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

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
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
              className="text-zinc-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updating} className="bg-blue-600 hover:bg-blue-700 text-white">
              {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {updating ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KPITile({ label, value, icon: Icon, color, subValue }: any) {
  const colors: any = {
    blue: "from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/20 text-blue-400",
    emerald: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 via-amber-500/5 to-transparent border-amber-500/20 text-amber-400",
    rose: "from-rose-500/20 via-rose-500/5 to-transparent border-rose-500/20 text-rose-400",
    purple: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/20 text-purple-400",
    zinc: "from-zinc-500/20 via-zinc-500/5 to-transparent border-zinc-500/20 text-zinc-400",
  }

  return (
    <div className={cn(
      "relative p-6 rounded-3xl border bg-zinc-900/40 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.02] group",
      colors[color] || colors.blue
    )}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", (colors[color] || colors.blue).split(" ")[0])} />
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-10 rounded-2xl bg-zinc-950 flex items-center justify-center border border-white/5 shadow-inner">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-black text-white tracking-tight">{value}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{label}</p>
            {subValue && <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">{subValue}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}