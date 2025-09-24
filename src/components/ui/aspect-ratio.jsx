import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";
import React from "react";

function AspectRatio({ ...props }) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
