/**
 * @fileoverview Firebase Compat SDK Type Definitions
 * @description Complete type definitions for firebase/compat SDK to resolve TypeScript errors
 *
 * This file provides type definitions for:
 * - firebase/compat/app (default export, initializeApp, apps, etc.)
 * - firebase/compat/auth (Auth, signInAnonymously, etc.)
 * - firebase/compat/firestore (Firestore, DocumentSnapshot, QuerySnapshot, FieldValue, etc.)
 */

declare module 'firebase/compat/app' {
  /**
   * Firebase App Configuration
   */
  export interface FirebaseOptions {
    apiKey: string;
    authDomain?: string;
    databaseURL?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
  }

  /**
   * Firebase App Instance
   */
  export interface FirebaseApp {
    readonly name: string;
    readonly options: FirebaseOptions;
    delete(): Promise<void>;
  }

  /**
   * Firebase User
   */
  export interface User {
    readonly uid: string;
    readonly email: string | null;
    readonly emailVerified: boolean;
    readonly displayName: string | null;
    readonly photoURL: string | null;
    readonly phoneNumber: string | null;
    readonly isAnonymous: boolean;
    readonly metadata: {
      readonly creationTime?: string;
      readonly lastSignInTime?: string;
    };
  }

  /**
   * User Credential
   */
  export interface UserCredential {
    readonly user: User | null;
    readonly credential: any | null;
    readonly operationType?: string;
  }

  /**
   * Firebase Auth
   */
  export interface Auth {
    readonly app: FirebaseApp;
    readonly currentUser: User | null;

    signInAnonymously(): Promise<UserCredential>;
    signOut(): Promise<void>;
    onAuthStateChanged(
      nextOrObserver: ((user: User | null) => void),
      error?: (error: Error) => void,
      completed?: () => void
    ): () => void;
  }

  /**
   * Firestore Timestamp
   */
  export class Timestamp {
    readonly seconds: number;
    readonly nanoseconds: number;

    constructor(seconds: number, nanoseconds: number);

    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    static fromMillis(milliseconds: number): Timestamp;

    toDate(): Date;
    toMillis(): number;
    isEqual(other: Timestamp): boolean;
  }

  /**
   * Firestore namespace
   */
  export namespace firestore {
    export class FieldValue {
      static serverTimestamp(): FieldValue;
      static delete(): FieldValue;
      static increment(n: number): FieldValue;
      static arrayUnion(...elements: any[]): FieldValue;
      static arrayRemove(...elements: any[]): FieldValue;
    }

    export interface DocumentSnapshot<T = any> {
      readonly id: string;
      readonly ref: DocumentReference<T>;
      readonly metadata: {
        readonly hasPendingWrites: boolean;
        readonly fromCache: boolean;
      };

      exists: boolean;
      data(): T | undefined;
      get(fieldPath: string): any;
    }

    export interface QuerySnapshot<T = any> {
      readonly query: Query<T>;
      readonly metadata: {
        readonly hasPendingWrites: boolean;
        readonly fromCache: boolean;
      };
      readonly docs: Array<DocumentSnapshot<T>>;
      readonly size: number;
      readonly empty: boolean;

      forEach(callback: (result: DocumentSnapshot<T>) => void): void;
    }

    export interface DocumentReference<T = any> {
      readonly id: string;
      readonly firestore: Firestore;
      readonly parent: CollectionReference<T>;
      readonly path: string;

      collection(collectionPath: string): CollectionReference<any>;
      get(): Promise<DocumentSnapshot<T>>;
      set(data: Partial<T>, options?: { merge?: boolean }): Promise<void>;
      update(data: Partial<T>): Promise<void>;
      delete(): Promise<void>;
      onSnapshot(
        onNext: (snapshot: DocumentSnapshot<T>) => void,
        onError?: (error: Error) => void,
        onCompletion?: () => void
      ): () => void;
    }

    export interface CollectionReference<T = any> extends Query<T> {
      readonly id: string;
      readonly parent: DocumentReference<any> | null;
      readonly path: string;

      doc(documentPath?: string): DocumentReference<T>;
      add(data: T): Promise<DocumentReference<T>>;
    }

    export interface Query<T = any> {
      readonly firestore: Firestore;

      where(fieldPath: string, opStr: WhereFilterOp, value: any): Query<T>;
      orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): Query<T>;
      limit(limit: number): Query<T>;
      limitToLast(limit: number): Query<T>;
      startAt(...fieldValues: any[]): Query<T>;
      startAfter(...fieldValues: any[]): Query<T>;
      endAt(...fieldValues: any[]): Query<T>;
      endBefore(...fieldValues: any[]): Query<T>;
      get(): Promise<QuerySnapshot<T>>;
      onSnapshot(
        onNext: (snapshot: QuerySnapshot<T>) => void,
        onError?: (error: Error) => void,
        onCompletion?: () => void
      ): () => void;
    }

    export type WhereFilterOp = '==' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';

    export interface WriteBatch {
      set<T>(documentRef: DocumentReference<T>, data: Partial<T>, options?: { merge?: boolean }): WriteBatch;
      update<T>(documentRef: DocumentReference<T>, data: Partial<T>): WriteBatch;
      delete<T>(documentRef: DocumentReference<T>): WriteBatch;
      commit(): Promise<void>;
    }

    export interface Settings {
      host?: string;
      ssl?: boolean;
      cacheSizeBytes?: number;
      experimentalForceLongPolling?: boolean;
      experimentalAutoDetectLongPolling?: boolean;
      ignoreUndefinedProperties?: boolean;
    }

    export interface PersistenceSettings {
      synchronizeTabs?: boolean;
    }

    export interface Firestore {
      readonly app: FirebaseApp;

      collection(collectionPath: string): CollectionReference<any>;
      doc(documentPath: string): DocumentReference<any>;
      batch(): WriteBatch;
      runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T>;
      settings(settings: Settings): void;
      enablePersistence(settings?: PersistenceSettings): Promise<void>;
      disableNetwork(): Promise<void>;
      enableNetwork(): Promise<void>;
      clearPersistence(): Promise<void>;
      terminate(): Promise<void>;
      waitForPendingWrites(): Promise<void>;
    }

    export function setLogLevel(logLevel: 'debug' | 'error' | 'silent'): void;
  }

  /**
   * Firebase Namespace (default export)
   */
  export interface FirebaseNamespace {
    initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
    app(name?: string): FirebaseApp;
    readonly apps: FirebaseApp[];

    auth(app?: FirebaseApp): Auth;
    firestore(app?: FirebaseApp): firestore.Firestore;

    readonly firestore: {
      FieldValue: typeof firestore.FieldValue;
      Timestamp: typeof Timestamp;
      setLogLevel(logLevel: 'debug' | 'error' | 'silent'): void;
      DocumentSnapshot: typeof firestore.DocumentSnapshot;
      QuerySnapshot: typeof firestore.QuerySnapshot;
    };

    readonly SDK_VERSION: string;
  }

  const firebase: FirebaseNamespace;
  export default firebase;
}

/**
 * Re-export types for firebase/compat/auth
 */
declare module 'firebase/compat/auth' {
  import { Auth, User, UserCredential } from 'firebase/compat/app';
  export { Auth, User, UserCredential };
}

/**
 * Re-export types for firebase/compat/firestore
 */
declare module 'firebase/compat/firestore' {
  import { firestore } from 'firebase/compat/app';
  export { firestore };
  export type Firestore = firestore.Firestore;
  export type DocumentSnapshot = firestore.DocumentSnapshot;
  export type QuerySnapshot = firestore.QuerySnapshot;
  export type DocumentReference = firestore.DocumentReference;
  export type CollectionReference = firestore.CollectionReference;
  export type Query = firestore.Query;
  export type WriteBatch = firestore.WriteBatch;
  export type FieldValue = firestore.FieldValue;
  export type Settings = firestore.Settings;
  export type PersistenceSettings = firestore.PersistenceSettings;
}
