import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { ResumeService } from '../../core/services/resume.service';

@Component({
    selector: 'app-resume-builder',
    standalone: true,
    imports: [
        CommonModule, FormsModule,
        MatCardModule, MatFormFieldModule, MatInputModule,
        MatButtonModule, MatIconModule, MatSnackBarModule,
        MatProgressBarModule, MatProgressSpinnerModule,
        MatCheckboxModule, MatChipsModule, MatDividerModule, MatTooltipModule,
        MatTabsModule, MatTableModule
    ],
    templateUrl: './resume-builder.component.html',
    styleUrls: ['./resume-builder.component.scss']
})
export class ResumeBuilderComponent implements OnInit {
    // ── State ──────────────────────────────────────────────────────────────────
    jdText: string = '';
    baseContent: any = null;         // full base JSON loaded from server
    editedContent: any = null;       // working copy user can edit
    uploadedFileName: string = '';
    
    // History
    history: any[] = [];
    historyColumns: string[] = ['title', 'date', 'files', 'actions'];

    // Section toggle flags — which sections to update from JD
    updateTitle    = true;
    updateSummary  = true;
    updateTD       = false;
    updateCH       = false;
    updateEnv      = true;

    // UI flags
    isGenerating  = false;
    isTailoring   = false;
    isLoading     = true;
    showJson      = false;           // advanced: toggle raw JSON editor

    extractedKeywords: string[] = [];

    constructor(
        private resumeService: ResumeService,
        private snackBar: MatSnackBar,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.loadBaseContent();
        this.loadHistory();
        this.route.queryParams.subscribe(params => {
            if (params['jd'] || params['email']) {
                this.jdText = params['jd'] || '';
                this.snackBar.open('Opportunity data loaded!', 'OK', { duration: 3000 });
            }
        });
    }

    // ── Load base resume from server ───────────────────────────────────────────
    loadBaseContent(): void {
        this.isLoading = true;
        this.resumeService.getBaseContent().subscribe({
            next: (data) => {
                this.baseContent = data;
                this.editedContent = JSON.parse(JSON.stringify(data)); // deep copy
                this.isLoading = false;
            },
            error: () => {
                this.snackBar.open('Error loading resume content.', 'Close', { duration: 3000 });
                this.isLoading = false;
            }
        });
    }

    loadHistory(): void {
        this.resumeService.listGenerations().subscribe(data => {
            this.history = data;
        });
    }

    downloadFile(folderId: string, filename: string): void {
        this.resumeService.downloadGenerationFile(folderId, filename).subscribe(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // ── Reset working copy to base ─────────────────────────────────────────────
    resetToBase(): void {
        this.editedContent = JSON.parse(JSON.stringify(this.baseContent));
        this.extractedKeywords = [];
        this.snackBar.open('↩️ Reset to base content', 'OK', { duration: 2500 });
    }

    // ── Smart JD Tailoring ─────────────────────────────────────────────────────
    // Extracts keywords from JD and patches ONLY the selected sections
    tailorFromJD(): void {
        if (!this.jdText.trim()) {
            this.snackBar.open('Please paste a Job Description first.', 'Close', { duration: 3000 });
            return;
        }

        this.isTailoring = true;
        this.resumeService.tailorSections({
            jd_text: this.jdText,
            base_content: this.baseContent,
            sections: {
                title:   this.updateTitle,
                summary: this.updateSummary,
                td:      this.updateTD,
                ch:      this.updateCH,
                env:     this.updateEnv
            }
        }).subscribe({
            next: (res) => {
                this.isTailoring = false;
                // Merge only the updated sections into editedContent
                if (res.updated) {
                    if (this.updateTitle   && res.updated.TITLE)   this.editedContent.TITLE  = res.updated.TITLE;
                    if (this.updateTitle   && res.updated.TITLE2)  this.editedContent.TITLE2 = res.updated.TITLE2;
                    if (this.updateSummary && res.updated.SUMMARY) this.editedContent.SUMMARY = res.updated.SUMMARY;
                    if (this.updateTD      && res.updated.TD)      this.editedContent.TD      = res.updated.TD;
                    if (this.updateCH      && res.updated.CH)      this.editedContent.CH      = res.updated.CH;
                    if (this.updateEnv     && res.updated.TD_ENV)  this.editedContent.TD_ENV  = res.updated.TD_ENV;
                    if (this.updateEnv     && res.updated.CH_ENV)  this.editedContent.CH_ENV  = res.updated.CH_ENV;
                }
                this.extractedKeywords = res.keywords || [];
                this.snackBar.open(`✅ Tailored ${res.sections_updated} section(s) from JD!`, 'Close', { duration: 4000 });
            },
            error: (err) => {
                this.isTailoring = false;
                this.snackBar.open('❌ Failed to tailor resume. ' + (err?.error?.error || ''), 'Close', { duration: 4000 });
            }
        });
    }

    // ── JSON File Upload (advanced) ────────────────────────────────────────────
    onJsonFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        this.uploadedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                this.editedContent = JSON.parse(text);
                this.snackBar.open(`✅ Loaded ${file.name}`, 'OK', { duration: 3000 });
            } catch {
                this.snackBar.open('❌ Invalid JSON file', 'Close', { duration: 3000 });
                this.uploadedFileName = '';
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    syncFromJsonEditor(raw: string): void {
        try { this.editedContent = JSON.parse(raw); } catch { /* ignore invalid mid-edit */ }
    }

    get jsonEditorContent(): string {
        return JSON.stringify(this.editedContent, null, 2);
    }

    // ── Generate DOCX ─────────────────────────────────────────────────────────
    generateResume(): void {
        this.isGenerating = true;
        this.resumeService.generateResume(this.editedContent, this.jdText).subscribe({
            next: (blob: Blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Ajay_Thota_Resume_${new Date().toISOString().split('T')[0]}.docx`;
                a.click();
                URL.revokeObjectURL(url);
                this.snackBar.open('✅ Resume downloaded!', 'Close', { duration: 5000 });
                this.isGenerating = false;
                this.loadHistory(); // Refresh history
            },
            error: () => {
                this.snackBar.open('❌ Could not generate resume.', 'Close', { duration: 5000 });
                this.isGenerating = false;
            }
        });
    }

    // ── Email Draft ───────────────────────────────────────────────────────────
    draftEmail(): void {
        this.resumeService.draftEmail(this.jdText).subscribe({
            next: (res) => {
                if (res.url) window.open(res.url, '_blank');
                this.snackBar.open('✅ Gmail draft opened!', 'Close', { duration: 3000 });
            },
            error: () => this.snackBar.open('❌ Failed to open Gmail draft.', 'Close', { duration: 3000 })
        });
    }

    getSummaryPreview(): string {
        return this.editedContent?.SUMMARY?.[0] || '';
    }
}
