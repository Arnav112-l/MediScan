import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reports: [],
  currentAnalysis: null,
  loading: false,
  error: null,
};

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setReports: (state, action) => {
      state.reports = action.payload;
    },
    setCurrentAnalysis: (state, action) => {
      state.currentAnalysis = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetReports: () => initialState,
  },
});

export const { setReports, setCurrentAnalysis, setLoading, setError, resetReports } = reportSlice.actions;
export default reportSlice.reducer;
