export enum SubmissionStatus {
    SUBMITTED = 'SUBMITTED',
    SCREENING = 'SCREENING',
    INTERVIEW = 'INTERVIEW',
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
    REJECTED = 'REJECTED',
    WITHDRAWN = 'WITHDRAWN'
}

export interface Submission {
    id?: string;
    jobId?: string;
    submissionStatus: SubmissionStatus;
    submissionDate?: string;
    submittedByVendor?: string;
    rateSubmitted?: string;
    followUpDate?: string;
    notes?: string;
}

export interface VendorGroup {
    vendorName: string;
    submissions: Submission[];
}
