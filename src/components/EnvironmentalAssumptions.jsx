// src/components/EnvironmentalAssumptions.jsx

import { useEffect, useState } from "react";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const EnvironmentalAssumptions = ({
  isOpen,
  onClose,
  onSave,
  currentAssumptions,
}) => {
  const initialDieselPrice = currentAssumptions?.dieselPricePerLiter ?? 0;
  const [dieselPrice, setDieselPrice] = useState(initialDieselPrice);
  const [error, setError] = useState("");

  useEffect(() => {
    setDieselPrice(currentAssumptions?.dieselPricePerLiter ?? 0);
    // Clear error when assumptions change (dialog reopens with new data)
    setError("");
  }, [currentAssumptions?.dieselPricePerLiter]);

  const handleSave = () => {
    const parsedPrice = parseFloat(dieselPrice);
    
    // Validate and show user-friendly error messages
    if (isNaN(parsedPrice)) {
      setError("Please enter a valid number.");
      return;
    }
    
    if (parsedPrice < 0) {
      setError("Diesel price cannot be negative.");
      return;
    }
    
    // Clear error and save
    setError("");
    onSave({ dieselPricePerLiter: parsedPrice });
    onClose();
  };

  const handleInputChange = (e) => {
    setDieselPrice(e.target.value);
    // Clear error when user starts typing
    if (error) setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Environmental Impact Assumptions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dieselPrice" className="text-right">
              Diesel Price ($/L)
            </Label>
            <div className="col-span-3">
              <Input
                id="dieselPrice"
                type="number"
                value={dieselPrice}
                onChange={handleInputChange}
                className={error ? "border-red-500" : ""}
                min="0"
                step="0.01"
                aria-invalid={!!error}
                aria-describedby={error ? "dieselPrice-error" : undefined}
              />
              {error && (
                <p 
                  id="dieselPrice-error" 
                  className="text-sm text-red-500 mt-1"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnvironmentalAssumptions;
