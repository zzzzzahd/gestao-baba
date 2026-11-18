// supabase/functions/delete-account/index.ts
// Edge Function: excluir conta do usuário com anonimização LGPD.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validar JWT do chamante
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar body
    const body = await req.json().catch(() => ({}));
    const { user_id } = body;

    if (!user_id || typeof user_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'user_id obrigatório no body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usuário só pode deletar a própria conta
    if (user_id !== caller.id) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar players do usuário
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('user_id', user_id);

    const playerIds = (players || []).map((p: { id: string }) => p.id);

    // Remover push subscriptions
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user_id);

    if (playerIds.length > 0) {
      // Avaliações dadas pelo usuário
      await supabaseAdmin.from('player_ratings').delete().in('rater_id', playerIds);

      // Confirmações futuras
      const today = new Date().toISOString().split('T')[0];
      await supabaseAdmin
        .from('game_confirmations')
        .delete()
        .in('player_id', playerIds)
        .gte('game_date', today);

      // Anonimizar players (mantém histórico)
      await supabaseAdmin
        .from('players')
        .update({ display_name: 'Jogador Removido', avatar_url: null, user_id: null, position: null })
        .in('id', playerIds);
    }

    // Anonimizar perfil
    await supabaseAdmin
      .from('profiles')
      .update({ name: 'Usuário Removido', email: null, avatar_url: null, position: null, consent_at: null })
      .eq('id', user_id);

    // Registrar no audit_log
    await supabaseAdmin.from('audit_log').insert({
      user_id,
      action:     'delete_account',
      table_name: 'auth.users',
      record_id:  user_id,
      new_data:   { reason: 'user_requested', lgpd_art: 'Art. 18, VI' },
    });

    // Deletar conta do Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('[delete-account] deleteUser error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir conta', detail: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[delete-account] Conta ${user_id} excluída com sucesso.`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[delete-account] Erro:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
