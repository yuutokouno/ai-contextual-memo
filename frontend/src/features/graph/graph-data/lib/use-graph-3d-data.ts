import { useQuery } from "@tanstack/react-query";
import { graphApi } from "@/entities/graph";

export const useGraph3DData = () => {
  return useQuery({
    queryKey: ["graph3d"],
    queryFn: graphApi.getGraph3D,
  });
};
