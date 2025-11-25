import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Common cron presets for quick scheduling
 */
const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 10 minutes', value: '*/10 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'First day of month', value: '0 0 1 * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
];

/**
 * Month names for dropdown display
 */
const MONTHS = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

/**
 * Day of week names for dropdown display
 */
const DAYS_OF_WEEK = [
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
];

/**
 * Minute preset values
 */
const MINUTE_PRESETS = ['0', '5', '10', '15', '30', '45', '*/5', '*/10', '*/15', '*/30'];

/**
 * Hour preset values
 */
const HOUR_PRESETS = [
  '0',
  '1',
  '3',
  '6',
  '9',
  '12',
  '15',
  '18',
  '21',
  '*/1',
  '*/2',
  '*/3',
  '*/6',
  '*/12',
];

/**
 * Props for CronBuilder component
 */
interface CronBuilderProps {
  /** Current cron expression value */
  value?: string;
  /** Callback fired when cron expression changes */
  onChange?: (cronExpression: string) => void;
  /** Selected timezone */
  timezone?: string;
  /** Callback fired when timezone changes */
  onTimezoneChange?: (timezone: string) => void;
}

/**
 * CronBuilder Component
 *
 * A comprehensive cron expression builder with visual dropdowns for easy scheduling.
 * Provides bidirectional sync between dropdown selections and raw cron input.
 * Supports both visual and advanced raw expression modes.
 *
 * @example
 * ```tsx
 * <CronBuilder
 *   value="0 9 * * *"
 *   onChange={(cron) => setCronExpression(cron)}
 *   timezone="America/New_York"
 *   onTimezoneChange={(tz) => setTimezone(tz)}
 * />
 * ```
 *
 * @param props - Component props
 * @returns React component
 */
export const CronBuilder: React.FC<CronBuilderProps> = ({
  value = '0 0 * * *',
  onChange,
  timezone = 'UTC',
  onTimezoneChange,
}) => {
  // Parse initial value to set correct initial states
  const parseInitialValue = (val: string) => {
    const parts = val.trim().split(/\s+/);
    if (parts.length === 5) {
      return {
        minute: parts[0],
        hour: parts[1],
        dayOfMonth: parts[2],
        month: parts[3],
        dayOfWeek: parts[4],
      };
    }
    return { minute: '0', hour: '0', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
  };

  const initialParts = useMemo(() => parseInitialValue(value), []);

  const [cronExpression, setCronExpression] = useState(value);
  const [isRawMode, setIsRawMode] = useState(false);
  const [minute, setMinute] = useState(initialParts.minute);
  const [hour, setHour] = useState(initialParts.hour);
  const [dayOfMonth, setDayOfMonth] = useState(initialParts.dayOfMonth);
  const [month, setMonth] = useState(initialParts.month);
  const [dayOfWeek, setDayOfWeek] = useState(initialParts.dayOfWeek);

  // Ref to prevent circular updates between parsing and building
  const isUpdatingFromExternal = useRef(false);
  // Ref to skip the initial mount effect
  const isInitialMount = useRef(true);

  // Memoize dropdown options to prevent recreating arrays on every render
  const minuteOptions = useMemo(() => {
    const options = [{ value: '*', label: 'Every minute' }];
    MINUTE_PRESETS.forEach((m) => options.push({ value: m, label: m }));
    Array.from({ length: 60 }, (_, i) => String(i))
      .filter((m) => !MINUTE_PRESETS.includes(m))
      .forEach((m) => options.push({ value: m, label: m }));
    return options;
  }, []);

  const hourOptions = useMemo(() => {
    const options = [{ value: '*', label: 'Every hour' }];
    HOUR_PRESETS.forEach((h) => options.push({ value: h, label: h }));
    Array.from({ length: 24 }, (_, i) => String(i))
      .filter((h) => !HOUR_PRESETS.includes(h))
      .forEach((h) => options.push({ value: h, label: h }));
    return options;
  }, []);

  const dayOptions = useMemo(() => {
    const options = [
      { value: '*', label: 'Every day' },
      { value: 'L', label: 'Last day' }
    ];
    Array.from({ length: 31 }, (_, i) => String(i + 1))
      .forEach((d) => options.push({ value: d, label: d }));
    return options;
  }, []);

  /**
   * Parse cron expression into individual components
   */
  const parseCronExpression = useCallback((expr: string) => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length === 5) {
      isUpdatingFromExternal.current = true;
      setMinute(parts[0]);
      setHour(parts[1]);
      setDayOfMonth(parts[2]);
      setMonth(parts[3]);
      setDayOfWeek(parts[4]);
      setIsRawMode(false);
      // Reset flag after state updates
      setTimeout(() => {
        isUpdatingFromExternal.current = false;
      }, 0);
    } else {
      // Invalid expression - switch to raw mode
      setIsRawMode(true);
    }
  }, []);

  /**
   * Build cron expression from individual components
   */
  const buildCronExpression = useCallback(() => {
    const cron = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;
    setCronExpression(cron);
    onChange?.(cron);
    return cron;
  }, [minute, hour, dayOfMonth, month, dayOfWeek, onChange]);

  /**
   * Handle raw cron input change
   */
  const handleRawCronChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCron = e.target.value;
    setCronExpression(newCron);
    onChange?.(newCron);
    // Try to parse the expression
    const parts = newCron.trim().split(/\s+/);
    if (parts.length === 5) {
      setIsRawMode(false);
      parseCronExpression(newCron);
    }
  };

  /**
   * Handle dropdown change and rebuild expression
   */
  const handleDropdownChange = (value: string, type: string) => {
    switch (type) {
      case 'minute':
        setMinute(value);
        break;
      case 'hour':
        setHour(value);
        break;
      case 'dayOfMonth':
        setDayOfMonth(value);
        break;
      case 'month':
        setMonth(value);
        break;
      case 'dayOfWeek':
        setDayOfWeek(value);
        break;
    }
    setIsRawMode(false);
  };

  /**
   * Apply preset cron expression
   */
  const applyPreset = (presetValue: string) => {
    setCronExpression(presetValue);
    onChange?.(presetValue);
    parseCronExpression(presetValue);
  };

  // Track the last value we received from outside to prevent loops
  const lastExternalValueRef = useRef(value);

  /**
   * Effect to update when external value changes
   * Does NOT run on initial mount since we already initialized from value
   */
  const isExternalEffectFirstRun = useRef(true);
  useEffect(() => {
    // Skip first run - we already initialized states from value
    if (isExternalEffectFirstRun.current) {
      isExternalEffectFirstRun.current = false;
      return;
    }

    // Only sync if the value actually changed from outside (not from our own onChange)
    if (value && value !== lastExternalValueRef.current) {
      lastExternalValueRef.current = value;
      parseCronExpression(value);
      setCronExpression(value);
    }
  }, [value, parseCronExpression]);

  // Store onChange in a ref to avoid it being a dependency that causes re-renders
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  /**
   * Effect to rebuild expression when dropdowns change
   * Only runs if we're not currently updating from an external value
   * Skips initial mount to prevent unnecessary onChange call
   */
  useEffect(() => {
    // Skip the first render to avoid calling onChange on mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isRawMode && !isUpdatingFromExternal.current) {
      const cron = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`;

      // Only call onChange if the value actually changed
      if (cron !== lastExternalValueRef.current) {
        setCronExpression(cron);
        lastExternalValueRef.current = cron;
        onChangeRef.current?.(cron);
      }
    }
  }, [minute, hour, dayOfMonth, month, dayOfWeek, isRawMode]);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="visual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual">Visual Builder</TabsTrigger>
          <TabsTrigger value="raw">Advanced</TabsTrigger>
        </TabsList>

        {/* Visual Builder Tab */}
        <TabsContent value="visual" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {/* Minute Dropdown */}
            <div>
              <Label htmlFor="minute-select" className="text-xs font-medium">
                Minute
              </Label>
              <Select value={minute} onValueChange={(val) => handleDropdownChange(val, 'minute')}>
                <SelectTrigger id="minute-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hour Dropdown */}
            <div>
              <Label htmlFor="hour-select" className="text-xs font-medium">
                Hour
              </Label>
              <Select value={hour} onValueChange={(val) => handleDropdownChange(val, 'hour')}>
                <SelectTrigger id="hour-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day of Month Dropdown */}
            <div>
              <Label htmlFor="day-month-select" className="text-xs font-medium">
                Day of Month
              </Label>
              <Select value={dayOfMonth} onValueChange={(val) => handleDropdownChange(val, 'dayOfMonth')}>
                <SelectTrigger id="day-month-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Dropdown */}
            <div>
              <Label htmlFor="month-select" className="text-xs font-medium">
                Month
              </Label>
              <Select value={month} onValueChange={(val) => handleDropdownChange(val, 'month')}>
                <SelectTrigger id="month-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">Every month</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Day of Week Dropdown */}
            <div>
              <Label htmlFor="day-week-select" className="text-xs font-medium">
                Day of Week
              </Label>
              <Select value={dayOfWeek} onValueChange={(val) => handleDropdownChange(val, 'dayOfWeek')}>
                <SelectTrigger id="day-week-select" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="*">Every day</SelectItem>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Presets Dropdown */}
          <div>
            <Label className="text-xs font-medium">Quick Presets</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  Common Presets
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {CRON_PRESETS.map((preset) => (
                  <DropdownMenuItem
                    key={preset.value}
                    onClick={() => applyPreset(preset.value)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{preset.label}</span>
                      <span className="text-xs text-muted-foreground">{preset.value}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Cron Expression Display */}
          <div className="rounded-md bg-muted p-3">
            <Label className="text-xs font-medium text-muted-foreground">Cron Expression</Label>
            <code className="text-sm font-mono">{cronExpression}</code>
          </div>
        </TabsContent>

        {/* Raw Expression Tab */}
        <TabsContent value="raw" className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="raw-cron" className="font-medium">
                Cron Expression
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="mb-2">Cron format: minute hour day month dayOfWeek</p>
                  <p className="mb-1">Examples:</p>
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    <li>&apos;0 9 * * *&apos; - Daily at 9 AM</li>
                    <li>&apos;*/5 * * * *&apos; - Every 5 minutes</li>
                    <li>&apos;0 0 1 * *&apos; - First day of month</li>
                    <li>&apos;0 9 * * 1-5&apos; - Weekdays at 9 AM</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="raw-cron"
              placeholder="0 0 * * *"
              value={cronExpression}
              onChange={handleRawCronChange}
              className="mt-2 font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Format: minute (0-59) hour (0-23) day (1-31) month (1-12) dayOfWeek (0-6)
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Timezone Selector */}
      <div>
        <Label htmlFor="timezone-select" className="text-sm font-medium">
          Timezone
        </Label>
        <Select value={timezone} onValueChange={onTimezoneChange}>
          <SelectTrigger id="timezone-select" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UTC">UTC</SelectItem>
            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
            <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
            <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
            <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
            <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
            <SelectItem value="Europe/Moscow">Europe/Moscow (MSK)</SelectItem>
            <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
            <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
            <SelectItem value="Asia/Bangkok">Asia/Bangkok (ICT)</SelectItem>
            <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
            <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
            <SelectItem value="Asia/Sydney">Asia/Sydney (AEDT)</SelectItem>
            <SelectItem value="Australia/Perth">Australia/Perth (AWST)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CronBuilder;
