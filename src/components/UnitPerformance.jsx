import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Zap,
  Droplets,
  Fuel,
  Leaf,
  DollarSign,
  Clock,
  Wrench,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUnits } from "../context/UnitContext";
import FinancialAssumptions from "./FinancialAssumptions";
import ROIAssumptions from "./ROIAssumptions";
import EnvironmentalAssumptions from "./EnvironmentalAssumptions";
import { formatCurrency } from "../utils/formatCurrency";
import Spinner from "./common/Spinner";

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

const UnitPerformance = ({ unit: propUnit, className, hideHeader = false }) => {
  const { userRole } = useAuth();
  const { getUnit, loading: unitsLoading } = useUnits();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [resolvedUnit, setResolvedUnit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFinancialAssumptions, setShowFinancialAssumptions] = useState(false);
  const [showROIAssumptions, setShowROIAssumptions] = useState(false);
  const [showEnvironmentalAssumptions, setShowEnvironmentalAssumptions] = useState(false);
  const [roiAssumptions, setRoiAssumptions] = useState({
    initialInvestment: 200000, // Default initial investment per unit
  });
  const [financialAssumptions, setFinancialAssumptions] = useState({
    electricityCost: 0.4, // Cost per kWh
    rebate: 50, // Rebate per month
    feedInTariff: 0.08, // Feed-in tariff per kWh
  });
  const [environmentalAssumptions, setEnvironmentalAssumptions] = useState({
    dieselPricePerLiter: 1.84, // Default diesel price per liter
  });

  // Effect to resolve unit data from various sources
  useEffect(() => {
    const resolveUnit = () => {
      try {
        // 1. If unit prop is provided directly (backward compatibility)
        if (propUnit) {
          setResolvedUnit(propUnit);
          setIsLoading(false);
          return;
        }

        // 2. Check if unit data was passed via navigation state
        if (location.state?.unit) {
          setResolvedUnit(location.state.unit);
          setIsLoading(false);
          return;
        }

        // 3. Get unit ID from route parameters
        const unitId = params.id;
        if (unitId && !unitsLoading) {
          const foundUnit = getUnit(unitId);
          if (foundUnit) {
            setResolvedUnit(foundUnit);
          } else {
            setResolvedUnit(null);
          }
          setIsLoading(false);
          return;
        }

        // 4. If we're still loading units, wait
        if (unitsLoading) {
          setIsLoading(true);
          return;
        }

        // 5. No unit found
        setResolvedUnit(null);
        setIsLoading(false);
      } catch (error) {
        console.error('Error resolving unit data:', error);
        setResolvedUnit(null);
        setIsLoading(false);
      }
    };

    resolveUnit();
  }, [propUnit, location.state, params.id, getUnit, unitsLoading]);

  // Show loading spinner while resolving unit data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Loading unit performance data...
          </p>
        </div>
      </div>
    );
  }

  // Show not found if unit couldn't be resolved
  if (!resolvedUnit) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Unit Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {params.id 
              ? `Unit with ID "${params.id}" could not be found.`
              : 'Please select a valid unit to view performance data.'
            }
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            data-testid="button-go-back"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Use the resolved unit for the rest of the component
  const unit = resolvedUnit;

  // Calculate individual unit power metrics
  const unitCurrentPower = unit.currentPower || 0;
  const unitParasiticLoad = unit.parasiticLoad || 0;
  const unitUserLoad = unit.userLoad || 0;
  const unitFeedInLoad = unitCurrentPower - unitParasiticLoad - unitUserLoad;

  // Mock trend data - in real app this would come from API comparing current vs 5 minutes ago
  const powerTrend = unitCurrentPower > 0 ? "up" : "down";
  const parasiticTrend = "down";
  const userTrend = unitUserLoad > 0 ? "up" : "down";
  const feedInTrend = unitFeedInLoad > 0 ? "up" : "down";

  // Mock performance data for this specific unit - in real app this would come from API
  // Scale the performance data based on this unit's current power output
  const unitPowerRatio = unitCurrentPower / 50; // Assuming 50kW is max power for scaling
  const baseUnitPerformance = {
    power: {
      today: Math.max(12, unitCurrentPower * 24 * 0.8), // Minimum 12 kWh per day
      month: Math.max(360, unitCurrentPower * 24 * 30 * 0.8), // Monthly
      allTime: Math.max(5400, unitCurrentPower * 24 * 365 * 1.5 * 0.8), // 1.5 years
    },
    water: {
      today: Math.max(15, unitCurrentPower * 8), // Approximate water generation
      month: Math.max(450, unitCurrentPower * 8 * 30),
      allTime: Math.max(6750, unitCurrentPower * 8 * 365 * 1.5),
    },
  };

  const performanceData = baseUnitPerformance;

  // Calculate diesel displaced based on unit current power generation
  // Assuming 1 kW of power generation displaces approximately 0.25 liters of diesel per hour
  const dieselDisplacementRate = 0.25; // liters per kW per hour

  const dieselDisplacedDaily = unitCurrentPower * 24 * dieselDisplacementRate; // liters per day
  const dieselDisplacedMonthly = dieselDisplacedDaily * 30; // liters per month
  const dieselDisplacedAllTime = dieselDisplacedMonthly * 15; // liters for 15 months

  performanceData.dieselDisplaced = {
    daily: Math.max(0, dieselDisplacedDaily),
    monthly: Math.max(0, dieselDisplacedMonthly),
    allTime: Math.max(0, dieselDisplacedAllTime),
  };

  // Calculate financial impact based on financial assumptions for this unit
  const totalPowerGeneratedToday = performanceData.power.today; // kWh from the card "Total Power Generated" today
  const unitParasiticLoadKWh = unitParasiticLoad * 24; // Convert kW to kWh for the day
  const unitUserLoadKWh = unitUserLoad * 24; // Convert kW to kWh for the day
  const feedInPowerToday = Math.max(0, totalPowerGeneratedToday - unitParasiticLoadKWh - unitUserLoadKWh); // kWh

  // Calculate money earned from feed-in
  const moneyEarnedFromFeedIn = Math.max(0, unitFeedInLoad * 24 * financialAssumptions.feedInTariff);

  // Calculate money saved by self-generating
  const moneySavedBySelfGenerating = unitUserLoadKWh * financialAssumptions.electricityCost;

  // Calculate total savings daily
  const savingsDaily = Math.max(0, moneyEarnedFromFeedIn + moneySavedBySelfGenerating - financialAssumptions.rebate / 30);

  // Calculate savings monthly and all time
  const savingsMonthly = savingsDaily * 30;
  const savingsAllTime = savingsMonthly * 15; // 15 months

  // Add calculated savings to performance data
  performanceData.savings = {
    daily: Math.max(0, savingsDaily), // Ensure non-negative
    monthly: Math.max(0, savingsMonthly), // Ensure non-negative
    allTime: Math.max(0, savingsAllTime), // Ensure non-negative
  };

  // Calculate CO2 avoided based on unit performance
  const co2AvoidanceRate = 0.66; // kg CO2 per kWh (approximate grid emission factor)
  performanceData.co2Avoided = {
    daily: performanceData.power.today * co2AvoidanceRate,
    monthly: performanceData.power.month * co2AvoidanceRate,
    allTime: performanceData.power.allTime * co2AvoidanceRate,
  };

  // Calculate ROI (Return on Investment) for this unit
  const annualSavings = savingsMonthly * 12;
  const roi = annualSavings > 0 ? (annualSavings / roiAssumptions.initialInvestment) * 100 : 0;

  // Calculate Payback Period (in years) for this unit
  const paybackPeriod = annualSavings > 0 ? roiAssumptions.initialInvestment / annualSavings : 0;

  performanceData.roi = roi;
  performanceData.paybackPeriod = paybackPeriod;

  // Unit-specific operational metrics (mock data - in real app from API)
  const isOnline = unit.status === 'online';
  performanceData.unitUptime = isOnline ? 99.2 : 0.0; // Unit uptime instead of fleet uptime
  performanceData.lastMaintenanceHours = 168; // Hours since last maintenance
  performanceData.daysSinceLastIssue = isOnline ? 12 : 0; // Days since last issue for this unit

  // Diesel price per liter (mock value - in real app this would come from API)
  const dieselPricePerLiter = environmentalAssumptions.dieselPricePerLiter;

  // Carbon pollution saved per liter of diesel (kg CO2 per liter)
  const co2PerLiterDiesel = 2.64;

  return (
    <div
      className={`min-h-screen bg-blue-50 dark:bg-gray-950 p-3 lg:p-4 xl:p-6 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Back Navigation Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 mb-4"
          data-testid="button-back-to-unit-details"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Unit Details</span>
        </button>
        {/* Header - only show if hideHeader is false */}
        {!hideHeader && (
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 lg:mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Unit Performance - {unit.name}
                </h1>
                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-2">
                  Monitor individual unit power generation, efficiency, and environmental impact
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span><strong>Serial Number:</strong> {unit.serialNumber || unit.id}</span>
                  <span><strong>Location:</strong> {unit.location || 'Not specified'}</span>
                  <span><strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                      unit.status === 'online' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      unit.status === 'offline' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      unit.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {unit.status || 'unknown'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Breadcrumb */}
            <nav className="text-sm text-gray-600 dark:text-gray-400">
              <span className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                Home
              </span>
              <span className="mx-2">/</span>
              <span className="hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer">
                Units
              </span>
              <span className="mx-2">/</span>
              <span className="text-gray-900 dark:text-gray-100">
                {unit.name} Performance
              </span>
            </nav>
          </div>
        )}

        {/* Main Summary Cards */}
        <div className={`grid gap-6 mb-8 ${unit.watergeneration ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          <SummaryCard
            title="Power Generated"
            todayValue={Math.round(performanceData.power.today).toLocaleString()}
            monthValue={Math.round(performanceData.power.month).toLocaleString()}
            allTimeValue={Math.round(performanceData.power.allTime).toLocaleString()}
            unit="kWh"
            icon={Zap}
            color="blue"
          />
          {unit.watergeneration && (
            <SummaryCard
              title="Water Generated"
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
              value={unitCurrentPower.toFixed(1)}
              unit="kW"
              color="blue"
              trend={powerTrend}
            />
            <PerformanceCard
              icon={Zap}
              title="Live: Parasitic Load"
              value={unitParasiticLoad.toFixed(1)}
              unit="kW"
              color="orange"
              trend={parasiticTrend}
            />
            <PerformanceCard
              icon={Zap}
              title="Live: User Load"
              value={unitUserLoad.toFixed(1)}
              unit="kW"
              color="green"
              trend={userTrend}
            />
            <PerformanceCard
              icon={Zap}
              title="Live: Feed-in Load"
              value={unitFeedInLoad.toFixed(1)}
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
              data-testid="button-financial-assumptions"
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
              data-testid="button-roi-assumptions"
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
              value={performanceData.paybackPeriod > 0 ? `${performanceData.paybackPeriod.toFixed(1)} years` : 'N/A'}
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
              data-testid="button-environmental-assumptions"
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
              value={performanceData.dieselDisplaced.daily.toFixed(1)}
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
              value={performanceData.dieselDisplaced.monthly.toFixed(0)}
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
              value={performanceData.dieselDisplaced.allTime.toFixed(0)}
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

        {/* Unit Performance */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Unit Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PerformanceCard
              icon={Clock}
              title="Unit Uptime"
              value={performanceData.unitUptime}
              unit="%"
              color="green"
            />
            <PerformanceCard
              icon={Wrench}
              title="Hours Since Maintenance"
              value={performanceData.lastMaintenanceHours}
              unit="hours"
              subtitle="Time since last service"
              color="orange"
            />
            <PerformanceCard
              icon={Calendar}
              title="Days Since Last Issue"
              value={performanceData.daysSinceLastIssue}
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

export default UnitPerformance;