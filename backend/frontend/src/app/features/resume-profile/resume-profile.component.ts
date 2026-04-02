import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../environments/environment';

interface ResumeContent {
  TITLE: string;
  TITLE2: string;
  SUMMARY: string[];
  TD: string[];
  CH: string[];
  TD_ENV: string;
  CH_ENV: string;
}

@Component({
  selector: 'app-resume-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Smart Apply Terminal</h1>
          <p class="page-subtitle">Instantly tailor applications and generate resumes from Job Descriptions</p>
        </div>
        <div class="header-actions">
           <!-- Actions handled within the terminal -->
        </div>
      </div>

      <!-- Smart Apply Section -->
      <div class="card smart-apply-card">
        <div class="card-header">
          <h2 class="card-title">🚀 Smart Apply Terminal</h2>
          <span class="badge info">Paste JD to Auto-Draft</span>
        </div>
        <div class="smart-grid">
          <div class="jd-input">
            <textarea [(ngModel)]="jdText" placeholder="Paste the full Job Description here..." rows="6"></textarea>
            <div class="jd-actions">
              <button class="btn-parse" (click)="parseJD()" [disabled]="parsing || !jdText">
                {{ parsing ? 'Scanning...' : 'Scan JD' }}
              </button>
            </div>
          </div>
          <div class="parsed-results" *ngIf="parsedData">
            <div class="result-item">
              <label>Target Role</label>
              <input [(ngModel)]="parsedData.role" />
            </div>
            <div class="result-item">
              <label>Recruiter Email</label>
              <input [(ngModel)]="parsedData.email" />
            </div>
            <div class="apply-actions">
              <button class="btn-draft" (click)="openDraft()">✉ Open Gmail Draft</button>
              <button class="btn-gen" (click)="generateFromProfile()" [disabled]="generating">
                {{ generating ? 'Generating...' : '📄 Generate Tailored Resume' }}
              </button>
            </div>
          </div>
        </div>
      </div>


      <div class="card json-card">
        <div class="card-header" (click)="showJsonEditor = !showJsonEditor" style="cursor: pointer;">
          <h2 class="card-title">📁 Master Profile Data (JSON)</h2>
          <span class="badge">{{ showJsonEditor ? '▼ Hide Editor' : '▲ Show Editor' }}</span>
        </div>
        <div class="json-editor-content" *ngIf="showJsonEditor">
          <p class="editor-help">Paste your updated resume JSON structure here to sync your master profile.</p>
          <textarea [(ngModel)]="jsonEditorContent" placeholder='{ "TITLE": "...", "SUMMARY": [...] }' rows="10"></textarea>
          <div class="json-actions">
            <button class="btn-sync" (click)="syncAndGenerate()" [disabled]="!jsonEditorContent || generating">
              {{ generating ? 'Generating...' : 'Update Profile & Generate Resume' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Follow-up Template Section -->
      <div class="card template-card">
        <div class="card-header">
          <h2 class="card-title">✉ Follow-up Template</h2>
          <button class="btn-save-sm" (click)="saveFollowupTemplate()">Save Template</button>
        </div>
        <textarea [(ngModel)]="followupTemplate" placeholder="Enter your custom follow-up message here..." rows="5"></textarea>
      </div>

      <!-- New Vendor Outreach Section -->
      <div class="card outreach-card">
        <div class="card-header">
          <h2 class="card-title">👤 New Vendor Outreach</h2>
        </div>
        <div class="outreach-grid">
          <div class="field">
            <label>Vendor Email</label>
            <input [(ngModel)]="vendorOutreach.email" placeholder="recruiter@agency.com" />
          </div>
          <div class="field">
            <label>Role</label>
            <input [(ngModel)]="vendorOutreach.role" placeholder="Java Developer" />
          </div>
          <button class="btn-heavy-draft" (click)="draftVendorMail()">Draft Outreach Email</button>
        </div>
      </div>

      @if (loading) {
        <div class="state-container">
          <mat-spinner diameter="32"></mat-spinner>
          <p>Loading automation services...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
    .page-title { font-size: 1.875rem; font-weight: 800; color: #0f172a; margin: 0; }
    .page-subtitle { color: #64748b; font-size: 0.9375rem; margin: 4px 0 0 0; font-weight: 500; }

    .btn-save {
      background: #6366f1; color: white; border: none; padding: 12px 28px;
      border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
    }
    .btn-save:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4); }
    .btn-save:disabled { background: #94a3b8; box-shadow: none; cursor: not-allowed; }

    .smart-apply-card { margin-bottom: 32px; border: 2px solid #6366f1; background: #f5f3ff; }
    .smart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    
    .jd-input { display: flex; flex-direction: column; gap: 12px; }
    .jd-input textarea {
      border-radius: 12px; border: 1px solid #c7d2fe; padding: 12px;
      font-size: 0.875rem; line-height: 1.5; background: white;
    }
    .jd-actions { display: flex; justify-content: flex-end; }
    .btn-parse {
      background: #6366f1; color: white; border: none; padding: 8px 20px;
      border-radius: 8px; font-weight: 700; cursor: pointer;
    }

    .parsed-results { background: white; border-radius: 12px; padding: 16px; border: 1px solid #c7d2fe; display: flex; flex-direction: column; gap: 12px; }
    .result-item { display: flex; flex-direction: column; gap: 4px; }
    .result-item label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .result-item input { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; font-size: 0.875rem; font-weight: 600; }
    
    .apply-actions { display: flex; gap: 10px; margin-top: 8px; }
    .btn-draft { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; padding: 10px; border-radius: 8px; font-weight: 700; flex: 1; cursor: pointer; }
    .btn-gen { background: #4f46e5; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 700; flex: 1; cursor: pointer; }

    .template-card { margin-bottom: 32px; }
    .template-card textarea {
      width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; padding: 12px;
      font-size: 0.875rem; background: #fafafa; box-sizing: border-box; resize: vertical;
    }
    .btn-save-sm { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }

    .outreach-card { margin-bottom: 32px; border: 1px solid #1e293b; background: white; }
    .outreach-grid { display: grid; grid-template-columns: 1fr 1fr auto; gap: 16px; align-items: flex-end; }
    .btn-heavy-draft { background: #1e293b; color: white; border: none; height: 42px; padding: 0 20px; border-radius: 12px; font-weight: 700; cursor: pointer; }

    .badge { font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
    .badge.info { background: #dbeafe; color: #1e40af; }

    .badge.info { background: #dbeafe; color: #1e40af; }

    .json-card { margin-bottom: 32px; border: 1px solid #e2e8f0; }
    .editor-help { font-size: 0.8rem; color: #64748b; margin-bottom: 12px; }
    .json-editor-content textarea {
      width: 100%; border-radius: 12px; border: 1px solid #e2e8f0; padding: 12px;
      font-family: 'Courier New', Courier, monospace; font-size: 0.85rem; background: #f8fafc;
      box-sizing: border-box;
    }
    .json-actions { display: flex; justify-content: flex-end; margin-top: 12px; }
    .btn-sync {
      background: #1e293b; color: white; border: none; padding: 10px 20px;
      border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s;
    }
    .btn-sync:hover { background: #0f172a; transform: translateY(-2px); }

    .editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .editor-column { display: flex; flex-direction: column; gap: 32px; }

    .card { background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .card-title { font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0; }

    .field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .field label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .field input, .field textarea {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 12px 16px; font-size: 0.9375rem; color: #1e293b; outline: none; transition: all 0.2s;
      font-family: inherit;
    }
    .field input:focus, .field textarea:focus { background: white; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,0.05); }

    .list-editor { display: flex; flex-direction: column; gap: 12px; }
    .item-row { display: flex; gap: 12px; align-items: flex-start; }
    .item-row textarea { flex: 1; min-height: 60px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; font-size: 0.875rem; resize: vertical; }
    
    .btn-add {
      background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;
      padding: 4px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer;
    }
    .btn-remove {
      background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;
      width: 32px; height: 32px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
    }

    .state-container {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 100px 0; gap: 20px; color: #64748b; background: white; border-radius: 24px;
    }
  `]
})
export class ResumeProfileComponent implements OnInit {
  content: ResumeContent | null = null;
  loading = true;
  saving = false;

  // Smart Apply State
  jdText = '';
  parsing = false;
  generating = false;
  parsedData: { role: string; email: string } | null = null;

  // JSON Editor State
  showJsonEditor = false;
  jsonEditorContent = '';

  // Email States
  followupTemplate = '';
  vendorOutreach = { email: '', role: '' };

  private api = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadProfile();
    this.loadTemplates();
  }

  loadTemplates() {
    this.http.get<{ content: string }>(`${this.api}/automation/email-template/followup`).subscribe(res => {
      this.followupTemplate = res.content;
    });
  }

  saveFollowupTemplate() {
    this.http.post(`${this.api}/automation/email-template/followup`, { content: this.followupTemplate }).subscribe(() => {
      alert('Follow-up template saved!');
    });
  }

  draftVendorMail() {
    if (!this.vendorOutreach.email || !this.vendorOutreach.role) return;
    const params = new URLSearchParams({
      role: this.vendorOutreach.role,
      email: this.vendorOutreach.email
    });
    this.http.get<{ url: string }>(`${this.api}/automation/email-draft?${params.toString()}`).subscribe(res => {
      window.open(res.url, '_blank');
    });
  }

  loadProfile() {
    this.loading = true;
    this.http.get<ResumeContent>(`${this.api}/automation/base-content`).subscribe({
      next: (data) => {
        this.content = data;
        this.jsonEditorContent = JSON.stringify(data, null, 2);
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  syncAndGenerate() {
    try {
      this.content = JSON.parse(this.jsonEditorContent);
      this.generateFromProfile();
    } catch (e) {
      alert('Invalid JSON format. Please check your data structure.');
    }
  }

  saveContent() {
    // Redundant now, but kept for internal service calls if needed
    if (!this.content) return;
    this.http.post(`${this.api}/automation/generate-resume`, this.content).subscribe();
  }

  parseJD() {
    this.parsing = true;
    this.http.post<any>(`${this.api}/automation/parse-jd`, { jdText: this.jdText }).subscribe({
      next: (res) => {
        this.parsedData = res;
        this.parsing = false;
      },
      error: () => {
        this.parsing = false;
        alert('Failed to parse JD.');
      }
    });
  }

  openDraft() {
    if (!this.parsedData) return;
    const params = new URLSearchParams({
      role: this.parsedData.role,
      email: this.parsedData.email,
      jd: this.jdText
    });
    this.http.get<{ url: string }>(`${this.api}/automation/email-draft?${params.toString()}`).subscribe({
      next: (res) => window.open(res.url, '_blank'),
      error: () => alert('Failed to open draft.')
    });
  }

  generateFromProfile() {
    if (!this.content) return;
    this.generating = true;
    this.http.post<any>(`${this.api}/automation/generate-resume`, this.content).subscribe({
      next: (res) => {
        this.generating = false;
        console.log('Resume output:', res.output);
      },
      error: () => {
        this.generating = false;
        alert('Failed to generate resume.');
      }
    });
  }
}
