/**
 * Protocol Configuration Wizard
 *
 * Step-by-step wizard for configuring new protocol connections
 * Supports Modbus, OPC-UA, DNP3, and MQTT
 */

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { apiPostJson } from "@/utils/apiFetch";

// Default configuration values
const DEFAULT_CONFIG = {
  // Modbus
  device_id: "",
  host: "",
  port: 502,
  unit_id: 1,
  timeout: 5,

  // OPC-UA
  endpoint_url: "",
  security_mode: "None",
  security_policy: "None",
  username: "",
  password: "",

  // DNP3
  master_address: 1,
  outstation_address: 10,
  dnp3_port: 20000,
  link_timeout: 5,
  app_timeout: 5,

  // MQTT
  broker_host: "",
  broker_port: 1883,
  client_id: "",
  use_tls: false,
  mqtt_username: "",
  mqtt_password: "",
};

const ProtocolWizard = ({ isOpen, onClose, onSuccess, tenantId }) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [currentStep, setCurrentStep] = useState(0);
  const [protocol, setProtocol] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const steps = {
    modbus: [
      { title: "Protocol Selection", description: "Choose protocol type" },
      { title: "Device Info", description: "Enter device details" },
      { title: "Connection", description: "Network configuration" },
      { title: "Test Connection", description: "Verify connectivity" },
      { title: "Complete", description: "Finish setup" },
    ],
    opcua: [
      { title: "Protocol Selection", description: "Choose protocol type" },
      { title: "Server Info", description: "OPC-UA server details" },
      { title: "Security", description: "Security configuration" },
      { title: "Test Connection", description: "Verify connectivity" },
      { title: "Complete", description: "Finish setup" },
    ],
    dnp3: [
      { title: "Protocol Selection", description: "Choose protocol type" },
      { title: "Addresses", description: "Master and outstation" },
      { title: "Connection", description: "Network configuration" },
      { title: "Test Connection", description: "Verify connectivity" },
      { title: "Complete", description: "Finish setup" },
    ],
    mqtt: [
      { title: "Protocol Selection", description: "Choose protocol type" },
      { title: "Broker Info", description: "MQTT broker details" },
      { title: "Authentication", description: "Credentials (optional)" },
      { title: "Test Connection", description: "Verify connectivity" },
      { title: "Complete", description: "Finish setup" },
    ],
  };

  const getCurrentSteps = () => steps[protocol] || steps.modbus;

  // ✅ FIXED: Safe number handler - handles empty string and NaN
  const handleNumberChange = (field, value) => {
    if (value === "") {
      setConfig({ ...config, [field]: "" });
      return;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      setConfig({ ...config, [field]: "" });
      return;
    }
    setConfig({ ...config, [field]: parsed });
  };

  // ✅ FIXED: Safe string handler
  const handleStringChange = (field, value) => {
    setConfig({ ...config, [field]: value });
  };

  // ✅ FIXED: Safe boolean handler
  const handleBooleanChange = (field, value) => {
    setConfig({ ...config, [field]: value });
  };

  const isStepValid = () => {
    // Step 0: Protocol selection - required
    if (currentStep === 0) {
      return Boolean(protocol);
    }

    // Allow navigation through all other steps
    // Field validation will be handled when saving or testing connection
    return true;
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const url = `/api/v1/protocols/${protocol}/test-connection${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const result = await apiPostJson(url, config);

      setTestResult({
        success: true,
        message: result.message || "Connection successful",
        details: result.details,
      });
      toast.success("Connection test successful!");
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message || "Connection failed",
        details: error.details,
      });
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      const url = `/api/v1/protocols/${protocol}/devices${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, config);

      toast.success(`${protocol.toUpperCase()} device configured successfully`);
      onSuccess?.();
      handleClose();
    } catch (_error) {
      toast.error("Failed to save configuration");
    }
  };

  const handleNext = () => {
    if (currentStep < getCurrentSteps().length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ✅ FIXED: Properly resets config to DEFAULT_CONFIG instead of empty object
  const handleClose = () => {
    setCurrentStep(0);
    setProtocol("");
    setTestResult(null);
    setConfig(DEFAULT_CONFIG);
    onClose();
  };

  // ✅ FIXED: Consistent save disable logic
  const isSaveDisabled = testResult && !testResult.success;

  const renderStepContent = () => {
    // Step 0: Protocol Selection
    if (currentStep === 0) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Protocol</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["modbus", "opcua", "dnp3", "mqtt"].map((p) => (
              <Card
                key={p}
                className={`cursor-pointer transition-colors ${
                  protocol === p
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setProtocol(p)}
              >
                <CardContent className="p-6 text-center">
                  <h4 className="text-xl font-bold uppercase">{p}</h4>
                  <p className="text-sm text-muted-foreground mt-2">
                    {p === "modbus" && "Industrial serial/TCP protocol"}
                    {p === "opcua" && "OPC Unified Architecture"}
                    {p === "dnp3" && "Distributed Network Protocol"}
                    {p === "mqtt" && "Message Queue Telemetry"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    }

    // Modbus Steps
    if (protocol === "modbus") {
      if (currentStep === 1) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Device Information</h3>
            <div>
              <Label htmlFor="device-id">Device ID</Label>
              <Input
                id="device-id"
                value={config.device_id}
                onChange={(e) =>
                  handleStringChange("device_id", e.target.value)
                }
                placeholder="pump_001"
              />
            </div>
            <div>
              <Label htmlFor="unit-id">Unit ID (Slave Address)</Label>
              <Input
                id="unit-id"
                type="number"
                value={config.unit_id}
                onChange={(e) =>
                  handleNumberChange("unit_id", e.target.value)
                }
              />
            </div>
          </div>
        );
      }
      if (currentStep === 2) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connection Settings</h3>
            <div>
              <Label htmlFor="host">Host/IP Address</Label>
              <Input
                id="host"
                value={config.host}
                onChange={(e) =>
                  handleStringChange("host", e.target.value)
                }
                placeholder="192.168.1.100"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={config.port}
                  onChange={(e) =>
                    handleNumberChange("port", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={config.timeout}
                  onChange={(e) =>
                    handleNumberChange("timeout", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        );
      }
    }

    // OPC-UA Steps
    if (protocol === "opcua") {
      if (currentStep === 1) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Server Information</h3>
            <div>
              <Label htmlFor="endpoint">Endpoint URL</Label>
              <Input
                id="endpoint"
                value={config.endpoint_url}
                onChange={(e) =>
                  handleStringChange("endpoint_url", e.target.value)
                }
                placeholder="opc.tcp://localhost:4840"
              />
            </div>
          </div>
        );
      }
      if (currentStep === 2) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Security Configuration</h3>
            <div>
              <Label htmlFor="security-mode">Security Mode</Label>
              <Select
                value={config.security_mode}
                onValueChange={(value) =>
                  handleStringChange("security_mode", value)
                }
              >
                <SelectTrigger id="security-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Sign">Sign</SelectItem>
                  <SelectItem value="SignAndEncrypt">
                    Sign and Encrypt
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                value={config.username}
                onChange={(e) =>
                  handleStringChange("username", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="password">Password (optional)</Label>
              <Input
                id="password"
                type="password"
                value={config.password}
                onChange={(e) =>
                  handleStringChange("password", e.target.value)
                }
              />
            </div>
          </div>
        );
      }
    }

    // DNP3 Steps
    if (protocol === "dnp3") {
      if (currentStep === 1) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">DNP3 Addresses</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="master-addr">Master Address</Label>
                <Input
                  id="master-addr"
                  type="number"
                  value={config.master_address}
                  onChange={(e) =>
                    handleNumberChange("master_address", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="outstation-addr">Outstation Address</Label>
                <Input
                  id="outstation-addr"
                  type="number"
                  value={config.outstation_address}
                  onChange={(e) =>
                    handleNumberChange("outstation_address", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        );
      }
      if (currentStep === 2) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connection Settings</h3>
            <div>
              <Label htmlFor="dnp3-host">Host/IP Address</Label>
              <Input
                id="dnp3-host"
                value={config.host}
                onChange={(e) =>
                  handleStringChange("host", e.target.value)
                }
                placeholder="192.168.1.100"
              />
            </div>
            <div>
              <Label htmlFor="dnp3-port">Port</Label>
              <Input
                id="dnp3-port"
                type="number"
                value={config.dnp3_port}
                onChange={(e) =>
                  handleNumberChange("dnp3_port", e.target.value)
                }
              />
            </div>
          </div>
        );
      }
    }

    // MQTT Steps
    if (protocol === "mqtt") {
      if (currentStep === 1) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Broker Information</h3>
            <div>
              <Label htmlFor="broker-host">Broker Host</Label>
              <Input
                id="broker-host"
                value={config.broker_host}
                onChange={(e) =>
                  handleStringChange("broker_host", e.target.value)
                }
                placeholder="broker.hivemq.com"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="broker-port">Port</Label>
                <Input
                  id="broker-port"
                  type="number"
                  value={config.broker_port}
                  onChange={(e) =>
                    handleNumberChange("broker_port", e.target.value)
                  }
                />
              </div>
              <div>
                <Label htmlFor="client-id">Client ID</Label>
                <Input
                  id="client-id"
                  value={config.client_id}
                  onChange={(e) =>
                    handleStringChange("client_id", e.target.value)
                  }
                  placeholder="thermacore-client"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="use-tls"
                checked={config.use_tls}
                onChange={(e) =>
                  handleBooleanChange("use_tls", e.target.checked)
                }
                className="w-4 h-4"
              />
              <Label htmlFor="use-tls">Use TLS/SSL</Label>
            </div>
          </div>
        );
      }
      if (currentStep === 2) {
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Authentication (Optional)</h3>
            <div>
              <Label htmlFor="mqtt-username">Username</Label>
              <Input
                id="mqtt-username"
                value={config.mqtt_username}
                onChange={(e) =>
                  handleStringChange("mqtt_username", e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="mqtt-password">Password</Label>
              <Input
                id="mqtt-password"
                type="password"
                value={config.mqtt_password}
                onChange={(e) =>
                  handleStringChange("mqtt_password", e.target.value)
                }
              />
            </div>
          </div>
        );
      }
    }

    // Test Connection Step (same for all protocols)
    if (currentStep === getCurrentSteps().length - 2) {
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Connection</h3>
          <p className="text-sm text-muted-foreground">
            Click the button below to test your configuration
          </p>

          <Button
            onClick={testConnection}
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          {testResult && (
            <Card
              className={
                testResult.success
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-destructive bg-destructive/10"
              }
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        testResult.success
                          ? "text-green-600"
                          : "text-destructive"
                      }`}
                    >
                      {testResult.message}
                    </p>
                    {testResult.details && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {testResult.details}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // Complete Step
    if (currentStep === getCurrentSteps().length - 1) {
      return (
        <div className="space-y-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h3 className="text-xl font-semibold">Configuration Complete!</h3>
          <p className="text-muted-foreground">
            Your {protocol.toUpperCase()} device has been configured
            successfully. Click the Save button below to finish.
          </p>
        </div>
      );
    }

    return null;
  };

  // Navigation buttons for desktop/mobile consistency
  const renderNavigation = () => (
    <div className="flex justify-between mt-6">
      <Button
        variant="outline"
        onClick={handleBack}
        disabled={currentStep === 0}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      {currentStep < getCurrentSteps().length - 1 && (
        <Button onClick={handleNext} disabled={!isStepValid()}>
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
      {currentStep === getCurrentSteps().length - 1 && (
        // ✅ FIXED: Consistent save disabled logic
        <Button
          onClick={saveConfiguration}
          disabled={isSaveDisabled}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      )}
    </div>
  );

  // Mobile (Drawer) View
  if (!isDesktop) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Protocol Configuration</DrawerTitle>
            <DrawerDescription>
              Step-by-step guide to configure your protocol
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-4 h-full overflow-y-auto">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                {getCurrentSteps().map((step, index) => (
                  <div
                    key={`${protocol}-${index}`}
                    className={`flex-1 text-center ${
                      index <= currentStep
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                        index <= currentStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="text-xs hidden sm:inline">
                      {step.title}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-1 bg-muted rounded-full">
                <div
                  className="h-1 bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      (currentStep / (getCurrentSteps().length - 1)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="min-h-[300px]">{renderStepContent()}</div>

            {renderNavigation()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop (Dialog) View
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Protocol Configuration Wizard</DialogTitle>
          <DialogDescription>
            Step-by-step guide to configure your protocol connection
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-2 mb-6 p-2 bg-muted/40 rounded-lg">
          {getCurrentSteps().map((step, stepIndex) => (
            <div key={stepIndex} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    stepIndex === currentStep
                      ? "bg-primary text-primary-foreground"
                      : stepIndex < currentStep
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepIndex < currentStep ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    stepIndex + 1
                  )}
                </div>
                <span className="text-xs mt-1 hidden sm:block">
                  {step.title}
                </span>
              </div>
              {stepIndex < getCurrentSteps().length - 1 && (
                <div
                  className={`h-0.5 w-12 mx-2 ${
                    stepIndex < currentStep ? "bg-green-600" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Navigation */}
        {renderNavigation()}
      </DialogContent>
    </Dialog>
  );
};

export default ProtocolWizard;
