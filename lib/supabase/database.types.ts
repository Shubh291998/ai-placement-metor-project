// lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          leetcode_username: string | null;
          codeforces_username: string | null;
          gfg_username: string | null;
          codechef_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          leetcode_username?: string | null;
          codeforces_username?: string | null;
          gfg_username?: string | null;
          codechef_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          leetcode_username?: string | null;
          codeforces_username?: string | null;
          gfg_username?: string | null;
          codechef_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      resumes: {
        Row: {
          id: string;
          user_id: string | null;
          file_url: string | null;
          raw_text: string | null;
          parsed_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          file_url?: string | null;
          raw_text?: string | null;
          parsed_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          file_url?: string | null;
          raw_text?: string | null;
          parsed_data?: Json;
          created_at?: string;
        };
      };
      job_descriptions: {
        Row: {
          id: string;
          user_id: string | null;
          raw_text: string | null;
          source_url: string | null;
          parsed_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          raw_text?: string | null;
          source_url?: string | null;
          parsed_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          raw_text?: string | null;
          source_url?: string | null;
          parsed_data?: Json;
          created_at?: string;
        };
      };
      gap_reports: {
        Row: {
          id: string;
          user_id: string | null;
          resume_id: string | null;
          jd_id: string | null;
          job_title: string;
          company: string | null;
          match_score: number;
          strengths: Json;
          gaps: Json;
          suggested_focus_areas: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          resume_id?: string | null;
          jd_id?: string | null;
          job_title: string;
          company?: string | null;
          match_score?: number;
          strengths?: Json;
          gaps?: Json;
          suggested_focus_areas?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          resume_id?: string | null;
          jd_id?: string | null;
          job_title?: string;
          company?: string | null;
          match_score?: number;
          strengths?: Json;
          gaps?: Json;
          suggested_focus_areas?: Json;
          created_at?: string;
        };
      };
      roadmaps: {
        Row: {
          id: string;
          report_id: string;
          user_id: string | null;
          target_role: string;
          estimated_weeks: number;
          weeks: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id?: string | null;
          target_role: string;
          estimated_weeks?: number;
          weeks?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string | null;
          target_role?: string;
          estimated_weeks?: number;
          weeks?: Json;
          created_at?: string;
        };
      };
      interview_sessions: {
        Row: {
          id: string;
          report_id: string;
          user_id: string | null;
          status: string;
          target_skills: Json;
          current_turn_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id?: string | null;
          status?: string;
          target_skills?: Json;
          current_turn_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string | null;
          status?: string;
          target_skills?: Json;
          current_turn_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      interview_turns: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          question: string;
          target_skill: string;
          difficulty: string;
          answer: string;
          feedback: string | null;
          score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_id: string;
          question: string;
          target_skill: string;
          difficulty: string;
          answer?: string;
          feedback?: string | null;
          score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_id?: string;
          question?: string;
          target_skill?: string;
          difficulty?: string;
          answer?: string;
          feedback?: string | null;
          score?: number | null;
          created_at?: string;
        };
      };
      tracker_stats: {
        Row: {
          id: string;
          user_id: string | null;
          platform: string;
          username: string;
          solved: number;
          rating: number | null;
          raw_data: Json;
          last_synced: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          platform: string;
          username: string;
          solved?: number;
          rating?: number | null;
          raw_data?: Json;
          last_synced?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          platform?: string;
          username?: string;
          solved?: number;
          rating?: number | null;
          raw_data?: Json;
          last_synced?: string;
        };
      };
      readiness_scores: {
        Row: {
          id: string;
          user_id: string | null;
          overall_score: number;
          resume_score: number;
          skill_gap_score: number;
          coding_score: number;
          interview_score: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          overall_score: number;
          resume_score?: number;
          skill_gap_score?: number;
          coding_score?: number;
          interview_score?: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          overall_score?: number;
          resume_score?: number;
          skill_gap_score?: number;
          coding_score?: number;
          interview_score?: number;
          recorded_at?: string;
        };
      };
      learning_resources: {
        Row: {
          id: string;
          topic: string;
          title: string;
          content: string;
          url: string | null;
          resource_type: string;
          embedding: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic: string;
          title: string;
          content: string;
          url?: string | null;
          resource_type?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          topic?: string;
          title?: string;
          content?: string;
          url?: string | null;
          resource_type?: string;
          embedding?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Functions: {
      match_learning_resources: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: string;
          topic: string;
          title: string;
          content: string;
          url: string;
          resource_type: "documentation" | "article" | "course" | "practice";
          similarity: number;
        }[];
      };
    };
  };
}
