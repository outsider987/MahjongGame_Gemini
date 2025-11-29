const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export interface User {
  id: number;
  display_name: string;
  avatar_url?: string;
  total_score: number;
  total_games: number;
  total_wins: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  display_name: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

const TOKEN_KEY = "mahjong_auth_token";
const USER_KEY = "mahjong_user";

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load from localStorage on init
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (storedToken) {
        this.token = storedToken;
      }
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    } catch (e) {
      console.error("Failed to load auth from storage:", e);
    }
  }

  private saveToStorage() {
    try {
      if (this.token) {
        localStorage.setItem(TOKEN_KEY, this.token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
      
      if (this.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(this.user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.error("Failed to save auth to storage:", e);
    }
  }

  private decodeJWT(token: string): { user_id: number; display_name: string; username?: string } | null {
    try {
      // Split token into parts: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode base64url payload (second part)
      const payload = parts[1];
      
      // Base64url to base64 conversion
      // Replace URL-safe characters and add padding if needed
      let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      // Decode base64 and parse JSON
      const decoded = atob(base64);
      const claims = JSON.parse(decoded);

      // Extract required fields
      if (!claims.user_id || !claims.display_name) {
        return null;
      }

      return {
        user_id: Number(claims.user_id),
        display_name: claims.display_name,
        username: claims.username,
      };
    } catch (e) {
      console.error("Failed to decode JWT:", e);
      return null;
    }
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (data.success && data.data) {
        this.token = data.data.token;
        this.user = data.data.user;
        this.saveToStorage();
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (data.success && data.data) {
        this.token = data.data.token;
        this.user = data.data.user;
        this.saveToStorage();
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  }

  getLineLoginUrl(): string {
    return `${API_URL}/api/auth/line/login`;
  }

  setTokenFromJWT(token: string): User | null {
    // Decode JWT to get claims
    const claims = this.decodeJWT(token);
    if (!claims) {
      return null;
    }

    // Create User object from JWT claims
    const user: User = {
      id: claims.user_id,
      display_name: claims.display_name,
      avatar_url: undefined,
      total_score: 0,
      total_games: 0,
      total_wins: 0,
    };

    // Update internal state
    this.token = token;
    this.user = user;

    // Save to localStorage
    this.saveToStorage();

    return user;
  }

  logout() {
    this.token = null;
    this.user = null;
    this.saveToStorage();
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  async updateProfile(displayName?: string, avatarUrl?: string): Promise<AuthResponse> {
    if (!this.token) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        this.user = data.data;
        this.saveToStorage();
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  }
}

export const authService = new AuthService();

