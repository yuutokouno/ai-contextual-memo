import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memoApi } from "@/entities/memo";

export const useDeleteMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => memoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
};
