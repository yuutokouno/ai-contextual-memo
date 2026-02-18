import { useQuery } from "@tanstack/react-query";
import { memoApi } from "@/entities/memo";

export const useMemoList = () => {
  return useQuery({
    queryKey: ["memos"],
    queryFn: memoApi.getAll,
  });
};
