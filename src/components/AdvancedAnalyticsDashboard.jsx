import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

const AdvancedAnalyticsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedUnit, setSelectedUnit] = useState('all');

  // Mock data for demonstration - in real app, this would come from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = {
        overview: {
          total_units: 12,
          active_units: 10,
          total_sensors: 48,
          recent_readings: 2856,
          uptime_percentage: 83.3
        },
        trends: {
          current_week_readings: 19992,
          previous_week_readings: 18456,
          trend_percentage: 8.3
        },
        performance: {
          avg_temperature_24h: 67.8,
          max_temperature_24h: 89.4,
          data_quality_score: 94.2
        },
        unitsPerformance: [
          { unit_id: 'UNIT001', unit_name: 'Boiler Alpha', performance_score: 98, status: 'online', reading_count: 144 },
          { unit_id: 'UNIT002', unit_name: 'Chiller Beta', performance_score: 87, status: 'online', reading_count: 140 },
          { unit_id: 'UNIT003', unit_name: 'HVAC Gamma', performance_score: 92, status: 'online', reading_count: 138 },
          { unit_id: 'UNIT004', unit_name: 'Pump Delta', performance_score: 76, status: 'maintenance', reading_count: 89 },
          { unit_id: 'UNIT005', unit_name: 'Compressor Epsilon', performance_score: 45, status: 'offline', reading_count: 12 }
        ],
        temperatureTrends: [
          { timestamp: '00:00', temperature: 65.2, pressure: 98.5 },
          { timestamp: '04:00', temperature: 67.8, pressure: 102.1 },
          { timestamp: '08:00', temperature: 72.4, pressure: 105.8 },
          { timestamp: '12:00', temperature: 78.9, pressure: 108.2 },
          { timestamp: '16:00', temperature: 81.3, pressure: 110.6 },
          { timestamp: '20:00', temperature: 75.6, pressure: 106.9 },
          { timestamp: '24:00', temperature: 69.1, pressure: 103.4 }
        ],
        alertPatterns: {
          period_days: 7,
          total_potential_alerts: 23,
          avg_alerts_per_day: 3.3,
          sensor_type_breakdown: {
            temperature: 12,
            pressure: 7,
            flow: 4
          }
        },
        anomalies: [
          {
            sensor_id: 'SENS_001',
            unit_id: 'UNIT003',
            sensor_type: 'temperature',
            value: 95.2,
            timestamp: '2024-01-15T14:32:00Z',
            anomaly_score: 4.2,
            confidence: 89.5
          },
          {
            sensor_id: 'SENS_015',
            unit_id: 'UNIT002',
            sensor_type: 'pressure',
            value: 145.8,
            timestamp: '2024-01-15T13:18:00Z',
            anomaly_score: 3.8,
            confidence: 92.1
          }
        ]
      };
      
      setDashboardData(mockData);
      setLoading(false);
    };

    fetchDashboardData();
  }, [selectedTimeRange, selectedUnit]);

  const formatValue = (value, unit = '') => {
    if (typeof value === 'number') {
      return `${value.toFixed(1)}${unit}`;
    }
    return value;
  };

  const getPerformanceColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (percentage) => {
    if (percentage > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (percentage < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive SCADA system performance insights</p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              Real-time
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Units</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.overview.active_units}/{dashboardData.overview.total_units}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatValue(dashboardData.overview.uptime_percentage)}% uptime
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.overview.recent_readings.toLocaleString()}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {getTrendIcon(dashboardData.trends.trend_percentage)}
                <span className="ml-1">
                  {formatValue(dashboardData.trends.trend_percentage)}% from last week
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Temperature</CardTitle>
              <Zap className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(dashboardData.performance.avg_temperature_24h, '°C')}
              </div>
              <p className="text-xs text-muted-foreground">
                Max: {formatValue(dashboardData.performance.max_temperature_24h, '°C')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(dashboardData.performance.data_quality_score)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Based on reading frequency
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trends">Trends & Performance</TabsTrigger>
            <TabsTrigger value="anomalies">Anomaly Detection</TabsTrigger>
            <TabsTrigger value="alerts">Alert Analysis</TabsTrigger>
            <TabsTrigger value="units">Unit Comparison</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Temperature & Pressure Trends</CardTitle>
                  <CardDescription>24-hour system performance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardData.temperatureTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="temperature" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="pressure" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Unit Performance Scores</CardTitle>
                  <CardDescription>Performance ranking across all units</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboardData.unitsPerformance} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="unit_name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="performance_score" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="anomalies">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Recent Anomalies
                  </CardTitle>
                  <CardDescription>
                    Machine learning detected anomalies in sensor readings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.anomalies.map((anomaly, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{anomaly.sensor_type}</Badge>
                            <span className="text-sm text-gray-600">{anomaly.unit_id}</span>
                          </div>
                          <div className="text-lg font-semibold">
                            {formatValue(anomaly.value, anomaly.sensor_type === 'temperature' ? '°C' : anomaly.sensor_type === 'pressure' ? ' PSI' : '')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(anomaly.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            Score: {formatValue(anomaly.anomaly_score)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatValue(anomaly.confidence)}% confidence
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Statistics</CardTitle>
                  <CardDescription>Detection performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Detected</span>
                      <span className="font-semibold">{dashboardData.anomalies.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Confidence</span>
                      <span className="font-semibold">
                        {formatValue(
                          dashboardData.anomalies.length > 0 
                            ? dashboardData.anomalies.reduce((sum, a) => sum + a.confidence, 0) / dashboardData.anomalies.length
                            : 0
                        )}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Detection Methods</span>
                      <span className="font-semibold">3 Active</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500 mb-2">Methods Used</div>
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">Z-Score Analysis</Badge>
                        <Badge variant="secondary" className="text-xs">IQR Detection</Badge>
                        <Badge variant="secondary" className="text-xs">Moving Average</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Patterns</CardTitle>
                  <CardDescription>
                    {dashboardData.alertPatterns.period_days}-day alert analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardData.alertPatterns.total_potential_alerts}
                      </div>
                      <div className="text-sm text-gray-600">Total Alerts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatValue(dashboardData.alertPatterns.avg_alerts_per_day)}
                      </div>
                      <div className="text-sm text-gray-600">Daily Average</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Distribution by Sensor Type</CardTitle>
                  <CardDescription>Breakdown of alert sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={Object.entries(dashboardData.alertPatterns.sensor_type_breakdown).map(([key, value], index) => ({
                          name: key,
                          value,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(dashboardData.alertPatterns.sensor_type_breakdown).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="units">
            <Card>
              <CardHeader>
                <CardTitle>Unit Performance Comparison</CardTitle>
                <CardDescription>Detailed performance metrics across all units</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {dashboardData.unitsPerformance.map((unit, index) => (
                    <div key={unit.unit_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {unit.unit_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold">{unit.unit_name}</div>
                          <div className="text-sm text-gray-600">{unit.unit_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${getPerformanceColor(unit.performance_score)}`}>
                            {unit.performance_score}%
                          </div>
                          <div className="text-xs text-gray-500">Performance</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold">{unit.reading_count}</div>
                          <div className="text-xs text-gray-500">Readings</div>
                        </div>
                        <Badge 
                          variant={unit.status === 'online' ? 'default' : 
                                  unit.status === 'maintenance' ? 'secondary' : 'destructive'}
                        >
                          {unit.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;