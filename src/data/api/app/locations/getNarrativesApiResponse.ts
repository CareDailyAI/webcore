import { ApiResponseBase } from '../../../models/apiResponseBase';
import { PhoneType } from '../userAccounts/createUserAndLocationApiResponse';
import { EmailVerificationStatus, PhoneVerificationStatus } from '../userAccounts/getUserInformationApiResponse';
import { NarrativePriority, NarrativeStatus } from './createOrUpdateNarrativeApiResponse';

export interface GetNarrativesApiResponse extends ApiResponseBase {
  nextMarker: string;
  narratives: Narrative[];
}

export enum NarrativeType {
  Default = 0,
  UserDeleted = 1,
  LocationDeleted = 2,
  LocationRemoved = 3,
}

export interface Narrative {
  id: number;
  narrativeType: NarrativeType;
  locationId: number;
  organizationId?: number;
  narrativeDate?: string;
  narrativeDateMs?: number;
  creationDate?: string;
  creationDateMs?: number;
  priority?: NarrativePriority;
  status?: NarrativeStatus;
  icon?: string;
  title?: string;
  description?: string;
  target?: {
    [field: string]: string;
  };

  /**
   * Returned if narrative posted by Bot.
   */
  appInstanceId?: number;

  /**
   * Returned for removal narrative types.
   */
  user?: {
    id: number;
    creationDate: string;
    creationDateMs: number;
    deleteDate: string;
    deleteDateMs: number;
    userName?: string;
    altUsername?: string;
    passwordSet: boolean;
    firstName?: string;
    lastName?: string;
    email?: {
      email?: string;
      verified: boolean;
      status: EmailVerificationStatus;
    };
    phone?: string;
    phoneType?: PhoneType;
    smsStatus?: PhoneVerificationStatus;
    language?: string;
  };
}
