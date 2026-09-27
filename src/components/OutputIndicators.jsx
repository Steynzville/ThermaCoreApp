import { Flame, Snowflake } from "lucide-react";
import { unitOutputs } from "../utils/unitOutputs";
import PowerIcon3D from "./PowerIcon3D";
import WaterIcon3D from "./WaterIcon3D";
export default function OutputIndicators({ unit }) {
  const outputs = unitOutputs(unit);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
      {Object.entries(outputs).map(([key, output]) => {
        const label = {
          power: "Electrical power",
          heat: "Useful heating",
          chill: "Useful chilling",
          water: "Potable AWG water",
        }[key];
        const state = !output.capable
          ? "Not fitted"
          : output.stale
            ? "No fresh reading"
            : output.active
              ? "Producing"
              : "Inactive";
        return (
          <div
            key={key}
            className="text-center"
            aria-label={`${label}: ${state}`}
            title={`${label}: ${state}${output.value == null ? "" : ` (${output.value} ${output.unit})`}`}
          >
            {key === "power" ? (
              <PowerIcon3D power={output.active ? output.value : 0} />
            ) : key === "water" ? (
              <WaterIcon3D
                waterLevel={
                  output.active ? Math.max(1, unit.awgWaterLevel || 1) : 0
                }
                greyedOut={!output.active}
              />
            ) : (
              (() => {
                const Icon = key === "heat" ? Flame : Snowflake;
                return (
                  <Icon
                    className={`h-12 w-12 mx-auto ${output.active ? (key === "heat" ? "text-red-500 drop-shadow-lg" : "text-cyan-500 drop-shadow-lg") : "text-gray-400 opacity-40"}`}
                  />
                );
              })()
            )}
            <span className="text-xs">
              {
                {
                  power: "Power",
                  heat: "Heat",
                  chill: "Chill",
                  water: "Water",
                }[key]
              }
            </span>
          </div>
        );
      })}
    </div>
  );
}
