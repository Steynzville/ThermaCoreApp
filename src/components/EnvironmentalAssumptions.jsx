
import React, { useEffect,useState } from 'react';

import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter,DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

const EnvironmentalAssumptions = ({ isOpen, onClose, onSave, currentAssumptions }) => {
  const [dieselPrice, setDieselPrice] = useState(currentAssumptions.dieselPricePerLiter);

  useEffect(() => {
    setDieselPrice(currentAssumptions.dieselPricePerLiter);
  }, [currentAssumptions.dieselPricePerLiter]);

  const handleSave = () => {
    onSave({ dieselPricePerLiter: parseFloat(dieselPrice) });
    onClose();
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
            <Input
              id="dieselPrice"
              type="number"
              value={dieselPrice}
              onChange={(e) => setDieselPrice(e.target.value)}
              className="col-span-3"
            />
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


