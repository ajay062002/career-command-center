import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface Reminder {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  completed: boolean;
  notes: string;
  jobId?: string;
}

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Personal Agenda</h1>
          <p class="page-subtitle">Manage follow-ups and custom task reminders</p>
        </div>
        <div class="header-actions">
           <span class="active-tasks-badge">{{ activeRemindersCount }} Active Tasks</span>
           <button class="btn-primary" (click)="showForm = !showForm">
             {{ showForm ? '✕ Close' : '+ New Reminder' }}
           </button>
        </div>
      </div>

      <!-- Add Reminder Form -->
      @if (showForm) {
        <div class="form-card highlight">
          <h2 class="form-title">Create Manual Reminder</h2>
          <div class="form-grid">
            <div class="field full-width">
              <label>Reminder Title *</label>
              <input [(ngModel)]="newReminder.title" placeholder="e.g., Call recruiter for status update" />
            </div>
            <div class="field">
              <label>Reminder Type</label>
              <select [(ngModel)]="newReminder.type">
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="TASK">Task</option>
                <option value="STUDY">Study Session</option>
                <option value="INTERVIEW">Interview Prep</option>
              </select>
            </div>
            <div class="field">
              <label>Due Date *</label>
              <input [(ngModel)]="newReminder.dueDate" type="date" />
            </div>
            <div class="field full-width">
              <label>Context / Notes</label>
              <textarea [(ngModel)]="newReminder.notes" placeholder="Extra details..." rows="2"></textarea>
            </div>
          </div>
          <div class="form-footer">
            @if (formError) { <span class="error-msg">{{ formError }}</span> }
            <button class="btn-save" (click)="addReminder()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Set Reminder' }}
            </button>
          </div>
        </div>
      }

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Syncing your schedule...</p>
        </div>
      } @else if (reminders.length === 0) {
        <div class="state-container empty">
           <span class="icon">📅</span>
           <p>Your agenda is clear! No active reminders.</p>
        </div>
      } @else {
        <div class="reminders-list">
          @for (r of sortedReminders; track r.id) {
            <div class="reminder-item" [class.completed]="r.completed" [class.overdue]="isOverdue(r)">
              <div class="check-box" (click)="toggleComplete(r)">
                @if (r.completed) {
                  <span class="check-icon">✓</span>
                }
              </div>
              
              <div class="reminder-content">
                <div class="reminder-main">
                  <h3 class="reminder-title">{{ r.title }}</h3>
                  <div class="reminder-meta">
                    <span class="type-tag" [class]="r.type.toLowerCase()">{{ r.type.replace('_', ' ') }}</span>
                    <span class="date-tag" [class.warning]="isOverdue(r)">
                      📅 {{ r.dueDate | date:'MMM dd, yyyy' }}
                      @if (isOverdue(r) && !r.completed) {
                        <span class="overdue-label">OVERDUE</span>
                      }
                    </span>
                  </div>
                </div>
                @if (r.notes) {
                  <p class="reminder-notes">{{ r.notes }}</p>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
    .page-title { font-size: 1.875rem; font-weight: 800; color: #0f172a; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 0.9375rem; margin: 4px 0 0 0; font-weight: 500; }
    
    .active-tasks-badge {
      font-size: 0.8125rem; font-weight: 700; color: #7c3aed; background: #f5f3ff;
      padding: 8px 16px; border-radius: 99px; border: 1px solid #ddd6fe;
    }

    .btn-primary {
      background: #0f172a; color: white; border: none; padding: 10px 20px;
      border-radius: 12px; font-weight: 600; font-size: 0.875rem; cursor: pointer;
      transition: all 0.2s;
    }

    .form-card {
      background: white; border: 1px solid #e2e8f0; border-radius: 24px;
      padding: 32px; margin-bottom: 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
    }
    .form-card.highlight { border-top: 4px solid #7c3aed; }
    .form-title { font-size: 1.125rem; font-weight: 800; color: #0f172a; margin-bottom: 24px; }

    .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
    .full-width { grid-column: 1 / -1; }
    
    .field { display: flex; flex-direction: column; gap: 8px; }
    .field label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .field input, .field textarea, .field select {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 12px 16px; font-size: 0.9375rem; color: #1e293b; outline: none; transition: all 0.2s;
    }
    .field input:focus, .field textarea:focus, .field select:focus { background: white; border-color: #7c3aed; box-shadow: 0 0 0 4px rgba(124,58,237,0.05); }

    .form-footer { display: flex; justify-content: flex-end; align-items: center; gap: 20px; margin-top: 24px; }
    .btn-save {
      background: #7c3aed; color: white; border: none; padding: 12px 28px;
      border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }

    .state-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px 0; gap: 20px; color: #64748b; font-weight: 500;
      background: white; border-radius: 24px; border: 1px dashed #e2e8f0;
    }

    .reminders-list { display: flex; flex-direction: column; gap: 12px; }

    .reminder-item {
      background: white; border: 1px solid #f1f5f9; border-radius: 20px;
      padding: 24px; display: flex; align-items: flex-start; gap: 20px;
      transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .reminder-item:hover { transform: translateX(8px); border-color: #ddd6fe; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .reminder-item.completed { opacity: 0.6; }
    .reminder-item.overdue:not(.completed) { border-left: 6px solid #ef4444; }

    .check-box {
      width: 28px; height: 28px; border-radius: 8px; border: 2px solid #e2e8f0;
      cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; margin-top: 2px;
    }
    .reminder-item.completed .check-box { background: #10b981; border-color: #10b981; }
    .check-icon { color: white; font-size: 16px; font-weight: 900; }

    .reminder-main { display: flex; flex-direction: column; gap: 12px; }
    .reminder-title { font-size: 1.0625rem; font-weight: 700; color: #1e293b; margin: 0; }
    .reminder-item.completed .reminder-title { text-decoration: line-through; }

    .reminder-meta { display: flex; gap: 16px; align-items: center; }
    .type-tag {
      font-size: 0.6875rem; font-weight: 800; color: #64748b; text-transform: uppercase;
      background: #f1f5f9; padding: 4px 10px; border-radius: 6px;
    }
    .type-tag.follow_up { color: #2563eb; background: #eff6ff; }
    .type-tag.interview { color: #db2777; background: #fdf2f8; }
    .type-tag.task { color: #b45309; background: #fffbeb; }

    .date-tag { font-size: 0.875rem; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 6px; }
    .date-tag.warning { color: #ef4444; }
    .overdue-label { background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.625rem; font-weight: 800; }

    .reminder-notes { margin: 16px 0 0 0; font-size: 0.9375rem; color: #64748b; line-height: 1.6; padding: 12px; background: #f8fafc; border-radius: 12px; }
  `]
})
export class RemindersComponent implements OnInit {
  reminders: Reminder[] = [];
  loading = true;
  showForm = false;
  saving = false;
  formError = '';

  newReminder: Partial<Reminder> = {
    title: '',
    type: 'FOLLOW_UP',
    dueDate: new Date().toISOString().split('T')[0],
    notes: '',
    completed: false
  };

  private api = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.fetchReminders();
  }

  fetchReminders() {
    this.loading = true;
    this.http.get<Reminder[]>(`${this.api}/reminders`).subscribe({
      next: (res) => {
        this.reminders = res;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  addReminder() {
    if (!this.newReminder.title || !this.newReminder.dueDate) {
      this.formError = 'Title and due date are required';
      return;
    }
    this.saving = true;
    this.http.post<Reminder>(`${this.api}/reminders`, this.newReminder).subscribe({
      next: (res) => {
        this.reminders.push(res);
        this.showForm = false;
        this.saving = false;
        this.newReminder = {
          title: '',
          type: 'FOLLOW_UP',
          dueDate: new Date().toISOString().split('T')[0],
          notes: '',
          completed: false
        };
      },
      error: () => {
        this.saving = false;
        this.formError = 'Failed to save reminder';
      }
    });
  }

  get sortedReminders() {
    return [...this.reminders].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }

  get activeRemindersCount() {
    return this.reminders.filter(r => !r.completed).length;
  }

  isOverdue(r: Reminder) {
    const due = new Date(r.dueDate);
    due.setHours(23, 59, 59, 999);
    return due < new Date();
  }

  toggleComplete(r: Reminder) {
    if (r.completed) return;
    this.http.put(`${this.api}/reminders/${r.id}/complete`, {}).subscribe({
      next: () => {
        r.completed = true;
      }
    });
  }
}
