import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  title = 'career-command-center-frontend';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // Wake up the Render backend immediately on page load —
    // avoids 15–30s cold start on the first real API call.
    // Fire-and-forget, never blocks the UI.
    const base = environment.apiBaseUrl.replace(/\/api$/, '');
    this.http.get(`${base}/`, { responseType: 'text' })
      .subscribe({ error: () => {} });
  }
}
