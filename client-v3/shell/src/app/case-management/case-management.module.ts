import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule, MatInputModule, MatListModule, MatTableModule, MatTabsModule } from '@angular/material';

import { SharedModule } from '../shared/shared.module';
import { CaseManagementService } from './_services/case-management.service';
import { CaseManagementRoutingModule } from './case-management-routing.module';
import { CaseManagementComponent } from './case-management.component';
import { FormListComponent } from './form-list/form-list.component';
import { FormResponsesListComponent } from './form-responses-list/form-responses-list.component';

@NgModule({
  imports: [
    CommonModule,
    CaseManagementRoutingModule,
    MatTabsModule,
    MatInputModule,
    FormsModule,
    MatListModule,
    MatCardModule,
    CdkTableModule,
    MatTableModule,
    SharedModule
  ],
  declarations: [CaseManagementComponent, FormListComponent, FormResponsesListComponent],
  providers: [CaseManagementService]
})
export class CaseManagementModule { }
