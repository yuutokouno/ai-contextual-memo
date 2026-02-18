import { useMutation } from "@tanstack/react-query";
import { memoApi } from "@/entities/memo";

export const useSearchMemo = () => {
  return useMutation({
    mutationFn: (query: string) => memoApi.search(query),
  });
};
