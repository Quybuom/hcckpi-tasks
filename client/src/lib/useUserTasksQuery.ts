import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

export function useUserTasksQuery() {
  const { user } = useAuth();
  
  // Map user role to appropriate query with assignment role filter
  const isDirector = user?.role === "Giám đốc";
  const isDeputyDirector = user?.role === "Phó Giám đốc";
  
  // Construct query key based on role
  // - Director: ALL organization tasks (both completed and not completed)
  // - Deputy Director: ALL tasks they "Chủ trì" (lead), "Chỉ đạo" (supervise), OR "Phối hợp" (collaborate) - filtering happens in frontend
  // - Staff/Department Head: All tasks they're assigned to (Chủ trì + Phối hợp)
  const queryKey = !user 
    ? null
    : isDirector
      ? ['/api/tasks']  // ALL organization tasks for full visibility
      : isDeputyDirector
        ? [`/api/tasks?userId=${user.id}&assignmentRoles=Chủ trì,Chỉ đạo,Phối hợp`]  // Fetch ALL tasks with all 3 roles (including completed)
        : [`/api/tasks?userId=${user.id}`];  // Staff: All assigned tasks (Chủ trì + Phối hợp)
  
  // AUTHENTICATED: Fetch user tasks with dynamic query
  return useQuery<any[]>({
    queryKey: queryKey || ['tasks-disabled'],
    queryFn: () => {
      const url = (queryKey && queryKey[0]) || '/api/tasks';
      return fetchJson<any[]>(url);
    },
    enabled: !!user && !!queryKey,
  });
}
