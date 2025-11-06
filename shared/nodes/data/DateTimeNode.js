/**
 * DateTimeNode - Universal node for date and time manipulation
 *
 * Provides comprehensive date/time operations including formatting, parsing,
 * arithmetic, timezone conversions, and component extraction.
 *
 * @example
 * ```json
 * {
 *   "datetime-1": {
 *     "operation": "format",
 *     "field": "createdAt",
 *     "outputFormat": "MM/DD/YYYY",
 *     "success?": "next-node"
 *   }
 * }
 * ```
 */
import { WorkflowNode } from '../../src/types';
export class DateTimeNode extends WorkflowNode {
    metadata = {
        id: 'dateTime',
        name: 'Date & Time Operations',
        version: '1.0.0',
        description: 'Universal date and time manipulation - format, parse, calculate, compare, and convert dates',
        inputs: ['operation', 'field', 'outputField', 'inputFormat', 'outputFormat', 'amount', 'unit', 'roundTo', 'compareWith', 'extract', 'fromTimezone', 'toTimezone'],
        outputs: ['result', 'formatted', 'parsed', 'calculated', 'compared', 'extracted', 'converted'],
        ai_hints: {
            purpose: 'Manipulate and format dates and times with comprehensive operations',
            when_to_use: 'When you need to format dates, perform date arithmetic, compare dates, extract components, or convert timezones',
            expected_edges: ['success', 'is_before', 'is_after', 'is_same', 'is_between', 'is_valid', 'is_invalid', 'error'],
            example_usage: '{"datetime-1": {"operation": "format", "field": "createdAt", "outputFormat": "MM/DD/YYYY", "success?": "next-node"}}',
            example_config: '{"operation": "format|parse|add|subtract|round|compare|extract|convert_timezone|diff|is_valid|now|to_iso", "field": "string", "outputField?": "string", "outputFormat?": "string", "amount?": "number", "unit?": "years|months|weeks|days|hours|minutes|seconds"}',
            get_from_state: [],
            post_to_state: ['dateTimeResult', 'dateTimeFormatted', 'dateTimeParsed', 'dateTimeCompared', 'dateTimeExtracted']
        }
    };
    async execute(context, config) {
        const { operation, field, outputField = 'dateTimeResult', inputFormat, outputFormat, amount, unit, roundTo, compareWith, compareOperation = 'is_before', startDate, endDate, extract, fromTimezone, toTimezone, diffUnit = 'days', defaultValue, onError = 'stop' } = config || {};
        if (!operation) {
            return {
                error: () => ({ error: 'Missing required parameter: operation' })
            };
        }
        try {
            let result;
            switch (operation) {
                case 'now':
                    result = this.getCurrentDateTime();
                    break;
                case 'format':
                    result = await this.formatDate(context, field, outputFormat, inputFormat);
                    break;
                case 'parse':
                    result = await this.parseDate(context, field, inputFormat);
                    break;
                case 'add':
                    result = await this.addTime(context, field, amount, unit, inputFormat);
                    break;
                case 'subtract':
                    result = await this.subtractTime(context, field, amount, unit, inputFormat);
                    break;
                case 'round':
                    result = await this.roundDate(context, field, roundTo, inputFormat);
                    break;
                case 'compare':
                    return await this.compareDate(context, field, compareWith, compareOperation, inputFormat);
                case 'extract':
                    result = await this.extractComponent(context, field, extract, inputFormat);
                    break;
                case 'convert_timezone':
                    result = await this.convertTimezone(context, field, fromTimezone, toTimezone, inputFormat);
                    break;
                case 'diff':
                    result = await this.calculateDiff(context, field, compareWith, diffUnit, inputFormat);
                    break;
                case 'is_valid':
                    return await this.validateDate(context, field, inputFormat);
                case 'to_iso':
                    result = await this.toISO(context, field, inputFormat);
                    break;
                default:
                    return {
                        error: () => ({ error: `Unknown operation: ${operation}` })
                    };
            }
            // Store result in state
            context.state[outputField] = result;
            context.state.dateTimeResult = result;
            return {
                success: () => ({
                    result,
                    operation,
                    outputField
                })
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Date/time operation failed';
            if (onError === 'use_default' && defaultValue !== undefined) {
                context.state[outputField || 'dateTimeResult'] = defaultValue;
                return {
                    success: () => ({
                        result: defaultValue,
                        usedDefault: true,
                        error: errorMessage
                    })
                };
            }
            if (onError === 'skip') {
                return {
                    success: () => ({
                        skipped: true,
                        error: errorMessage
                    })
                };
            }
            return {
                error: () => ({
                    error: errorMessage,
                    operation,
                    field,
                    nodeId: context.nodeId
                })
            };
        }
    }
    /**
     * Get current date and time
     */
    getCurrentDateTime() {
        return new Date().toISOString();
    }
    /**
     * Format a date according to the specified format
     */
    async formatDate(context, field, outputFormat, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        if (!outputFormat) {
            return date.toISOString();
        }
        return this.formatDateWithPattern(date, outputFormat);
    }
    /**
     * Parse a date string into a Date object
     */
    async parseDate(context, field, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        return this.parseToDate(dateValue, inputFormat);
    }
    /**
     * Add time to a date
     */
    async addTime(context, field, amount, unit, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        this.modifyDate(date, amount, unit);
        return date.toISOString();
    }
    /**
     * Subtract time from a date
     */
    async subtractTime(context, field, amount, unit, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        this.modifyDate(date, -amount, unit);
        return date.toISOString();
    }
    /**
     * Round a date to the specified boundary
     */
    async roundDate(context, field, roundTo, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        switch (roundTo) {
            case 'start_of_day':
                date.setHours(0, 0, 0, 0);
                break;
            case 'end_of_day':
                date.setHours(23, 59, 59, 999);
                break;
            case 'start_of_week':
                const dayOfWeek = date.getDay();
                date.setDate(date.getDate() - dayOfWeek);
                date.setHours(0, 0, 0, 0);
                break;
            case 'end_of_week':
                const endDayOfWeek = date.getDay();
                date.setDate(date.getDate() + (6 - endDayOfWeek));
                date.setHours(23, 59, 59, 999);
                break;
            case 'start_of_month':
                date.setDate(1);
                date.setHours(0, 0, 0, 0);
                break;
            case 'end_of_month':
                date.setMonth(date.getMonth() + 1);
                date.setDate(0);
                date.setHours(23, 59, 59, 999);
                break;
            case 'start_of_year':
                date.setMonth(0, 1);
                date.setHours(0, 0, 0, 0);
                break;
            case 'end_of_year':
                date.setMonth(11, 31);
                date.setHours(23, 59, 59, 999);
                break;
        }
        return date.toISOString();
    }
    /**
     * Compare two dates
     */
    async compareDate(context, field, compareWith, compareOperation, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date1 = this.parseToDate(dateValue, inputFormat);
        const date2 = this.parseToDate(compareWith, inputFormat);
        const time1 = date1.getTime();
        const time2 = date2.getTime();
        let comparisonResult;
        let edgeName;
        switch (compareOperation) {
            case 'is_before':
                comparisonResult = time1 < time2;
                edgeName = comparisonResult ? 'is_before' : 'is_not_before';
                break;
            case 'is_after':
                comparisonResult = time1 > time2;
                edgeName = comparisonResult ? 'is_after' : 'is_not_after';
                break;
            case 'is_same':
                comparisonResult = time1 === time2;
                edgeName = comparisonResult ? 'is_same' : 'is_not_same';
                break;
            case 'is_between':
                // For is_between, we need startDate and endDate from config
                comparisonResult = false;
                edgeName = 'error';
                break;
            default:
                comparisonResult = false;
                edgeName = 'error';
        }
        context.state.dateTimeCompared = {
            result: comparisonResult,
            operation: compareOperation,
            date1: date1.toISOString(),
            date2: date2.toISOString()
        };
        return {
            [edgeName]: () => ({
                result: comparisonResult,
                date1: date1.toISOString(),
                date2: date2.toISOString(),
                operation: compareOperation
            })
        };
    }
    /**
     * Extract a component from a date
     */
    async extractComponent(context, field, component, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        let result;
        switch (component) {
            case 'year':
                result = date.getFullYear();
                break;
            case 'month':
                result = date.getMonth() + 1; // 1-12
                break;
            case 'day':
                result = date.getDate();
                break;
            case 'hour':
                result = date.getHours();
                break;
            case 'minute':
                result = date.getMinutes();
                break;
            case 'second':
                result = date.getSeconds();
                break;
            case 'millisecond':
                result = date.getMilliseconds();
                break;
            case 'dayOfWeek':
                result = date.getDay(); // 0-6
                break;
            case 'dayOfYear':
                result = this.getDayOfYear(date);
                break;
            case 'weekOfYear':
                result = this.getWeekOfYear(date);
                break;
            case 'quarter':
                result = Math.floor(date.getMonth() / 3) + 1; // 1-4
                break;
            case 'timestamp':
                result = date.getTime();
                break;
            default:
                throw new Error(`Unknown extract component: ${component}`);
        }
        context.state.dateTimeExtracted = result;
        return result;
    }
    /**
     * Convert date between timezones
     */
    async convertTimezone(context, field, fromTimezone, toTimezone, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        // Note: Timezone conversion in pure JavaScript is limited
        // For production, consider using a library like Luxon or date-fns-tz
        // This is a simplified implementation using timezone offsets
        try {
            // Get offset for target timezone
            const offset = this.getTimezoneOffset(toTimezone);
            // Apply offset
            const utcTime = date.getTime();
            const convertedDate = new Date(utcTime + offset);
            return convertedDate.toISOString();
        }
        catch (error) {
            throw new Error(`Timezone conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Calculate difference between two dates
     */
    async calculateDiff(context, field, compareWith, unit, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date1 = this.parseToDate(dateValue, inputFormat);
        const date2 = this.parseToDate(compareWith, inputFormat);
        const diffMs = Math.abs(date1.getTime() - date2.getTime());
        let result;
        switch (unit) {
            case 'milliseconds':
                result = diffMs;
                break;
            case 'seconds':
                result = Math.floor(diffMs / 1000);
                break;
            case 'minutes':
                result = Math.floor(diffMs / (1000 * 60));
                break;
            case 'hours':
                result = Math.floor(diffMs / (1000 * 60 * 60));
                break;
            case 'days':
                result = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                break;
            case 'weeks':
                result = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
                break;
            case 'months':
                result = this.getMonthDiff(date1, date2);
                break;
            case 'years':
                result = Math.floor(this.getMonthDiff(date1, date2) / 12);
                break;
            default:
                result = diffMs;
        }
        return result;
    }
    /**
     * Validate if a date is valid
     */
    async validateDate(context, field, inputFormat) {
        try {
            const dateValue = this.getFieldValue(context, field);
            const date = this.parseToDate(dateValue, inputFormat);
            const isValid = !isNaN(date.getTime());
            context.state.dateTimeValid = isValid;
            if (isValid) {
                return {
                    is_valid: () => ({
                        result: true,
                        date: date.toISOString()
                    })
                };
            }
            else {
                return {
                    is_invalid: () => ({
                        result: false,
                        value: dateValue
                    })
                };
            }
        }
        catch {
            return {
                is_invalid: () => ({
                    result: false,
                    value: context.state[field]
                })
            };
        }
    }
    /**
     * Convert date to ISO string
     */
    async toISO(context, field, inputFormat) {
        const dateValue = this.getFieldValue(context, field);
        const date = this.parseToDate(dateValue, inputFormat);
        return date.toISOString();
    }
    /**
     * Helper: Get field value from context state or inputs
     */
    getFieldValue(context, field) {
        // Try to get from state first
        if (field in context.state) {
            return context.state[field];
        }
        // Try inputs
        if (field in context.inputs) {
            return context.inputs[field];
        }
        // Try nested path
        const segments = field.split('.');
        let value = context.state;
        for (const segment of segments) {
            if (value && typeof value === 'object' && segment in value) {
                value = value[segment];
            }
            else {
                throw new Error(`Field not found: ${field}`);
            }
        }
        return value;
    }
    /**
     * Helper: Parse value to Date object
     */
    parseToDate(value, inputFormat) {
        if (value instanceof Date) {
            return value;
        }
        if (typeof value === 'number') {
            return new Date(value);
        }
        if (typeof value === 'string') {
            // If no format specified, try ISO parsing
            if (!inputFormat) {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date string: ${value}`);
                }
                return date;
            }
            // Simple format parsing (for production, use a library like date-fns)
            return this.parseWithFormat(value, inputFormat);
        }
        throw new Error(`Cannot parse date from value: ${value}`);
    }
    /**
     * Helper: Parse date with custom format
     */
    parseWithFormat(dateStr, format) {
        // This is a simplified implementation
        // For production, use a library like date-fns or Luxon
        // Common format patterns
        const formats = {
            'YYYY-MM-DD': /^(\d{4})-(\d{2})-(\d{2})$/,
            'MM/DD/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
            'DD/MM/YYYY': /^(\d{2})\/(\d{2})\/(\d{4})$/,
            'YYYY/MM/DD': /^(\d{4})\/(\d{2})\/(\d{2})$/,
        };
        const pattern = formats[format];
        if (!pattern) {
            // Fallback to standard parsing
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                throw new Error(`Unsupported format: ${format}`);
            }
            return date;
        }
        const match = dateStr.match(pattern);
        if (!match) {
            throw new Error(`Date string doesn't match format ${format}`);
        }
        let year, month, day;
        switch (format) {
            case 'YYYY-MM-DD':
            case 'YYYY/MM/DD':
                year = Number(match[1]);
                month = Number(match[2]);
                day = Number(match[3]);
                break;
            case 'MM/DD/YYYY':
                month = Number(match[1]);
                day = Number(match[2]);
                year = Number(match[3]);
                break;
            case 'DD/MM/YYYY':
                day = Number(match[1]);
                month = Number(match[2]);
                year = Number(match[3]);
                break;
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        return new Date(year, month - 1, day);
    }
    /**
     * Helper: Format date with custom pattern
     */
    formatDateWithPattern(date, pattern) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        const pad = (n, length = 2) => String(n).padStart(length, '0');
        // Replace format tokens
        return pattern
            .replace('YYYY', String(year))
            .replace('YY', String(year).slice(-2))
            .replace('MM', pad(month))
            .replace('M', String(month))
            .replace('DD', pad(day))
            .replace('D', String(day))
            .replace('HH', pad(hours))
            .replace('H', String(hours))
            .replace('mm', pad(minutes))
            .replace('m', String(minutes))
            .replace('ss', pad(seconds))
            .replace('s', String(seconds));
    }
    /**
     * Helper: Modify date by adding/subtracting time
     */
    modifyDate(date, amount, unit) {
        switch (unit) {
            case 'years':
                date.setFullYear(date.getFullYear() + amount);
                break;
            case 'months':
                date.setMonth(date.getMonth() + amount);
                break;
            case 'weeks':
                date.setDate(date.getDate() + (amount * 7));
                break;
            case 'days':
                date.setDate(date.getDate() + amount);
                break;
            case 'hours':
                date.setHours(date.getHours() + amount);
                break;
            case 'minutes':
                date.setMinutes(date.getMinutes() + amount);
                break;
            case 'seconds':
                date.setSeconds(date.getSeconds() + amount);
                break;
            case 'milliseconds':
                date.setMilliseconds(date.getMilliseconds() + amount);
                break;
        }
    }
    /**
     * Helper: Get day of year
     */
    getDayOfYear(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }
    /**
     * Helper: Get week of year
     */
    getWeekOfYear(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
    /**
     * Helper: Get month difference between two dates
     */
    getMonthDiff(date1, date2) {
        const d1 = date1 > date2 ? date1 : date2;
        const d2 = date1 > date2 ? date2 : date1;
        const yearDiff = d1.getFullYear() - d2.getFullYear();
        const monthDiff = d1.getMonth() - d2.getMonth();
        return yearDiff * 12 + monthDiff;
    }
    /**
     * Helper: Get timezone offset in milliseconds
     * Note: This is a simplified implementation
     */
    getTimezoneOffset(timezone) {
        // This is a very simplified implementation
        // For production, use a proper timezone library
        const offsets = {
            'UTC': 0,
            'GMT': 0,
            'EST': -5 * 60 * 60 * 1000,
            'EDT': -4 * 60 * 60 * 1000,
            'CST': -6 * 60 * 60 * 1000,
            'CDT': -5 * 60 * 60 * 1000,
            'MST': -7 * 60 * 60 * 1000,
            'MDT': -6 * 60 * 60 * 1000,
            'PST': -8 * 60 * 60 * 1000,
            'PDT': -7 * 60 * 60 * 1000,
        };
        return offsets[timezone] || 0;
    }
}
export default DateTimeNode;
