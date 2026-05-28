import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as eventsApi from '../api/events';
import type { CreateEventPayload, TransitionPayload, PipelinePayload, SettlePayload } from '../api/events';

export const useEvents = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['events', params],
    queryFn: () => eventsApi.list(params),
  });

export const useEvent = (id: string) =>
  useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.get(id),
    enabled: !!id,
  });

export const useCreateEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEventPayload) => eventsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });
};

export const useTransitionEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TransitionPayload }) =>
      eventsApi.transition(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['events', vars.id] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useRunPipeline = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PipelinePayload }) =>
      eventsApi.runPipeline(id, payload),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['events', vars.id] }),
  });
};

export const useSettleEvent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SettlePayload }) =>
      eventsApi.settle(id, payload),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['events', vars.id] }),
  });
};
