import { supabase } from "@/integrations/supabase/client";

export interface MCCHierarchyRecord {
  customer_id: string;
  login_customer_id: string | null;
  is_manager: boolean;
  account_name: string;
  requires_login_customer_id: boolean;
}

export interface MCCDetectionResult {
  success: boolean;
  hierarchy_detected: boolean;
  total_accounts: number;
  recommendations: Record<string, MCCHierarchyRecord>;
  last_updated: string;
  error?: string;
}

export interface LoginCustomerIdResult {
  success: boolean;
  customer_id: string;
  login_customer_id: string | null;
  requires_login_customer_id: boolean;
  account_info: any;
  detection_method: 'hierarchy_table' | 'dynamic_detection';
  error?: string;
}

/**
 * Triggers MCC hierarchy detection for the current user.
 * This will scan all accessible Google Ads accounts and build the MCC relationship map.
 */
export async function detectMCCHierarchy(): Promise<MCCDetectionResult> {
  try {
    console.log('🔍 Triggering MCC hierarchy detection...');
    
    const { data, error } = await supabase.functions.invoke('detect-mcc-hierarchy', {
      body: {}
    });

    if (error) {
      console.error('❌ MCC hierarchy detection error:', error);
      throw new Error(error.message || 'Failed to detect MCC hierarchy');
    }

    console.log('✅ MCC hierarchy detection result:', data);
    return data;
  } catch (error) {
    console.error('❌ MCC hierarchy detection failed:', error);
    return {
      success: false,
      hierarchy_detected: false,
      total_accounts: 0,
      recommendations: {},
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets the correct login-customer-id for a specific customer ID.
 * Uses cached hierarchy data if available, otherwise performs dynamic detection.
 */
export async function getLoginCustomerId(customerId: string): Promise<LoginCustomerIdResult> {
  try {
    console.log('🔍 Getting login-customer-id for:', customerId);
    
    const { data, error } = await supabase.functions.invoke('get-login-customer-id', {
      body: { customerId }
    });

    if (error) {
      console.error('❌ Login customer ID detection error:', error);
      throw new Error(error.message || 'Failed to get login customer ID');
    }

    console.log('✅ Login customer ID result:', data);
    return data;
  } catch (error) {
    console.error('❌ Login customer ID detection failed:', error);
    return {
      success: false,
      customer_id: customerId,
      login_customer_id: null,
      requires_login_customer_id: false,
      account_info: null,
      detection_method: 'dynamic_detection',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets the current MCC hierarchy from the database for the authenticated user.
 */
export async function getMCCHierarchy() {
  try {
    const { data, error } = await supabase
      .from('google_ads_mcc_hierarchy')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.error('❌ Error fetching MCC hierarchy:', error);
      throw new Error(error.message);
    }

    console.log('✅ Retrieved MCC hierarchy:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to get MCC hierarchy:', error);
    return [];
  }
}

/**
 * Clears the cached MCC hierarchy for the current user.
 * Useful when you want to force a fresh detection.
 */
export async function clearMCCHierarchy() {
  try {
    const { error } = await supabase
      .from('google_ads_mcc_hierarchy')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all user's records

    if (error) {
      console.error('❌ Error clearing MCC hierarchy:', error);
      throw new Error(error.message);
    }

    console.log('✅ Cleared MCC hierarchy cache');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear MCC hierarchy:', error);
    return false;
  }
}

/**
 * Checks if MCC hierarchy has been detected for the current user.
 */
export async function hasMCCHierarchy(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('google_ads_mcc_hierarchy')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error checking MCC hierarchy:', error);
      return false;
    }

    return (count || 0) > 0;
  } catch (error) {
    console.error('❌ Failed to check MCC hierarchy:', error);
    return false;
  }
}