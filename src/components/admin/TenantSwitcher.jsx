import { Building2, Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTenant } from "../../context/TenantContext";

/**
 * TenantSwitcher component for admin users to switch between tenants
 * Only visible to admin users with multi-tenant access
 */
export default function TenantSwitcher() {
  const { currentTenant, availableTenants, isAdmin, switchTenant, isLoading } =
    useTenant();

  // Don't render for non-admin users
  if (!isAdmin) {
    return null;
  }

  // Don't render while loading
  if (isLoading) {
    return null;
  }

  const handleTenantSwitch = (tenantId) => {
    switchTenant(tenantId);
    // Optionally trigger a page reload to refresh data
    // window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-[200px]"
        >
          <Building2 className="h-4 w-4" />
          <span className="flex-1 text-left truncate">
            {currentTenant ? currentTenant.name : "All Tenants"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All Tenants option */}
        <DropdownMenuItem
          onClick={() => handleTenantSwitch(null)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span>All Tenants</span>
            {!currentTenant && <Check className="h-4 w-4" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Individual tenants */}
        {availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantSwitch(tenant.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{tenant.name}</span>
              {currentTenant?.id === tenant.id && <Check className="h-4 w-4" />}
            </div>
          </DropdownMenuItem>
        ))}

        {availableTenants.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-sm">
              No tenants available
            </span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
