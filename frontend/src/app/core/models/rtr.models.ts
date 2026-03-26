export enum RTRStatus {
    RTR = 'RTR',
    SUBMITTED = 'Submitted',
    INTERVIEW = 'Interview',
    INTERVIEW_L2 = 'Interview L2',
    OFFER = 'Offer',
    REJECTED = 'Rejected',
    ON_HOLD = 'On Hold',
    WITHDRAWN = 'Withdrawn',
    NO_RESPONSE = 'No Response',
    CLIENT_REJECTED = 'Client Rejected',
}

export interface RTR {
    id?: string;
    jobId?: string;      // optional — standalone RTR
    date: string;
    vendorName: string;
    vendorCompany: string;
    clientName: string;
    vendorPhone?: string;
    vendorEmail?: string;
    rate: number | null;
    role: string;
    location: string;
    status: string;
}

export interface RtrVendorGroup {
    vendorName: string;
    rtrs: RTR[];
}
