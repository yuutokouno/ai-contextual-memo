import { useMutation, useQueryClient } from "@tanstack/react-query";
import { memoApi } from "@/entities/memo";

export const useCreateMemo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => memoApi.create(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memos"] });
    },
  });
};
