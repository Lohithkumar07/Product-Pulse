export type Sentiment = 'positive' | 'neutral' | 'negative';
export type Priority = 'high' | 'medium' | 'low';
export type DecisionStatus = 'New' | 'Reviewing' | 'Planned' | 'In Progress' | 'Completed' | 'Rejected';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  created_at?: string;
}

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  row_count: number;
  analysis_status: string;
  created_at: string;
  uploaded_at: string;
}

export interface FeedbackItem {
  id: string;
  dataset_id?: string;
  product_id?: string;
  content: string;
  rating: number;
  source: string;
  date: string;
  sentiment: Sentiment;
  sentiment_score: number;
  sentiment_confidence: number;
  topic: string;
  priority: Priority;
  issue_group?: string;
  ai_summary?: string;
  detected_problem?: string;
  possible_cause?: string;
  user_impact?: string;
  suggested_action?: string;
  created_at?: string;
}

export interface DecisionItem {
  id: string;
  dataset_id?: string;
  product_id?: string;
  title: string;
  affected_feature: string;
  priority: Priority;
  trend: 'increasing' | 'stable' | 'decreasing';
  supporting_feedback_count: number;
  suggested_action: string;
  status: DecisionStatus;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardOverview {
  total_feedback: number;
  positive_percentage: number;
  neutral_percentage: number;
  negative_percentage: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  high_priority_issues: number;
  trends: {
    total_change: string;
    positive_change: string;
    neutral_change: string;
    negative_change: string;
    high_priority_change: string;
  };
  ai_takeaway: string;
}

export interface SentimentBreakdown {
  breakdown: Array<{
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  total: number;
  ai_interpretation: string;
}

export interface TrendPoint {
  date: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface TopIssue {
  rank: number;
  issue_name: string;
  topic: string;
  feedback_count: number;
  sentiment: string;
  priority: string;
  trend: string;
  negative_percentage: number;
}

export interface AISummary {
  overall_summary: string;
  positive_points: string[];
  negative_points: string[];
  top_problems: Array<{
    issue: string;
    count: number;
    severity: string;
    details: string;
  }>;
  emerging_trends: string[];
  recommended_actions: string[];
}

export interface ReportItem {
  id: string;
  product_id: string;
  title: string;
  period: string;
  created_at: string;
  report: {
    product_name: string;
    analysis_period: string;
    generated_at: string;
    metrics: {
      total_feedback: number;
      average_rating: number;
      positive_percentage: number;
      neutral_percentage: number;
      negative_percentage: number;
      high_priority_issues: number;
    };
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    top_topics: Array<{ name: string; count: number; percentage: number }>;
    ai_summary: AISummary;
    product_decisions: DecisionItem[];
  };
}

export interface ImportResult {
  dataset_id: string;
  name?: string;
  filename?: string;
  total_rows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  detected_columns: Record<string, string | null>;
  topics_detected?: string[];
  preview_imported?: FeedbackItem[];
}
