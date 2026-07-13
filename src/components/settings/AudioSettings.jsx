import { Volume2 } from "lucide-react";

import { useSettings } from "../../context/SettingsContext";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";

const AudioSettings = () => {
  const { settings, toggleSound, setVolume } = useSettings();

  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader className="flex flex-row items-center space-x-2">
        <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Audio Settings
        </h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label
              htmlFor="soundEffectsToggle"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Sound Effects
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enable or disable login and logout sounds
            </p>
          </div>
          <Switch
            id="soundEffectsToggle"
            checked={settings.soundEnabled}
            onCheckedChange={() => toggleSound()}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="volumeSlider"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Volume Level
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(settings.volume * 100)}%
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Adjust the volume of sound effects
          </p>
          <Slider
            id="volumeSlider"
            value={[settings.volume]}
            onValueChange={(value) => setVolume(value[0])}
            max={1}
            min={0}
            step={0.05}
            disabled={!settings.soundEnabled}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioSettings;
