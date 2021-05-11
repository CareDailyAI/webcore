import { ApiResponseBase } from '../../../models/apiResponseBase';
import { LocationAccessLevel, LocationNotificationsCategory } from './getLocationUsersApiResponse';

export interface AddLocationUsersApiResponse extends ApiResponseBase {}

export interface LocationUsersModel {
  users: Array<{
    id: number;
    locationAccess: LocationAccessLevel;
    temporary: boolean;
    category: LocationNotificationsCategory;
    nickname?: string;
    schedules?: Array<{
      daysOfWeek?: number;
      startTime?: number;
      endTime?: number;
    }>;
  }>;
}
