import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

function decodeJwt(token) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      let savedUser = null;
      try {
        savedUser = JSON.parse(localStorage.getItem('user'));
      } catch (e) {}

      const decoded = decodeJwt(token);
      if (decoded) {
        setUser({
          ...savedUser,
          id: decoded.id || savedUser?.id,
          name: decoded.name || savedUser?.name,
          email: decoded.email || savedUser?.email,
          role: decoded.role || savedUser?.role,
          hostel: decoded.hostel || savedUser?.hostel,
          studentId: decoded.studentId || decoded.regNo || savedUser?.studentId || savedUser?.regNo,
          regNo: decoded.regNo || decoded.studentId || savedUser?.regNo || savedUser?.studentId,
          messName: savedUser?.messName || (decoded.hostel ? `Mess - ${decoded.hostel}` : 'Central Mess — Block A'),
        });
      } else if (savedUser) {
        setUser(savedUser);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  const requestOtp = async (email) => {
    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: data.error || data.message || 'Failed to send OTP' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Could not connect to the server. Please try again.' };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        return { success: false, message: data.error || data.message || 'OTP verification failed' };
      }
      const decoded = decodeJwt(data.token);
      const userObj = {
        ...data.user,
        name: data.user?.name || decoded?.name,
        role: data.user?.role || decoded?.role,
        hostel: data.user?.hostel || decoded?.hostel,
        studentId: data.user?.studentId || decoded?.studentId,
        regNo: data.user?.regNo || decoded?.regNo || decoded?.studentId,
      };
      setToken(data.token);
      setUser(userObj);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userObj));
      return { success: true, user: userObj, token: data.token };
    } catch (err) {
      return { success: false, message: 'Could not connect to the server. Please try again.' };
    }
  };

  const registerRequest = async ({ name, email, role, hostel, studentId }) => {
    try {
      const response = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, hostel, studentId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: data.error || data.message || 'Registration request failed' };
      }
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Could not connect to the server. Please try again.' };
    }
  };

  const registerVerify = async (email, otp) => {
    try {
      const response = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.token) {
        return { success: false, message: data.error || data.message || 'Verification failed' };
      }
      const decoded = decodeJwt(data.token);
      const userObj = {
        ...data.user,
        name: data.user?.name || decoded?.name,
        role: data.user?.role || decoded?.role,
        hostel: data.user?.hostel || decoded?.hostel,
        studentId: data.user?.studentId || decoded?.studentId,
        regNo: data.user?.regNo || decoded?.regNo || decoded?.studentId,
      };
      setToken(data.token);
      setUser(userObj);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userObj));
      return { success: true, user: userObj, token: data.token };
    } catch (err) {
      return { success: false, message: 'Could not connect to the server. Please try again.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        requestOtp,
        verifyOtp,
        registerRequest,
        registerVerify,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
