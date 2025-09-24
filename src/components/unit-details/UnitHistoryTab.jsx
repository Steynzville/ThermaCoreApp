import React from "react";
import VitalSignGraph from "../VitalSignGraph";

const UnitHistoryTab = ({ unit }) => {
  return (
    <div className="space-y-6">
      <VitalSignGraph
        title="Power Output History"
        dataKey="power"
        color="#8884d8"
      />
      <VitalSignGraph
        title="Temperature In History"
        dataKey="tempIn"
        color="#82ca9d"
      />
      <VitalSignGraph
        title="Temperature Out History"
        dataKey="tempOut"
        color="#ffc658"
      />
      <VitalSignGraph
        title="Pressure History"
        dataKey="pressure"
        color="#ff7300"
      />
      {unit && unit.watergeneration && (
        <VitalSignGraph
          title="Water Level History"
          dataKey="waterLevel"
          color="#0088FE"
        />
      )}
    </div>
  );
};

export default UnitHistoryTab;
