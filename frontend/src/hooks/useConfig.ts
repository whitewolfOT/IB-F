import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminApi from '../api/admin';

export const useConfig = () =>
  useQuery({
    queryKey: ['admin', 'config'],
    queryFn: adminApi.getConfig,
  });

export const useProposals = () =>
  useQuery({
    queryKey: ['admin', 'proposals'],
    queryFn: adminApi.getProposals,
  });

export const useRatifyProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.ratify(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};

export const useRejectProposal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
};
