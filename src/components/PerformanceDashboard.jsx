import {
  Calendar,
  Clock,
  DollarSign,
  Droplets,
  Fuel,
  TrendingDown,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { units } from "../data/mockUnits";
import { formatCurrency } from "../utils/formatCurrency";

const PerformanceCard = ({
  icon: Icon,
  title,
  value,
  unit,
  subtitle,
  color = "blue",
  asterisk = false,
  trend = null,
  dollarAmount = null,
  carbonSaved = null,
}) => {
  const colorClasses = {
    blue: "bg-white dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    darkpurple:
      "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  const iconColorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    purple: "text-purple-600 dark:text-purple-400",
    darkpurple: "text-purple-700 dark:text-purple-300",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
  };

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <div
      className={`p-6 rounded-lg border ${colorClasses[color]} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between mb-4">
        <Icon className={`h-8 w-8 ${iconColorClasses[color]}`} />
        <div className="flex items-center space-x-2">
          {trend && TrendIcon && (
            <TrendIcon
              className={`h-4 w-4 ${
                trend === "up"
                  ? "text-green-500 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            />
          )}
          {asterisk && (
            <span className="text-xs text-gray-500 dark:text-gray-400">*</span>
          )}
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </h3>
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>
      </div>
      {dollarAmount && (
        <div className="text-lg font-semibold text-green-600 dark:text-green-400 mt-2">
          {dollarAmount}
        </div>
      )}
      {carbonSaved && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
          {carbonSaved}
        </div>
      )}
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
};

const SummaryCard = ({
  title,
  todayValue,
  monthValue,
  allTimeValue,
  unit,
  icon: Icon,
  color = "blue",
}) => {
  const colorClasses = {
    blue: "bg-white dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  };

  const iconColorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
  };

  return (
    <div
      className={`p-6 rounded-lg border ${colorClasses[color]} col-span-full`}
    >
      <div className="flex items-center mb-4">
        <Icon className={`h-8 w-8 ${iconColorClasses[color]} mr-3`} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {todayValue}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{unit}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Today
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {monthValue}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{unit}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            This Month
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {allTimeValue}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{unit}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            All Time
          </div>
        </div>
      </div>
    </div>
  );
};

const PerformanceDashboard = ({ className, hideHeader = false }) => {
  const { userRole } = useAuth();
  const [showFinancialAssumptions, setShowFinancialAssumptions] =
    useState(false);
  const [showROIAssumptions, setShowROIAssumptions] = useState(false);
  const [showEnvironmentalAssumptions, setShowEnvironmentalAssumptions] = useState(false);
  const [roiAssumptions, setRoiAssumptions] = useState({
    initialInvestment: userRole === "admin" ? 2000000 : 600000, // Default initial investment based on role
  });
  const [financialAssumptions, setFinancialAssumptions] = useState({
    electricityCost: 0.4, // Cost per kWh
    rebate: 50, // Rebate per month
    feedInTariff: 0.08, // Feed-in tariff per kWh
  });
  const [environmentalAssumptions, setEnvironmentalAssumptions] = useState({
    dieselPricePerLiter: 1.84, // Default diesel price per liter
  });

  // Filter units based on user role - User role only sees first 5 units
  const filteredUnits = userRole === "user" ? units.slice(0, 6) : units;

  // Calculate aggregate power metrics from actual mockUnits data
  const totalCurrentPower = filteredUnits.reduce(
    (sum, unit) => sum + (unit.currentPower || 0),
    0,
  );
  const totalParasiticLoad = filteredUnits.reduce(
    (sum, unit) => sum + (unit.parasiticLoad || 0),
    0,
  );
  const totalUserLoad = filteredUnits.reduce(
    (sum, unit) => sum + (unit.userLoad || 0),
    0,
  );
  const totalFeedInLoad =
    totalCurrentPower - totalParasiticLoad - totalUserLoad;

  // Mock trend data - in real app this would come from API comparing current vs 5 minutes ago
  // All tiles will show trend arrows that update every 5 minutes
  const powerTrend = "up";
  const parasiticTrend = "down";
  const userTrend = "up";
  const feedInTrend = totalFeedInLoad > 0 ? "up" : "down";

  // Mock performance data - in real app this would come from API
  const adminPerformanceData = {
    power: {
      today: 1247.5,
      month: 38420.8,
      allTime: 2847392.1,
    },
      water: {
      today: 1617,
      month: 64680,
      allTime: 2134440,
    },
  };

  const userPerformanceData = {
    power: {
      today: adminPerformanceData.power.today * 0.3,
      month: adminPerformanceData.power.month * 0.3,
      allTime: adminPerformanceData.power.allTime * 0.3,
    },
      water: {
      today: 764,
      month: 30560,
      allTime: 987617,
    },
  };

  // Debug logging to check userRole
  console.log('Current userRole:', userRole);
  
  const performanceData = userRole === 'admin' ? adminPerformanceData : userPerformanceData;

  // Calculate diesel displaced based on total current power generation
  // Assuming 1 kW of power generation displaces approximately 0.25 liters of diesel per hour
  const dieselDisplacementRate = 0.25; // liters per kW per hour

  const dieselDisplacedDaily = totalCurrentPower * 24 * dieselDisplacementRate; // liters per day
  const dieselDisplacedMonthly = dieselDisplacedDaily * 30; // liters per month
  const dieselDisplacedAllTime = dieselDisplacedMonthly * 15; // liters for 15 months

  performanceData.dieselDisplaced = {
    daily: dieselDisplacedDaily,
    monthly: dieselDisplacedMonthly,
    allTime: dieselDisplacedAllTime,
  };

  // Calculate financial impact based on financial assumptions
  const totalPowerGeneratedToday = performanceData.power.today; // kWh from the card "Total Power Generated" today
  const totalParasiticLoadKWh = totalParasiticLoad * 24; // Convert kW to kWh for the day
  const totalUserLoadKWh = totalUserLoad * 24; // Convert kW to kWh for the day
  const feedInPowerToday =
    totalPowerGeneratedToday - totalParasiticLoadKWh - totalUserLoadKWh; // kWh

  // Calculate money earned from feed-in
  const moneyEarnedFromFeedIn =
    totalFeedInLoad * 24 * financialAssumptions.feedInTariff;

  // Calculate money saved by self-generating
  const moneySavedBySelfGenerating =
    totalUserLoadKWh * financialAssumptions.electricityCost;

  // Calculate total savings daily
  const savingsDaily =
    moneyEarnedFromFeedIn +
    moneySavedBySelfGenerating -
    financialAssumptions.rebate / 30;

  // Calculate savings monthly and all time
  const savingsMonthly = savingsDaily * 30;
  const savingsAllTime = savingsMonthly * 15; // 15 months

  // Add calculated savings to performance data
  performanceData.savings = {
    daily: Math.max(0, savingsDaily), // Ensure non-negative
    monthly: Math.max(0, savingsMonthly), // Ensure non-negative
    allTime: Math.max(0, savingsAllTime), // Ensure non-negative
  };

  performanceData.co2Avoided = {
    daily: 825.6,
    monthly: 25593.6,
    allTime: 1881088.8,
  };

  // Calculate ROI (Return on Investment)
  const annualSavings = savingsMonthly * 12;
  const roi = (annualSavings / roiAssumptions.initialInvestment) * 100;

  // Calculate Payback Period (in years)
  const paybackPeriod = roiAssumptions.initialInvestment / annualSavings;

  performanceData.roi = roi;
  performanceData.paybackPeriod = paybackPeriod;
  performanceData.systemAvailability = 97.8;
  performanceData.mttr = 4.2;
  performanceData.daysSinceFailure = 23;

  // Diesel price per liter (mock value - in real app this would come from API)
  const dieselPricePerLiter = environmentalAssumptions.dieselPricePerLiter;

  // Carbon pollution saved per liter of diesel (kg CO2 per liter)
  const co2PerLiterDiesel = 2.64;

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header - only show if hideHeader is false */}
        {!hideHeader && (
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 lg:mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Performance Dashboard
                </h1>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400">
                  Monitor power generation, efficiency, and environmental impact
                </p>
              </div>
            </div>

            {/* Breadcrumb */}
            <nav className="text-sm text-gray-600 dark:text-gray-400">
              <span className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                Home
              </span>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-gray-100">
                Performance
              </span>
            </nav>
          </div>
        )}

        {/* Main Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SummaryCard
            title="Total Power Generated"
            todayValue={Math.round(performanceData.power.today).toLocaleString()}
            monthValue={Math.round(performanceData.power.month).toLocaleString()}
            allTimeValue={Math.round(performanceData.power.allTime).toLocaleString()}
            unit="kWh"
            icon={Zap}
            color="blue"
          />
          {filteredUnits.some(u => u.watergeneration) && (
            <SummaryCard
              title="Total Water Generated"
              todayValue={performanceData.water.today.toLocaleString()}
              monthValue={performanceData.water.month.toLocaleString()}
              allTimeValue={performanceData.water.allTime.toLocaleString()}
              unit="liters"
              icon={Droplets}
              color="green"
            />
          )}
        </div>

        {/* Current Power Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Current Power Generation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PerformanceCard
              icon={Zap}
              title="Live: Power Generation"
              value={totalCurrentPower.toFixed(1)}
              unit="kW"
              color="blue"
              trend={powerTrend}
            />
            <PerformanceCard
              icon={Zap}
              title="Live: Parasitic Load"
              value={totalParasiticLoad.toFixed(1)}
              unit="kW"
              color="orange"
              trend={parasiticTrend}
            />
            <PerformanceCard
              icon={Zap}
              title="Live: User Load"
              value={totalUserLoad.toFixed(1)}
              unit="kW"
              color="green"
              trend={userTrend}
            />
            <PerformanceCard
              icon={Zap}
              title="Live: Feed-in Load"
              value={totalFeedInLoad.toFixed(1)}
              unit="kW"
              subtitle="Balance after loads"
              color="yellow"
              trend={feedInTrend}
            />
          </div>
        </div>

        {/* Financial Impact */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Financial Impact
            </h2>
            <button
              onClick={() => setShowFinancialAssumptions(true)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Financial Impact Assumptions"
            >
              <svg
                className="h-5 w-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerformanceCard
              icon={DollarSign}
              title="Savings (Today)"
              value={formatCurrency(performanceData.savings.daily)}
              unit=""
              subtitle="*saved on grid power"
              color="green"
            />
            <PerformanceCard
              icon={DollarSign}
              title="Savings (This Month)"
              value={formatCurrency(performanceData.savings.monthly)}
              unit=""
              subtitle="*saved on grid power"
              color="green"
            />
            <PerformanceCard
              icon={DollarSign}
              title="Savings (All Time)"
              value={formatCurrency(performanceData.savings.allTime)}
              unit=""
              subtitle="*saved on grid power"
              color="green"
            />
          </div>
        </div>

        {/* ROI and Payback Period */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              ROI and Payback Period
            </h2>
            <button
              onClick={() => setShowROIAssumptions(true)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="ROI Assumptions"
            >
              <svg
                className="h-5 w-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerformanceCard
              icon={DollarSign}
              title="ROI"
              value={`${performanceData.roi.toFixed(2)}%`}
              unit=""
              color="purple"
            />
            <PerformanceCard
              icon={Clock}
              title="Payback Period"
              value={`${performanceData.paybackPeriod.toFixed(2)} years`}
              unit=""
              color="purple"
            />
          </div>
        </div>



        {/* Environmental Impact */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Environmental Impact
            </h2>
            <button
              onClick={() => setShowEnvironmentalAssumptions(true)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Environmental Impact Assumptions"
            >
              <svg
                className="h-5 w-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerformanceCard
              icon={Fuel}
              title="Diesel Displaced (Today)"
              value={performanceData.dieselDisplaced.daily.toLocaleString()}
              unit="L"
              dollarAmount={formatCurrency(
                performanceData.dieselDisplaced.daily * dieselPricePerLiter,
              )}
              carbonSaved={`${(performanceData.dieselDisplaced.daily * co2PerLiterDiesel).toFixed(1)} kg CO₂ saved`}
              color="orange"
              asterisk={true}
            />
            <PerformanceCard
              icon={Fuel}
              title="Diesel Displaced (This Month)"
              value={performanceData.dieselDisplaced.monthly.toLocaleString()}
              unit="L"
              dollarAmount={formatCurrency(
                performanceData.dieselDisplaced.monthly * dieselPricePerLiter,
              )}
              carbonSaved={`${(performanceData.dieselDisplaced.monthly * co2PerLiterDiesel).toFixed(1)} kg CO₂ saved`}
              color="orange"
              asterisk={true}
            />
            <PerformanceCard
              icon={Fuel}
              title="Diesel Displaced (All Time)"
              value={performanceData.dieselDisplaced.allTime.toLocaleString()}
              unit="L"
              dollarAmount={formatCurrency(
                performanceData.dieselDisplaced.allTime * dieselPricePerLiter,
              )}
              carbonSaved={`${((performanceData.dieselDisplaced.allTime * co2PerLiterDiesel) / 1000).toFixed(1)} tonnes CO₂ saved`}
              color="orange"
              asterisk={true}
            />
          </div>
          
          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              * Environmental calculations are based on diesel generator
              equivalency for comparative analysis.
            </p>
          </div>
        </div>

        {/* Fleet Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Fleet Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerformanceCard
              icon={Clock}
              title="Fleet Uptime"
              value={performanceData.systemAvailability}
              unit="%"
              color="green"
            />
            <PerformanceCard
              icon={Wrench}
              title="MTTR"
              value={performanceData.mttr}
              unit="hours"
              subtitle="Mean Time to Repair"
              color="orange"
            />
            <PerformanceCard
              icon={Calendar}
              title="Consecutive days of Optimal Operation"
              value={performanceData.daysSinceFailure}
              unit="days"
              color="blue"
            />
          </div>
        </div>

        {/* Financial Assumptions Modal */}
        <FinancialAssumptions
          isOpen={showFinancialAssumptions}
          onClose={() => setShowFinancialAssumptions(false)}
          onSave={setFinancialAssumptions}
          currentAssumptions={financialAssumptions}
        />

        <ROIAssumptions
          isOpen={showROIAssumptions}
          onClose={() => setShowROIAssumptions(false)}
          onSave={setRoiAssumptions}
          currentAssumptions={roiAssumptions}
        />

        <EnvironmentalAssumptions
          isOpen={showEnvironmentalAssumptions}
          onClose={() => setShowEnvironmentalAssumptions(false)}
          onSave={setEnvironmentalAssumptions}
          currentAssumptions={environmentalAssumptions}
        />
      </div>
    </div>
  );
};

export default PerformanceDashboard;
