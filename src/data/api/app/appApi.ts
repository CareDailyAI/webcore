import { AuthApi } from './auth/authApi';
import { UserAccountsApi } from './userAccounts/userAccountsApi';
import { LocationsApi } from './locations/locationsApi';
import { DevicesApi } from './devices/devicesApi';
import { CommonApi } from './common/commonApi';
import { DeviceMeasurementsApi } from './deviceMeasurements/deviceMeasurementsApi';
import { UserCommunicationsApi } from './userCommunications/userCommunicationsApi';
import { inject, injectable } from '../../../modules/common/di';
import { DevicesConfigurationApi } from './devicesConfiguration/devicesConfigurationApi';
import { EnergyManagementApi } from './energyManagement/energyManagementApi';
import { PaidServicesApi } from './paidServices/paidServicesApi';
import { ProfessionalMonitoringApi } from './professionalMonitoring/professionalMonitoringApi';
import { SystemAndUserPropertiesApi } from './systemAndUserProperties/systemAndUserPropertiesApi';
import { WeatherApi } from './weather/weatherApi';
import { OAuthClientApi } from './OAuthClient/oAuthClientApi';
import { OAuthHostApi } from './OAuthHost/oAuthHostApi';
import { ReportsApi } from './reports/reportsApi';
import { RulesEngineApi } from './rulesEngine/rulesEngineApi';
import { DeviceModelsApi } from './deviceModels/deviceModelsApi';
import { EntityStoriesApi } from './entityStories/entityStoriesApi';
import { FileManagementApi } from './fileManagement/fileManagementApi';
import { ApplicationFilesApi } from './applicationFiles/applicationFilesApi';
import { MediaApi } from './media/mediaApi';
import { CirclesApi } from './circles/circlesApi';

@injectable('AppApi')
export class AppApi {
  @inject('AuthApi') public readonly auth!: AuthApi;
  @inject('MediaApi') public readonly mediaApi!: MediaApi;
  @inject('CommonApi') public readonly common!: CommonApi;
  @inject('DevicesApi') public readonly devices!: DevicesApi;
  @inject('ReportsApi') public readonly reportsApi!: ReportsApi;
  @inject('WeatherApi') public readonly weatherApi!: WeatherApi;
  @inject('OAuthHostApi') public readonly oAuthHostApi!: OAuthHostApi;
  @inject('RulesEngineApi') public readonly rulesEngineApi!: RulesEngineApi;
  @inject('OAuthClientApi') public readonly oAuthClientApi!: OAuthClientApi;
  @inject('UserAccountsApi') public readonly userAccounts!: UserAccountsApi;
  @inject('LocationsApi') public readonly locations!: LocationsApi;
  @inject('DeviceModelsApi') public readonly deviceModelsApi!: DeviceModelsApi;
  @inject('PaidServicesApi') public readonly paidServicesApi!: PaidServicesApi;
  @inject('EntityStoriesApi') public readonly entityStoriesApi!: EntityStoriesApi;
  @inject('FileManagementApi') public readonly fileManagementApi!: FileManagementApi;
  @inject('ApplicationFilesApi') public readonly applicationFilesApi!: ApplicationFilesApi;
  @inject('EnergyManagementApi') public readonly energyManagementApi!: EnergyManagementApi;
  @inject('UserCommunicationsApi') public readonly userCommunications!: UserCommunicationsApi;
  @inject('DeviceMeasurementsApi') public readonly deviceMeasurements!: DeviceMeasurementsApi;
  @inject('DevicesConfigurationApi') public readonly devicesConfiguration!: DevicesConfigurationApi;
  @inject('ProfessionalMonitoringApi') public readonly professionalMonitoringApi!: ProfessionalMonitoringApi;
  @inject('SystemAndUserPropertiesApi') public readonly systemAndUserPropertiesApi!: SystemAndUserPropertiesApi;
  @inject('CirclesApi') public readonly circles!: CirclesApi;
}
