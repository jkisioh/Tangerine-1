import { Component, OnInit } from '@angular/core';

import { SyncingService } from '../_services/syncing.service';

@Component({
  selector: 'app-sync-records',
  templateUrl: './sync-records.component.html',
  styleUrls: ['./sync-records.component.css']
})
export class SyncRecordsComponent implements OnInit {
  isLoading = false;
  docsNotUploaded;
  docsUploaded;
  syncPercentageComplete;
  constructor(private syncingService: SyncingService) { }

  async ngOnInit() {
    const result = await this.syncingService.getDocsNotUploaded();
    this.docsNotUploaded = result ? result.length : 0;
    this.docsUploaded = await this.syncingService.getNumberOfFormsLockedAndUploaded();
    this.syncPercentageComplete =
      ((this.docsUploaded / (this.docsNotUploaded + this.docsUploaded)) * 100);
  }

  async pushAllRecords() {
    this.toggleIsSyncing();
    try {
      const result = await this.syncingService.pushAllrecords();
      if (result) {
        this.toggleIsSyncing();
      }
    } catch (error) {
      console.error(error);
      this.toggleIsSyncing();
    }
  }


  toggleIsSyncing() {
    this.isLoading = !this.isLoading;
  }
}
