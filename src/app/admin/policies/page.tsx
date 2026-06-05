import { fetchAllAdminPolicies } from "@/lib/admin/policyData";
import AdminPoliciesContent from "@/components/admin/AdminPoliciesContent";

export default async function AdminPoliciesPage() {
  const policies = await fetchAllAdminPolicies();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900">Toate polițele</h2>
        <p className="mt-1 text-sm text-gray-500">
          {policies.length}{" "}
          {policies.length === 1 ? "poliță" : "polițe"} din toți utilizatorii.
        </p>
      </div>

      <AdminPoliciesContent policies={policies} />
    </div>
  );
}
