import { WcStorage } from '../../modules/localStorage/localStorage';
import { LiteEvent } from '../../modules/common/liteEvent';
import { AuthApi } from '../api/app/auth/authApi';
import { LoginApiResponse } from '../api/app/auth/loginApiResponse';
import { SendPasscodeApiResponse } from '../api/app/auth/sendPasscodeApiResponse';
import { inject, injectable } from '../../modules/common/di';
import { BaseService } from './baseService';
import { ApiResponseBase } from '../models/apiResponseBase';
import { UserAccountsApi } from '../api/app/userAccounts/userAccountsApi';
import { OAuthHostApi } from '../api/app/OAuthHost/oAuthHostApi';

const LOCAL_STORAGE_API_KEY = 'Auth-Key';
const LOCAL_STORAGE_API_KEY_EXPIRE = 'Auth-KeyExpire';
const LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD = 'Auth-KeyExpirePeriod';
const LOCAL_STORAGE_LAST_USERNAME = 'Auth-Username';

/**
 * How many milliseconds before the end of the key validity period will it be necessary to update the key
 */
const API_KEY_EXPIRE_ADDITIONAL_DELAY = 2 * 60 * 1000; // 2 minutes

@injectable('AuthService')
export class AuthService extends BaseService {
  @inject('AuthApi') protected readonly authApi: AuthApi;
  @inject('OAuthHostApi') protected readonly oAuthHostApi: OAuthHostApi;
  @inject('UserAccountsApi') protected readonly userAccountsApi: UserAccountsApi;
  @inject('WcStorage') protected readonly wcStorage: WcStorage;

  /**
   * Event that triggered when for some reason token is no more valid we need to re-login.
   * Possible reasons:
   *  - Server return 401 error
   *  - Some client call logoutFromAllBrowsers method
   *  - Token has expired
   * @type {LiteEvent<string>}
   */
  public readonly onNeedRelogin: LiteEvent<string> = new LiteEvent<string>();

  /**
   * Event that triggered when user logged into the system.
   * This event means only that fact that user gets his auth token
   * @type {LiteEvent<string>}
   */
  public readonly onLogin: LiteEvent<string> = new LiteEvent<string>();

  /**
   * Event that triggered when user logged out from the system
   * @type {LiteEvent<string>}
   */
  public readonly onLogout: LiteEvent<string> = new LiteEvent<string>();

  private _apiKey: string | undefined;

  private ensureAuthenticatedPromise: Promise<boolean> | undefined;

  private apiKeyExpireTimeout: any;

  public get apiKey() {
    return this._apiKey;
  }

  public get apiKeyExpire() {
    let expireDateStr = this.wcStorage.get<string>(LOCAL_STORAGE_API_KEY_EXPIRE);
    return expireDateStr ? new Date(expireDateStr) : undefined;
  }

  public get apiKeyExpirePeriod(): number | undefined {
    let val = this.wcStorage.get(LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD);
    return val != null ? parseInt(val as string, 10) : undefined;
  }

  constructor() {
    super();
    this.init();
  }

  private init() {
    let _apiKey = this.wcStorage.get<string>(LOCAL_STORAGE_API_KEY);
    if (_apiKey) {
      this.logger.debug('API key extracted from local storage: ' + _apiKey);
      this._apiKey = _apiKey;
      let keyExpire = this.wcStorage.get<string>(LOCAL_STORAGE_API_KEY_EXPIRE);
      if (keyExpire) {
        this.setUpKeyExpireTimeout(keyExpire);
      }
      this.onLogin.trigger();
    } else {
      this.logger.debug('API key was not found in local storage');
    }
  }

  public ensureAuthenticated(): Promise<boolean> {
    if (this._apiKey) {
      return Promise.resolve(true);
    }
    if (!this.ensureAuthenticatedPromise) {
      this.ensureAuthenticatedPromise = new Promise<boolean>((resolve) => {
        let eventSubscriptionCanceller = this.onLogin.on(() => {
          eventSubscriptionCanceller();
          delete this.ensureAuthenticatedPromise;
          resolve(true);
        });
      });
    }
    return Promise.resolve(this.ensureAuthenticatedPromise);
  }

  /**
   * Log in into the system by username and password
   * @param {string} username
   * @param {string} pwd
   * @param {boolean} [admin] Use if need to get admin API_KEY type
   * @returns {Promise<LoginInfo>}
   */
  public login(username: string, pwd: string, admin?: boolean): Promise<LoginInfo> {
    let me = this;
    let params = admin ? { keyType: 11 } : undefined;
    return this.logoutFromThisBrowser()
      .then(() => this.authApi.login(username, pwd, params))
      .then((result) => {
        me.logger.debug('Logged in as: ' + username, result);
        me._apiKey = result.key;
        me.wcStorage.set(LOCAL_STORAGE_API_KEY, result.key);
        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE, result.keyExpire);
        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD, new Date(result.keyExpire!).getTime() - new Date().getTime());
        me.wcStorage.set(LOCAL_STORAGE_LAST_USERNAME, username);
        me.setUpKeyExpireTimeout(result.keyExpire!);
        me.onLogin.trigger();
        return result;
      });
  }

  /**
   * Log in into the system by username and passcode
   * @param {string} username The username.
   * @param {string} passcode Passcode.
   * @param {boolean} [admin] Use if need to get admin API_KEY type.
   * @returns {Promise<LoginInfo>}
   */
  public loginByPasscode(username: string, passcode: string, admin?: boolean): Promise<LoginInfo> {
    let me = this;
    let keyType = admin ? 11 : 0; // Admin or User key type
    return this.logoutFromThisBrowser()
      .then(() => this.authApi.login(username, undefined, { passcode: passcode, keyType: keyType }))
      .then((result) => {
        me.logger.debug('Logged in as: ' + username, result);
        me._apiKey = result.key;
        me.wcStorage.set(LOCAL_STORAGE_API_KEY, result.key);
        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE, result.keyExpire);
        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD, new Date(result.keyExpire!).getTime() - new Date().getTime());
        me.wcStorage.set(LOCAL_STORAGE_LAST_USERNAME, username);
        me.setUpKeyExpireTimeout(result.keyExpire!);
        me.onLogin.trigger();
        return result;
      });
  }

  /**
   * This login API allows the user to log in with an existing API key instead of username and password.
   * Request can also be used generate a temporary key that is valid for only a brief amount of time.
   * See {@link http://docs.iotapps.apiary.io/#reference/login-and-logout/login-with-an-existing-api-key/login-by-key}
   *
   * @param {string} apiKey Temporary or normal API_KEY
   * @param {boolean} [admin] Use if need to get admin API_KEY type.
   * @returns {Promise<LoginApiResponse>}
   */
  loginByKey(apiKey: string, admin?: boolean): Promise<LoginApiResponse> {
    let me = this;
    let keyType = admin ? 11 : 0; // Admin or User key type
    return this.logoutFromThisBrowser()
      .then(() => this.authApi.loginByKey({ apiKey: apiKey, keyType: keyType }))
      .then((result) => {
        me.logger.debug('Logged in by API_KEY', result);

        // NOTE: Dmitry said that if API_KEY is valid enough - server will not generate new API_KEY. ¯\_(ツ)_/¯
        const key = result.key || apiKey;

        me._apiKey = key;
        me.wcStorage.set(LOCAL_STORAGE_API_KEY, key);
        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE, result.keyExpire);
        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD, new Date(result.keyExpire!).getTime() - new Date().getTime());
        me.wcStorage.remove(LOCAL_STORAGE_LAST_USERNAME);
        me.setUpKeyExpireTimeout(result.keyExpire!);
        me.onLogin.trigger();
        return result;
      })
      .catch((err) => {
        return err;
      });
  }

  /**
   * Requests a new API_KEY and reset it's expiration to default.
   * @returns {Promise<LoginInfo>}
   */
  public refreshToken(): Promise<LoginInfo> {
    let me = this;
    return me.authApi.loginByKey({ apiKey: me._apiKey }).then((result) => {
      me.logger.debug('API key has refreshed from: ' + me._apiKey, result);
      me._apiKey = result.key;
      me.wcStorage.set(LOCAL_STORAGE_API_KEY, result.key);
      me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE, result.keyExpire);
      me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD, new Date(result.keyExpire!).getTime() - new Date().getTime());
      me.setUpKeyExpireTimeout(result.keyExpire!);
      return result;
    });
  }

  /**
   * Send an SMS verification code to specific user.
   * @param {string} username The username.
   * @param {boolean} [admin] Use if need to get admin API_KEY type.
   * @param {string} [brand] Optional brand name.
   * @returns {Promise<SendPasscodeApiResponse>}
   */
  public sendPasscode(username: string, admin?: boolean, brand?: string): Promise<SendPasscodeApiResponse> {
    if (!username || username.length === 0) {
      return Promise.reject(`Username can not be empty [${username}].`);
    }
    let keyType = admin ? 11 : 0; // Admin or User key type
    let brandName = brand ? brand : undefined;
    return this.authApi
      .sendPasscode({
        username: username,
        type: 2,
        keyType: keyType,
        brand: brandName,
      })
      .then((result) => {
        return result;
      });
  }

  /**
   * Gets temporary API key that is valid for only a brief amount of time.
   * @returns {Promise<LoginInfo>}
   */
  public getTempToken(): Promise<LoginInfo> {
    return this.authApi.loginByKey({ keyType: 1 }).then((result) => {
      this.logger.debug('Temporary API key has been requested.', result);
      return result;
    });
  }

  /**
   * Set up timeout to handle token expiration time
   * @param {string|number} keyExpireDate date/time as string in RFC2822 or ISO 8601 formats, or in milliseconds since UNIX epoch
   */
  public setUpKeyExpireTimeout(keyExpireDate: string | number) {
    let me = this;
    if (keyExpireDate) {
      let keyExpireDateObj = new Date(keyExpireDate);
      let expirePeriod = keyExpireDateObj.getTime() - new Date().getTime() - API_KEY_EXPIRE_ADDITIONAL_DELAY;
      if (isNaN(expirePeriod) || expirePeriod <= 0) {
        me.logger.debug('API key has expired: ' + me._apiKey);
        me.logoutFromThisBrowser();
        me.onNeedRelogin.trigger();
      } else {
        // setTimeout is buggy: it will fire immediately if timeout is bigger that 0x7FFFFFFF
        if (expirePeriod >= 0x7fffffff) {
          expirePeriod = 0x7ffffffe;
        }

        if (this.apiKeyExpireTimeout) {
          clearTimeout(this.apiKeyExpireTimeout);
          this.apiKeyExpireTimeout = undefined;
        }

        me.wcStorage.set(LOCAL_STORAGE_API_KEY_EXPIRE, keyExpireDateObj.toISOString());
        this.apiKeyExpireTimeout = setTimeout(function () {
          me.logger.debug(`API key (${me._apiKey}) is about to expire. Refreshing...`);
          me.refreshToken().catch(() => {
            me.logoutFromThisBrowser();
            me.onNeedRelogin.trigger();
          });
        }, expirePeriod);
      }
    } else {
      this.clearKeyExpireTimeout();
    }
  }

  /**
   * Clear API key expiration timeout.
   */
  private clearKeyExpireTimeout() {
    this.wcStorage.remove(LOCAL_STORAGE_API_KEY_EXPIRE);
    this.wcStorage.remove(LOCAL_STORAGE_API_KEY_EXPIRE_PERIOD);
    if (this.apiKeyExpireTimeout) {
      clearTimeout(this.apiKeyExpireTimeout);
    }
    this.apiKeyExpireTimeout = undefined;
  }

  /**
   * Log out only from this browser. In other words - clear session and forget auth token
   * @returns {Promise<boolean>}
   */
  public logoutFromThisBrowser() {
    delete this._apiKey;
    this.wcStorage.remove(LOCAL_STORAGE_API_KEY);
    this.clearKeyExpireTimeout();
    this.onLogout.trigger();
    this.logger.debug('System logged out');
    return Promise.resolve(true);
  }

  /**
   * Log out from all session from all clients (browsers and android/ios native clients). This call annul auth token on
   * the server.
   * @returns {Promise<LogoutApiResponse>}
   */
  public logoutFromAllBrowsers() {
    let me = this;
    return me.authApi.logout().then(() => {
      me.logger.debug('System logged out from all the browsers');
      me._apiKey = undefined;
      me.wcStorage.remove(LOCAL_STORAGE_API_KEY);
      this.clearKeyExpireTimeout();
      me.onLogout.trigger();
    });
  }

  /**
   * Is webcore is authenticated
   * @returns {boolean}
   */
  public isAuthenticated() {
    return !!this._apiKey;
  }

  /**
   * Set new password by temporary API key.
   * @param {string} newPassword New password
   * @param {string} tempKey Temporary API key
   * @param [params] Request parameters
   * @param {string} [params.brand] A parameter identifying specific email template, among other customization settings
   * @param {string} [params.appName] App name to identify the brand
   * @param {string} [params.passcode] SMS passcode if it was sent (this API can return resultCode=17 which force user to enter passcode)
   * @returns {Promise<ApiResponseBase>}
   */
  public setNewPasswordByTempKey(
    newPassword: string,
    tempKey: string,
    params?: {
      brand?: string;
      appName?: string;
      passcode?: string;
    },
  ): Promise<ApiResponseBase> {
    return this.userAccountsApi.newPasswordByTempKey(newPassword, tempKey, params).then((result) => {
      return result;
    });
  }

  /**
   * Set new password.
   * If 2-factor auth is used - this API will send passcode, so you'll need to call this method again
   * @param {string} newPassword New password
   * @param {string} oldPassword Old password
   * @param {string} [passcode] 2-factor auth passcode
   * @param [params] Request parameters
   * @param {string} [params.brand] A parameter identifying specific email template, among other customization settings
   * @param {string} [params.appName] App name to identify the brand
   * @returns {Promise<ApiResponseBase>}
   */
  public setNewPassword(
    newPassword: string,
    oldPassword: string,
    passcode?: string,
    params?: {
      brand?: string;
      appName?: string;
    },
  ): Promise<ApiResponseBase> {
    return this.ensureAuthenticated().then(() => {
      return this.userAccountsApi.newPassword(newPassword, oldPassword, passcode, params);
    });
  }

  /**
   * Gets URL which allows a user to approve or deny an authorization request from the third-party application.
   * The user will be redirected to the external application web page.
   * @param {string} approved If the url to approve or deny authorization (true or false).
   * @param params Request parameters.
   * @param {string} params.clientId OAuth Client ID.
   * @param {string} params.responseType OAuth 2 response type. The "code" response type is the only one currently supported.
   * @param {string} params.apiKey Temporary API_KEY.
   * @param {string} [params.brand] Brand name.
   * @param {number} [params.locationId] Location ID, where the third-party app is going to have access.
   * @param {string} [params.state] The client's state which will be returned in the callback URL.
   * @returns {Promise<string>}
   */
  getUrlToApproveOrDenyAuthorization(
    approved: boolean,
    params: {
      clientId: string;
      responseType: string;
      apiKey: string;
      state?: string;
      locationId?: number;
      brand?: string;
    },
  ): Promise<string> {
    return this.oAuthHostApi.getUrlToApproveOrDenyAuthorization(approved, params);
  }
}

export interface LoginInfo extends LoginApiResponse {}

export interface LogoutApiResponse extends ApiResponseBase {}
