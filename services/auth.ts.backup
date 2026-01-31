import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const API_BASE = 'https://lumina.viberyte.com';

// Google OAuth Config
const GOOGLE_CLIENT_ID_IOS = '1234567890-abcdefghijk.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = '1234567890-abcdefghijk.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = '1234567890-abcdefghijk.apps.googleusercontent.com';

export interface User {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google' | 'apple' | 'guest';
  role?: 'member' | 'partner';
  createdAt: string;
  profileData?: any;
}

export interface PartnerData {
  role: 'member' | 'partner';
  businessName?: string;
  instagramHandle?: string;
  partnerRole?: 'venue_owner' | 'promoter' | 'staff';
}

class AuthService {
  private user: User | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  useGoogleAuth() {
    const [request, response, promptAsync] = Google.useAuthRequest({
      iosClientId: GOOGLE_CLIENT_ID_IOS,
      androidClientId: GOOGLE_CLIENT_ID_ANDROID,
      webClientId: GOOGLE_CLIENT_ID_WEB,
    });
    
    return { request, response, promptAsync };
  }

  private async saveProfile(user: User): Promise<void> {
    const existingProfile = await AsyncStorage.getItem('@lumina_profile');
    let profile = existingProfile ? JSON.parse(existingProfile) : {};
    
    profile = {
      ...profile,
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider,
      role: user.role || 'member',
    };
    
    await AsyncStorage.setItem('@lumina_profile', JSON.stringify(profile));
  }

  async signInWithGoogle(accessToken: string): Promise<User> {
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      const googleUser = await userInfoResponse.json();
      
      const fullName = googleUser.name || '';
      const firstName = fullName.split(' ')[0] || fullName;
      
      const user: User = {
        id: `google_${googleUser.id}`,
        email: googleUser.email,
        name: firstName,
        provider: 'google',
        role: 'member',
        createdAt: new Date().toISOString(),
        profileData: { fullName, picture: googleUser.picture },
      };

      await this.saveUserToBackend(user, accessToken);
      await AsyncStorage.setItem('@lumina_user', JSON.stringify(user));
      await AsyncStorage.setItem('@lumina_auth_token', accessToken);
      await AsyncStorage.setItem('@lumina_user_id', user.id);
      await AsyncStorage.setItem('@lumina_is_guest', 'false');
      await AsyncStorage.setItem('@lumina_user_role', 'member');
      
      await this.saveProfile(user);
      
      this.user = user;
      this.startTokenRefresh();
      
      return user;
      
    } catch (error) {
      console.error('Google sign in error:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  async signInWithApple(): Promise<User> {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, email, fullName } = credential;
      
      let displayName = 'Friend';
      
      if (fullName?.givenName) {
        displayName = fullName.givenName;
        await AsyncStorage.setItem(`@apple_name_${credential.user}`, displayName);
      } else {
        const cachedName = await AsyncStorage.getItem(`@apple_name_${credential.user}`);
        if (cachedName) {
          displayName = cachedName;
        }
      }
      
      const user: User = {
        id: `apple_${credential.user}`,
        email: email || `${credential.user}@privaterelay.appleid.com`,
        name: displayName,
        provider: 'apple',
        role: 'member',
        createdAt: new Date().toISOString(),
        profileData: { 
          fullName: fullName 
            ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
            : displayName
        },
      };

      await this.saveUserToBackend(user, identityToken || '');
      await AsyncStorage.setItem('@lumina_user', JSON.stringify(user));
      await AsyncStorage.setItem('@lumina_auth_token', identityToken || `apple_${Date.now()}`);
      await AsyncStorage.setItem('@lumina_user_id', user.id);
      await AsyncStorage.setItem('@lumina_is_guest', 'false');
      await AsyncStorage.setItem('@lumina_user_role', 'member');
      
      await this.saveProfile(user);
      
      this.user = user;
      this.startTokenRefresh();
      
      return user;
      
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        throw new Error('Sign in cancelled');
      }
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Invalid credentials');
      }

      const data = await response.json();
      
      const fullName = data.name || '';
      const firstName = fullName.split(' ')[0] || email.split('@')[0];
      
      const user: User = {
        id: data.userId?.toString() || `email_${Date.now()}`,
        email: data.email,
        name: firstName,
        provider: 'email',
        role: data.role || 'member',
        createdAt: data.createdAt || new Date().toISOString(),
        profileData: { fullName: data.name },
      };

      await AsyncStorage.setItem('@lumina_user', JSON.stringify(user));
      await AsyncStorage.setItem('@lumina_auth_token', data.token);
      if (data.refreshToken) {
        await AsyncStorage.setItem('@lumina_refresh_token', data.refreshToken);
      }
      await AsyncStorage.setItem('@lumina_user_id', user.id);
      await AsyncStorage.setItem('@lumina_is_guest', 'false');
      await AsyncStorage.setItem('@lumina_user_role', user.role || 'member');
      
      await this.saveProfile(user);
      
      this.user = user;
      this.startTokenRefresh();
      
      return user;
      
    } catch (error: any) {
      throw new Error(error.message || 'Sign in failed');
    }
  }

  async signUpWithEmail(email: string, password: string, name: string, partnerData?: PartnerData): Promise<User> {
    try {
      const payload: any = { email, password, name };
      
      if (partnerData) {
        payload.role = partnerData.role;
        if (partnerData.role === 'partner') {
          payload.businessName = partnerData.businessName;
          payload.instagramHandle = partnerData.instagramHandle;
          payload.partnerRole = partnerData.partnerRole;
        }
      }

      const response = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sign up failed');
      }

      const data = await response.json();
      
      const firstName = name.split(' ')[0] || name;
      const role = partnerData?.role || 'member';
      
      const user: User = {
        id: data.userId?.toString() || `email_${Date.now()}`,
        email: data.email || email,
        name: firstName,
        provider: 'email',
        role: role,
        createdAt: data.createdAt || new Date().toISOString(),
        profileData: { 
          fullName: name,
          ...(partnerData?.role === 'partner' && {
            businessName: partnerData.businessName,
            instagramHandle: partnerData.instagramHandle,
            partnerRole: partnerData.partnerRole,
          }),
        },
      };

      await AsyncStorage.setItem('@lumina_user', JSON.stringify(user));
      await AsyncStorage.setItem('@lumina_auth_token', data.token);
      if (data.refreshToken) {
        await AsyncStorage.setItem('@lumina_refresh_token', data.refreshToken);
      }
      await AsyncStorage.setItem('@lumina_user_id', user.id);
      await AsyncStorage.setItem('@lumina_is_guest', 'false');
      await AsyncStorage.setItem('@lumina_user_role', role);
      
      if (partnerData?.role === 'partner') {
        await AsyncStorage.setItem('@lumina_partner_data', JSON.stringify({
          businessName: partnerData.businessName,
          instagramHandle: partnerData.instagramHandle,
          partnerRole: partnerData.partnerRole,
        }));
      }
      
      await this.saveProfile(user);
      
      this.user = user;
      this.startTokenRefresh();
      
      return user;
      
    } catch (error: any) {
      throw new Error(error.message || 'Sign up failed');
    }
  }

  async continueAsGuest(): Promise<User> {
    const guest: User = {
      id: `guest-${Date.now()}`,
      email: '',
      name: '',
      provider: 'guest',
      role: 'member',
      createdAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem('@lumina_user', JSON.stringify(guest));
    await AsyncStorage.setItem('@lumina_auth_token', 'guest_token');
    await AsyncStorage.setItem('@lumina_user_id', guest.id);
    await AsyncStorage.setItem('@lumina_is_guest', 'true');
    await AsyncStorage.setItem('@lumina_user_role', 'member');
    
    await this.saveProfile(guest);
    
    this.user = guest;
    return guest;
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.user) return this.user;
    
    try {
      const userData = await AsyncStorage.getItem('@lumina_user');
      if (userData) {
        this.user = JSON.parse(userData);
        this.startTokenRefresh();
        return this.user;
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
    
    return null;
  }

  async getUserRole(): Promise<'member' | 'partner'> {
    const role = await AsyncStorage.getItem('@lumina_user_role');
    return (role as 'member' | 'partner') || 'member';
  }

  async getPartnerData(): Promise<PartnerData | null> {
    try {
      const data = await AsyncStorage.getItem('@lumina_partner_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async refreshAuthToken(): Promise<void> {
    try {
      const refreshToken = await AsyncStorage.getItem('@lumina_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      await AsyncStorage.setItem('@lumina_auth_token', data.token);
      
      console.log('✅ Token refreshed');
      
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }

  private startTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    this.refreshTimer = setInterval(() => {
      this.refreshAuthToken();
    }, 6 * 24 * 60 * 60 * 1000);
  }

  async signOut(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    
    await AsyncStorage.multiRemove([
      '@lumina_user',
      '@lumina_auth_token',
      '@lumina_refresh_token',
      '@lumina_profile',
      '@lumina_user_id',
      '@lumina_is_guest',
      '@lumina_user_role',
      '@lumina_partner_data',
      'lumina_partner_session',
    ]);
    
    this.user = null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('@lumina_auth_token');
    return !!token && token !== 'guest_token';
  }
  
  async isGuest(): Promise<boolean> {
    const isGuest = await AsyncStorage.getItem('@lumina_is_guest');
    return isGuest === 'true';
  }

  async isPartner(): Promise<boolean> {
    const role = await AsyncStorage.getItem('@lumina_user_role');
    return role === 'partner';
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('@lumina_auth_token');
  }

  private async saveUserToBackend(user: User, token: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/auth/save-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(user),
      });
    } catch (error) {
      console.error('Error saving user to backend:', error);
    }
  }
}

export default new AuthService();
