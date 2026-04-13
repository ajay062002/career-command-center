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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatBadgeModule } from '@angular/material/badge';
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
        MatTabsModule, MatTableModule, MatSlideToggleModule, MatBadgeModule
    ],
    templateUrl: './resume-builder.component.html',
    styleUrls: ['./resume-builder.component.scss']
})
export class ResumeBuilderComponent implements OnInit {

    // ── Resume content state ──────────────────────────────────────────────────
    jdText: string = '';
    baseContent: any = null;       // original from server — never mutated
    editedContent: any = null;     // working copy user edits & downloads
    originalContent: any = null;   // snapshot before tailoring (for before/after)
    uploadedFileName: string = '';

    // ── Before/After preview state ────────────────────────────────────────────
    showDiff: boolean = false;     // show the diff panel after tailoring
    aiModel: string = '';

    // ── History ───────────────────────────────────────────────────────────────
    history: any[] = [];
    historyColumns: string[] = ['title', 'date', 'files', 'actions'];

    // ── Section toggles — ALL on by default, always update everything ────────
    updateTitle    = true;
    updateSummary  = true;
    updateTD       = true;
    updateCH       = true;
    updateEnv      = true;

    // ── UI flags ─────────────────────────────────────────────────────────────
    isGenerating  = false;
    isTailoring   = false;
    isLoading     = true;
    showJson      = false;
    useAiAgent    = true;

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
            if (params['jd']) {
                this.jdText = params['jd'];
                this.snackBar.open('JD loaded from context!', 'OK', { duration: 3000 });
            }
        });
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    loadBaseContent(): void {
        this.isLoading = true;
        this.resumeService.getBaseContent().subscribe({
            next: (data) => {
                this.baseContent = data;
                this.editedContent = JSON.parse(JSON.stringify(data));
                this.isLoading = false;
            },
            error: (err) => {
                console.error('base-content error', err);
                this.snackBar.open('⚠️ Could not load resume base content. Check backend.', 'Close', { duration: 5000 });
                this.isLoading = false;
            }
        });
    }

    loadHistory(): void {
        this.resumeService.listGenerations().subscribe({
            next: (data) => { this.history = data; },
            error: () => { this.history = []; }
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

    // ── Reset ─────────────────────────────────────────────────────────────────

    resetToBase(): void {
        this.editedContent = JSON.parse(JSON.stringify(this.baseContent));
        this.originalContent = null;
        this.extractedKeywords = [];
        this.showDiff = false;
        this.snackBar.open('↩️ Reset to base content', 'OK', { duration: 2500 });
    }

    // ── AI Tailoring ──────────────────────────────────────────────────────────

    tailorFromJD(): void {
        if (!this.jdText.trim()) {
            this.snackBar.open('Please paste a Job Description first.', 'Close', { duration: 3000 });
            return;
        }
        if (!this.editedContent) {
            this.snackBar.open('Base content not loaded yet.', 'Close', { duration: 3000 });
            return;
        }

        // Snapshot current state for before/after
        this.originalContent = JSON.parse(JSON.stringify(this.editedContent));
        this.isTailoring = true;
        this.showDiff = false;

        this.resumeService.tailorSections({
            jd_text: this.jdText,
            base_content: this.baseContent,
            use_ai: this.useAiAgent,
            sections: {
                title:   this.updateTitle,
                summary: this.updateSummary,
                td:      this.updateTD,
                ch:      this.updateCH,
                env:     this.updateEnv,
            }
        }).subscribe({
            next: (res) => {
                this.isTailoring = false;
                const u = res.updated || {};

                // Merge only toggled sections into editedContent
                if (this.updateTitle   && u.TITLE)   this.editedContent.TITLE   = u.TITLE;
                if (this.updateTitle   && u.TITLE2)  this.editedContent.TITLE2  = u.TITLE2;
                if (this.updateSummary && u.SUMMARY) this.editedContent.SUMMARY = u.SUMMARY;
                if (this.updateTD      && u.TD)      this.editedContent.TD      = u.TD;
                if (this.updateCH      && u.CH)      this.editedContent.CH      = u.CH;
                if (this.updateEnv     && u.TD_ENV)  this.editedContent.TD_ENV  = u.TD_ENV;
                if (this.updateEnv     && u.CH_ENV)  this.editedContent.CH_ENV  = u.CH_ENV;

                this.extractedKeywords = res.keywords || [];
                this.aiModel = res.ai_model || (res.ai_powered ? 'claude-sonnet-4-6' : 'keyword-fallback');
                this.showDiff = true;

                const badge = res.ai_powered ? '🤖 Claude' : '🔍 Keyword';
                this.snackBar.open(
                    `${badge} — Tailored ${res.sections_updated} section(s). Review the before/after below.`,
                    'Close', { duration: 5000 }
                );
            },
            error: (err) => {
                this.isTailoring = false;
                this.snackBar.open('❌ Failed to tailor: ' + (err?.error?.error || 'Unknown error'), 'Close', { duration: 5000 });
            }
        });
    }

    // ── Helpers for before/after diff display ─────────────────────────────────

    getBefore(section: string): any[] {
        if (!this.originalContent) return [];
        const v = this.originalContent[section];
        return Array.isArray(v) ? v : [];
    }

    getAfter(section: string): any[] {
        if (!this.editedContent) return [];
        const v = this.editedContent[section];
        return Array.isArray(v) ? v : [];
    }

    /** Returns true if a bullet is new (not in originalContent's section) */
    isNewBullet(section: string, bullet: string): boolean {
        const before = this.getBefore(section);
        return !before.includes(bullet);
    }

    /** Returns true if a bullet was removed (in original but not in edited) */
    wasRemovedBullet(section: string, bullet: string): boolean {
        const after = this.getAfter(section);
        return !after.includes(bullet);
    }

    get sectionsUpdated(): string[] {
        const out: string[] = [];
        if (!this.originalContent || !this.editedContent) return out;
        const keys: [string, string][] = [['TITLE','Title'], ['SUMMARY','Summary'], ['TD','TD Bullets'], ['CH','CH Bullets'], ['TD_ENV','Tech Env']];
        for (const [k, label] of keys) {
            if (JSON.stringify(this.originalContent[k]) !== JSON.stringify(this.editedContent[k])) {
                out.push(label);
            }
        }
        return out;
    }

    // ── JSON upload / editor ──────────────────────────────────────────────────

    onJsonFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        this.uploadedFileName = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.editedContent = JSON.parse(e.target?.result as string);
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
        try { this.editedContent = JSON.parse(raw); } catch { /* ignore mid-edit */ }
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
                // Name file with job title so it self-organises in Downloads
                const title = (this.editedContent?.TITLE || 'Resume')
                    .replace(/[^a-zA-Z0-9 _-]/g, '')
                    .trim()
                    .replace(/\s+/g, '_');
                const date = new Date().toISOString().split('T')[0];
                a.download = `Ajay_Thota_${title}_${date}.docx`;
                a.click();
                URL.revokeObjectURL(url);
                this.isGenerating = false;
                this.snackBar.open('Resume downloaded: ' + (this.editedContent?.TITLE || ''), 'Close', { duration: 5000 });
                this.loadHistory();
            },
            error: (err) => {
                this.isGenerating = false;
                this.snackBar.open('❌ ' + (err?.error?.error || 'Could not generate resume.'), 'Close', { duration: 5000 });
            }
        });
    }

    // ── Email Draft ───────────────────────────────────────────────────────────

    draftEmail(): void {
        this.resumeService.draftEmail(this.jdText).subscribe({
            next: (res) => {
                if (res.url) window.open(res.url, '_blank');
                this.snackBar.open('✅ Email draft opened!', 'Close', { duration: 3000 });
            },
            error: () => this.snackBar.open('❌ Failed to open draft.', 'Close', { duration: 3000 })
        });
    }

    getSummaryPreview(): string {
        return this.editedContent?.SUMMARY?.[0] || '';
    }
}
