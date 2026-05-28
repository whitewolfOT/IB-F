import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

interface Asset {
  asset_id: string;
  name: string;
  type: string;
  value?: number;
  currency?: string;
  status?: string;
  created_at: string;
  [key: string]: unknown;
}

const ASSET_TYPES = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'property', label: 'Property' },
  { value: 'commodity', label: 'Commodity' },
];

const AssetRegistry: React.FC = () => {
  const qc = useQueryClient();
  const { data: assets, isLoading, error } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: () => client.get<Asset[]>('/api/assets').then((r) => r.data),
  });

  const { mutateAsync: createAsset, isPending } = useMutation({
    mutationFn: (payload: Partial<Asset>) => client.post<Asset>('/api/assets', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setFormError('Name is required.'); return; }
    if (!type) { setFormError('Type is required.'); return; }
    setFormError('');
    try {
      await createAsset({ name, type, value: value ? Number(value) : undefined, currency });
      setName(''); setType(''); setValue(''); setCurrency('USD'); setShowForm(false);
    } catch {
      setSubmitError('Failed to create asset.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Asset Registry</h2>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'Register Asset'}</Button>
      </div>

      {showForm && (
        <Card title="Register New Asset">
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input id="name" label="Asset Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select id="type" label="Asset Type" options={ASSET_TYPES} placeholder="-- Select --" value={type} onChange={(e) => setType(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input id="value" label="Value (optional)" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
              <Input id="currency" label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
            </div>
            {formError && <p className="text-sm text-danger">{formError}</p>}
            {submitError && <p className="text-sm text-danger">{submitError}</p>}
            <Button type="submit" loading={isPending}>Register</Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : error ? (
        <div className="bg-danger-light border border-danger/30 rounded-md p-4 text-sm text-danger">Failed to load assets.</div>
      ) : (
        <Card>
          {!assets || assets.length === 0 ? (
            <EmptyState title="No assets" message="Register your first asset above." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Value</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.asset_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs text-gray-500">{a.asset_id.slice(0, 8)}…</td>
                    <td className="py-2 font-medium">{a.name}</td>
                    <td className="py-2">{a.type}</td>
                    <td className="py-2 font-mono">{a.value ?? '—'} {a.currency}</td>
                    <td className="py-2 text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString()}</td>
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

export default AssetRegistry;
