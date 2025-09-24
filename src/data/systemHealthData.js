const systemHealthData = [
  {
    name: "Frontend Hosting",
    provider: "Netlify",
    status: "Operational",
    responseTime: "80ms",
    icon: "Globe",
  },
  {
    name: "Backend API",
    provider: "Render",
    status: "Operational",
    responseTime: "120ms",
    icon: "Server",
  },
  {
    name: "Database",
    provider: "TimescaleDB",
    status: "Operational",
    responseTime: "90ms",
    icon: "Database",
  },
  {
    name: "Real-time Messaging",
    provider: "Mosquitto MQTT Broker",
    status: "Operational",
    responseTime: "150ms",
    icon: "Activity",
  },
];

export default systemHealthData;
