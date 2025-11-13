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
import { Search, User, Mail, Calendar, Shield, Eye, EyeOff, Edit, Trash2 } from 'lucide-react'

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
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
          User Management
        </h1>
        <p className="text-muted-foreground">Manage platform users and their permissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage registered users on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button className="w-full sm:w-auto">
                <User className="mr-2 h-4 w-4" />
                Add New User
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="h-8 w-8 rounded-full animate-spin border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                            <div>
                              <div>{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : user.role === 'editor' ? 'secondary' : 'outline'}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : user.status === 'pending' ? 'secondary' : 'destructive'}>
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.joinedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleStatus(user.id)}
                              title={`Mark as ${user.status === 'active' ? 'inactive' : 'active'}`}
                            >
                              {user.status === 'active' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              title="Edit user"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              title="Delete user"
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Platform user statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Total Users</span>
              <span className="font-semibold">{users.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Active</span>
              <span className="font-semibold">{users.filter(u => u.status === 'active').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pending</span>
              <span className="font-semibold">{users.filter(u => u.status === 'pending').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Admins</span>
              <span className="font-semibold">{users.filter(u => u.role === 'admin').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Editors</span>
              <span className="font-semibold">{users.filter(u => u.role === 'editor').length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <CardDescription>Understand the permissions for each role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold">Admin</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>• Full platform access</li>
                <li>• Manage all content</li>
                <li>• User management</li>
                <li>• Site settings</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">Editor</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>• Content management</li>
                <li>• Post creation/editing</li>
                <li>• Event management</li>
                <li>• Limited access</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold">User</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>• View public content</li>
                <li>• Profile management</li>
                <li>• Limited permissions</li>
                <li>• No admin access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newRole}
                onValueChange={(value) => setNewRole(value as 'admin' | 'editor' | 'user')}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      <span>Admin - Full access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span>Editor - Content management</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>User - Basic access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {newRole === 'admin' && 'Full platform access including user management'}
              {newRole === 'editor' && 'Can create and manage content but limited admin access'}
              {newRole === 'user' && 'Basic user with limited permissions'}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updating}>
              {updating ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}