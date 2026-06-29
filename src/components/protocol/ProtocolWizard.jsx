import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle2, ChevronLeft, ChevronRight, Save, XCircle } from "lucide-react";

const PROTOCOL_TYPES = {
  "opc-ua": {
    label: "OPC-UA",
    steps: [
      { id: "endpoint", title: "Endpoint", description: "Server URL" },
      { id: "security", title: "Security", description: "Auth settings" },
      { id: "nodes", title: "Nodes", description: "Select nodes" },
      { id: "review", title: "Review", description: "Confirm" },
    ],
    fields: ["endpointUrl", "securityMode", "securityPolicy", "username", "password"],
  },
  mqtt: {
    label: "MQTT",
    steps: [
      { id: "broker", title: "Broker", description: "Connection" },
      { id: "topics", title: "Topics", description: "Subscribe" },
      { id: "review", title: "Review", description: "Confirm" },
    ],
    fields: ["brokerUrl", "clientId", "username", "password", "topics"],
  },
  modbus: {
    label: "Modbus",
    steps: [
      { id: "connection", title: "Connection", description: "Serial/TCP" },
      { id: "registers", title: "Registers", description: "Map registers" },
      { id: "review", title: "Review", description: "Confirm" },
    ],
    fields: ["transport", "host", "port", "slaveId", "registers"],
  },
  dnp3: {
    label: "DNP3",
    steps: [
      { id: "outstation", title: "Outstation", description: "Configure" },
      { id: "points", title: "Points", description: "Map points" },
      { id: "review", title: "Review", description: "Confirm" },
    ],
    fields: ["outstationAddress", "masterAddress", "points"],
  },
};

export function ProtocolWizard({ protocol, onSave, onCancel, initialData }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData || {});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const protocolConfig = PROTOCOL_TYPES[protocol];
  const steps = protocolConfig?.steps || [];
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const validateStep = (stepIndex) => {
    const step = steps[stepIndex];
    const newErrors = {};

    // Basic validation - check required fields for this step
    if (step) {
      // Add validation logic based on step
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) return;

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaveSuccess(true);
      if (onSave) {
        onSave(formData);
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    if (!step) return null;

    switch (step.id) {
      case "endpoint":
      case "broker":
      case "connection":
      case "outstation":
        return renderConnectionFields();
      case "security":
        return renderSecurityFields();
      case "nodes":
      case "topics":
      case "registers":
      case "points":
        return renderDataFields();
      case "review":
        return renderReview();
      default:
        return <div>Unknown step</div>;
    }
  };

  const renderConnectionFields = () => {
    const fields = {
      endpointUrl: { label: "Endpoint URL", type: "text", placeholder: "opc.tcp://localhost:4840" },
      brokerUrl: { label: "Broker URL", type: "text", placeholder: "mqtt://localhost:1883" },
      host: { label: "Host", type: "text", placeholder: "localhost" },
      port: { label: "Port", type: "number", placeholder: "502" },
      outstationAddress: { label: "Outstation Address", type: "number", placeholder: "1" },
      masterAddress: { label: "Master Address", type: "number", placeholder: "2" },
    };

    const relevantFields = Object.keys(fields).filter((key) =>
      protocolConfig.fields.includes(key)
    );

    return (
      <div className="space-y-4">
        {relevantFields.map((key) => (
          <div key={key}>
            <Label htmlFor={key}>{fields[key].label}</Label>
            <Input
              id={key}
              type={fields[key].type}
              placeholder={fields[key].placeholder}
              value={formData[key] || ""}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className={errors[key] ? "border-red-500" : ""}
            />
            {errors[key] && <p className="text-sm text-red-500 mt-1">{errors[key]}</p>}
          </div>
        ))}
      </div>
    );
  };

  const renderSecurityFields = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="securityMode">Security Mode</Label>
          <Select
            value={formData.securityMode || "none"}
            onValueChange={(value) => handleFieldChange("securityMode", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select security mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="sign">Sign</SelectItem>
              <SelectItem value="signAndEncrypt">Sign & Encrypt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="securityPolicy">Security Policy</Label>
          <Select
            value={formData.securityPolicy || "basic256"}
            onValueChange={(value) => handleFieldChange("securityPolicy", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select security policy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic256">Basic256</SelectItem>
              <SelectItem value="basic128">Basic128</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Username"
            value={formData.username || ""}
            onChange={(e) => handleFieldChange("username", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={formData.password || ""}
            onChange={(e) => handleFieldChange("password", e.target.value)}
          />
        </div>
      </div>
    );
  };

  const renderDataFields = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Configure the data points for this protocol
        </div>
        <div className="border rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Data point configuration will be available here</span>
            </div>
            <div className="text-xs text-muted-foreground">
              This is a simplified view. Full configuration available in the complete wizard.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReview = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Review your configuration before saving
        </div>
        <div className="border rounded-lg divide-y">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="flex justify-between py-2 px-4">
              <span className="font-medium">{key}</span>
              <span className="text-muted-foreground">{String(value) || "Not set"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{protocolConfig?.label} Protocol</CardTitle>
            <CardDescription>
              Step {currentStep + 1} of {steps.length}: {currentStepData?.title}
            </CardDescription>
          </div>
          <Badge variant="outline">{protocol}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={String(currentStep)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {steps.map((step, index) => (
              <TabsTrigger
                key={`step-${step.id}-${index}`}
                value={String(index)}
                className={index <= currentStep ? "text-primary" : ""}
                disabled={index > currentStep}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{index + 1}</span>
                  <span className="text-xs">{step.title}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {steps.map((step, index) => (
            <TabsContent key={`content-${step.id}-${index}`} value={String(index)}>
              <div className="py-4">{renderStepContent()}</div>
            </TabsContent>
          ))}
        </Tabs>

        {errors.submit && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{errors.submit}</AlertDescription>
          </Alert>
        )}

        {saveSuccess && (
          <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Protocol configuration saved successfully!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Default export for compatibility with existing imports
export default ProtocolWizard;
