export enum ReminderType {
    FOLLOW_UP = 'FOLLOW_UP',
    RTR_EXPIRY = 'RTR_EXPIRY',
    INTERVIEW = 'INTERVIEW',
    CUSTOM = 'CUSTOM'
}

export interface Reminder {
    id?: string;
    jobId?: string | null;
    type: ReminderType;
    title: string;
    dueDate: string;
    completed?: boolean;
    notes?: string;
}
