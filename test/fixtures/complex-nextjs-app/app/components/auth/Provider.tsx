import { createContext, useContext } from 'react';
import { useAuth } from '../../lib/auth/hooks';
import { AuthConfig } from '../../utils/auth/config';

export const AuthContext = createContext(null);
export const AuthProvider: React.FC = ({ children }) => {
  const auth = useAuth(AuthConfig);
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
