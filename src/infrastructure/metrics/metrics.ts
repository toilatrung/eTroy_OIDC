export type MetricType = 'counter' | 'gauge' | 'histogram';

export type AllowedMetricLabel =
  | 'method'
  | 'route'
  | 'status_class'
  | 'module'
  | 'operation'
  | 'outcome'
  | 'event_type'
  | 'dependency'
  | 'grant_type'
  | 'scope_group';

export type MetricLabels = Partial<Record<AllowedMetricLabel, string>>;

export interface CounterMetric {
  name: string;
  labels: MetricLabels;
  value: number;
}

export interface GaugeMetric {
  name: string;
  labels: MetricLabels;
  value: number;
}

export interface HistogramMetric {
  name: string;
  labels: MetricLabels;
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  averageMs: number;
}

export type TimerMetric = HistogramMetric;

interface StoredHistogram {
  name: string;
  labels: MetricLabels;
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
}

const counterStore = new Map<string, CounterMetric>();
const gaugeStore = new Map<string, GaugeMetric>();
const histogramStore = new Map<string, StoredHistogram>();

const ALLOWED_LABELS = new Set<AllowedMetricLabel>([
  'method',
  'route',
  'status_class',
  'module',
  'operation',
  'outcome',
  'event_type',
  'dependency',
  'grant_type',
  'scope_group',
]);

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const ALLOWED_OUTCOMES = new Set(['success', 'failure', 'denied', 'noop', 'error', 'unknown']);
const ALLOWED_DEPENDENCIES = new Set(['mongodb', 'redis', 'logger', 'metrics', 'system']);
const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token']);
const ALLOWED_STATUS_CLASSES = new Set(['1xx', '2xx', '3xx', '4xx', '5xx']);
const SAFE_LABEL_VALUE_PATTERN = /^[A-Za-z0-9_.:/ -]{1,128}$/u;
const SAFE_METRIC_NAME_PATTERN = /^[a-z_:][a-z0-9_:]*$/u;
const FORBIDDEN_LABEL_VALUE_PATTERN =
  /(access_token|refresh_token|id_token|authorization_code|code_verifier|client_secret|clientSecret|password|bearer\s+|BEGIN\s+PRIVATE\s+KEY|-----BEGIN|set-cookie|cookie:|csrf)/iu;

const normalizeMetricName = (name: string): string => {
  const normalized = name.trim();
  if (normalized.length === 0 || !SAFE_METRIC_NAME_PATTERN.test(normalized)) {
    throw new Error('Metric name must be lowercase, namespaced, and non-empty.');
  }
  return normalized;
};

const normalizeBoundedValue = (value: string): string =>
  SAFE_LABEL_VALUE_PATTERN.test(value) && !FORBIDDEN_LABEL_VALUE_PATTERN.test(value)
    ? value
    : 'unknown';

const normalizeLabelValue = (label: AllowedMetricLabel, value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }

  if (label === 'method') {
    const method = normalized.toUpperCase();
    return ALLOWED_METHODS.has(method) ? method : 'OTHER';
  }

  if (label === 'status_class') {
    return ALLOWED_STATUS_CLASSES.has(normalized) ? normalized : 'unknown';
  }

  if (label === 'outcome') {
    return ALLOWED_OUTCOMES.has(normalized) ? normalized : 'unknown';
  }

  if (label === 'dependency') {
    return ALLOWED_DEPENDENCIES.has(normalized) ? normalized : 'unknown';
  }

  if (label === 'grant_type') {
    return ALLOWED_GRANT_TYPES.has(normalized) ? normalized : 'unknown';
  }

  if (label === 'route') {
    return normalized.includes('?') ? 'unknown' : normalizeBoundedValue(normalized);
  }

  return normalizeBoundedValue(normalized);
};

const sanitizeLabels = (labels?: MetricLabels): MetricLabels => {
  if (labels === undefined) {
    return {};
  }

  const sanitized: MetricLabels = {};
  for (const [key, value] of Object.entries(labels)) {
    const label = key as AllowedMetricLabel;
    if (!ALLOWED_LABELS.has(label)) {
      continue;
    }

    const normalized = normalizeLabelValue(label, value);
    if (normalized !== undefined) {
      sanitized[label] = normalized;
    }
  }

  return sanitized;
};

const metricKey = (name: string, labels: MetricLabels): string => {
  const labelPairs = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  return `${name}|${labelPairs.map(([key, value]) => `${key}=${value}`).join(',')}`;
};

const toStatusClass = (statusCode: number): string => {
  if (!Number.isInteger(statusCode) || statusCode < 100 || statusCode > 599) {
    return 'unknown';
  }

  return `${Math.floor(statusCode / 100)}xx`;
};

export const statusClassFromStatusCode = toStatusClass;

export function incrementCounter(name: string, incrementBy?: number): CounterMetric;
export function incrementCounter(
  name: string,
  labels?: MetricLabels,
  incrementBy?: number,
): CounterMetric;
export function incrementCounter(
  name: string,
  labelsOrIncrementBy: MetricLabels | number = {},
  maybeIncrementBy = 1,
): CounterMetric {
  const labels = typeof labelsOrIncrementBy === 'number' ? {} : sanitizeLabels(labelsOrIncrementBy);
  const incrementBy =
    typeof labelsOrIncrementBy === 'number' ? labelsOrIncrementBy : maybeIncrementBy;

  if (!Number.isFinite(incrementBy) || incrementBy < 0) {
    throw new Error('Counter increment must be a finite number greater than or equal to 0.');
  }

  const metricName = normalizeMetricName(name);
  const key = metricKey(metricName, labels);
  const previous = counterStore.get(key);
  const next: CounterMetric = {
    name: metricName,
    labels,
    value: (previous?.value ?? 0) + incrementBy,
  };

  counterStore.set(key, next);
  return next;
}

export const getCounter = (name: string, labels?: MetricLabels): CounterMetric => {
  const metricName = normalizeMetricName(name);
  const sanitizedLabels = sanitizeLabels(labels);
  return (
    counterStore.get(metricKey(metricName, sanitizedLabels)) ?? {
      name: metricName,
      labels: sanitizedLabels,
      value: 0,
    }
  );
};

export const setGauge = (name: string, value: number, labels?: MetricLabels): GaugeMetric => {
  if (!Number.isFinite(value)) {
    throw new Error('Gauge value must be a finite number.');
  }

  const metricName = normalizeMetricName(name);
  const sanitizedLabels = sanitizeLabels(labels);
  const gauge: GaugeMetric = {
    name: metricName,
    labels: sanitizedLabels,
    value,
  };

  gaugeStore.set(metricKey(metricName, sanitizedLabels), gauge);
  return gauge;
};

export const getGauge = (name: string, labels?: MetricLabels): GaugeMetric => {
  const metricName = normalizeMetricName(name);
  const sanitizedLabels = sanitizeLabels(labels);
  return (
    gaugeStore.get(metricKey(metricName, sanitizedLabels)) ?? {
      name: metricName,
      labels: sanitizedLabels,
      value: 0,
    }
  );
};

export const recordHistogram = (
  name: string,
  durationMs: number,
  labels?: MetricLabels,
): HistogramMetric => {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error('Histogram value must be a finite number greater than or equal to 0.');
  }

  const metricName = normalizeMetricName(name);
  const sanitizedLabels = sanitizeLabels(labels);
  const key = metricKey(metricName, sanitizedLabels);
  const previous = histogramStore.get(key) ?? {
    name: metricName,
    labels: sanitizedLabels,
    count: 0,
    totalMs: 0,
    minMs: Number.POSITIVE_INFINITY,
    maxMs: 0,
  };

  const next: StoredHistogram = {
    name: metricName,
    labels: sanitizedLabels,
    count: previous.count + 1,
    totalMs: previous.totalMs + durationMs,
    minMs: Math.min(previous.minMs, durationMs),
    maxMs: Math.max(previous.maxMs, durationMs),
  };

  histogramStore.set(key, next);

  return {
    name: metricName,
    labels: sanitizedLabels,
    count: next.count,
    totalMs: next.totalMs,
    minMs: Number.isFinite(next.minMs) ? next.minMs : 0,
    maxMs: next.maxMs,
    averageMs: next.count === 0 ? 0 : next.totalMs / next.count,
  };
};

export const recordTiming = (name: string, durationMs: number): TimerMetric =>
  recordHistogram(name, durationMs);

export const startTimer = (name: string): (() => TimerMetric) => {
  const metricName = normalizeMetricName(name);
  const startAt = performance.now();

  return () => recordTiming(metricName, performance.now() - startAt);
};

export const getTimer = (name: string): TimerMetric => {
  const metricName = normalizeMetricName(name);
  const current = histogramStore.get(metricKey(metricName, {}));

  if (!current) {
    return {
      name: metricName,
      labels: {},
      count: 0,
      totalMs: 0,
      minMs: 0,
      maxMs: 0,
      averageMs: 0,
    };
  }

  return {
    name: metricName,
    labels: current.labels,
    count: current.count,
    totalMs: current.totalMs,
    minMs: Number.isFinite(current.minMs) ? current.minMs : 0,
    maxMs: current.maxMs,
    averageMs: current.count === 0 ? 0 : current.totalMs / current.count,
  };
};

const renderLabels = (labels: MetricLabels): string => {
  const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) {
    return '';
  }

  return `{${entries.map(([key, value]) => `${key}="${value}"`).join(',')}}`;
};

export const renderMetrics = (): string => {
  const lines: string[] = [
    '# HELP etroy_oidc_info Static service information.',
    '# TYPE etroy_oidc_info gauge',
    'etroy_oidc_info 1',
  ];

  for (const metric of counterStore.values()) {
    lines.push(`# TYPE ${metric.name} counter`);
    lines.push(`${metric.name}${renderLabels(metric.labels)} ${metric.value}`);
  }

  for (const metric of gaugeStore.values()) {
    lines.push(`# TYPE ${metric.name} gauge`);
    lines.push(`${metric.name}${renderLabels(metric.labels)} ${metric.value}`);
  }

  for (const metric of histogramStore.values()) {
    const labels = renderLabels(metric.labels);
    lines.push(`# TYPE ${metric.name} histogram`);
    lines.push(`${metric.name}_count${labels} ${metric.count}`);
    lines.push(`${metric.name}_sum${labels} ${metric.totalMs}`);
    lines.push(`${metric.name}_min${labels} ${Number.isFinite(metric.minMs) ? metric.minMs : 0}`);
    lines.push(`${metric.name}_max${labels} ${metric.maxMs}`);
    lines.push(
      `${metric.name}_avg${labels} ${metric.count === 0 ? 0 : metric.totalMs / metric.count}`,
    );
  }

  return `${lines.join('\n')}\n`;
};

export const resetMetricsForTest = (): void => {
  counterStore.clear();
  gaugeStore.clear();
  histogramStore.clear();
};
