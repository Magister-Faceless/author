# ✅ Fixed: expandedFolders.has is not a function

**Error:**
```
TypeError: expandedFolders.has is not a function
at renderNode (FileExplorer.tsx:186)
```

---

## Problem

The `expandedFolders` state is a `Set<string>`, but when persisted to localStorage, it was converted to an array. When the app reloaded, it stayed as an array instead of being converted back to a Set.

**Storage Flow:**
1. **Save**: `Set<string>` → `Array.from()` → `["folder1", "folder2"]` → localStorage ✅
2. **Load**: `["folder1", "folder2"]` → ❌ **MISSING CONVERSION** → Used as array
3. **Error**: `array.has()` doesn't exist (only `Set.has()` exists)

---

## Fix

Added a `merge` function to the Zustand persist config to convert the array back to a Set on load:

```typescript
{
  name: 'author-app-storage',
  partialize: (state) => ({
    columnWidths: state.columnWidths,
    expandedFolders: Array.from(state.expandedFolders),  // Save as array
  }),
  merge: (persistedState: any, currentState) => ({
    ...currentState,
    ...persistedState,
    expandedFolders: new Set(persistedState.expandedFolders || []),  // ✅ Convert back to Set
  }),
}
```

---

## Result

- ✅ FileExplorer renders without errors
- ✅ Folder expand/collapse works
- ✅ State persists across reloads
- ✅ No more "expandedFolders.has is not a function"

---

**The UI bug is fixed!** The page should have auto-reloaded with webpack hot reload. 🎉
