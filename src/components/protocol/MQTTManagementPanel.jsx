/**
 * MQTT Management Panel Component
 *
 * Provides subscription management, message monitoring,
 * publish/subscribe configuration, topic hierarchy, and broker management.
 */

import {
  Filter,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiGetJson, apiPostJson } from "@/utils/apiFetch";

const MQTTManagementPanel = ({ isOpen, onClose, tenantId }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newSubscription, setNewSubscription] = useState({
    topic: "",
    qos: 0,
  });
  const [publishMessage, setPublishMessage] = useState({
    topic: "",
    payload: "",
    qos: 0,
    retain: false,
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [topicFilter, setTopicFilter] = useState("");
  const [_loading, _setLoading] = useState(false);

  // Fetch MQTT status
  const fetchMQTTStatus = useCallback(async () => {
    try {
      const url = `/api/v1/protocols/mqtt/status${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setConnectionStatus(data);
    } catch (_error) {}
  }, [tenantId]);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      const url = `/api/v1/protocols/mqtt/subscriptions${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setSubscriptions(data.subscriptions || []);
    } catch (_error) {}
  }, [tenantId]);

  // Fetch recent messages
  const fetchMessages = useCallback(async () => {
    try {
      const url = `/api/v1/protocols/mqtt/messages${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      const data = await apiGetJson(url);
      setMessages(data.messages || []);
    } catch (_error) {}
  }, [tenantId]);

  // Subscribe to topic
  const handleSubscribe = async () => {
    if (!newSubscription.topic) {
      toast.error("Topic is required");
      return;
    }

    try {
      const url = `/api/v1/protocols/mqtt/subscribe${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, newSubscription);

      toast.success(`Subscribed to ${newSubscription.topic}`);
      setNewSubscription({ topic: "", qos: 0 });
      fetchSubscriptions();
    } catch (_error) {
      toast.error("Failed to subscribe to topic");
    }
  };

  // Unsubscribe from topic
  const handleUnsubscribe = async (topic) => {
    try {
      const url = `/api/v1/protocols/mqtt/unsubscribe${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, { topic });

      toast.success(`Unsubscribed from ${topic}`);
      fetchSubscriptions();
    } catch (_error) {
      toast.error("Failed to unsubscribe from topic");
    }
  };

  // Publish message
  const handlePublish = async () => {
    if (!publishMessage.topic || !publishMessage.payload) {
      toast.error("Topic and payload are required");
      return;
    }

    try {
      const url = `/api/v1/protocols/mqtt/publish${tenantId ? `?tenant_id=${tenantId}` : ""}`;
      await apiPostJson(url, publishMessage);

      toast.success("Message published successfully");
      setPublishMessage({ topic: "", payload: "", qos: 0, retain: false });
    } catch (_error) {
      toast.error("Failed to publish message");
    }
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    toast.info("Message history cleared");
  };

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      fetchMQTTStatus();
      fetchSubscriptions();
      fetchMessages();

      // Auto-refresh every 3 seconds
      const interval = setInterval(() => {
        fetchMQTTStatus();
        fetchMessages();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isOpen, fetchMQTTStatus, fetchMessages, fetchSubscriptions]);

  // Filter messages by topic
  const filteredMessages = messages.filter((msg) =>
    topicFilter ? msg.topic.includes(topicFilter) : true,
  );

  const getQoSBadge = (qos) => {
    const colors = {
      0: "secondary",
      1: "default",
      2: "destructive",
    };
    return <Badge variant={colors[qos] || "outline"}>QoS {qos}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>MQTT Management</DialogTitle>
              <DialogDescription>
                Manage subscriptions, publish messages, and monitor MQTT traffic
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus && (
                <Badge
                  variant={
                    connectionStatus.connected ? "default" : "destructive"
                  }
                >
                  {connectionStatus.connected ? "Connected" : "Disconnected"}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="subscriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
            <TabsTrigger value="topics">Topic Hierarchy</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Add New Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="sub-topic">
                      Topic (supports wildcards)
                    </Label>
                    <Input
                      id="sub-topic"
                      placeholder="sensors/+/temperature or sensors/#"
                      value={newSubscription.topic}
                      onChange={(e) =>
                        setNewSubscription({
                          ...newSubscription,
                          topic: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-qos">QoS Level</Label>
                    <Select
                      value={String(newSubscription.qos)}
                      onValueChange={(value) =>
                        setNewSubscription({
                          ...newSubscription,
                          qos: parseInt(value, 10),
                        })
                      }
                    >
                      <SelectTrigger id="sub-qos">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">QoS 0 - At most once</SelectItem>
                        <SelectItem value="1">QoS 1 - At least once</SelectItem>
                        <SelectItem value="2">QoS 2 - Exactly once</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSubscribe} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Subscribe
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Active Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {subscriptions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No active subscriptions
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subscriptions.map((sub) => (
                        <div
                          key={sub.topic}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{sub.topic}</span>
                            {getQoSBadge(sub.qos)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUnsubscribe(sub.topic)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by topic..."
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="max-w-xs"
                />
                {topicFilter && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTopicFilter("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {filteredMessages.length} messages
                </Badge>
                <Button size="sm" variant="outline" onClick={clearMessages}>
                  Clear
                </Button>
                <Button size="sm" variant="outline" onClick={fetchMessages}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[500px]">
              {filteredMessages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {topicFilter
                    ? "No messages match the filter"
                    : "No messages received yet"}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((msg) => (
                    <Card key={`${msg.topic}-${msg.timestamp}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {msg.topic}
                            </span>
                            {getQoSBadge(msg.qos)}
                            {msg.retained && (
                              <Badge variant="secondary">Retained</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {msg.timestamp
                              ? new Date(msg.timestamp).toLocaleTimeString()
                              : "N/A"}
                          </span>
                        </div>
                        <div className="bg-muted p-3 rounded font-mono text-sm overflow-x-auto">
                          <pre className="whitespace-pre-wrap break-all">
                            {typeof msg.payload === "object"
                              ? JSON.stringify(msg.payload, null, 2)
                              : msg.payload}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="publish" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Publish Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pub-topic">Topic</Label>
                  <Input
                    id="pub-topic"
                    placeholder="sensors/temperature/device1"
                    value={publishMessage.topic}
                    onChange={(e) =>
                      setPublishMessage({
                        ...publishMessage,
                        topic: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="pub-payload">Payload</Label>
                  <Textarea
                    id="pub-payload"
                    placeholder='{"temperature": 25.5, "unit": "celsius"}'
                    rows={8}
                    value={publishMessage.payload}
                    onChange={(e) =>
                      setPublishMessage({
                        ...publishMessage,
                        payload: e.target.value,
                      })
                    }
                    className="font-mono text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pub-qos">QoS Level</Label>
                    <Select
                      value={String(publishMessage.qos)}
                      onValueChange={(value) =>
                        setPublishMessage({
                          ...publishMessage,
                          qos: parseInt(value, 10),
                        })
                      }
                    >
                      <SelectTrigger id="pub-qos">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">QoS 0 - At most once</SelectItem>
                        <SelectItem value="1">QoS 1 - At least once</SelectItem>
                        <SelectItem value="2">QoS 2 - Exactly once</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publishMessage.retain}
                        onChange={(e) =>
                          setPublishMessage({
                            ...publishMessage,
                            retain: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Retain message</span>
                    </label>
                  </div>
                </div>

                <Button onClick={handlePublish} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Publish Message
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="topics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Topic Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No topics to display
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {Array.from(new Set(messages.map((m) => m.topic)))
                        .sort()
                        .map((topic) => {
                          const msgCount = messages.filter(
                            (m) => m.topic === topic,
                          ).length;
                          return (
                            <div
                              key={topic}
                              className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                            >
                              <span className="font-mono text-sm">{topic}</span>
                              <Badge variant="outline">
                                {msgCount} messages
                              </Badge>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MQTTManagementPanel;
