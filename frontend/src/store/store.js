import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import medicineReducer from './slices/medicineSlice';
import reminderReducer from './slices/reminderSlice';
import reportReducer from './slices/reportSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    medicine: medicineReducer,
    reminders: reminderReducer,
    reports: reportReducer,
    dashboard: dashboardReducer,
  },
});
