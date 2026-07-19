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
 * 
 * Behavior: Clicking a tenant selects it (green tick) and closes the dropdown.
 * The "Go to Dashboard" button on the Admin Landing page handles navigation.
 */
export default function TenantSwitcher() {
  const { currentTenant, availableTenants, isAdmin, isLoading, switchTenant } =
    useTenant();

  // Don't render for non-admin users
  if (!isAdmin) {
    return null;
  }

  // Don't render while loading
  if (isLoading) {
    return null;
  }

  const handleTenantSelect = (tenantId) => {
    // Switch tenant (this updates currentTenant in context)
    switchTenant(tenantId);
    
    // Set flag that user has made a selection
    // ✅ Wrap in try/catch to handle storage errors in Safari private browsing, etc.
    try {
      sessionStorage.setItem("tenant_selected", "true");
    } catch (_error) {
      // Non-critical — ignore storage failures (e.g., Safari private browsing)
    }
  };

  // ✅ Check both null and undefined to handle context initialization states
  const isAllTenantsSelected = !currentTenant;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-[200px] w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="flex-1 text-left truncate">
              {currentTenant ? currentTenant.name : "All Tenants"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Switch Tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All Tenants option */}
        <DropdownMenuItem
          onClick={() => handleTenantSelect(null)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between w-full">
            <span className="truncate">All Tenants</span>
            {isAllTenantsSelected && <Check className="h-4 w-4 text-green-500" />}
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Individual tenants */}
        {availableTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantSelect(tenant.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="truncate">{tenant.name}</span>
              {currentTenant?.id === tenant.id && <Check className="h-4 w-4 text-green-500" />}
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
