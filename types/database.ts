// Auto-generated types will replace this file after: npx supabase gen types typescript --project-id <ref> > types/database.ts
// For now, define the minimum needed for TypeScript to compile

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: { Row: UserRow; Insert: Partial<UserRow>; Update: Partial<UserRow>; Relationships: [] }
      salesforce_sync_state: { Row: SalesforceSyncStateRow; Insert: Partial<SalesforceSyncStateRow>; Update: Partial<SalesforceSyncStateRow>; Relationships: [] }
      platform_themes: { Row: PlatformThemeRow; Insert: Partial<PlatformThemeRow>; Update: Partial<PlatformThemeRow>; Relationships: [] }
      campaigns: { Row: CampaignRow; Insert: Partial<CampaignRow>; Update: Partial<CampaignRow>; Relationships: [] }
      campaign_participants: { Row: CampaignParticipantRow; Insert: Partial<CampaignParticipantRow>; Update: Partial<CampaignParticipantRow>; Relationships: [] }
      teams: { Row: TeamRow; Insert: Partial<TeamRow>; Update: Partial<TeamRow>; Relationships: [] }
      scoring_rules: { Row: ScoringRuleRow; Insert: Partial<ScoringRuleRow>; Update: Partial<ScoringRuleRow>; Relationships: [] }
      scoring_rule_exceptions: { Row: ScoringRuleExceptionRow; Insert: Partial<ScoringRuleExceptionRow>; Update: Partial<ScoringRuleExceptionRow>; Relationships: [] }
      point_transactions: { Row: PointTransactionRow; Insert: Partial<PointTransactionRow>; Update: Partial<PointTransactionRow>; Relationships: [] }
      point_audit_logs: { Row: PointAuditLogRow; Insert: Partial<PointAuditLogRow>; Update: Partial<PointAuditLogRow>; Relationships: [] }
      levels: { Row: LevelRow; Insert: Partial<LevelRow>; Update: Partial<LevelRow>; Relationships: [] }
      bonuses: { Row: BonusRow; Insert: Partial<BonusRow>; Update: Partial<BonusRow>; Relationships: [] }
      user_bonuses: { Row: UserBonusRow; Insert: Partial<UserBonusRow>; Update: Partial<UserBonusRow>; Relationships: [] }
      feed_events: { Row: FeedEventRow; Insert: Partial<FeedEventRow>; Update: Partial<FeedEventRow>; Relationships: [] }
      celebration_events: { Row: CelebrationEventRow; Insert: Partial<CelebrationEventRow>; Update: Partial<CelebrationEventRow>; Relationships: [] }
      notifications: { Row: NotificationRow; Insert: Partial<NotificationRow>; Update: Partial<NotificationRow>; Relationships: [] }
    }
    Views: {
      campaign_rankings: { Row: CampaignRankingRow; Relationships: [] }
    }
    Functions: Record<string, never>
    Enums: {
      user_role: 'manager' | 'participant'
      user_function: 'internal_seller' | 'external_seller' | 'hunter' | 'manager' | 'auditor'
      user_status: 'active' | 'inactive'
      campaign_status: 'draft' | 'active' | 'closed'
      rule_applies_to: 'all' | 'internal_seller' | 'external_seller' | 'hunter'
      rule_category: 'goal' | 'activity' | 'behavior' | 'bonus' | 'penalty'
      rule_period: 'daily' | 'weekly' | 'monthly'
      transaction_origin: 'manual' | 'salesforce' | 'sap'
      transaction_status: 'active' | 'reversed'
      audit_action: 'created' | 'edited' | 'reversed'
      bonus_trigger: 'manual' | 'automatic'
      feed_event_type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_milestone' | 'ranking_change' | 'campaign_start' | 'campaign_end'
      notification_type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_warning' | 'ranking_up' | 'system'
    }
    CompositeTypes: Record<string, never>
  }
}

// Row types defined as type aliases (not interfaces) to satisfy Record<string, unknown> index signature
type UserRow = {
  id: string; name: string; email: string; avatar_url: string | null
  role: 'manager' | 'participant'; team_id: string | null
  function: 'internal_seller' | 'external_seller' | 'hunter' | 'manager' | 'auditor'
  status: 'active' | 'inactive'; created_at: string; updated_at: string
  sf_alias: string | null
}
type TeamRow = { id: string; name: string; color: string; created_at: string }
type CampaignRow = {
  id: string; name: string; slug: string; description: string | null; rules: string | null
  prizes: string | null; banner_url: string | null; theme: Json
  status: 'draft' | 'active' | 'closed'; starts_at: string | null; ends_at: string | null
  display_token: string; created_by: string; created_at: string; updated_at: string
}
type CampaignParticipantRow = {
  id: string; campaign_id: string; user_id: string; joined_at: string
  current_streak: number; longest_streak: number; last_activity_date: string | null
  photo_url: string | null
}
type ScoringRuleRow = {
  id: string; campaign_id: string; name: string; description: string | null; points: number
  applies_to: 'all' | 'internal_seller' | 'external_seller' | 'hunter'
  category: 'goal' | 'activity' | 'behavior' | 'bonus' | 'penalty'
  target_value: number | null; target_period: 'daily' | 'weekly' | 'monthly' | null
  is_active: boolean; created_at: string
  data_origin: 'manual' | 'salesforce'
  sf_soql: string | null
  sf_value_field: string | null
  sf_alias_field: string | null
  sf_frequency: '5min' | 'daily' | 'weekly' | null
  sf_run_time: string | null
  sf_run_day: number | null
}
type ScoringRuleExceptionRow = {
  id: string; scoring_rule_id: string; user_id: string; points_override: number; reason: string | null
}
type PointTransactionRow = {
  id: string; campaign_id: string; user_id: string; scoring_rule_id: string | null
  points: number; event_date: string; description: string | null; attachment_url: string | null
  origin: 'manual' | 'salesforce' | 'sap'; status: 'active' | 'reversed'
  import_batch_id: string | null; created_by: string; created_at: string
}
type PointAuditLogRow = {
  id: string; transaction_id: string; action: 'created' | 'edited' | 'reversed'
  changed_by: string; previous_points: number | null; new_points: number | null
  reason: string | null; created_at: string
}
type LevelRow = {
  id: string; campaign_id: string; name: string; min_points: number
  badge_icon: string; color: string; perks: Json; order: number
}
type BonusRow = {
  id: string; campaign_id: string; name: string; description: string | null
  points: number; badge_icon: string; trigger_type: 'manual' | 'automatic'
  trigger_config: Json; created_at: string
}
type UserBonusRow = {
  id: string; bonus_id: string; user_id: string; campaign_id: string
  awarded_at: string; awarded_by: string; transaction_id: string | null
}
type FeedEventRow = {
  id: string; campaign_id: string; user_id: string
  event_type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_milestone' | 'ranking_change' | 'campaign_start' | 'campaign_end'
  payload: Json; created_at: string
}
type CelebrationEventRow = {
  id: string; campaign_id: string; user_id: string; points: number
  rule_name: string | null; message: string | null; triggered_at: string
}
type NotificationRow = {
  id: string; user_id: string; campaign_id: string | null
  type: 'point_earned' | 'level_up' | 'bonus_earned' | 'streak_warning' | 'ranking_up' | 'system'
  title: string; body: string; read_at: string | null; created_at: string
}
export type SalesforceSyncStateRow = {
  scoring_rule_id: string; user_id: string
  last_value: number; last_synced_at: string
}
export type PlatformThemeRow = {
  id: string
  name: string
  subtitle: string
  bg_gradient: string
  primary_color: string
  accent_color: string
  is_active: boolean
  created_at: string
}

type CampaignRankingRow = {
  campaign_id: string; user_id: string; name: string; avatar_url: string | null
  function: string; team_name: string | null; team_color: string | null; team_id: string | null
  total_points: number; current_streak: number; longest_streak: number; position: number
}

// Convenience helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type UserProfile = Tables<'users'> & { teams: { name: string; color: string } | null }

export type CampaignRanking = {
  campaign_id: string; user_id: string; name: string; avatar_url: string | null
  function: string; team_name: string | null; team_color: string | null; team_id: string | null
  total_points: number; current_streak: number; longest_streak: number; position: number
}

export type CampaignTheme = {
  primary?: string; secondary?: string; accent?: string; dark?: string
  font_heading?: string; font_body?: string
  icons?: { points: string; streak: string; bonus: string; penalty: string; trophy: string }
}
