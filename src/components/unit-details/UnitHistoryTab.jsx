import VitalSignGraph from "../VitalSignGraph";

const UnitHistoryTab = ({ unit }) => {
  return (
    <div className="space-y-6">
      <VitalSignGraph
        title="Ambient Temperature History"
        dataKey="ambientTemp"
        color="#3b82f6"
      />
      <VitalSignGraph
        title="Ambient Humidity History"
        dataKey="ambientHumidity"
        color="#06b6d4"
      />
      <VitalSignGraph
        title="Temperature In History"
        dataKey="tempIn"
        color="#82ca9d"
      />
      <VitalSignGraph
        title="Temperature Out - Chill History"
        dataKey="tempOutChill"
        color="#60a5fa"
      />
      <VitalSignGraph
        title="Temperature Out - Hot History"
        dataKey="tempOutHot"
        color="#f87171"
      />
      <VitalSignGraph
        title="Power Output History"
        dataKey="power"
        color="#8884d8"
      />
      {unit?.watergeneration && (
        <VitalSignGraph
          title="AWG Water Level History"
          dataKey="awgWaterLevel"
          color="#0088FE"
        />
      )}
      <VitalSignGraph
        title="Differential Pressure History"
        dataKey="differentialPressure"
        color="#ff7300"
      />
      <VitalSignGraph
        title="Battery Voltage History"
        dataKey="batteryVoltage"
        color="#22c55e"
      />
      <VitalSignGraph
        title="Flow Rate Out - Chill History"
        dataKey="flowRateOutChill"
        color="#0284c7"
      />
      <VitalSignGraph
        title="Flow Rate Out - Hot History"
        dataKey="flowRateOutHot"
        color="#e11d48"
      />
    </div>
  );
};

export default UnitHistoryTab;
