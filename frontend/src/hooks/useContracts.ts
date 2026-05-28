import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as contractsApi from '../api/contracts';
import type { CreateContractPayload } from '../api/contracts';

export const useContracts = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['contracts', params],
    queryFn: () => contractsApi.list(params),
  });

export const useContract = (id: string) =>
  useQuery({
    queryKey: ['contracts', id],
    queryFn: () => contractsApi.get(id),
    enabled: !!id,
  });

export const useCreateContract = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateContractPayload) => contractsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  });
};
