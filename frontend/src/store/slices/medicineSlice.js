import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  searchResults: [],
  recentSearches: [],
  popularSearches: [],
  comparisons: [],
  history: [],
  loading: false,
  error: null,
};

const medicineSlice = createSlice({
  name: 'medicine',
  initialState,
  reducers: {
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    addRecentSearch: (state, action) => {
      if (!state.recentSearches.includes(action.payload)) {
        state.recentSearches = [action.payload, ...state.recentSearches].slice(0, 5);
      }
    },
    setComparisons: (state, action) => {
      state.comparisons = action.payload;
    },
    setHistory: (state, action) => {
      state.history = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetMedicine: () => initialState,
  },
});

export const {
  setSearchResults,
  addRecentSearch,
  setComparisons,
  setHistory,
  setLoading,
  setError,
  resetMedicine,
} = medicineSlice.actions;
export default medicineSlice.reducer;
