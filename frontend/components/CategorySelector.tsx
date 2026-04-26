"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

const PREDEFINED_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Housing",
  "Utilities",
  "Healthcare",
  "Entertainment",
  "Shopping",
  "Education",
  "Other",
] as const;

export type CategorySelection = {
  selectedCategory: string;
  customCategory: string;
  value: string;
};

type Props = {
  onChange: (selection: CategorySelection) => void;
  error?: string;
  disabled?: boolean;
  resetSignal?: number;
};

function emitSelection(
  selectedCategory: string,
  customCategory: string,
  onChange: (selection: CategorySelection) => void
) {
  const value = selectedCategory === "Other" ? customCategory.trim() : selectedCategory;
  onChange({ selectedCategory, customCategory, value });
}

export default function CategorySelector({ onChange, error = "", disabled = false, resetSignal = 0 }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const onChangeRef = useRef(onChange);

  const showCustomInput = selectedCategory === "Other";

  const categories = useMemo(() => PREDEFINED_CATEGORIES, []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setSelectedCategory("");
    setCustomCategory("");
    onChangeRef.current({ selectedCategory: "", customCategory: "", value: "" });
  }, [resetSignal]);

  function onCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextCategory = e.target.value;
    setSelectedCategory(nextCategory);

    if (nextCategory !== "Other") {
      setCustomCategory("");
      emitSelection(nextCategory, "", onChangeRef.current);
      return;
    }

    emitSelection(nextCategory, customCategory, onChangeRef.current);
  }

  function onCustomCategoryChange(e: ChangeEvent<HTMLInputElement>) {
    const nextCustomValue = e.target.value;
    setCustomCategory(nextCustomValue);
    emitSelection(selectedCategory, nextCustomValue, onChangeRef.current);
  }

  return (
    <div>
      <label htmlFor="expense-category">Category</label>
      <select
        id="expense-category"
        value={selectedCategory}
        onChange={onCategoryChange}
        disabled={disabled}
        required
      >
        <option value="" disabled>
          Select a category
        </option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      {showCustomInput ? (
        <div style={{ marginTop: 10 }}>
          <label htmlFor="custom-category">Custom category</label>
          <input
            id="custom-category"
            value={customCategory}
            onChange={onCustomCategoryChange}
            maxLength={40}
            placeholder="Enter custom category"
            disabled={disabled}
          />
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}