import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { JobsComponent } from './features/jobs/jobs.component';
import { RtrComponent } from './features/rtr/rtr.component';
import { SubmissionsComponent } from './features/submissions/submissions.component';
import { StudyComponent } from './features/study/study.component';
import { RemindersComponent } from './features/reminders/reminders.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { JobFormComponent } from './features/jobs/job-form/job-form.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { UserManagementComponent } from './features/admin/user-management/user-management.component';
import { ResumeBuilderComponent } from './features/resume-builder/resume-builder.component';
import { JobDiscoveryComponent } from './features/job-discovery/job-discovery.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            { path: 'dashboard', component: DashboardComponent },
            {
                path: 'jobs',
                children: [
                    { path: '', component: JobsComponent },
                    { path: 'add', component: JobFormComponent },
                    { path: 'edit/:id', component: JobFormComponent }
                ]
            },
            { path: 'job-discovery', component: JobDiscoveryComponent },
            { path: 'rtr', component: RtrComponent },
            { path: 'submissions', component: SubmissionsComponent },
            { path: 'study', component: StudyComponent },
            { path: 'reminders', component: RemindersComponent },
            { path: 'analytics', component: AnalyticsComponent },
            { path: 'resume-builder', component: ResumeBuilderComponent },
            { path: 'admin', component: UserManagementComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    },
    { path: '**', redirectTo: 'dashboard' }
];
