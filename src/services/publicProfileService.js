import { supabase } from './supabase';

export async function getPublicProfileData(userId) {
  if (!userId) {
    return null;
  }

  try {
    // ---------------------------------------------------------
    // 1. PERFIL
    // ---------------------------------------------------------
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, name, avatar_url, position, favorite_team, bio, instagram_handle, preferred_position, is_public'
      )
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.is_public === false) {
      return null;
    }

    // ---------------------------------------------------------
    // 2. JOGADORES
    // ---------------------------------------------------------
    const { data: playerRows, error: playersError } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', userId);

    if (playersError) {
      console.error('[getPublicProfileData] players:', playersError);
    }

    const players = playerRows || [];
    const playerIds = players.map((player) => player.id);

    // ---------------------------------------------------------
    // PERFIL SEM JOGADOR VINCULADO
    // ---------------------------------------------------------
    if (playerIds.length === 0) {
      return {
        profile,
        stats: {
          goals: 0,
          assists: 0,
          matches: 0,
          rating: 0,
          babaCount: 0,
        },
        streak: 0,
        earnedBadges: [],
        followers: 0,
      };
    }

    // ---------------------------------------------------------
    // 3. ESTATÍSTICAS DE PARTIDAS
    // ---------------------------------------------------------
    const { data: matchPlayers, error: matchPlayersError } = await supabase
      .from('match_players')
      .select('goals, assists')
      .in('player_id', playerIds);

    if (matchPlayersError) {
      console.error(
        '[getPublicProfileData] match_players:',
        matchPlayersError
      );
    }

    const mp = matchPlayers || [];

    const goals = mp.reduce(
      (sum, row) => sum + (row.goals || 0),
      0
    );

    const assists = mp.reduce(
      (sum, row) => sum + (row.assists || 0),
      0
    );

    const matches = mp.length;

    // ---------------------------------------------------------
    // 4. AVALIAÇÕES
    // ---------------------------------------------------------
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_rating_summary')
      .select('final_rating')
      .in('player_id', playerIds);

    if (ratingsError) {
      console.error(
        '[getPublicProfileData] player_rating_summary:',
        ratingsError
      );
    }

    const ratingValues = (ratings || [])
      .map((row) => Number(row.final_rating))
      .filter((value) => value > 0);

    const avgRating = ratingValues.length
      ? ratingValues.reduce((sum, value) => sum + value, 0) /
        ratingValues.length
      : 0;

    // ---------------------------------------------------------
    // 5. SEQUÊNCIA / STREAK
    // ---------------------------------------------------------
    const { data: confirmations, error: confirmationsError } =
      await supabase
        .from('game_confirmations')
        .select('game_date')
        .in('player_id', playerIds)
        .eq('status', 'confirmed')
        .order('game_date', { ascending: false })
        .limit(30);

    if (confirmationsError) {
      console.error(
        '[getPublicProfileData] game_confirmations:',
        confirmationsError
      );
    }

    const confs = confirmations || [];

    let streak = confs.length > 0 ? 1 : 0;

    for (let i = 1; i < confs.length; i++) {
      const previous = new Date(confs[i - 1].game_date);
      const current = new Date(confs[i].game_date);

      const diffDays =
        (previous - current) / (1000 * 60 * 60 * 24);

      if (diffDays <= 14) {
        streak++;
      } else {
        break;
      }
    }

    // ---------------------------------------------------------
    // 6. BADGES
    // ---------------------------------------------------------
    const { data: badges, error: badgesError } = await supabase
      .from('player_badges')
      .select(
        'badge_id, earned_at, badge:badge_definitions(name, icon, rarity)'
      )
      .in('player_id', playerIds)
      .order('earned_at', { ascending: false });

    if (badgesError) {
      console.error(
        '[getPublicProfileData] player_badges:',
        badgesError
      );
    }

    // ---------------------------------------------------------
    // 7. SEGUIDORES
    // ---------------------------------------------------------
    const { count: followersCount, error: followersError } =
      await supabase
        .from('player_follows')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('followed_id', userId);

    if (followersError) {
      console.error(
        '[getPublicProfileData] player_follows:',
        followersError
      );
    }

    // ---------------------------------------------------------
    // RESULTADO FINAL
    // ---------------------------------------------------------
    return {
      profile,

      stats: {
        goals,
        assists,
        matches,
        rating: avgRating,
        babaCount: players.length,
      },

      streak,

      earnedBadges: badges || [],

      followers: followersCount || 0,
    };
  } catch (error) {
    console.error('[getPublicProfileData]', error);
    return null;
  }
}   ''