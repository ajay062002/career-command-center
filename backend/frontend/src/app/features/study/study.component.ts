import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface StudySession {
  id: string;
  topic: string;
  timeSpentMinutes: number;
  date: string;
  source: string;
  notes: string;
}

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Learning Modules</h1>
          <p class="page-subtitle">Track your structured growth and curriculum progress</p>
        </div>
        <div class="header-actions">
           <div class="stats-pill">
              <span class="label">Total Momentum</span>
              <span class="value">{{ totalMinutes }}m</span>
           </div>
           <button class="btn-primary" (click)="toggleForm()">
             {{ showForm || editingSession ? '✕ Cancel' : '+ New Module' }}
           </button>
        </div>
      </div>

      <!-- Log / Edit Form -->
      @if (showForm || editingSession) {
        <div class="form-card animate-in">
          <h2 class="form-title">{{ editingSession ? 'Refine Learning Module' : 'Initialize New Module' }}</h2>
          <div class="form-grid">
            <div class="field">
              <label>Module / Topic *</label>
              <input [(ngModel)]="newSession.topic" placeholder="e.g. Distributed Systems" />
            </div>
            <div class="field">
              <label>Time Invested (mins) *</label>
              <input [(ngModel)]="newSession.timeSpentMinutes" type="number" placeholder="60" />
            </div>
            <div class="field">
              <label>Completion Date</label>
              <input [(ngModel)]="newSession.date" type="date" />
            </div>
            <div class="field">
              <label>Learning Resource</label>
              <input [(ngModel)]="newSession.source" placeholder="e.g. Coursera, O'Reilly" />
            </div>
            <div class="field full-width">
              <label>Critical Takeaways</label>
              <textarea [(ngModel)]="newSession.notes" placeholder="Synthesize what you learned..." rows="3"></textarea>
            </div>
          </div>
          <div class="form-footer">
            @if (formError) { <span class="error-msg">{{ formError }}</span> }
            <button class="btn-save" (click)="saveSession()" [disabled]="saving">
              {{ saving ? 'Syncing...' : (editingSession ? 'Update Module' : 'Validate & Log') }}
            </button>
          </div>
        </div>
      }

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Decrypting learning data...</p>
        </div>
      } @else if (sessions.length === 0) {
        <div class="state-container empty">
           <span class="icon">🚀</span>
           <p>Your curriculum is empty. Start your first module today!</p>
        </div>
      } @else {
        <div class="table-container animate-in">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Resource</th>
                <th>Takeaways</th>
                <th class="actions-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of sessions; track s.id) {
                <tr>
                  <td>
                    <span class="topic-tag">{{ s.topic }}</span>
                  </td>
                  <td>
                    <span class="time-text">{{ s.timeSpentMinutes }}m</span>
                  </td>
                  <td class="date-cell">
                    <span class="date-text">{{ s.date | date:'MMM dd, yyyy' }}</span>
                  </td>
                  <td>
                    <span class="source-text">{{ s.source || 'Personal Study' }}</span>
                  </td>
                  <td class="notes-cell">
                    <p class="notes-preview" [title]="s.notes">{{ s.notes || '—' }}</p>
                  </td>
                  <td class="actions-cell">
                    <button class="btn-icon" (click)="editSession(s)" title="Edit Module">
                      <span class="material-symbols-rounded">edit</span>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 40px; }
    .page-title { font-family: 'Outfit', sans-serif; font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
    .page-subtitle { color: #64748b; font-size: 1rem; margin: 4px 0 0 0; font-weight: 500; }
    
    .header-actions { display: flex; align-items: center; gap: 24px; }
    
    .stats-pill {
      display: flex; flex-direction: column; align-items: flex-end;
      background: white; padding: 10px 20px; border-radius: 16px; border: 1px solid #e2e8f0;
    }
    .stats-pill .label { font-size: 0.625rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .stats-pill .value { font-size: 1.25rem; font-weight: 800; color: #10b981; font-family: 'Outfit', sans-serif; }

    .btn-primary {
      background: #0f172a; color: white; border: none; padding: 14px 28px;
      border-radius: 14px; font-weight: 700; font-size: 0.875rem; cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
    }
    .btn-primary:hover { background: #1e293b; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2); }

    .form-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 28px;
      padding: 40px; margin-bottom: 40px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);
      border-top: 6px solid #6366f1;
    }
    .form-title { font-family: 'Outfit', sans-serif; font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 32px; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
    .full-width { grid-column: 1 / -1; }
    
    .field { display: flex; flex-direction: column; gap: 8px; }
    .field label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
    .field input, .field textarea {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 14px 18px; font-size: 0.9375rem; color: #1e293b; outline: none; transition: all 0.2s;
    }
    .field input:focus, .field textarea:focus { background: white; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.05); }

    .form-footer { display: flex; justify-content: flex-end; align-items: center; gap: 24px; margin-top: 32px; }
    .btn-save {
      background: #0f172a; color: white; border: none; padding: 14px 32px;
      border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s;
    }
    .error-msg { color: #dc2626; font-size: 0.8125rem; font-weight: 600; }

    .table-container {
      background: white; border: 1px solid #f1f5f9; border-radius: 24px;
      overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .premium-table { width: 100%; border-collapse: collapse; }
    .premium-table th {
      background: #f8fafc; padding: 16px 24px; text-align: left;
      font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;
      letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9;
    }
    .premium-table td { padding: 16px 24px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .premium-table tr:last-child td { border-bottom: none; }
    .premium-table tr:hover { background: #fcfdfe; }

    .topic-tag {
      font-size: 0.8125rem; font-weight: 800; color: #6366f1; background: #eef2ff;
      padding: 6px 14px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .time-text { font-weight: 700; color: #10b981; font-family: 'Outfit', sans-serif; }
    .date-text { font-size: 0.875rem; color: #475569; font-weight: 600; }
    .source-text { font-size: 0.875rem; color: #64748b; font-weight: 600; }
    
    .notes-cell { max-width: 400px; }
    .notes-preview {
      font-size: 0.8125rem; color: #64748b; margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
    }

    .actions-cell { width: 80px; text-align: center; }
    .btn-icon {
      width: 40px; height: 40px; border-radius: 10px; border: 1px solid #e2e8f0;
      background: white; color: #64748b; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .btn-icon:hover { border-color: #6366f1; color: #6366f1; background: #f5f3ff; }

    .state-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px 0; gap: 24px; color: #94a3b8; font-weight: 600;
      background: white; border-radius: 32px; border: 2px dashed #e2e8f0;
    }

    .animate-in { animation: slideUp 0.4s ease-out; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class StudyComponent implements OnInit {
  sessions: StudySession[] = [];
  totalMinutes = 0;
  loading = true;
  showForm = false;
  saving = false;
  editingSession: StudySession | null = null;
  formError: string | null = null;

  newSession: Partial<StudySession> = {
    topic: '', timeSpentMinutes: undefined,
    date: new Date().toISOString().split('T')[0],
    source: '', notes: ''
  };

  private api = environment.apiBaseUrl;
  constructor(private http: HttpClient) { }

  ngOnInit() { this.loadSessions(); }

  loadSessions() {
    this.loading = true;
    this.http.get<StudySession[]>(`${this.api}/study`).subscribe({
      next: data => {
        this.sessions = data.sort((a, b) => b.date.localeCompare(a.date));
        this.calcTotalMinutes();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  calcTotalMinutes() {
    this.totalMinutes = this.sessions.reduce((sum, s) => sum + (s.timeSpentMinutes || 0), 0);
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.editingSession = null;
    this.resetForm();
  }

  resetForm() {
    this.newSession = {
      topic: '', timeSpentMinutes: undefined,
      date: new Date().toISOString().split('T')[0],
      source: '', notes: ''
    };
    this.formError = null;
  }

  editSession(session: StudySession) {
    this.editingSession = session;
    this.showForm = false;
    this.newSession = { ...session };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveSession() {
    if (!this.newSession.topic || !this.newSession.timeSpentMinutes) {
      this.formError = 'Topic and time spent are required.';
      return;
    }
    this.formError = null;
    this.saving = true;

    if (this.editingSession) {
      this.http.put<StudySession>(`${this.api}/study/${this.editingSession.id}`, this.newSession).subscribe({
        next: updated => {
          const index = this.sessions.findIndex(s => s.id === updated.id);
          this.sessions[index] = updated;
          this.finalizeSave();
        },
        error: () => { this.formError = 'Failed to update session.'; this.saving = false; }
      });
    } else {
      this.http.post<StudySession>(`${this.api}/study`, this.newSession).subscribe({
        next: created => {
          this.sessions.unshift(created);
          this.finalizeSave();
        },
        error: () => { this.formError = 'Failed to log session.'; this.saving = false; }
      });
    }
  }

  finalizeSave() {
    this.calcTotalMinutes();
    this.showForm = false;
    this.editingSession = null;
    this.saving = false;
    this.resetForm();
  }
}
