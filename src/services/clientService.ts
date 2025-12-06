import { supabase } from '../lib/supabase';

export interface Client {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientWithPortfolios extends Client {
  portfolios: Array<{
    id: string;
    name: string;
    property_count: number;
  }>;
}

export const clientService = {
  async getClients(organizationId: string): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('last_name', { ascending: true });

    if (error) throw error;
    return data as Client[];
  },

  async getClientById(id: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Client;
  },

  async getClientWithPortfolios(clientId: string): Promise<ClientWithPortfolios> {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;

    const { data: portfolios, error: portfolioError } = await supabase
      .from('portfolios')
      .select(`
        id,
        name,
        properties:properties(count)
      `)
      .eq('client_id', clientId);

    if (portfolioError) throw portfolioError;

    return {
      ...client,
      portfolios: (portfolios || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        property_count: p.properties?.[0]?.count || 0,
      })),
    } as ClientWithPortfolios;
  },

  async createClient(organizationId: string, data: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company_name?: string;
    notes?: string;
  }): Promise<Client> {
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        company_name: data.company_name,
        notes: data.notes,
      })
      .select()
      .single();

    if (error) throw error;
    return client as Client;
  },

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Client;
  },

  async deactivateClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async createPortfolioForClient(clientId: string, userId: string, organizationId: string, name: string): Promise<any> {
    const { data, error } = await supabase
      .from('portfolios')
      .insert({
        client_id: clientId,
        user_id: userId,
        organization_id: organizationId,
        name: name,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPortfoliosForClient(clientId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('portfolios')
      .select(`
        id,
        name,
        description,
        created_at,
        properties:properties(count)
      `)
      .eq('client_id', clientId);

    if (error) throw error;
    return data || [];
  },
};
