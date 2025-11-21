import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWebSocketStore, useWebSocketConnection } from '@/stores/useWebSocketStore';
import { cn } from '@/lib/utils';

/**
 * WebSocketStatus Component
 *
 * Displays a real-time connection status indicator for the WebSocket connection.
 * Shows connection state (connected, disconnected, reconnecting) with a visual indicator
 * and tooltip with detailed connection information.
 *
 * The component uses the WebSocket store to track connection status and automatically
 * updates when the status changes. Includes visual indicators for different connection states:
 * - Connected: Green dot
 * - Disconnected: Red dot
 * - Reconnecting: Yellow dot with loading spinner
 *
 * @example
 * ```tsx
 * import { WebSocketStatus } from '@/components/monitoring/WebSocketStatus';
 *
 * export function Header() {
 *   return (
 *     <header>
 *       <h1>Dashboard</h1>
 *       <WebSocketStatus />
 *     </header>
 *   );
 * }
 * ```
 *
 * @returns {JSX.Element} The rendered WebSocket status indicator
 */
export function WebSocketStatus(): JSX.Element {
  const connectionStatus = useWebSocketStore((state) => state.connectionStatus);
  const connection = useWebSocketConnection();
  const [displayTime, setDisplayTime] = useState<string>('');

  // Update display time every second to show how long we've been connected/disconnected
  useEffect(() => {
    const interval = setInterval(() => {
      if (connection.connectedAt && connectionStatus === 'connected') {
        const elapsed = Date.now() - connection.connectedAt.getTime();
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          setDisplayTime(`${hours}h ago`);
        } else if (minutes > 0) {
          setDisplayTime(`${minutes}m ago`);
        } else {
          setDisplayTime(`${seconds}s ago`);
        }
      } else if (connection.disconnectedAt && connectionStatus === 'disconnected') {
        const elapsed = Date.now() - connection.disconnectedAt.getTime();
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);

        if (minutes > 0) {
          setDisplayTime(`${minutes}m ago`);
        } else {
          setDisplayTime(`${seconds}s ago`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connection.connectedAt, connection.disconnectedAt, connectionStatus]);

  /**
   * Get the status configuration (color, label, icon) based on connection status
   */
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          dotColor: 'bg-green-500',
          label: 'Connected',
          sublabel: `Connected ${displayTime}`,
          hoverBg: 'hover:bg-green-50 dark:hover:bg-green-950',
        };
      case 'connecting':
        return {
          dotColor: 'bg-yellow-500',
          label: 'Connecting...',
          sublabel: 'Establishing connection',
          hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950',
        };
      case 'reconnecting':
        return {
          dotColor: 'bg-yellow-500',
          label: 'Reconnecting...',
          sublabel: `Attempt ${connection.reconnectAttempts} of ${connection.maxReconnectAttempts}`,
          hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950',
        };
      case 'disconnected':
        return {
          dotColor: 'bg-red-500',
          label: 'Disconnected',
          sublabel: `Disconnected ${displayTime}`,
          hoverBg: 'hover:bg-red-50 dark:hover:bg-red-950',
        };
      case 'failed':
      case 'closed':
      default:
        return {
          dotColor: 'bg-red-500',
          label: 'Connection Failed',
          sublabel: connection.lastError || 'Check server status',
          hoverBg: 'hover:bg-red-50 dark:hover:bg-red-950',
        };
    }
  };

  const config = getStatusConfig();
  const isLoading = connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer',
              'bg-gray-100 dark:bg-gray-800',
              config.hoverBg
            )}
            role="status"
            aria-label={`WebSocket connection status: ${config.label}`}
          >
            {/* Status Dot */}
            <div className="relative flex items-center justify-center">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  config.dotColor
                )}
              />

              {/* Loading Spinner for Reconnecting State */}
              {isLoading && (
                <Loader2
                  className="w-3 h-3 absolute animate-spin text-yellow-500"
                  strokeWidth={3}
                />
              )}
            </div>

            {/* Status Label */}
            <div className="hidden sm:flex flex-col gap-0.5">
              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {config.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {config.sublabel}
              </div>
            </div>

            {/* Mobile-only Status Dot Label */}
            <div className="sm:hidden text-xs font-medium text-gray-900 dark:text-gray-100">
              {config.label === 'Connected' ? '●' : '○'}
            </div>
          </div>
        </TooltipTrigger>

        {/* Tooltip Content with Detailed Information */}
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          <div className="space-y-2 text-sm">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="font-semibold">Status:</span>
              <span className="capitalize">{connectionStatus}</span>
            </div>

            {/* Connected Time */}
            {connection.connectedAt && connectionStatus === 'connected' && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Connected:</span>
                <span>{connection.connectedAt.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Disconnected Time */}
            {connection.disconnectedAt && connectionStatus === 'disconnected' && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Disconnected:</span>
                <span>{connection.disconnectedAt.toLocaleTimeString()}</span>
              </div>
            )}

            {/* Reconnection Attempts */}
            {(connectionStatus === 'reconnecting' || connectionStatus === 'connecting') && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Attempts:</span>
                <span>
                  {connection.reconnectAttempts} / {connection.maxReconnectAttempts}
                </span>
              </div>
            )}

            {/* Latency */}
            {connection.latency !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Latency:</span>
                <span>{connection.latency}ms</span>
              </div>
            )}

            {/* Subscribed Channels */}
            {connection.subscribedChannels.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="font-semibold">Channels:</span>
                <span>{connection.subscribedChannels.join(', ')}</span>
              </div>
            )}

            {/* Error Message */}
            {connection.lastError && (
              <div className="flex items-start gap-2">
                <span className="font-semibold text-red-500">Error:</span>
                <span className="text-red-500">{connection.lastError}</span>
              </div>
            )}

            {/* Help Text */}
            <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-600">
              Real-time monitoring via WebSocket
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default WebSocketStatus;
