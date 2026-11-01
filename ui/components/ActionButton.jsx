// ui/components/ActionButton.jsx
/**
 * ActionButton Component
 * Single responsibility: Render an individual operational trigger button with execution feedback.
 */
import { Button } from "@chakra-ui/react";

export default function ActionButton({ label, scriptKey, colorScheme = "teal", isLoading, onTrigger }) {
  return (
    <Button
      size="sm"
      colorScheme={colorScheme}
      isLoading={isLoading}
      loadingText="Executing..."
      variant="outline"
      onClick={() => onTrigger(scriptKey, label)}
    >
      {label}
    </Button>
  );
}
