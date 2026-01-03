import { create } from 'zustand';
import { getCategories } from '../lib/api';

interface Category {
  id: string;
  name: string;
}

interface CategoryState {
  categories: Category[];
  activeCategory: string;
  activeCategoryId: string | null;
  fetchCategories: () => Promise<void>;
  setActiveCategory: (name: string, id: string | null) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  activeCategory: 'All',
  activeCategoryId: null,
  fetchCategories: async () => {
    try {
      const res = await getCategories();
      set({ categories: res.categories });
    } catch (error) {
      set({ categories: [] });
    }
  },
  setActiveCategory: (name, id) => {
    set({ activeCategory: name, activeCategoryId: id });
  },
}));
