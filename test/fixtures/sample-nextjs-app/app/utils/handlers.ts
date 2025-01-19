import { Dispatch, SetStateAction } from 'react';
import { logEvent } from './analytics';

export const handleClick = (setClicked: Dispatch<SetStateAction<boolean>>) => {
  setClicked(true);
  logEvent('button_clicked');
};
