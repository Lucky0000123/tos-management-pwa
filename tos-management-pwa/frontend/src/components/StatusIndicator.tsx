import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function StatusIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isOnline ? 'default' : 'destructive'}
        className="flex items-center gap-1 px-3 py-1"
      >
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            Online
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>
    </div>
  );
}