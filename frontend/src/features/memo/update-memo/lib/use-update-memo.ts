import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memoApi } from "@/entities/memo";

export const useUpdateMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      memoApi.update(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
};
