/**
 * @fileoverview Utility Type Definitions
 * @description Helper types, generic utilities, and common type patterns
 */

// ========================================
// Generic Utility Types
// ========================================

/**
 * Make all properties optional recursively
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract keys of type V from object T
 */
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Nullable type helper
 */
type Nullable<T> = T | null;

/**
 * Undefinable type helper
 */
type Maybe<T> = T | undefined;

/**
 * Optional type (null or undefined)
 */
type Optional<T> = T | null | undefined;

// ========================================
// Function Types
// ========================================

/**
 * Generic async function type
 */
type AsyncFunction<T = void, Args extends unknown[] = []> = (...args: Args) => Promise<T>;

/**
 * Callback function type
 */
type Callback<T = void> = (error?: Error | null, result?: T) => void;

/**
 * Event handler type
 */
type EventHandler<E extends Event = Event> = (event: E) => void;

/**
 * Debounced function type
 */
interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => ReturnType<T>;
}

/**
 * Throttled function type
 */
interface ThrottledFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): ReturnType<T>;
  cancel: () => void;
}

// ========================================
// Promise Types
// ========================================

/**
 * Promise result type (success or failure)
 */
type PromiseResult<T, E = Error> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

/**
 * Async operation result
 */
interface AsyncResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
}

// ========================================
// DOM Types
// ========================================

/**
 * HTML element with data attributes
 */
interface DatasetElement<T extends Record<string, string> = Record<string, string>> extends HTMLElement {
  dataset: DOMStringMap & T;
}

/**
 * Form element types
 */
type FormInputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Form data object
 */
type FormDataObject = Record<string, string | number | boolean | null>;

/**
 * Event target with value
 */
interface EventTargetWithValue extends EventTarget {
  value: string;
}

/**
 * Input event with typed target
 */
interface TypedInputEvent extends Event {
  target: HTMLInputElement;
}

/**
 * Change event with typed target
 */
interface TypedChangeEvent extends Event {
  target: FormInputElement;
}

// ========================================
// Storage Types
// ========================================

/**
 * Local storage item with metadata
 */
interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiry?: number;
  version?: string;
}

/**
 * Storage operation result
 */
interface StorageOperationResult {
  success: boolean;
  error?: string;
  quotaExceeded?: boolean;
}

/**
 * Cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ========================================
// API Response Types
// ========================================

/**
 * Generic API response
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
}

/**
 * Paginated response
 */
interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * List response with metadata
 */
interface ListResponse<T> {
  items: T[];
  count: number;
  metadata?: Record<string, unknown>;
}

// ========================================
// State Management Types
// ========================================

/**
 * Loading state
 */
interface LoadingState {
  isLoading: boolean;
  error?: string;
  progress?: number;
  message?: string;
}

/**
 * Selection state for lists
 */
interface SelectionState<T = string> {
  selected: Set<T>;
  lastSelected?: T;
  allSelected: boolean;
}

/**
 * Sort configuration
 */
interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Filter configuration
 */
interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
}

// ========================================
// Modal Types
// ========================================

/**
 * Modal configuration
 */
interface ModalConfig {
  title?: string;
  content?: string | HTMLElement;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  closable?: boolean;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

/**
 * Modal state
 */
interface ModalState {
  isOpen: boolean;
  data?: unknown;
  resolve?: (value: unknown) => void;
  reject?: (reason?: unknown) => void;
}

// ========================================
// Validation Types
// ========================================

/**
 * Validation rule
 */
interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
  validator?: (value: unknown) => boolean;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors?: Record<string, string[]>;
}

/**
 * Field validation state
 */
interface FieldValidation {
  valid: boolean;
  touched: boolean;
  dirty: boolean;
  errors: string[];
}

// ========================================
// Date/Time Types
// ========================================

/**
 * Date range
 */
interface DateRange {
  start: Date | string;
  end: Date | string;
}

/**
 * Time period
 */
type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Date format options
 */
interface DateFormatOptions {
  format?: string;
  locale?: string;
  timezone?: string;
}

// ========================================
// File Types
// ========================================

/**
 * File metadata
 */
interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  path?: string;
}

/**
 * File upload progress
 */
interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  fileName: string;
}

/**
 * Export format options
 */
type ExportFormat = 'json' | 'xlsx' | 'csv' | 'pdf';

/**
 * Export options
 */
interface ExportOptions {
  format: ExportFormat;
  fileName?: string;
  includeHeaders?: boolean;
  dateRange?: DateRange;
  filters?: Record<string, unknown>;
}

// ========================================
// Event Types
// ========================================

/**
 * Custom event detail
 */
interface CustomEventDetail<T = unknown> {
  type: string;
  data?: T;
  timestamp: number;
  source?: string;
}

/**
 * Event emitter subscription
 */
interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Event listener map
 */
type EventListenerMap<T extends string = string> = Map<T, Set<EventHandler>>;

// ========================================
// Configuration Types
// ========================================

/**
 * Application configuration
 */
interface AppConfig {
  debug: boolean;
  environment: 'development' | 'production' | 'test';
  version: string;
  apiEndpoint?: string;
  features?: Record<string, boolean>;
}

/**
 * Module configuration
 */
interface ModuleConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

// ========================================
// Error Types
// ========================================

/**
 * Application error
 */
interface AppError {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
  timestamp: number;
}

/**
 * Error with context
 */
interface ContextualError extends Error {
  code?: string;
  context?: Record<string, unknown>;
  recoverable?: boolean;
}

// ========================================
// ID Types
// ========================================

/**
 * UUID string type
 */
type UUID = string;

/**
 * ID generator function
 */
type IdGenerator = () => string;

// ========================================
// Common Object Types
// ========================================

/**
 * Key-value pair
 */
interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

/**
 * Named item
 */
interface NamedItem {
  id: string;
  name: string;
}

/**
 * Labeled item (for dropdowns, etc.)
 */
interface LabeledItem<V = string> {
  label: string;
  value: V;
  disabled?: boolean;
}

/**
 * Option item for select elements
 */
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

// ========================================
// Collection Types
// ========================================

/**
 * Dictionary/map type
 */
type Dictionary<T> = Record<string, T>;

/**
 * Indexed collection
 */
type IndexedCollection<T> = Record<string | number, T>;

/**
 * Tree node
 */
interface TreeNode<T = unknown> {
  id: string;
  data: T;
  children?: TreeNode<T>[];
  parent?: string;
  expanded?: boolean;
}

// ========================================
// Export Types
// ========================================

export {
  // Generic utilities
  DeepPartial,
  RequiredProps,
  OptionalProps,
  KeysOfType,
  Nullable,
  Maybe,
  Optional,

  // Function types
  AsyncFunction,
  Callback,
  EventHandler,
  DebouncedFunction,
  ThrottledFunction,

  // Promise types
  PromiseResult,
  AsyncResult,
  RetryConfig,

  // DOM types
  DatasetElement,
  FormInputElement,
  FormDataObject,
  EventTargetWithValue,
  TypedInputEvent,
  TypedChangeEvent,

  // Storage types
  StorageItem,
  StorageOperationResult,
  CacheEntry,

  // API types
  ApiResponse,
  PaginatedResponse,
  ListResponse,

  // State types
  LoadingState,
  SelectionState,
  SortConfig,
  FilterConfig,

  // Modal types
  ModalConfig,
  ModalState,

  // Validation types
  ValidationRule,
  ValidationResult,
  FieldValidation,

  // Date types
  DateRange,
  TimePeriod,
  DateFormatOptions,

  // File types
  FileMetadata,
  FileUploadProgress,
  ExportFormat,
  ExportOptions,

  // Event types
  CustomEventDetail,
  EventSubscription,
  EventListenerMap,

  // Config types
  AppConfig,
  ModuleConfig,

  // Error types
  AppError,
  ContextualError,

  // ID types
  UUID,
  IdGenerator,

  // Object types
  KeyValuePair,
  NamedItem,
  LabeledItem,
  SelectOption,

  // Collection types
  Dictionary,
  IndexedCollection,
  TreeNode,
};
