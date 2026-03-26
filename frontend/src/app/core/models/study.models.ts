export interface StudySession {
    id?: string;
    date: string;
    topic: string;
    subTopic?: string;
    timeSpentMinutes: number;
    source?: string;
    difficulty?: number;
    confidence?: number;
    notes?: string;
}
