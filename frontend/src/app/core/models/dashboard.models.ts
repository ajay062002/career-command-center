export interface DashboardSummary {
    totalJobs: number;
    activeSubmissions: number;
    rtrPending: number;
    offers: number;
    rejected: number;
    studyMinutesThisWeek: number;
    overdueReminders: number;
    totalUsers?: number;
    totalVendors: number;
    submissionRate: number;
    interviewConversions: number;
}

export interface JobStatusCount {
    status: string;
    count: number;
}

export interface StudyTrend {
    date: string;
    totalMinutes: number;
}

export interface RtrTimelineEntry {
    date: string;
    rtrs: number;
    submissions: number;
}

export interface VendorPerformance {
    vendorCompany: string;
    totalSubmissions: number;
    totalRtrs: number;
    interviewsOrOffers: number;
}
