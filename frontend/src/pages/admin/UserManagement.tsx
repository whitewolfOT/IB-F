import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, createUser, updateUser } from '../../api/admin';
import type { AdminUser } from '../../api/admin';
import { OrgRole } from '../../types/index';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const ROLE_OPTIONS = Object.values(OrgRole).map((r) => ({ value: r, label: r.replace(/_/g, ' ') }));

const UserManagement: React.FC = () => {
  const qc = useQueryClient();
  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: listUsers,
  });

  const { mutateAsync: addUser, isPending: creating } = useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const { mutateAsync: patchUser, isPending: updating } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AdminUser> }) => updateUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [isMaster, setIsMaster] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !role) { setFormError('All fields are required.'); return; }
    setFormError('');
    try {
      await addUser({ email, password, role, is_master: isMaster });
      setEmail(''); setPassword(''); setRole(''); setIsMaster(false); setShowForm(false);
    } catch {
      setFormError('Failed to create user.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">User Management</h2>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Add User'}</Button>
      </div>

      {showForm && (
        <Card title="Create User">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input id="email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input id="password" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Select id="role" label="Role" options={ROLE_OPTIONS} placeholder="-- Select Role --" value={role} onChange={(e) => setRole(e.target.value)} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isMaster} onChange={(e) => setIsMaster(e.target.checked)} className="h-4 w-4" />
              Master admin
            </label>
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <Button type="submit" loading={creating}>Create User</Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load users.</div>
      ) : (
        <Card>
          {!users || users.length === 0 ? (
            <EmptyState title="No users" message="Create the first user." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Master</th>
                  <th className="pb-2 font-medium">Active</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2 text-xs">{u.role}</td>
                    <td className="py-2">{u.is_master ? '✓' : '—'}</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active === false ? 'bg-danger-light text-danger' : 'bg-green-100 text-green-700'}`}>
                        {u.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={updating}
                        onClick={() => patchUser({ id: u.user_id, payload: { is_active: u.is_active === false ? true : false } })}
                      >
                        {u.is_active === false ? 'Activate' : 'Deactivate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
};

export default UserManagement;
