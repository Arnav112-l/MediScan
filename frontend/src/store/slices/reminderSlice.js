import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reminders: [],
  loading: false,
  error: null,
};

const reminderSlice = createSlice({
  name: 'reminders',
  initialState,
  reducers: {
    setReminders: (state, action) => {
      state.reminders = action.payload;
    },
    toggleReminder: (state, action) => {
      const index = state.reminders.findIndex(r => r.id === action.payload);
      if (index !== -1) {
        state.reminders[index].active = !state.reminders[index].active;
      }
    },
    addReminder: (state, action) => {
      state.reminders.push(action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetReminders: () => initialState,
  },
});

export const {
  setReminders,
  toggleReminder,
  addReminder,
  setLoading,
  setError,
  resetReminders,
} = reminderSlice.actions;
export default reminderSlice.reducer;
