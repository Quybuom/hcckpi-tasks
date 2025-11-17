import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const WARNING_TIME = 30 * 1000; // Show warning 30 seconds before logout

export function IdleTimeout() {
  const { user, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const showWarningRef = useRef<boolean>(false);

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    showWarningRef.current = false;
    setShowWarning(false);
    setCountdown(30);

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Set warning timer (4.5 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      showWarningRef.current = true;
      setShowWarning(true);
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT - WARNING_TIME);

    // Set logout timer (5 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT);
  };

  const handleLogout = async () => {
    setShowWarning(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    await logout();
  };

  const handleStayLoggedIn = () => {
    resetTimer();
  };

  useEffect(() => {
    // Only activate idle timeout if user is logged in
    if (!user) {
      return;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const resetTimerOnActivity = () => {
      // Only reset if not currently showing warning dialog
      // This prevents accidental dismiss of warning
      // Use ref to always read the latest value
      if (!showWarningRef.current) {
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimerOnActivity);
    });

    // Initialize timer on mount
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimerOnActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user]);

  // Don't render anything if user is not logged in
  if (!user) {
    return null;
  }

  return (
    <Dialog open={showWarning} onOpenChange={(open) => !open && handleStayLoggedIn()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-idle-warning">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Cảnh báo phiên làm việc
          </DialogTitle>
          <DialogDescription>
            Bạn đã không có hoạt động trong một thời gian dài. Hệ thống sẽ tự động đăng xuất sau{" "}
            <span className="font-semibold text-warning">{countdown} giây</span> nếu không có thao tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="button-logout-now"
          >
            Đăng xuất ngay
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            data-testid="button-stay-logged-in"
          >
            Tiếp tục làm việc
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
