import { useState } from 'react';
import { handleClick } from '../utils/handlers';
import styles from '../styles/button.module.css';

export const Button: React.FC = ({ children }) => {
  const [clicked, setClicked] = useState(false);
  return (
    <button 
      className={styles.button} 
      onClick={() => handleClick(setClicked)}
    >
      {children}
    </button>
  );
};
