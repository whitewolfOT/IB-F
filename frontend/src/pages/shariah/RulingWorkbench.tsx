import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import { applyRuling, saveDraft } from '../../api/reviews';
import type { Review } from '../../api/reviews';
import { list as listStandards } from '../../api/standards';
import type { Standard } from '../../api/standards';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import Spinner from '../../components/ui/Spinner';

const RULING_TYPES = [
  { value: 'permissible', label: 'Permissible (Halal)' },
  { value: 'impermissible', label: 'Impermissible (Haram)' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'requires_rectification', label: 'Requires Rectification' },
];

const VIOLATIONS = [
  { key: 'riba', label: 'Riba (Interest)', description: 'Any increase in exchange of specific items.' },
  { key: 'gharar', label: 'Gharar (Uncertainty)', description: 'Excessive ambiguity in contract terms.' },
  { key: 'maysir', label: 'Maysir (Speculation)', description: 'Gambling or speculative elements.' },
];

const RulingWorkbench: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: review, isLoading } = useQuery<Review>({
    queryKey: ['reviews', reviewId],
    queryFn: () => client.get<Review>(`/api/reviews/${reviewId}`).then((r) => r.data),
    enabled: !!reviewId,
  });

  const { data: standards } = useQuery<Standard[]>({
    queryKey: ['standards'],
    queryFn: () => listStandards(),
  });

  const { mutateAsync: saveD, isPending: savingDraft } = useMutation({
    mutationFn: (text: string) => saveDraft(reviewId!, { draft_reasoning: text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', reviewId] }),
  });

  const { mutateAsync: submitRuling, isPending: submitting } = useMutation({
    mutationFn: () =>
      applyRuling(reviewId!, {
        ruling_type: rulingType,
        legal_reasoning: reasoning,
        ruling_confidence: confidence,
        signature,
        selected_standards: selectedStandards,
        violations,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      navigate('/shariah');
    },
  });

  const [reasoning, setReasoning] = useState('');
  const [rulingType, setRulingType] = useState('');
  const [confidence, setConfidence] = useState(80);
  const [signature, setSignature] = useState('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [violations, setViolations] = useState<Record<string, boolean>>({ riba: false, gharar: false, maysir: false });
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [standardsSearch, setStandardsSearch] = useState('');

  // Pre-populate from draft
  useEffect(() => {
    if (review?.draft_reasoning) {
      setReasoning(review.draft_reasoning);
    }
    if (review?.ruling_type) {
      setRulingType(review.ruling_type);
    }
    if (typeof review?.ruling_confidence === 'number') {
      setConfidence(review.ruling_confidence);
    }
  }, [review]);

  const hasChanged = useRef(false);

  // Track changes
  useEffect(() => {
    hasChanged.current = true;
  }, [reasoning]);

  // Autosave every 30 seconds when content changed
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasChanged.current && reasoning.trim()) {
        try {
          await saveD(reasoning);
          setLastSaved(new Date().toLocaleTimeString());
          hasChanged.current = false;
        } catch {
          // silent autosave failure
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [reasoning, saveD]);

  const handleSaveDraft = useCallback(async () => {
    if (!reasoning.trim()) { setError('Reasoning cannot be empty.'); return; }
    setError('');
    try {
      const res = await saveD(reasoning);
      setLastSaved(new Date(res.draft_updated_at).toLocaleTimeString());
      hasChanged.current = false;
    } catch {
      setError('Failed to save draft.');
    }
  }, [reasoning, saveD]);

  const handleSubmit = async () => {
    if (!rulingType) { setError('Select a ruling type.'); return; }
    if (!reasoning.trim()) { setError('Legal reasoning is required.'); return; }
    if (!signature.trim()) { setError('Signature (name) is required.'); return; }
    setError('');
    try {
      await submitRuling();
    } catch {
      setError('Failed to submit ruling.');
    }
  };

  const toggleStandard = (id: string) => {
    setSelectedStandards((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link to="/shariah" className="text-xs text-client hover:underline">← Back to Queue</Link>
        <h2 className="text-xl font-bold text-gray-900 mt-1">Ruling Workbench</h2>
        <p className="text-xs font-mono text-gray-400">{reviewId}</p>
        {lastSaved && <p className="text-xs text-gray-400 mt-0.5">Draft saved at {lastSaved}</p>}
      </div>

      {/* Panel 1: Violation Scan */}
      <Card title="Violation Scan">
        <div className="flex flex-col gap-3">
          {VIOLATIONS.map((v) => (
            <label key={v.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-danger focus:ring-danger"
                checked={violations[v.key]}
                onChange={(e) => setViolations((prev) => ({ ...prev, [v.key]: e.target.checked }))}
              />
              <div>
                <p className="text-sm font-medium text-gray-800">{v.label}</p>
                <p className="text-xs text-gray-500">{v.description}</p>
              </div>
            </label>
          ))}
        </div>
        {Object.values(violations).some(Boolean) && (
          <div className="mt-3 bg-danger-light border border-danger/30 rounded p-3 text-xs text-danger">
            Violations flagged: {Object.entries(violations).filter(([, v]) => v).map(([k]) => k).join(', ')}
          </div>
        )}
      </Card>

      {/* Panel 2: Reasoning + Standards */}
      <Card title="Legal Reasoning & Standards">
        <div className="flex flex-col gap-4">
          <Textarea
            id="reasoning"
            label="Legal Reasoning"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={6}
            placeholder="Provide your Shariah legal analysis..."
          />
          {standards && standards.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">AAOIFI Standards</p>
              <input
                type="search"
                placeholder="Search standards by code or title…"
                value={standardsSearch}
                onChange={(e) => setStandardsSearch(e.target.value)}
                className="w-full mb-2 text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-shariah"
              />
              {(() => {
                const q = standardsSearch.toLowerCase();
                const filtered = standards.filter(s =>
                  !q || s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)
                );
                return filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 italic px-2">No standards match "{standardsSearch}"</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-100 rounded p-2">
                    {filtered.map((s) => (
                      <label key={s.standard_id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-shariah focus:ring-shariah"
                          checked={selectedStandards.includes(s.standard_id)}
                          onChange={() => toggleStandard(s.standard_id)}
                        />
                        <span className="text-xs text-gray-700">{s.code} – {s.title}</span>
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </Card>

      {/* Panel 3: Ruling + Confidence */}
      <Card title="Ruling">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Ruling Type</p>
            <div className="flex flex-col gap-2">
              {RULING_TYPES.map((rt) => (
                <label key={rt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="ruling_type"
                    value={rt.value}
                    checked={rulingType === rt.value}
                    onChange={() => setRulingType(rt.value)}
                    className="h-4 w-4 text-shariah focus:ring-shariah"
                  />
                  <span className="text-sm">{rt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="confidence" className="text-sm font-medium text-gray-700">
              Confidence: {confidence}%
            </label>
            <input
              id="confidence"
              type="range"
              min={0}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full mt-1 accent-shariah"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="signature" className="text-sm font-medium text-gray-700">Signature (Full Name)</label>
            <input
              id="signature"
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Your full name as digital signature"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-shariah"
            />
          </div>

          {error && (
            <div className="bg-danger-light border border-danger/30 rounded p-3 text-sm text-danger">{error}</div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" loading={savingDraft} onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button
              className="bg-shariah hover:bg-shariah-dark text-white"
              loading={submitting}
              onClick={handleSubmit}
            >
              Sign & Submit
            </Button>
          </div>
          <p className="text-xs text-gray-400">Sign & Submit is irreversible.</p>
        </div>
      </Card>
    </div>
  );
};

export default RulingWorkbench;
