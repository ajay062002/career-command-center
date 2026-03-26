export enum WorkMode {
    REMOTE = 'REMOTE',
    HYBRID = 'HYBRID',
    ONSITE = 'ONSITE'
}

export enum JobStatus {
    APPLIED = 'APPLIED',
    RTR_SENT = 'RTR_SENT',
    RTR_PENDING = 'RTR_PENDING',
    SUBMITTED = 'SUBMITTED',
    INTERVIEWING = 'INTERVIEWING',
    OFFER = 'OFFER',
    REJECTED = 'REJECTED',
    ON_HOLD = 'ON_HOLD'
}

export interface Job {
    id?: string;
    jobTitle: string;
    companyName: string;
    vendorCompany?: string;
    vendorContactName?: string;
    vendorContactEmail?: string;
    location?: string;
    workMode: WorkMode;
    status: JobStatus;
    appliedDate?: string;
    notes?: string;
}

export interface JobPage {
    content: Job[];
    totalElements: number;
    size: number;
    number: number;
}
