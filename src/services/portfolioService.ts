import { supabase } from '../lib/supabase';

export interface Portfolio {
  id: string;
  user_id: string;
  organization_id?: string | null;
  client_id?: string | null;
  name: string;
  description?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  property_count?: number;
}

export interface Client {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const portfolioService = {
  async getUserDefaultPortfolio(): Promise<Portfolio | null> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;

    const { data, error } = await supabase.rpc('get_user_default_portfolio', {
      p_user_id: user.id,
    });

    if (error) throw error;

    if (data) {
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', data)
        .single();

      if (portfolioError) throw portfolioError;
      return portfolio;
    }

    return null;
  },

  async getUserPortfolios(): Promise<Portfolio[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await supabase.rpc('get_user_portfolios', {
      p_user_id: user.id,
    });

    if (error) throw error;
    return data || [];
  },

  async getPortfolioById(portfolioId: string): Promise<Portfolio | null> {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single();

    if (error) throw error;
    return data;
  },

  async createPortfolio(portfolio: Partial<Portfolio>): Promise<Portfolio> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        ...portfolio,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePortfolio(portfolioId: string, updates: Partial<Portfolio>): Promise<Portfolio> {
    const { data, error } = await supabase
      .from('portfolios')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePortfolio(portfolioId: string): Promise<void> {
    const portfolio = await this.getPortfolioById(portfolioId);

    if (portfolio?.is_default) {
      throw new Error('Cannot delete default portfolio');
    }

    const { error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolioId);

    if (error) throw error;
  },

  async userNeedsOrganization(): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { data, error } = await supabase.rpc('user_needs_organization', {
      p_user_id: user.id,
    });

    if (error) return false;
    return data || false;
  },

  async getClients(organizationId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async createClient(organizationId: string, client: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...client,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getClientPortfolios(clientId: string): Promise<Portfolio[]> {
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createClientPortfolio(
    clientId: string,
    organizationId: string,
    portfolioName: string
  ): Promise<Portfolio> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        client_id: clientId,
        name: portfolioName,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
