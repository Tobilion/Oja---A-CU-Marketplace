/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Repository } from './repo';
import { MockRepository } from './mockRepo';
import { SupabaseRepository } from './supabaseRepo';
import { IS_DEMO_MODE } from '../config/appConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidSupabase = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('YOUR_') && supabaseUrl.startsWith('https://')
);

export const isSupabaseConfigMissing = !IS_DEMO_MODE && !hasValidSupabase;

// If in demo mode, use MockRepository.
// If in production/public mode with valid credentials, use SupabaseRepository.
// If in production without credentials, use an error-throwing dummy or SupabaseRepository so mock is never silently used.
export const repo: Repository =
  IS_DEMO_MODE
    ? new MockRepository()
    : hasValidSupabase
    ? new SupabaseRepository(supabaseUrl!, supabaseAnonKey!)
    : (new MockRepository()); // Note: isSupabaseConfigMissing will halt UI rendering in App.tsx

export * from './repo';
