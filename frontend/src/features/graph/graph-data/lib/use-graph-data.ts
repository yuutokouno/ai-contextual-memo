import { useQuery } from "@tanstack/react-query";
import { graphApi } from "@/entities/graph";

export const useGraphData = () => {
  return useQuery({
    queryKey: ["graph"],
    queryFn: graphApi.getGraph,
  });
};
