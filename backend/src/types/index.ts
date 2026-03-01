import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Olostep
export interface OlostepResponse {
  html: string;
  url: string;
  responseTimeMs: number;
  creditsUsed?: number;
}

export interface HtmlQualityResult {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendation: 'proceed_with_analysis' | 'rescrape' | 'manual_review';
  confidence: number;
}

// GEO Scoring
export interface GeoScoreResult {
  overallScore: number;
  industryBenchmark: number;
  scrapeQuality: string;
  attributes: {
    extractability: AttributeScore;
    entityClarity: AttributeScore;
    specificity: AttributeScore;
    corroboration: AttributeScore;
    coverage: AttributeScore;
    freshness: AttributeScore;
    indexability: AttributeScore;
    machineReadability: AttributeScore;
  };
  priorityActions: string[];
}

export interface AttributeScore {
  score: number;
  justification: string;
  examples: string[];
  improvements: string[];
}

// Job types for BullMQ
export interface AnalysisJobData {
  analysisId: string;
  companyId: string;
  userId: string;
}

export interface ScrapeJobData {
  analysisId: string;
  url: string;
  type: 'CUSTOMER_SITE' | 'COMPETITOR_SITE';
  scrapeJobId: string;
}

export interface ScoreJobData {
  analysisId: string;
  scrapeJobId: string;
}

export interface ContentJobData {
  analysisId: string;
  companyId: string;
}
