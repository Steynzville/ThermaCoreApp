
const UnitOverviewTab = ({ unit }) => {
  return (
    <div className="space-y-6">
      {/* Alarm Alert - Only show if unit has alarm */}
      {unit.hasAlarm && (
        <Card className="bg-red-600 border-red-700 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-8 w-8 text-white animate-bounce" />
              <div>
                <h3 className="text-xl font-bold text-white">
                  🚨 NH3 LEAK DETECTED 🚨
                </h3>
                <p className="text-red-100">
                  Critical alarm: Toxic ammonia leak detected in system.
                  Immediate attention required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UnitVitals unit={unit} />
    </div>
  );
};

export default UnitOverviewTab;
