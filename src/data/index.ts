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
// If in production without credentials, export an error-throwing stub so mock data
// can never be silently used. App.tsx halts rendering via isSupabaseConfigMissing.
function createMissingConfigStub(): Repository {
  return new Proxy(
    { isMock: false },
    {
      get(target, prop) {
        if (prop === 'isMock') return false;
        return () => {
          throw new Error(
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or run with VITE_APP_MODE=demo.'
          );
        };
      },
    }
  ) as Repository;
}

export const repo: Repository =
  IS_DEMO_MODE
    ? new MockRepository()
    : hasValidSupabase
    ? new SupabaseRepository(supabaseUrl!, supabaseAnonKey!)
    : createMissingConfigStub();

export * from './repo';
