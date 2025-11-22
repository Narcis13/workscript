import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Eye, Grid3x3 } from "lucide-react";

/**
 * Props for the QuickActions component
 */
export interface QuickActionsProps {
  /**
   * Optional additional CSS classes for the container
   */
  className?: string;
}

/**
 * QuickActions component for dashboard quick navigation
 *
 * QuickActions provides a set of prominent action buttons that allow users to quickly
 * navigate to key features of the application: create a new workflow, create a new
 * automation, view real-time monitoring, and browse available nodes.
 *
 * This component is specifically designed for the Dashboard page (Requirement 15)
 * to provide quick access to the most commonly used features.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage on dashboard
 * <QuickActions />
 *
 * // With custom styling
 * <QuickActions className="gap-3" />
 * ```
 *
 * @param {QuickActionsProps} props - Component props
 * @returns {React.ReactElement} The rendered QuickActions component
 *
 * @remarks
 * - Uses lucide-react icons for visual consistency
 * - Each button has a descriptive label and icon
 * - Buttons navigate using React Router to their respective pages
 * - Responsive layout: grid adapts from 1 column on mobile to 4 columns on desktop
 * - Uses shadcn/ui Button component with secondary variant
 * - All buttons are clickable and functional without additional props
 *
 * Related Requirements:
 * - Req 15: Dashboard Overview and Statistics
 * - Req 18: Responsive Design and Mobile Optimization
 * - Req 4: Workflow List Management (Create Workflow button)
 * - Req 9: Automation List Management (Create Automation button)
 * - Req 13: Real-time Monitoring & WebSocket (View Monitoring button)
 * - Req 1: Node Library Browser (Browse Nodes button)
 */
export const QuickActions: React.FC<QuickActionsProps> = ({ className }) => {
  const navigate = useNavigate();

  // Define actions array - stable across renders
  const actions = [
    {
      id: "create-workflow",
      label: "Create New Workflow",
      icon: Plus,
      description: "Build and define a new workflow",
      onClick: () => navigate("/workflows/new"),
    },
    {
      id: "create-automation",
      label: "Create New Automation",
      icon: Zap,
      description: "Schedule or trigger a workflow",
      onClick: () => navigate("/automations/new"),
    },
    {
      id: "view-monitoring",
      label: "View Monitoring",
      icon: Eye,
      description: "Watch executions in real-time",
      onClick: () => navigate("/monitoring"),
    },
    {
      id: "browse-nodes",
      label: "Browse Nodes",
      icon: Grid3x3,
      description: "Explore available workflow nodes",
      onClick: () => navigate("/nodes"),
    },
  ];

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${
        className || ""
      }`.trim()}
    >
      {actions.map((action) => {
        const IconComponent = action.icon;
        return (
          <Button
            key={action.id}
            variant="secondary"
            onClick={action.onClick}
            className="h-auto flex flex-col items-center gap-2 py-4 px-3 rounded-lg border hover:border-primary/50 hover:shadow-md transition-all duration-200 min-h-[100px]"
            title={action.description}
          >
            <IconComponent className="size-6 text-primary flex-shrink-0" />
            <span className="font-medium text-center text-xs leading-tight whitespace-normal break-words w-full">
              {action.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default QuickActions;
